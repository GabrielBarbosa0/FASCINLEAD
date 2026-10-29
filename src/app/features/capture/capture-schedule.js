import { ophthalmologyTriage } from '../../../utils/lead.js';
import {
  appointmentQuotaStatus,
  buildAppointmentSlots,
  isOphthalmologyDateAllowed,
  isOptometristDateAllowed,
  isTransportAppointmentAllowed,
  isTransportDateAllowed,
  ophthalmologyAppointmentSchedule,
  optometristAppointmentSchedule
} from '../../../utils/schedule.js';

export function careRouteAppointmentSchedule(settings, careRoute) {
  return careRoute === 'ophthalmologist'
    ? ophthalmologyAppointmentSchedule(settings)
    : optometristAppointmentSchedule(settings);
}

export function isCareRouteDateAllowed(settings, careRoute, appointmentDate) {
  return careRoute === 'ophthalmologist'
    ? isOphthalmologyDateAllowed(settings, appointmentDate)
    : isOptometristDateAllowed(settings, appointmentDate);
}

export function captureAppointmentTimeField({ scheduleState, service, profile, online = navigator.onLine }) {
  const { settings, appointmentDate, appointments, loading, error } = scheduleState;
  const triage = ophthalmologyTriage(scheduleState.triage || {}, settings);
  const needsTransport = scheduleState.triage?.needsTransport === true || scheduleState.triage?.needsTransport === 'true';
  const ophthalmologyDateBlocked = triage.careRoute === 'ophthalmologist'
    && appointmentDate
    && !isOphthalmologyDateAllowed(settings, appointmentDate);
  const optometristDateBlocked = triage.careRoute !== 'ophthalmologist'
    && appointmentDate
    && !isOptometristDateAllowed(settings, appointmentDate);
  const transportDateBlocked = needsTransport && appointmentDate && !isTransportDateAllowed(settings, appointmentDate);
  const baseSchedule = careRouteAppointmentSchedule(settings, triage.careRoute);
  const serviceSchedule = { ...baseSchedule, appointmentDurationMinutes: service.durationMinutes };
  if (!online) {
    return '<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">Conecte-se para consultar os horários</option></select><small class="field-error"></small><small class="schedule-availability">Agendamentos exigem conexão com a agenda atualizada.</small></div>';
  }
  if (ophthalmologyDateBlocked) {
    return '<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">O oftalmologista não atende neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dos dias configurados para atendimento oftalmológico.</small></div>';
  }
  if (optometristDateBlocked) {
    return '<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">O optometrista não atende neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dos dias configurados na escala do optometrista.</small></div>';
  }
  if (transportDateBlocked) {
    return '<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">Transporte indisponível neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dia configurado para transporte.</small></div>';
  }
  if (settings.schedulingMode === 'free') {
    return '<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário</label><input id="appointmentTime" name="appointmentTime" type="time" /><small class="field-error"></small></div>';
  }

  const quota = appointmentQuotaStatus(settings, appointmentDate, appointments, profile);
  const slots = appointmentDate
    ? buildAppointmentSlots(serviceSchedule, appointments, '', { appointmentDate, profile })
    : [];
  const availableSlots = slots.filter((slot) => slot.available && (!needsTransport || isTransportAppointmentAllowed(
    settings,
    appointmentDate,
    slot.time,
    service.durationMinutes
  )));
  let placeholder = 'Escolha primeiro uma data';
  if (loading) placeholder = 'Consultando horários...';
  else if (error) placeholder = 'Horários indisponíveis';
  else if (quota.reason === 'mei-day-not-allowed') placeholder = 'MEI sem cota para este dia';
  else if (quota.reason === 'mei-quota') placeholder = 'Sua cota de agendamentos foi atingida';
  else if (quota.reason === 'daily-limit') placeholder = 'Limite de vagas do dia atingido';
  else if (appointmentDate && !availableSlots.length) placeholder = triage.careRoute === 'ophthalmologist'
    ? 'Sem horários do oftalmologista neste dia'
    : 'Dia sem horários disponíveis';
  else if (appointmentDate) placeholder = 'Selecione um horário';

  const options = availableSlots
    .map((slot) => `<option value="${slot.time}">${slot.time} - ${slot.endTime}</option>`)
    .join('');
  return `<div class="field" data-field="appointmentTime">
    <label for="appointmentTime">Horário disponível</label>
    <select id="appointmentTime" name="appointmentTime" ${!appointmentDate || loading || error || !availableSlots.length ? 'disabled' : ''}>
      <option value="">${placeholder}</option>${options}
    </select>
    <small class="field-error"></small>
    ${appointmentDate && !loading && !error ? `<small class="schedule-availability">${quota.isMei && quota.meiLimited ? `Cota MEI: ${quota.meiMorningRemaining} pela manhã e ${quota.meiAfternoonRemaining} à tarde${quota.limited ? `; ${quota.dailyRemaining} vaga(s) no dia` : ''}` : quota.limited ? `${quota.dailyRemaining} vaga(s) restante(s) no dia` : `${availableSlots.length} de ${slots.length} horário(s) disponível(is)`}</small>` : ''}
  </div>`;
}
