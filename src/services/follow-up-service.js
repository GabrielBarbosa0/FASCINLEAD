import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { followUpAppointmentKey } from '../utils/follow-up.js';

export const FOLLOW_UP_QUERY_LIMIT = 500;

function permissionError(message) {
  const error = new Error(message);
  error.code = 'permission-denied';
  return error;
}

export function subscribeToTeamFollowUps(profile, onData, onError) {
  if (!isFirebaseConfigured || profile?.role !== 'manager' || !profile.storeId) {
    throw permissionError('Retornos da equipe indisponiveis.');
  }
  const today = new Date();
  const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60_000)).toISOString().slice(0, 10);
  const followUpsQuery = query(
    collection(db, 'leads'),
    where('storeId', '==', profile.storeId),
    where('appointmentDate', '<=', localToday),
    limit(FOLLOW_UP_QUERY_LIMIT + 1)
  );
  return onSnapshot(followUpsQuery, (snapshot) => {
    onData({
      records: snapshot.docs.slice(0, FOLLOW_UP_QUERY_LIMIT).map((item) => ({ id: item.id, ...item.data() })),
      truncated: snapshot.size > FOLLOW_UP_QUERY_LIMIT
    });
  }, onError);
}

export async function markFollowUpContactStarted(profile, lead) {
  if (!isFirebaseConfigured || profile?.role !== 'captor' || lead?.capturedByUid !== profile.uid) {
    throw permissionError('Retorno nao autorizado.');
  }
  await setDoc(doc(db, 'leads', lead.id), {
    followUpContactedAt: serverTimestamp(),
    followUpContactedByUid: profile.uid,
    followUpContactedByName: profile.displayName,
    followUpContactedAppointmentKey: followUpAppointmentKey(lead),
    updatedAtServer: serverTimestamp()
  }, { merge: true });
}
