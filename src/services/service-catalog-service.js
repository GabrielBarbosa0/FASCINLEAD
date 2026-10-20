import { collection, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { profileStoreIds } from '../utils/permissions.js';
import { defaultAppointmentService, normalizeAppointmentService, servicesForStore, validateAppointmentService } from '../utils/service-catalog.js';

function permissionError(message) {
  const error = new Error(message);
  error.code = 'permission-denied';
  return error;
}

export async function loadAppointmentServices(profile, { includeInactive = false } = {}) {
  if (!isFirebaseConfigured || !profile) throw permissionError('Servicos indisponiveis.');
  if (includeInactive && profile.role !== 'admin') throw permissionError('Servicos inativos indisponiveis.');

  const constraints = [];
  const storeIds = profileStoreIds(profile);
  if (profile.role !== 'admin') {
    constraints.push(where('storeIds', storeIds.length === 1 ? 'array-contains' : 'array-contains-any', storeIds.length === 1 ? storeIds[0] : storeIds));
    constraints.push(where('active', '==', true));
  }
  const snapshot = await getDocs(query(collection(db, 'appointmentServices'), ...constraints));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data(), ...normalizeAppointmentService(item.data()) }))
    .filter((item) => includeInactive || item.active === true)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function saveAppointmentService(profile, values, serviceId = '') {
  if (!isFirebaseConfigured || profile?.role !== 'admin') throw permissionError('Apenas administradores podem gerenciar servicos.');
  const validation = validateAppointmentService(values);
  if (!validation.isValid) return validation;

  const reference = serviceId ? doc(db, 'appointmentServices', serviceId) : doc(collection(db, 'appointmentServices'));
  await setDoc(reference, {
    ...validation.data,
    ...(serviceId ? {} : { createdAt: serverTimestamp(), createdByUid: profile.uid }),
    updatedAt: serverTimestamp(),
    updatedByUid: profile.uid
  }, { merge: true });
  return { ...validation, id: reference.id };
}

export async function setAppointmentServiceActive(profile, service, active) {
  if (!active) {
    const services = await loadAppointmentServices(profile, { includeInactive: true });
    const uncoveredStoreIds = service.storeIds.filter((storeId) => !servicesForStore(
      services.filter((item) => item.id !== service.id), storeId
    ).length);
    if (uncoveredStoreIds.length) {
      const error = new Error('Mantenha pelo menos um servico ativo em cada unidade atendida.');
      error.code = 'last-active-service';
      throw error;
    }
  }
  return saveAppointmentService(profile, { ...service, active }, service.id);
}

export async function ensureDefaultAppointmentServices(profile, schedules, services) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') return services;
  const existingStoreIds = new Set(services.flatMap((service) => service.storeIds || []));
  const missing = schedules.filter((schedule) => !existingStoreIds.has(schedule.id));
  if (!missing.length) return services;

  const batch = writeBatch(db);
  const existingDefault = services.find((service) => service.id === 'default-eye-exam');
  if (existingDefault) {
    const updated = { ...existingDefault, storeIds: [...new Set([...existingDefault.storeIds, ...missing.map((item) => item.id)])] };
    batch.set(doc(db, 'appointmentServices', existingDefault.id), {
      storeIds: updated.storeIds,
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
      updatedByUid: profile.uid
    }, { merge: true });
    await batch.commit();
    return services.map((service) => service.id === existingDefault.id ? updated : service);
  }
  const created = defaultAppointmentService(
    missing.map((schedule) => schedule.id),
    missing[0]?.appointmentDurationMinutes
  );
  batch.set(doc(db, 'appointmentServices', created.id), {
    name: created.name,
    storeIds: created.storeIds,
    durationMinutes: created.durationMinutes,
    active: true,
    schemaVersion: 2,
    createdAt: serverTimestamp(),
    createdByUid: profile.uid,
    updatedAt: serverTimestamp(),
    updatedByUid: profile.uid
  });
  await batch.commit();
  return [...services, created];
}
