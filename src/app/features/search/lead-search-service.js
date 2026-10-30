import { doc, getDocFromServer } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, isFirebaseConfigured } from '../../../firebase/client.js';

export async function searchLeadAppointments(queryText) {
  if (!isFirebaseConfigured || !functions) return [];
  const search = httpsCallable(functions, 'searchLeadAppointments');
  const response = await search({ query: String(queryText || '') });
  return Array.isArray(response.data?.results) ? response.data.results : [];
}

export async function checkCpfActiveAppointment(customerCpf) {
  if (!isFirebaseConfigured || !functions) return { hasAppointment: false };
  const check = httpsCallable(functions, 'checkCpfActiveAppointment');
  const response = await check({ customerCpf: String(customerCpf || '') });
  return { hasAppointment: response.data?.hasAppointment === true };
}

export async function loadSearchLead(leadId) {
  if (!isFirebaseConfigured || !db || !leadId) return null;
  const snapshot = await getDocFromServer(doc(db, 'leads', leadId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
