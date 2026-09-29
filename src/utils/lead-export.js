import { formatBrazilianPhone } from './phone.js';
import { STORES } from './stores.js';

function datePart(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function timePart(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function inputDatePart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function storeName(storeId) {
  return STORES.find((store) => store.id === storeId)?.label
    || String(storeId || '').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceName(source) {
  return source === 'street' ? 'Captacao em campo' : source || '';
}

const CSV_COLUMNS = [
  ['ID do lead', (lead) => lead.id],
  ['Nome do cliente', (lead) => lead.fullName],
  ['Nome preferido', (lead) => lead.preferredName],
  ['Telefone', (lead) => formatBrazilianPhone(lead.phoneSearch || lead.phone)],
  ['Captador responsavel', (lead) => lead.capturedByName],
  ['ID do captador', (lead) => lead.capturedByUid],
  ['Unidade / loja', (lead) => storeName(lead.storeId)],
  ['Data da captacao', (lead) => datePart(lead.capturedAtClient)],
  ['Horario da captacao', (lead) => timePart(lead.capturedAtClient)],
  ['Data do pre-agendamento', (lead) => inputDatePart(lead.appointmentDate)],
  ['Horario do pre-agendamento', (lead) => lead.appointmentTime],
  ['Interesse principal', (lead) => lead.interestLabel],
  ['Bairro', (lead) => lead.neighborhood],
  ['Cidade', (lead) => lead.city],
  ['UF', (lead) => lead.state],
  ['Origem do lead', (lead) => sourceName(lead.source)],
  ['Observacoes', (lead) => lead.notes]
];

function protectSpreadsheetFormula(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const safeValue = protectSpreadsheetFormula(value).replaceAll('"', '""');
  return `"${safeValue}"`;
}

export function createLeadsCsv(leads) {
  const header = CSV_COLUMNS.map(([label]) => csvCell(label)).join(';');
  const rows = leads.map((lead) => CSV_COLUMNS
    .map(([, getValue]) => csvCell(getValue(lead)))
    .join(';'));
  return `\uFEFF${[header, ...rows].join('\r\n')}`;
}

export function downloadLeadsCsv(leads, startDate, endDate) {
  const blob = new Blob([createLeadsCsv(leads)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fascinlead-detalhado-${startDate}-a-${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
