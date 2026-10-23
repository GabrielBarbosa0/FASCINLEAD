import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import {
  appointmentBlockTimes,
  appointmentSlotId,
  DEFAULT_STORE_SCHEDULE,
  normalizeStoreSchedule,
  validateStoreSchedule
} from '../utils/schedule.js';
import { STORES } from '../utils/stores.js';
import { profileStoreIds } from '../utils/permissions.js';

function permissionError(message) {
  const error = new Error(message);
  error.code = 'permission-denied';
  return error;
}

export function subscribeToStoreSchedule(profile, onData, onError) {
  if (!isFirebaseConfigured || !profile?.storeId) throw permissionError('Configuracao de agenda indisponivel.');
  return onSnapshot(doc(db, 'stores', profile.storeId), { includeMetadataChanges: true }, (snapshot) => {
    onData(
      normalizeStoreSchedule(snapshot.exists() ? snapshot.data() : DEFAULT_STORE_SCHEDULE),
      { fromCache: snapshot.metadata.fromCache }
    );
  }, onError);
}

export function subscribeToDayAppointments(profile, appointmentDate, onData, onError) {
  if (!isFirebaseConfigured || !profile?.storeId || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate || '')) {
    throw permissionError('Data de agendamento indisponivel.');
  }
  const dayQuery = query(
    collection(db, 'appointmentSlots'),
    where('storeId', '==', profile.storeId),
    where('appointmentDate', '==', appointmentDate)
  );
  return onSnapshot(dayQuery, { includeMetadataChanges: true }, (snapshot) => {
    onData(
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      { fromCache: snapshot.metadata.fromCache }
    );
  }, onError);
}

export async function loadStoreSchedules(profile) {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile?.role)) throw permissionError('Agendas indisponiveis.');
  const snapshot = await getDocs(collection(db, 'stores'));
  const byId = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
  const allowedStoreIds = profileStoreIds(profile);
  return STORES.filter((store) => allowedStoreIds.includes(store.id)).map((store) => ({
    ...store,
    ...normalizeStoreSchedule(byId.get(store.id) || DEFAULT_STORE_SCHEDULE)
  }));
}

export async function loadStoreSchedule(profile, storeId) {
  if (!isFirebaseConfigured || !profile?.uid || !profileStoreIds(profile).includes(storeId)) {
    throw permissionError('Configuracao de agenda indisponivel.');
  }
  const snapshot = await getDoc(doc(db, 'stores', storeId));
  return {
    id: storeId,
    ...normalizeStoreSchedule(snapshot.exists() ? snapshot.data() : DEFAULT_STORE_SCHEDULE)
  };
}

export async function saveStoreSchedule(profile, storeId, values) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') throw permissionError('Apenas administradores podem configurar agendas.');
  const validation = validateStoreSchedule(values);
  if (!validation.isValid) return validation;
  await setDoc(doc(db, 'stores', storeId), {
    ...validation.data,
    updatedAt: serverTimestamp(),
    updatedByUid: profile.uid
  }, { merge: true });
  return validation;
}

export async function backfillAppointmentSlots(profile, records, monthKey) {
  if (!isFirebaseConfigured || profile?.role !== 'admin' || !/^\d{4}-\d{2}$/.test(monthKey || '')) return 0;
  const startDate = `${monthKey}-01`;
  const [year, month] = monthKey.split('-').map(Number);
  const endDate = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  const [slotsSnapshot, storesSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'appointmentSlots'),
      where('appointmentDate', '>=', startDate),
      where('appointmentDate', '<=', endDate)
    )),
    getDocs(collection(db, 'stores'))
  ]);
  const existingIds = new Set(slotsSnapshot.docs.map((item) => item.id));
  const settingsByStore = new Map(storesSnapshot.docs.map((item) => [item.id, normalizeStoreSchedule(item.data())]));
  const missing = [];
  records.forEach((lead) => {
    if (!lead.appointmentDate || !lead.appointmentTime || lead.appointmentSchedulingMode === 'free') return;
    const duration = Number(lead.appointmentDurationMinutes)
      || settingsByStore.get(lead.storeId)?.appointmentDurationMinutes
      || DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes;
    appointmentBlockTimes(lead.appointmentTime, duration).forEach((blockTime) => {
      const slotId = appointmentSlotId(lead.storeId, lead.appointmentDate, blockTime);
      if (!existingIds.has(slotId) && missing.length < 450) {
        missing.push({ lead, duration, blockTime, slotId });
        existingIds.add(slotId);
      }
    });
  });
  if (!missing.length) return 0;

  const batch = writeBatch(db);
  missing.forEach(({ lead, duration, blockTime, slotId }) => {
    batch.set(doc(db, 'appointmentSlots', slotId), {
      storeId: lead.storeId,
      appointmentDate: lead.appointmentDate,
      appointmentTime: lead.appointmentTime,
      blockTime,
      durationMinutes: duration,
      leadId: lead.id,
      capturedByUid: lead.capturedByUid,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
  return missing.length;
}
