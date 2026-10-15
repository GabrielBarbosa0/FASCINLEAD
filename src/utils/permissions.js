import { STORES } from './stores.js';

export function profileStoreIds(profile) {
  if (profile?.role === 'admin') return STORES.map((store) => store.id);
  const configured = Array.isArray(profile?.storeIds) ? profile.storeIds : [];
  return [...new Set([profile?.storeId, ...configured].filter(Boolean))];
}

export function canAccessStore(profile, storeId) {
  return profile?.role === 'admin' || profileStoreIds(profile).includes(storeId);
}
