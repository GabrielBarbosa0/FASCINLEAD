import { STORE_IDS } from './stores.js';

const VALID_ROLES = new Set(['captor', 'manager', 'admin']);

export function normalizeAccessEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export function validateAccess(values) {
  const displayName = String(values.displayName || '').trim();
  const email = normalizeAccessEmail(values.email);
  const role = String(values.role || '');
  const storeId = String(values.storeId || '').trim().toLowerCase();
  const errors = {};

  if (displayName.length < 2 || displayName.length > 120) {
    errors.displayName = 'Informe um nome entre 2 e 120 caracteres.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'Informe um e-mail valido.';
  }

  if (!VALID_ROLES.has(role)) {
    errors.role = 'Escolha um perfil valido.';
  }

  if (!STORE_IDS.has(storeId)) {
    errors.storeId = 'Escolha uma loja valida.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { displayName, email, role, storeId }
  };
}
