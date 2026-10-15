import { DEFAULT_STORE_SCHEDULE } from './schedule.js';
import { canAccessStore } from './permissions.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function followUpAvailableAt(lead, noShowGraceMinutes = DEFAULT_STORE_SCHEDULE.noShowGraceMinutes) {
  if (!DATE_PATTERN.test(lead?.appointmentDate || '') || !TIME_PATTERN.test(lead?.appointmentTime || '')) return null;
  const appointment = new Date(`${lead.appointmentDate}T${lead.appointmentTime}:00`);
  if (Number.isNaN(appointment.getTime())) return null;
  appointment.setMinutes(appointment.getMinutes() + Number(noShowGraceMinutes || 0));
  return appointment;
}

export function appointmentFollowUps(leads, profile, settings = DEFAULT_STORE_SCHEDULE, now = new Date()) {
  if (!['captor', 'manager', 'admin'].includes(profile?.role)) return [];
  return leads
    .filter((lead) => profile.role === 'captor'
      ? lead.capturedByUid === profile.uid
      : profile.role === 'manager' ? canAccessStore(profile, lead.storeId) : true)
    .filter((lead) => {
      const leadSettings = settings?.byStore?.[lead.storeId] || settings;
      return lead.appointmentAttendance === 'missed'
        || (leadSettings?.automaticPendingFollowUp === true
          && (!lead.appointmentAttendance || lead.appointmentAttendance === 'pending'));
    })
    .filter((lead) => {
      const leadSettings = settings?.byStore?.[lead.storeId] || settings;
      const grace = Number(leadSettings?.noShowGraceMinutes ?? DEFAULT_STORE_SCHEDULE.noShowGraceMinutes);
      const availableAt = followUpAvailableAt(lead, grace);
      return availableAt && availableAt.getTime() <= now.getTime();
    })
    .sort((a, b) => String(b.appointmentDate || '').localeCompare(String(a.appointmentDate || ''))
      || String(b.appointmentTime || '').localeCompare(String(a.appointmentTime || '')));
}

export function followUpAppointmentKey(lead) {
  return `${lead?.appointmentDate || ''}|${lead?.appointmentTime || ''}`;
}

export function isFollowUpContacted(lead) {
  return Boolean(lead?.followUpContactedAt
    && lead.followUpContactedAppointmentKey === followUpAppointmentKey(lead));
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
