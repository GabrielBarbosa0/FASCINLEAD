export const STORES = Object.freeze([
  { id: 'loja-02', label: 'Loja 02', city: 'Surubim', displayLabel: 'Loja 02 - Surubim' },
  { id: 'loja-04', label: 'Loja 04', city: 'Carpina', displayLabel: 'Loja 04 - Carpina' },
  { id: 'loja-05', label: 'Loja 05', city: 'Limoeiro', displayLabel: 'Loja 05 - Limoeiro' },
  { id: 'loja-06', label: 'Loja 06', city: 'Surubim', displayLabel: 'Loja 06 - Surubim' }
]);

export const STORE_IDS = new Set(STORES.map((store) => store.id));

const SURUBIM_SHARED_STORE_IDS = Object.freeze(['loja-02', 'loja-06']);

export function appointmentResourceId(storeId) {
  return SURUBIM_SHARED_STORE_IDS.includes(storeId) ? 'consultorio-surubim' : storeId;
}

export function appointmentResourceStoreIds(storeId) {
  return SURUBIM_SHARED_STORE_IDS.includes(storeId) ? [...SURUBIM_SHARED_STORE_IDS] : [storeId];
}

export function transportResourceStoreIds(storeId) {
  return SURUBIM_SHARED_STORE_IDS.includes(storeId) ? [...SURUBIM_SHARED_STORE_IDS] : [storeId];
}
