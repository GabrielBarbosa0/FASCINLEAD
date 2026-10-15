import {
  collection,
  doc,
  enableNetwork,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createLeadDocument, createLeadUpdate } from '../utils/lead.js';
import { getInstallationId } from '../utils/installation.js';

const DEMO_STORAGE_KEY = 'fascinlead:demo-leads';

function readDemoLeads() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeDemoLeads(leads) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event('fascinlead:demo-leads'));
}

export function subscribeToLeads(profile, demoMode, onData, onError) {
  if (demoMode || !isFirebaseConfigured) {
    const emit = () => onData(readDemoLeads());
    window.addEventListener('fascinlead:demo-leads', emit);
    emit();
    return () => window.removeEventListener('fascinlead:demo-leads', emit);
  }

  const leadsQuery = query(
    collection(db, 'leads'),
    where('capturedByUid', '==', profile.uid),
    orderBy('capturedAtClient', 'desc'),
    limit(100)
  );

  return onSnapshot(
    leadsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onData(
        snapshot.docs.map((leadDoc) => ({
          id: leadDoc.id,
          ...leadDoc.data(),
          syncState: leadDoc.metadata.hasPendingWrites ? 'pending' : 'synced',
          fromCache: leadDoc.metadata.fromCache
        }))
      );
    },
    onError
  );
}

export function saveLead(input, profile, demoMode, onRemoteError) {
  const result = createLeadDocument(input, profile, getInstallationId());
  if (!result.isValid) return result;

  const id = crypto.randomUUID();

  if (demoMode || !isFirebaseConfigured) {
    const leads = readDemoLeads();
    writeDemoLeads([
      {
        id,
        ...result.data,
        syncState: 'demo',
        fromCache: true
      },
      ...leads
    ]);
    return { ...result, id };
  }

  const leadData = {
    ...result.data,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  };
  let writePromise;
  if (input.schedulingMode === 'controlled' && result.data.appointmentDate && result.data.appointmentTime) {
    const slotId = `slot-${profile.storeId}-${result.data.appointmentDate}-${result.data.appointmentTime}`;
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', id), leadData);
    batch.set(doc(db, 'appointmentSlots', slotId), {
      storeId: profile.storeId,
      appointmentDate: result.data.appointmentDate,
      appointmentTime: result.data.appointmentTime,
      durationMinutes: Number(input.appointmentDurationMinutes) || 20,
      leadId: id,
      capturedByUid: profile.uid,
      createdAt: serverTimestamp()
    });
    writePromise = batch.commit();
  } else {
    writePromise = setDoc(doc(db, 'leads', id), leadData);
  }

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export function updateLead(id, input, demoMode, onRemoteError, existingLead = null) {
  const result = createLeadUpdate(input);
  if (!result.isValid) return result;

  if (demoMode || !isFirebaseConfigured) {
    const leads = readDemoLeads();
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return { isValid: false, errors: {}, notFound: true };
    const appointmentChanged = leads[index].appointmentDate !== result.data.appointmentDate
      || leads[index].appointmentTime !== result.data.appointmentTime;
    leads[index] = {
      ...leads[index],
      ...result.data,
      ...(appointmentChanged && leads[index].appointmentAttendance === 'missed' ? { appointmentAttendance: 'pending' } : {}),
      syncState: 'demo',
      fromCache: true
    };
    writeDemoLeads(leads);
    return { ...result, id };
  }

  const appointmentChanged = existingLead && (
    existingLead.appointmentDate !== result.data.appointmentDate
    || existingLead.appointmentTime !== result.data.appointmentTime
  );
  const leadUpdate = {
    ...result.data,
    ...(appointmentChanged && existingLead.appointmentAttendance === 'missed' ? { appointmentAttendance: 'pending' } : {}),
    updatedAtServer: serverTimestamp()
  };
  const oldControlled = existingLead?.appointmentSchedulingMode === 'controlled'
    && existingLead.appointmentDate && existingLead.appointmentTime;
  const newControlled = result.data.appointmentSchedulingMode === 'controlled'
    && result.data.appointmentDate && result.data.appointmentTime;
  const oldSlotId = oldControlled
    ? `slot-${existingLead.storeId}-${existingLead.appointmentDate}-${existingLead.appointmentTime}`
    : '';
  const newSlotId = newControlled
    ? `slot-${existingLead.storeId}-${result.data.appointmentDate}-${result.data.appointmentTime}`
    : '';
  let writePromise;
  if (existingLead && oldSlotId !== newSlotId && (oldSlotId || newSlotId)) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', id), leadUpdate, { merge: true });
    if (oldSlotId) batch.delete(doc(db, 'appointmentSlots', oldSlotId));
    if (newSlotId) {
      batch.set(doc(db, 'appointmentSlots', newSlotId), {
        storeId: existingLead.storeId,
        appointmentDate: result.data.appointmentDate,
        appointmentTime: result.data.appointmentTime,
        durationMinutes: result.data.appointmentDurationMinutes,
        leadId: id,
        capturedByUid: existingLead.capturedByUid,
        createdAt: serverTimestamp()
      });
    }
    writePromise = batch.commit();
  } else {
    writePromise = setDoc(doc(db, 'leads', id), leadUpdate, { merge: true });
  }

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export function updateDemoAppointmentAttendance(id, attendance, profile) {
  const allowed = new Set(['pending', 'attended', 'missed']);
  if (!allowed.has(attendance)) return false;
  const leads = readDemoLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  leads[index] = {
    ...leads[index],
    appointmentAttendance: attendance,
    appointmentAttendanceUpdatedAt: new Date().toISOString(),
    appointmentAttendanceUpdatedByUid: profile.uid
  };
  writeDemoLeads(leads);
  return true;
}

export async function synchronizeNow(demoMode) {
  if (demoMode || !isFirebaseConfigured) return { demo: true };
  await enableNetwork(db);
  await waitForPendingWrites(db);
  return { demo: false };
}
