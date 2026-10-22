export const DEFAULT_STORE_SCHEDULE = Object.freeze({
  schedulingMode: 'controlled',
  appointmentDurationMinutes: 20,
  noShowGraceMinutes: 30,
  automaticPendingFollowUp: false,
  showAmetropiaFields: false,
  limitedDaysEnabled: false,
  limitedWeekdays: Object.freeze([3, 6]),
  limitedDayCapacity: 10,
  meiDailyQuota: 2,
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

function timeToMinutes(value) {
  if (!TIME_PATTERN.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function normalizeStoreSchedule(value = {}) {
  const duration = Number(value.appointmentDurationMinutes);
  const noShowGrace = Number(value.noShowGraceMinutes);
  const limitedDayCapacity = Number(value.limitedDayCapacity);
  const meiDailyQuota = Number(value.meiDailyQuota);
  const limitedWeekdays = Array.isArray(value.limitedWeekdays)
    ? [...new Set(value.limitedWeekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [...DEFAULT_STORE_SCHEDULE.limitedWeekdays];
  const opening = TIME_PATTERN.test(value.openingTime || '') ? value.openingTime : DEFAULT_STORE_SCHEDULE.openingTime;
  const closing = TIME_PATTERN.test(value.closingTime || '') ? value.closingTime : DEFAULT_STORE_SCHEDULE.closingTime;
  return {
    schedulingMode: value.schedulingMode === 'free' ? 'free' : 'controlled',
    appointmentDurationMinutes: Number.isInteger(duration) && duration >= 5 && duration <= 180
      ? duration
      : DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes,
    noShowGraceMinutes: Number.isInteger(noShowGrace) && noShowGrace >= 0 && noShowGrace <= 240
      ? noShowGrace
      : DEFAULT_STORE_SCHEDULE.noShowGraceMinutes,
    automaticPendingFollowUp: value.automaticPendingFollowUp === true || value.automaticPendingFollowUp === 'true',
    showAmetropiaFields: value.showAmetropiaFields === true || value.showAmetropiaFields === 'true',
    limitedDaysEnabled: value.limitedDaysEnabled === true || value.limitedDaysEnabled === 'true',
    limitedWeekdays,
    limitedDayCapacity: Number.isInteger(limitedDayCapacity) && limitedDayCapacity >= 1 && limitedDayCapacity <= 100
      ? limitedDayCapacity
      : DEFAULT_STORE_SCHEDULE.limitedDayCapacity,
    meiDailyQuota: Number.isInteger(meiDailyQuota) && meiDailyQuota >= 1 && meiDailyQuota <= 100
      ? meiDailyQuota
      : DEFAULT_STORE_SCHEDULE.meiDailyQuota,
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
  const limitedDaysEnabled = value.limitedDaysEnabled === true || value.limitedDaysEnabled === 'true';
  const limitedWeekdays = Array.isArray(value.limitedWeekdays) ? value.limitedWeekdays.map(Number) : [];
  const limitedDayCapacity = Number(value.limitedDayCapacity);
  const meiDailyQuota = Number(value.meiDailyQuota);
  const opening = timeToMinutes(value.openingTime);
  const closing = timeToMinutes(value.closingTime);

  if (!Number.isInteger(rawDuration) || rawDuration < 5 || rawDuration > 180) {
    errors.appointmentDurationMinutes = 'Informe uma duracao entre 5 e 180 minutos.';
  }
  if (!Number.isInteger(rawNoShowGrace) || rawNoShowGrace < 0 || rawNoShowGrace > 240) {
    errors.noShowGraceMinutes = 'Informe uma tolerancia entre 0 e 240 minutos.';
  }
  if (opening === null) errors.openingTime = 'Informe um horario inicial valido.';
  if (closing === null) errors.closingTime = 'Informe um horario final valido.';
  if (opening !== null && closing !== null && opening >= closing) {
    errors.closingTime = 'O encerramento deve ser depois da abertura.';
  }
  if (opening !== null && closing !== null && closing - opening < schedule.appointmentDurationMinutes) {
    errors.closingTime = 'O expediente precisa comportar pelo menos uma consulta.';
  }
  if (limitedDaysEnabled && !limitedWeekdays.length) {
    errors.limitedWeekdays = 'Escolha pelo menos um dia com vagas limitadas.';
  }
  if (limitedDaysEnabled && (!Number.isInteger(limitedDayCapacity) || limitedDayCapacity < 1 || limitedDayCapacity > 100)) {
    errors.limitedDayCapacity = 'Informe um limite entre 1 e 100 vagas.';
  }
  if (limitedDaysEnabled && (!Number.isInteger(meiDailyQuota) || meiDailyQuota < 1 || meiDailyQuota > limitedDayCapacity)) {
    errors.meiDailyQuota = 'A cota do MEI deve ficar entre 1 e o limite total do dia.';
  }

  return { data: schedule, errors, isValid: Object.keys(errors).length === 0 };
}

function weekdayFromDate(appointmentDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate || '')) return null;
  const date = new Date(`${appointmentDate}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getDay();
}

export function appointmentQuotaStatus(settings, appointmentDate, appointments = [], profile = null, ignoredLeadId = '') {
  const schedule = normalizeStoreSchedule(settings);
  const weekday = weekdayFromDate(appointmentDate);
  const limited = schedule.limitedDaysEnabled && weekday !== null && schedule.limitedWeekdays.includes(weekday);
  const activeAppointments = appointments.filter((appointment) => appointment.id !== ignoredLeadId);
  const dailyUsed = activeAppointments.length;
  const isMei = profile?.roleProfileId === 'system-mei';
  const meiUsed = isMei
    ? activeAppointments.filter((appointment) => appointment.capturedByUid === profile?.uid).length
    : 0;
  const dailyRemaining = limited ? Math.max(0, schedule.limitedDayCapacity - dailyUsed) : null;
  const meiRemaining = limited && isMei ? Math.max(0, schedule.meiDailyQuota - meiUsed) : null;
  const dailyBlocked = limited && dailyRemaining === 0;
  const meiBlocked = limited && isMei && meiRemaining === 0;
  return {
    limited,
    isMei,
    dailyUsed,
    dailyRemaining,
    meiUsed,
    meiRemaining,
    blocked: dailyBlocked || meiBlocked,
    reason: dailyBlocked ? 'daily-limit' : meiBlocked ? 'mei-quota' : ''
  };
}

export function buildAppointmentSlots(settings, appointments = [], ignoredLeadId = '', context = {}) {
  const schedule = normalizeStoreSchedule(settings);
  if (schedule.schedulingMode === 'free') return [];

  const start = timeToMinutes(schedule.openingTime);
  const end = timeToMinutes(schedule.closingTime);
  const duration = schedule.appointmentDurationMinutes;
  const quota = appointmentQuotaStatus(
    schedule,
    context.appointmentDate,
    appointments,
    context.profile,
    ignoredLeadId
  );
  const occupiedRanges = appointments
    .filter((appointment) => appointment.id !== ignoredLeadId)
    .map((appointment) => {
      const appointmentStart = timeToMinutes(appointment.appointmentTime);
      const appointmentDuration = Number(appointment.durationMinutes)
        || Number(appointment.appointmentDurationMinutes)
        || duration;
      return appointmentStart === null ? null : [appointmentStart, appointmentStart + appointmentDuration];
    })
    .filter(Boolean);

  const slots = [];
  for (let slotStart = start; slotStart + duration <= end; slotStart += duration) {
    const slotEnd = slotStart + duration;
    const occupied = occupiedRanges.some(([appointmentStart, appointmentEnd]) => (
      appointmentStart < slotEnd && appointmentEnd > slotStart
    ));
    slots.push({
      time: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      available: !occupied && !quota.blocked
    });
  }
  return slots;
}
