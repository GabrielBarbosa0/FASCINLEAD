import { STORE_IDS } from './stores.js';

const VALID_ROLES = new Set(['captor', 'manager', 'admin']);

export function normalizeAccessEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function storeLabel(storeId = '') {
  return String(storeId).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatAccessStoreSummary(access = {}) {
  const allStoreIds = [...STORE_IDS];
  const storeIds = access.role === 'admin'
    ? allStoreIds
    : [...new Set(access.storeIds || [access.storeId].filter(Boolean))];
  const allStores = allStoreIds.every((storeId) => storeIds.includes(storeId));

  if (allStores) return { short: 'TODAS', full: 'Todas as unidades' };
  if (storeIds.length === 1) return { short: storeLabel(storeIds[0]), full: storeLabel(storeIds[0]) };

  return {
    short: storeIds.map((storeId) => storeLabel(storeId).replace(/^Loja\s+/i, '')).join(', '),
    full: storeIds.map(storeLabel).join(', ')
  };
}

export function validateAccess(values, roleProfiles = [], options = {}) {
  const displayName = String(values.displayName || '').trim();
  const email = normalizeAccessEmail(values.email);
  const password = String(values.password || '');
  const phone = String(values.phone || '').replace(/\D/g, '');
  const savwinCode = String(values.savwinCode || '').trim();
  const roleProfileId = String(values.roleProfileId || '');
  const selectedProfile = roleProfiles.find((profile) => profile.id === roleProfileId && profile.active !== false);
  const role = selectedProfile?.baseRole || String(values.role || '');
  const storeId = String(values.storeId || '').trim().toLowerCase();
  const requestedStoreIds = Array.isArray(values.storeIds) ? values.storeIds : [values.storeIds].filter(Boolean);
  const errors = {};

  if (displayName.length < 2 || displayName.length > 120) {
    errors.displayName = 'Informe um nome entre 2 e 120 caracteres.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'Informe um e-mail valido.';
  }

  if (options.requirePassword && password.length < 6) {
    errors.password = 'Crie uma senha inicial com pelo menos 6 caracteres.';
  }

  if (phone.length < 10 || phone.length > 11) {
    errors.phone = 'Informe um telefone com DDD.';
  }

  if (savwinCode.length > 30) {
    errors.savwinCode = 'Use no maximo 30 caracteres.';
  }

  if (!VALID_ROLES.has(role) || (roleProfileId && !selectedProfile)) {
    errors.role = 'Escolha um perfil valido.';
  }

  if (!STORE_IDS.has(storeId)) {
    errors.storeId = 'Escolha uma loja valida.';
  }

  const storeIds = role === 'admin'
    ? [...STORE_IDS]
    : role === 'manager'
      ? [...new Set([storeId, ...requestedStoreIds.map((item) => String(item).trim().toLowerCase())])]
      : [storeId];
  if (storeIds.some((item) => !STORE_IDS.has(item))) errors.storeIds = 'Escolha apenas unidades validas.';

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { displayName, email, password, phone, savwinCode, role, roleProfileId: selectedProfile?.id || '', storeId, storeIds }
  };
}
