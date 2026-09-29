import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createLeadUpdate } from '../utils/lead.js';

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
    constraints.unshift(where('storeId', '==', profile.storeId));
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

function assertAdmin(profile) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') {
    const error = new Error('Apenas administradores podem alterar leads da equipe.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function updateManagementLead(profile, id, input) {
  assertAdmin(profile);
  const validation = createLeadUpdate(input);
  if (!validation.isValid) return validation;

  await setDoc(doc(db, 'leads', id), {
    ...validation.data,
    updatedAtServer: serverTimestamp()
  }, { merge: true });
  return validation;
}

export async function deleteManagementLead(profile, id) {
  assertAdmin(profile);
  await deleteDoc(doc(db, 'leads', id));
}
