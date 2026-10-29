export const FUNNEL_STAGES = Object.freeze([
  { id: 'captured', label: 'Captado' },
  { id: 'awaiting_appointment', label: 'Aguardando agendamento' },
  { id: 'scheduled', label: 'Agendado' },
  { id: 'confirmation', label: 'Em confirmação' },
  { id: 'confirmed', label: 'Confirmado' },
  { id: 'attended', label: 'Compareceu' },
  { id: 'missed', label: 'Faltou' },
  { id: 'awaiting_reschedule', label: 'Aguardando reagendamento' },
  { id: 'cancelled', label: 'Cancelado' },
  { id: 'closed', label: 'Encerrado' }
]);

export const FUNNEL_EVENT_LABELS = Object.freeze({
  lead_created: 'Cadastro criado',
  appointment_scheduled: 'Agendamento realizado',
  appointment_rescheduled: 'Agendamento reagendado',
  appointment_cancelled: 'Agendamento cancelado',
  appointment_reminder_sent: 'Lembrete enviado',
  appointment_attended: 'Comparecimento registrado',
  appointment_missed: 'Falta registrada',
  follow_up_contacted: 'Retorno iniciado'
});

export function funnelStageLabel(stage) {
  return FUNNEL_STAGES.find((item) => item.id === stage)?.label || 'Captado';
}

export function initialFunnelStage(appointmentDate = '') {
  return appointmentDate ? 'scheduled' : 'awaiting_appointment';
}

export function leadCreationEvents(lead, profile, now = new Date()) {
  const base = {
    leadId: lead.id,
    storeId: lead.storeId,
    actorUid: profile.uid,
    actorName: String(profile.displayName || 'Usuario'),
    actorRole: String(profile.role || 'captor'),
    occurredAtClient: now.toISOString(),
    reasonCode: '',
    schemaVersion: 1
  };
  const events = [{ ...base, eventType: 'lead_created', funnelStage: 'captured' }];
  if (lead.appointmentDate && lead.appointmentTime) {
    events.push({ ...base, eventType: 'appointment_scheduled', funnelStage: 'scheduled' });
  }
  return events;
}
