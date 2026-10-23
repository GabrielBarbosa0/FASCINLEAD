export const STORES = Object.freeze([
  { id: 'loja-02', label: 'Loja 02', city: 'Surubim', displayLabel: 'Loja 02 - Surubim' },
  { id: 'loja-04', label: 'Loja 04', city: 'Carpina', displayLabel: 'Loja 04 - Carpina' },
  { id: 'loja-05', label: 'Loja 05', city: 'Limoeiro', displayLabel: 'Loja 05 - Limoeiro' },
  { id: 'loja-06', label: 'Loja 06', city: 'Surubim', displayLabel: 'Loja 06 - Surubim' }
]);

export const STORE_IDS = new Set(STORES.map((store) => store.id));
