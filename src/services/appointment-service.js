import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { monthRange } from '../utils/calendar.js';

export const APPOINTMENTS_QUERY_LIMIT = 500;
export const APPOINTMENT_ATTENDANCE = new Set(['pending', 'attended', 'missed']);

function appointmentsQuery(profile, monthKey, selectedStoreId = '') {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile?.role)) {
    const error = new Error('Agenda indisponivel para este perfil.');
    error.code = 'permission-denied';
    throw error;
  }

  const { startDate, endDate } = monthRange(monthKey);
  const storeId = profile.role === 'manager' ? profile.storeId : selectedStoreId;
  const constraints = [
    where('appointmentDate', '>=', startDate),
    where('appointmentDate', '<=', endDate),
    limit(APPOINTMENTS_QUERY_LIMIT + 1)
  ];
  if (storeId) constraints.unshift(where('storeId', '==', storeId));
  return query(collection(db, 'leads'), ...constraints);
}

export function subscribeToAppointments(profile, monthKey, selectedStoreId, onData, onError) {
  return onSnapshot(appointmentsQuery(profile, monthKey, selectedStoreId), (snapshot) => {
    const records = snapshot.docs.slice(0, APPOINTMENTS_QUERY_LIMIT)
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => String(a.appointmentDate || '').localeCompare(String(b.appointmentDate || ''))
        || String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || ''))
        || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR'));
    onData({ records, truncated: snapshot.size > APPOINTMENTS_QUERY_LIMIT });
  }, onError);
}

export async function setAppointmentAttendance(profile, lead, attendance) {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile?.role)
    || !APPOINTMENT_ATTENDANCE.has(attendance)
    || (profile.role === 'manager' && lead.storeId !== profile.storeId)) {
    const error = new Error('Status de comparecimento nao autorizado.');
    error.code = 'permission-denied';
    throw error;
  }

  await setDoc(doc(db, 'leads', lead.id), {
    appointmentAttendance: attendance,
    appointmentAttendanceUpdatedAt: serverTimestamp(),
    appointmentAttendanceUpdatedByUid: profile.uid,
    updatedAtServer: serverTimestamp()
  }, { merge: true });
}
