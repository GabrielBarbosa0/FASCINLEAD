export const DEFAULT_STORE_SCHEDULE = Object.freeze({
  schedulingMode: 'controlled',
  appointmentDurationMinutes: 20,
  noShowGraceMinutes: 30,
  automaticPendingFollowUp: false,
  openingTime: '08:00',
  closingTime: '18:00'
});

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

  return { data: schedule, errors, isValid: Object.keys(errors).length === 0 };
}

export function buildAppointmentSlots(settings, appointments = [], ignoredLeadId = '') {
  const schedule = normalizeStoreSchedule(settings);
  if (schedule.schedulingMode === 'free') return [];

  const start = timeToMinutes(schedule.openingTime);
  const end = timeToMinutes(schedule.closingTime);
  const duration = schedule.appointmentDurationMinutes;
  const occupiedRanges = appointments
    .filter((appointment) => appointment.id !== ignoredLeadId)
    .map((appointment) => {
      const appointmentStart = timeToMinutes(appointment.appointmentTime);
      const appointmentDuration = Number(appointment.durationMinutes) || duration;
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
      available: !occupied
    });
  }
  return slots;
}
