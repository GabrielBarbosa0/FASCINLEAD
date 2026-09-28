const CSV_COLUMNS = [
  ['Data e hora', 'capturedAtClient'],
  ['Nome', 'fullName'],
  ['Telefone', 'phone'],
  ['Interesse', 'interestLabel'],
  ['Bairro', 'neighborhood'],
  ['Cidade', 'city'],
  ['UF', 'state'],
  ['Loja', 'storeId'],
  ['Captador', 'capturedByName'],
  ['Observacao', 'notes']
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
    .map(([, field]) => csvCell(lead[field]))
    .join(';'));
  return `\uFEFF${[header, ...rows].join('\r\n')}`;
}

export function downloadLeadsCsv(leads, startDate, endDate) {
  const blob = new Blob([createLeadsCsv(leads)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fascinlead-${startDate}-a-${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
