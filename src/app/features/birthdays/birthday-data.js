export const BIRTHDAY_BENEFIT_TYPES = Object.freeze([
  { id: 'voucher', label: 'Voucher' },
  { id: 'cashback', label: 'Cashback' }
]);

export const DEFAULT_BIRTHDAY_CAMPAIGN = Object.freeze({
  enabled: false,
  lookAheadDays: 7,
  benefitType: 'voucher',
  benefitValue: 0
});

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}

export function birthdayMonthDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return '';
  const [, , month, day] = match;
  const candidate = new Date(Date.UTC(2024, Number(month) - 1, Number(day)));
  if (candidate.getUTCMonth() + 1 !== Number(month) || candidate.getUTCDate() !== Number(day)) return '';
  return `${month}-${day}`;
}

function birthdayKeyForDate(date) {
  const monthDay = `${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
  return monthDay === '02-28' && date.getFullYear() % 4 !== 0 ? ['02-28', '02-29'] : [monthDay];
}

export function upcomingBirthdays(leads = [], { today = new Date(), lookAheadDays = DEFAULT_BIRTHDAY_CAMPAIGN.lookAheadDays } = {}) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const totalDays = Math.max(0, Math.min(Number(lookAheadDays) || 0, 31));
  const entries = [];

  for (let daysUntil = 0; daysUntil <= totalDays; daysUntil += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + daysUntil);
    const allowedMonthDays = birthdayKeyForDate(date);
    leads.forEach((lead) => {
      const monthDay = String(lead.birthMonthDay || birthdayMonthDay(lead.birthDate));
      if (!allowedMonthDays.includes(monthDay)) return;
      entries.push({
        lead,
        daysUntil,
        birthdayDate: localDateKey(date),
        birthdayMonthDay: monthDay
      });
    });
  }

  return entries.sort((first, second) => first.daysUntil - second.daysUntil
    || String(first.lead.fullName || '').localeCompare(String(second.lead.fullName || ''), 'pt-BR'));
}

export function birthdayBenefitLabel(type, value) {
  const label = BIRTHDAY_BENEFIT_TYPES.find((item) => item.id === type)?.label || 'Beneficio';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return label;
  return `${label} de R$ ${amount.toFixed(2).replace('.', ',')}`;
}
