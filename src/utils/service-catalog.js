import { STORE_IDS } from './stores.js';

export const DEFAULT_APPOINTMENT_SERVICE_NAME = 'Exame de vista';

export function defaultAppointmentService(storeIds, durationMinutes = 20) {
  const normalizedStoreIds = [...new Set((Array.isArray(storeIds) ? storeIds : [storeIds]).filter(Boolean))];
  return {
    id: 'default-eye-exam',
    name: DEFAULT_APPOINTMENT_SERVICE_NAME,
    storeIds: normalizedStoreIds,
    durationMinutes: Number(durationMinutes) || 20,
    active: true,
    isDefault: true,
    schemaVersion: 2
  };
}

export function normalizeAppointmentService(value = {}) {
  const storeIds = Array.isArray(value.storeIds) ? value.storeIds : value.storeId ? [value.storeId] : [];
  return {
    name: String(value.name || '').trim(),
    storeIds: [...new Set(storeIds.map((storeId) => String(storeId).trim().toLowerCase()).filter(Boolean))],
    durationMinutes: Number(value.durationMinutes),
    active: value.active === true || value.active === 'true',
    schemaVersion: 2
  };
}

export function validateAppointmentService(value = {}) {
  const data = normalizeAppointmentService(value);
  const errors = {};

  if (data.name.length < 2 || data.name.length > 80) errors.name = 'Informe um nome entre 2 e 80 caracteres.';
  if (!data.storeIds.length || data.storeIds.some((storeId) => !STORE_IDS.has(storeId))) {
    errors.storeIds = 'Escolha pelo menos uma unidade valida.';
  }
  if (!Number.isInteger(data.durationMinutes) || data.durationMinutes < 10 || data.durationMinutes > 180 || data.durationMinutes % 10 !== 0) {
    errors.durationMinutes = 'Informe uma duracao entre 10 e 180 minutos, em intervalos de 10.';
  }

  return { data, errors, isValid: Object.keys(errors).length === 0 };
}

export function servicesForStore(services, storeId, activeOnly = true) {
  return services
    .filter((service) => (service.storeIds || (service.storeId ? [service.storeId] : [])).includes(storeId)
      && (!activeOnly || service.active))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
