import { DEFAULT_STORE_SCHEDULE } from './schedule.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function followUpAvailableAt(lead, noShowGraceMinutes = DEFAULT_STORE_SCHEDULE.noShowGraceMinutes) {
  if (!DATE_PATTERN.test(lead?.appointmentDate || '') || !TIME_PATTERN.test(lead?.appointmentTime || '')) return null;
  const appointment = new Date(`${lead.appointmentDate}T${lead.appointmentTime}:00`);
  if (Number.isNaN(appointment.getTime())) return null;
  appointment.setMinutes(appointment.getMinutes() + Number(noShowGraceMinutes || 0));
  return appointment;
}

export function missedFollowUps(leads, profile, settings = DEFAULT_STORE_SCHEDULE, now = new Date()) {
  if (profile?.role !== 'captor') return [];
  const grace = Number(settings?.noShowGraceMinutes ?? DEFAULT_STORE_SCHEDULE.noShowGraceMinutes);
  return leads
    .filter((lead) => lead.capturedByUid === profile.uid && lead.appointmentAttendance === 'missed')
    .filter((lead) => {
      const availableAt = followUpAvailableAt(lead, grace);
      return availableAt && availableAt.getTime() <= now.getTime();
    })
    .sort((a, b) => String(b.appointmentDate || '').localeCompare(String(a.appointmentDate || ''))
      || String(b.appointmentTime || '').localeCompare(String(a.appointmentTime || '')));
}

export function buildWhatsAppFollowUpUrl(lead) {
  const phone = String(lead?.phone || lead?.phoneSearch || '').replace(/\D/g, '');
  if (!phone) return '';
  const internationalPhone = phone.startsWith('55') ? phone : `55${phone}`;
  const customerName = String(lead?.preferredName || lead?.fullName || '').trim();
  const greeting = customerName ? `Ola, ${customerName}!` : 'Ola!';
  const message = `${greeting} Sentimos sua falta no horario agendado. Voce gostaria de reagendar seu atendimento?`;
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
}
