export const DEFAULT_STORE_SCHEDULE = Object.freeze({
  schedulingMode: 'controlled',
  appointmentDurationMinutes: 20,
  noShowGraceMinutes: 5,
  rescheduleAfterMinutes: 30,
  automaticPendingFollowUp: false,
  showAmetropiaFields: false,
  limitedDaysEnabled: false,
  limitedWeekdays: Object.freeze([3, 6]),
  limitedDayCapacity: 10,
  limitedDayRules: Object.freeze([
    Object.freeze({ weekday: 3, capacity: 10 }),
    Object.freeze({ weekday: 6, capacity: 10 })
  ]),
  meiDailyQuota: 2,
  meiQuotaEnabled: false,
  meiQuotaWeekdays: Object.freeze([3, 6]),
  meiMorningQuota: 1,
  meiAfternoonQuota: 1,
  meiQuotaRules: Object.freeze([
    Object.freeze({ weekday: 3, morningQuota: 1, afternoonQuota: 1 }),
    Object.freeze({ weekday: 6, morningQuota: 1, afternoonQuota: 1 })
  ]),
  openingTime: '08:00',
  closingTime: '18:00'
});

export const WEEKDAY_OPTIONS = Object.freeze([
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terca' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sabado' }
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const APPOINTMENT_BLOCK_MINUTES = 10;

function timeToMinutes(value) {
  if (!TIME_PATTERN.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function appointmentBlockTimes(appointmentTime, durationMinutes) {
  const start = timeToMinutes(appointmentTime);
  const duration = Number(durationMinutes);
  if (start === null || !Number.isFinite(duration) || duration <= 0) return [];
  const blockCount = Math.ceil(duration / APPOINTMENT_BLOCK_MINUTES);
  return Array.from({ length: blockCount }, (_, index) => (
    minutesToTime(start + (index * APPOINTMENT_BLOCK_MINUTES))
  ));
}

export function appointmentSlotId(storeId, appointmentDate, blockTime) {
  return `slot-${storeId}-${appointmentDate}-${blockTime}`;
}

function normalizeLimitedDayRules(value, legacyWeekdays, legacyCapacity) {
  const source = Array.isArray(value)
    ? value
    : legacyWeekdays.map((weekday) => ({ weekday, capacity: legacyCapacity }));
  const byWeekday = new Map();
  source.forEach((rule) => {
    const weekday = Number(rule?.weekday);
    const capacity = Number(rule?.capacity);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return;
    byWeekday.set(weekday, { weekday, capacity });
  });
  return [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday);
}

function normalizeMeiQuotaRules(value, legacyWeekdays, morningQuota, afternoonQuota) {
  const source = Array.isArray(value)
    ? value
    : legacyWeekdays.map((weekday) => ({ weekday, morningQuota, afternoonQuota }));
  const byWeekday = new Map();
  source.forEach((rule) => {
    const weekday = Number(rule?.weekday);
    const morning = Number(rule?.morningQuota);
    const afternoon = Number(rule?.afternoonQuota);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    if (!Number.isInteger(morning) || morning < 0 || morning > 100) return;
    if (!Number.isInteger(afternoon) || afternoon < 0 || afternoon > 100 || morning + afternoon < 1) return;
    byWeekday.set(weekday, { weekday, morningQuota: morning, afternoonQuota: afternoon });
  });
  return [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday);
}

export function normalizeStoreSchedule(value = {}) {
  const duration = Number(value.appointmentDurationMinutes);
  const noShowGrace = Number(value.noShowGraceMinutes);
  const normalizedNoShowGrace = Number.isInteger(noShowGrace) && noShowGrace >= 0 && noShowGrace <= 240
    ? noShowGrace
    : DEFAULT_STORE_SCHEDULE.noShowGraceMinutes;
  const rescheduleAfter = Number(value.rescheduleAfterMinutes);
  const normalizedRescheduleAfter = Number.isInteger(rescheduleAfter)
    && rescheduleAfter > normalizedNoShowGrace
    && rescheduleAfter <= 1440
    ? rescheduleAfter
    : Math.max(DEFAULT_STORE_SCHEDULE.rescheduleAfterMinutes, normalizedNoShowGrace + 5);
  const limitedDayCapacity = Number(value.limitedDayCapacity);
  const meiDailyQuota = Number(value.meiDailyQuota);
  const legacyMeiQuota = Number.isInteger(meiDailyQuota) && meiDailyQuota >= 1 && meiDailyQuota <= 100
    ? meiDailyQuota
    : DEFAULT_STORE_SCHEDULE.meiDailyQuota;
  const meiMorningQuota = Number(value.meiMorningQuota);
  const meiAfternoonQuota = Number(value.meiAfternoonQuota);
  const limitedWeekdays = Array.isArray(value.limitedWeekdays)
    ? [...new Set(value.limitedWeekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [...DEFAULT_STORE_SCHEDULE.limitedWeekdays];
  const meiQuotaWeekdays = Array.isArray(value.meiQuotaWeekdays)
    ? [...new Set(value.meiQuotaWeekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [...limitedWeekdays];
  const normalizedMeiMorningQuota = Number.isInteger(meiMorningQuota) && meiMorningQuota >= 0 && meiMorningQuota <= 100
    ? meiMorningQuota
    : Math.ceil(legacyMeiQuota / 2);
  const normalizedMeiAfternoonQuota = Number.isInteger(meiAfternoonQuota) && meiAfternoonQuota >= 0 && meiAfternoonQuota <= 100
    ? meiAfternoonQuota
    : Math.floor(legacyMeiQuota / 2);
  const hasPeriodQuotas = Number.isInteger(meiMorningQuota) && Number.isInteger(meiAfternoonQuota);
  const normalizedLimitedDayCapacity = Number.isInteger(limitedDayCapacity) && limitedDayCapacity >= 1 && limitedDayCapacity <= 100
    ? limitedDayCapacity
    : DEFAULT_STORE_SCHEDULE.limitedDayCapacity;
  const limitedDayRules = normalizeLimitedDayRules(value.limitedDayRules, limitedWeekdays, normalizedLimitedDayCapacity);
  const meiQuotaRules = normalizeMeiQuotaRules(
    value.meiQuotaRules,
    meiQuotaWeekdays,
    normalizedMeiMorningQuota,
    normalizedMeiAfternoonQuota
  );
  const primaryLimitedRule = limitedDayRules[0];
  const primaryMeiRule = meiQuotaRules[0];
  const opening = TIME_PATTERN.test(value.openingTime || '') ? value.openingTime : DEFAULT_STORE_SCHEDULE.openingTime;
  const closing = TIME_PATTERN.test(value.closingTime || '') ? value.closingTime : DEFAULT_STORE_SCHEDULE.closingTime;
  return {
    schedulingMode: value.schedulingMode === 'free' ? 'free' : 'controlled',
    appointmentDurationMinutes: Number.isInteger(duration) && duration >= 5 && duration <= 180
      ? duration
      : DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes,
    noShowGraceMinutes: normalizedNoShowGrace,
    rescheduleAfterMinutes: normalizedRescheduleAfter,
    automaticPendingFollowUp: value.automaticPendingFollowUp === true || value.automaticPendingFollowUp === 'true',
    showAmetropiaFields: value.showAmetropiaFields === true || value.showAmetropiaFields === 'true',
    limitedDaysEnabled: value.limitedDaysEnabled === true || value.limitedDaysEnabled === 'true',
    limitedDayRules,
    limitedWeekdays: limitedDayRules.map((rule) => rule.weekday),
    limitedDayCapacity: primaryLimitedRule?.capacity || normalizedLimitedDayCapacity,
    meiDailyQuota: primaryMeiRule
      ? primaryMeiRule.morningQuota + primaryMeiRule.afternoonQuota
      : hasPeriodQuotas ? normalizedMeiMorningQuota + normalizedMeiAfternoonQuota : legacyMeiQuota,
    meiQuotaEnabled: value.meiQuotaEnabled === undefined
      ? value.limitedDaysEnabled === true || value.limitedDaysEnabled === 'true'
      : value.meiQuotaEnabled === true || value.meiQuotaEnabled === 'true',
    meiQuotaRules,
    meiQuotaWeekdays: meiQuotaRules.map((rule) => rule.weekday),
    meiMorningQuota: primaryMeiRule?.morningQuota ?? normalizedMeiMorningQuota,
    meiAfternoonQuota: primaryMeiRule?.afternoonQuota ?? normalizedMeiAfternoonQuota,
    openingTime: opening,
    closingTime: closing
  };
}

export function validateStoreSchedule(value) {
  const errors = {};
  const schedule = normalizeStoreSchedule(value);
  const rawDuration = Number(value.appointmentDurationMinutes);
  const rawNoShowGrace = value.noShowGraceMinutes === undefined
    ? DEFAULT_STORE_SCHEDULE.noShowGraceMinutes
    : Number(value.noShowGraceMinutes);
  const rawRescheduleAfter = value.rescheduleAfterMinutes === undefined
    ? schedule.rescheduleAfterMinutes
    : Number(value.rescheduleAfterMinutes);
  const limitedDaysEnabled = value.limitedDaysEnabled === true || value.limitedDaysEnabled === 'true';
  const limitedDayRules = Array.isArray(value.limitedDayRules)
    ? value.limitedDayRules
    : normalizeLimitedDayRules(undefined, Array.isArray(value.limitedWeekdays) ? value.limitedWeekdays.map(Number) : [], Number(value.limitedDayCapacity));
  const meiQuotaEnabled = value.meiQuotaEnabled === true || value.meiQuotaEnabled === 'true';
  const meiQuotaRules = Array.isArray(value.meiQuotaRules)
    ? value.meiQuotaRules
    : normalizeMeiQuotaRules(
      undefined,
      Array.isArray(value.meiQuotaWeekdays) ? value.meiQuotaWeekdays.map(Number) : [],
      Number(value.meiMorningQuota),
      Number(value.meiAfternoonQuota)
    );
  const opening = timeToMinutes(value.openingTime);
  const closing = timeToMinutes(value.closingTime);

  if (!Number.isInteger(rawDuration) || rawDuration < 5 || rawDuration > 180) {
    errors.appointmentDurationMinutes = 'Informe uma duracao entre 5 e 180 minutos.';
  }
  if (!Number.isInteger(rawNoShowGrace) || rawNoShowGrace < 0 || rawNoShowGrace > 240) {
    errors.noShowGraceMinutes = 'Informe um alerta entre 0 e 240 minutos.';
  }
  if (!Number.isInteger(rawRescheduleAfter) || rawRescheduleAfter < 1 || rawRescheduleAfter > 1440) {
    errors.rescheduleAfterMinutes = 'Informe um prazo entre 1 e 1440 minutos.';
  } else if (Number.isInteger(rawNoShowGrace) && rawNoShowGrace >= 0 && rawNoShowGrace <= 240
    && rawRescheduleAfter <= rawNoShowGrace) {
    errors.rescheduleAfterMinutes = 'O reagendamento deve ser sugerido depois do alerta de atraso.';
  }
  if (opening === null) errors.openingTime = 'Informe um horario inicial valido.';
  if (closing === null) errors.closingTime = 'Informe um horario final valido.';
  if (opening !== null && closing !== null && opening >= closing) {
    errors.closingTime = 'O encerramento deve ser depois da abertura.';
  }
  if (opening !== null && closing !== null && closing - opening < schedule.appointmentDurationMinutes) {
    errors.closingTime = 'O expediente precisa comportar pelo menos uma consulta.';
  }
  const validLimitedRules = normalizeLimitedDayRules(limitedDayRules, [], 0);
  const validMeiRules = normalizeMeiQuotaRules(meiQuotaRules, [], 0, 0);
  if (limitedDaysEnabled && (!limitedDayRules.length || validLimitedRules.length !== limitedDayRules.length)) {
    errors.limitedDayRules = 'Configure ao menos um dia com limite entre 1 e 100 vagas.';
  }
  if (meiQuotaEnabled && (!meiQuotaRules.length || validMeiRules.length !== meiQuotaRules.length)) {
    errors.meiQuotaRules = 'Configure ao menos um dia com cotas validas para manha e tarde.';
  }

  return { data: schedule, errors, isValid: Object.keys(errors).length === 0 };
}

function weekdayFromDate(appointmentDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate || '')) return null;
  const date = new Date(`${appointmentDate}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getDay();
}

export function appointmentQuotaStatus(settings, appointmentDate, appointments = [], profile = null, ignoredLeadId = '', appointmentTime = '') {
  const schedule = normalizeStoreSchedule(settings);
  const weekday = weekdayFromDate(appointmentDate);
  const limitedRule = schedule.limitedDayRules.find((rule) => rule.weekday === weekday);
  const meiRule = schedule.meiQuotaRules.find((rule) => rule.weekday === weekday);
  const limited = schedule.limitedDaysEnabled && Boolean(limitedRule);
  const uniqueAppointments = new Map();
  appointments.forEach((appointment) => {
    const appointmentKey = appointment.leadId || appointment.id;
    if (!appointmentKey || appointmentKey === ignoredLeadId || appointment.id === ignoredLeadId) return;
    if (!uniqueAppointments.has(appointmentKey)) uniqueAppointments.set(appointmentKey, appointment);
  });
  const activeAppointments = [...uniqueAppointments.values()];
  const dailyUsed = activeAppointments.length;
  const isMei = profile?.roleProfileId === 'system-mei';
  const meiDayAllowed = !isMei || !schedule.meiQuotaEnabled || Boolean(meiRule);
  const meiLimited = schedule.meiQuotaEnabled && isMei && Boolean(meiRule);
  const meiAppointments = isMei
    ? activeAppointments.filter((appointment) => appointment.capturedByUid === profile?.uid)
    : [];
  const meiMorningUsed = meiAppointments.filter((appointment) => (timeToMinutes(appointment.appointmentTime) ?? 720) < 720).length;
  const meiAfternoonUsed = meiAppointments.length - meiMorningUsed;
  const appointmentMinutes = timeToMinutes(appointmentTime);
  const meiPeriod = appointmentMinutes === null ? '' : appointmentMinutes < 720 ? 'morning' : 'afternoon';
  const meiMorningRemaining = meiLimited ? Math.max(0, meiRule.morningQuota - meiMorningUsed) : null;
  const meiAfternoonRemaining = meiLimited ? Math.max(0, meiRule.afternoonQuota - meiAfternoonUsed) : null;
  const meiUsed = meiMorningUsed + meiAfternoonUsed;
  const dailyRemaining = limited ? Math.max(0, limitedRule.capacity - dailyUsed) : null;
  const meiRemaining = meiLimited
    ? (meiMorningRemaining + meiAfternoonRemaining)
    : null;
  const dailyBlocked = limited && dailyRemaining === 0;
  const meiBlocked = meiLimited && (
    (meiPeriod === 'morning' && meiMorningRemaining === 0)
    || (meiPeriod === 'afternoon' && meiAfternoonRemaining === 0)
    || (!meiPeriod && meiMorningRemaining === 0 && meiAfternoonRemaining === 0)
  );
  return {
    limited,
    isMei,
    meiLimited,
    dailyUsed,
    dailyRemaining,
    meiUsed,
    meiRemaining,
    meiMorningUsed,
    meiMorningRemaining,
    meiAfternoonUsed,
    meiAfternoonRemaining,
    meiPeriod,
    meiDayAllowed,
    blocked: dailyBlocked || !meiDayAllowed || meiBlocked,
    reason: dailyBlocked ? 'daily-limit' : !meiDayAllowed ? 'mei-day-not-allowed' : meiBlocked ? 'mei-quota' : ''
  };
}

export function buildAppointmentSlots(settings, appointments = [], ignoredLeadId = '', context = {}) {
  const schedule = normalizeStoreSchedule(settings);
  if (schedule.schedulingMode === 'free') return [];

  const start = timeToMinutes(schedule.openingTime);
  const end = timeToMinutes(schedule.closingTime);
  const duration = schedule.appointmentDurationMinutes;
  const occupiedRanges = appointments
    .filter((appointment) => appointment.id !== ignoredLeadId && appointment.leadId !== ignoredLeadId)
    .map((appointment) => {
      const blockStart = timeToMinutes(appointment.blockTime);
      if (blockStart !== null) return [blockStart, blockStart + APPOINTMENT_BLOCK_MINUTES];
      const appointmentStart = timeToMinutes(appointment.appointmentTime);
      const appointmentDuration = Number(appointment.durationMinutes)
        || Number(appointment.appointmentDurationMinutes)
        || duration;
      return appointmentStart === null ? null : [appointmentStart, appointmentStart + appointmentDuration];
    })
    .filter(Boolean);

  const slots = [];
  for (let slotStart = start; slotStart + duration <= end; slotStart += APPOINTMENT_BLOCK_MINUTES) {
    const slotEnd = slotStart + duration;
    const slotTime = minutesToTime(slotStart);
    const quota = appointmentQuotaStatus(
      schedule,
      context.appointmentDate,
      appointments,
      context.profile,
      ignoredLeadId,
      slotTime
    );
    const occupied = occupiedRanges.some(([appointmentStart, appointmentEnd]) => (
      appointmentStart < slotEnd && appointmentEnd > slotStart
    ));
    slots.push({
      time: slotTime,
      endTime: minutesToTime(slotEnd),
      available: !occupied && !quota.blocked
    });
  }
  return slots;
}
