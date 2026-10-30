import { FUNNEL_STAGES } from '../funnel/funnel-model.js';

const HIDDEN_STAGES = new Set(['captured', 'closed']);

export function kanbanColumns(records = []) {
  return FUNNEL_STAGES
    .filter((stage) => !HIDDEN_STAGES.has(stage.id))
    .map((stage) => ({
      ...stage,
      leads: records
        .filter((lead) => (lead.funnelStage || 'awaiting_appointment') === stage.id)
        .sort((first, second) => String(first.appointmentDate || '9999-12-31').localeCompare(String(second.appointmentDate || '9999-12-31'))
          || String(first.appointmentTime || '99:99').localeCompare(String(second.appointmentTime || '99:99'))
          || String(first.fullName || '').localeCompare(String(second.fullName || ''), 'pt-BR'))
    }));
}
