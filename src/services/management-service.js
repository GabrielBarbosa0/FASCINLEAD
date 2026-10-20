import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createLeadUpdate } from '../utils/lead.js';
import { canAccessStore, profileStoreIds } from '../utils/permissions.js';

export const MANAGEMENT_QUERY_LIMIT = 300;

function localDayStart(date) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function localDayAfter(date) {
  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString();
}

export async function loadManagementLeads(profile, startDate, endDate) {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile.role)) {
    throw new Error('Acesso gerencial indisponivel.');
  }

  const constraints = [
    where('capturedAtClient', '>=', localDayStart(startDate)),
    where('capturedAtClient', '<', localDayAfter(endDate)),
    orderBy('capturedAtClient', 'desc'),
    limit(MANAGEMENT_QUERY_LIMIT + 1)
  ];

  if (profile.role === 'manager') {
    const storeIds = profileStoreIds(profile);
    constraints.unshift(where('storeId', storeIds.length === 1 ? '==' : 'in', storeIds.length === 1 ? storeIds[0] : storeIds));
  }

  const snapshot = await getDocs(query(collection(db, 'leads'), ...constraints));
  const records = snapshot.docs.slice(0, MANAGEMENT_QUERY_LIMIT).map((leadDoc) => ({
    id: leadDoc.id,
    ...leadDoc.data()
  }));

  return {
    records,
    truncated: snapshot.size > MANAGEMENT_QUERY_LIMIT
  };
}

function assertCanUpdate(profile, lead) {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile?.role)
    || !canAccessStore(profile, lead?.storeId)) {
    const error = new Error('Perfil sem acesso a este lead.');
    error.code = 'permission-denied';
    throw error;
  }
}

function assertAdmin(profile) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') {
    const error = new Error('Perfil sem permissao para excluir leads.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function updateManagementLead(profile, lead, input) {
  assertCanUpdate(profile, lead);
  const validation = createLeadUpdate(input);
  if (!validation.isValid) return validation;

  const oldControlled = lead.appointmentSchedulingMode === 'controlled' && lead.appointmentDate && lead.appointmentTime;
  const newControlled = validation.data.appointmentSchedulingMode === 'controlled'
    && validation.data.appointmentDate && validation.data.appointmentTime;
  const oldSlotId = oldControlled ? `slot-${lead.storeId}-${lead.appointmentDate}-${lead.appointmentTime}` : '';
  const newSlotId = newControlled ? `slot-${lead.storeId}-${validation.data.appointmentDate}-${validation.data.appointmentTime}` : '';
  const update = {
    ...validation.data,
    ...((lead.appointmentDate !== validation.data.appointmentDate
      || lead.appointmentTime !== validation.data.appointmentTime)
      && lead.appointmentAttendance === 'missed'
      ? { appointmentAttendance: 'pending' }
      : {}),
    updatedAtServer: serverTimestamp()
  };
  if (oldSlotId !== newSlotId && (oldSlotId || newSlotId)) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', lead.id), update, { merge: true });
    if (oldSlotId) batch.delete(doc(db, 'appointmentSlots', oldSlotId));
    if (newSlotId) batch.set(doc(db, 'appointmentSlots', newSlotId), {
      storeId: lead.storeId,
      appointmentDate: validation.data.appointmentDate,
      appointmentTime: validation.data.appointmentTime,
      durationMinutes: validation.data.appointmentDurationMinutes,
      leadId: lead.id,
      capturedByUid: lead.capturedByUid,
      createdAt: serverTimestamp()
    });
    await batch.commit();
  } else {
    await setDoc(doc(db, 'leads', lead.id), update, { merge: true });
  }
  return validation;
}

export async function deleteManagementLead(profile, lead) {
  assertAdmin(profile);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'leads', lead.id));
  if (lead.appointmentDate && lead.appointmentTime) {
    batch.delete(doc(db, 'appointmentSlots', `slot-${lead.storeId}-${lead.appointmentDate}-${lead.appointmentTime}`));
  }
  await batch.commit();
}
