import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createId } from '../utils/id.js';

export function addLeadHistoryEvents(batch, leadId, events) {
  events.forEach((event) => {
    batch.set(doc(db, 'leads', leadId, 'history', createId()), {
      ...event,
      leadId,
      occurredAtServer: serverTimestamp()
    });
  });
}

export function createLeadHistoryBatch(leadId, events) {
  const batch = writeBatch(db);
  addLeadHistoryEvents(batch, leadId, events);
  return batch;
}

export function subscribeToLeadHistory(profile, leadId, onData, onError) {
  if (!isFirebaseConfigured || !profile?.uid || !leadId) return () => {};
  return onSnapshot(query(collection(db, 'leads', leadId, 'history'), orderBy('occurredAtServer', 'desc'), limit(100)), (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}
