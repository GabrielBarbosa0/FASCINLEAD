const FIELD_ALIASES = Object.freeze({
  cpf: ['CPF', 'CPFCNPJ', 'CPFCLIENTE', 'CPF_CLIENTE', 'CPFCLIENTEPAGADOR'],
  store: ['LOJA', 'CODLOJA', 'CODIGOLOJA'],
  os: ['OS', 'N_OS', 'NUMEROOS', 'NUMERO_OS', 'CODIGOOS'],
  sale: ['CODIGOVENDA', 'CODVENDA', 'VENDA'],
  customer: ['CODCLIENTE', 'CODIGOCLIENTE'],
  customerName: ['CLIENTE', 'NOMECLIENTE', 'NOME_CLIENTE'],
  date: ['DATAVENDA', 'DATA_VENDA', 'DATAOS', 'DATA_OS', 'DATA'],
  value: ['VLRLIQUIDOVENDA', 'VALORVENDA', 'VALOR_VENDA', 'VALORTOTAL', 'TOTAL'],
  product: ['PRODUTO', 'DESCRICAOPRODUTO', 'DESCRICAO_PRODUTO', 'DESCRICAO']
});

function firstValue(record, aliases) {
  for (const key of aliases) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

export function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

export function formatBrazilianCpf(value) {
  const digits = normalizeCpf(value);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function parseDate(value) {
  const text = String(value || '').trim();
  let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value || '').trim().replace(/R\$\s?/i, '');
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function normalizeStoreCode(value) {
  const text = String(value || '').trim();
  const match = text.match(/^0*(\d+)/);
  return match ? String(Number(match[1])) : text;
}

export function groupSavwinSales(records = []) {
  const groups = new Map();
  records.forEach((record, index) => {
    const storeCode = normalizeStoreCode(firstValue(record, FIELD_ALIASES.store));
    const osNumber = String(firstValue(record, FIELD_ALIASES.os)).trim();
    const saleCode = String(firstValue(record, FIELD_ALIASES.sale)).trim();
    const key = `${storeCode}|${osNumber || saleCode || index}`;
    const current = groups.get(key) || {
      key,
      storeCode,
      osNumber,
      saleCode,
      customerCode: String(firstValue(record, FIELD_ALIASES.customer)).trim(),
      customerName: String(firstValue(record, FIELD_ALIASES.customerName)).trim(),
      cpf: normalizeCpf(firstValue(record, FIELD_ALIASES.cpf)),
      saleDate: parseDate(firstValue(record, FIELD_ALIASES.date)),
      saleValue: parseMoney(firstValue(record, FIELD_ALIASES.value)),
      products: [],
      rowCount: 0
    };
    const product = String(firstValue(record, FIELD_ALIASES.product)).trim();
    if (product && !current.products.includes(product)) current.products.push(product);
    current.rowCount += 1;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => b.saleDate.localeCompare(a.saleDate) || b.osNumber.localeCompare(a.osNumber));
}

const STORE_CODES = Object.freeze({ 'loja-02': '2', 'loja-04': '4', 'loja-05': '5', 'loja-06': '6' });

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function classifySavwinSales(lead, cpf, sales, windowDays = 90) {
  const normalizedCpf = normalizeCpf(cpf);
  const capturedDate = String(lead?.capturedAtClient || lead?.appointmentDate || '').slice(0, 10);
  const deadline = addDays(capturedDate, windowDays);
  const expectedStore = STORE_CODES[lead?.storeId] || '';
  const exact = sales.filter((sale) => !sale.cpf || sale.cpf === normalizedCpf);
  const historical = exact.filter((sale) => sale.saleDate && capturedDate && sale.saleDate < capturedDate);
  const candidates = exact.filter((sale) => {
    if (!sale.saleDate || !capturedDate) return sale.storeCode === expectedStore;
    return sale.saleDate >= capturedDate && (!deadline || sale.saleDate <= deadline);
  }).map((sale) => ({ ...sale, sameStore: !expectedStore || sale.storeCode === expectedStore }));
  candidates.sort((a, b) => Number(b.sameStore) - Number(a.sameStore) || b.saleDate.localeCompare(a.saleDate));
  return { candidates, historical, status: candidates.length ? 'possible_sale' : 'no_sale' };
}

export function maskCpf(value) {
  const cpf = normalizeCpf(value);
  return cpf.length === 11 ? `***.***.***-${cpf.slice(-2)}` : '';
}
