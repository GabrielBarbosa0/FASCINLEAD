export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function normalizeBrazilianPhone(value) {
  let digits = onlyDigits(value);

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) return null;

  return {
    e164: `+55${digits}`,
    search: digits,
    formatted: formatBrazilianPhone(digits)
  };
}

export function formatBrazilianPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return '';

  const areaCode = digits.slice(0, 2);
  const firstPart = digits.length === 11 ? digits.slice(2, 7) : digits.slice(2, 6);
  const lastPart = digits.length === 11 ? digits.slice(7) : digits.slice(6);

  if (digits.length < 3) return `(${areaCode}`;
  if (!lastPart) return `(${areaCode}) ${firstPart}`;
  return `(${areaCode}) ${firstPart}-${lastPart}`;
}
