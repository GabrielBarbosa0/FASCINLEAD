import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';

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
