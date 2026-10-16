const STORE_CODES = Object.freeze({
  'loja-02': '2',
  'loja-04': '4',
  'loja-05': '5',
  'loja-06': '6'
});

export const isLocalSavwinEnabled = import.meta.env.DEV;

export async function consultLocalSavwinSales({ startDate, endDate, storeIds }) {
  if (!isLocalSavwinEnabled) throw new Error('A consulta local ao SavWin nao esta disponivel nesta versao.');
  const storeCodes = [...new Set((storeIds || []).map((storeId) => STORE_CODES[storeId]).filter(Boolean))];
  const response = await fetch('/api/savwin/products-by-os', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, storeCodes })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Nao foi possivel consultar o SavWin.');
  return payload;
}
