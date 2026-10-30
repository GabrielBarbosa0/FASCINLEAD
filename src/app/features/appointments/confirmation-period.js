import { addDaysToDateInput } from '../../shared/formatters.js';

export const DEFAULT_CONFIRMATION_DAYS = 7;
export const MAX_CONFIRMATION_DAYS = 90;

export function normalizeConfirmationDays(value) {
  const days = Number.parseInt(String(value), 10);
  if (!Number.isFinite(days)) return DEFAULT_CONFIRMATION_DAYS;
  return Math.min(MAX_CONFIRMATION_DAYS, Math.max(1, days));
}

export function confirmationEndDate(startDate, days) {
  return addDaysToDateInput(startDate, normalizeConfirmationDays(days) - 1);
}
