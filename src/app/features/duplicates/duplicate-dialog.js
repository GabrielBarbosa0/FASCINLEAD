import { formatBrazilianPhone } from '../../../utils/phone.js';
import { escapeHtml, formatAppointmentDate, storeLabel } from '../../shared/formatters.js';
import { DUPLICATE_MATCH, hasBlockingDuplicate } from './duplicate-detector.js';

function matchLabel(candidate) {
  return candidate.matches
    .map((id) => Object.values(DUPLICATE_MATCH).find((match) => match.id === id)?.label)
    .filter(Boolean)
    .join(' · ');
}

export function duplicateDialog({ open = false, loading = false, error = '', candidates = [] } = {}) {
  if (!open) return '';
  const blocking = hasBlockingDuplicate(candidates);
  const content = loading
    ? '<p class="duplicate-dialog-empty">Pesquisando cadastros existentes...</p>'
    : error
      ? `<p class="duplicate-dialog-empty">${escapeHtml(error)}</p>`
      : candidates.map((lead) => `<article class="duplicate-candidate">
        <div><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))} · ${escapeHtml(storeLabel(lead.storeId))}</span><small>${escapeHtml(matchLabel(lead))}</small></div>
        <div><span>${lead.appointmentDate ? `Agendado: ${escapeHtml(formatAppointmentDate(lead.appointmentDate))}, ${escapeHtml(lead.appointmentTime)}` : 'Sem agendamento'}</span><button class="button button-secondary" type="button" data-duplicate-open="${escapeHtml(lead.id)}">Abrir cadastro</button></div>
      </article>`).join('') || '<p class="duplicate-dialog-empty">Nenhum cadastro correspondente foi encontrado.</p>';
  return `<dialog id="duplicate-dialog" class="confirmation-dialog duplicate-dialog" aria-labelledby="duplicate-dialog-title">
    <div class="confirmation-dialog-copy"><span class="eyebrow">VERIFICACAO DE DUPLICIDADE</span><h2 id="duplicate-dialog-title">Possiveis cadastros existentes</h2><p>${blocking ? 'Este CPF ja possui um cadastro. Abra o registro para consultar ou reagendar.' : 'Revise os registros encontrados antes de criar outro cadastro.'}</p></div>
    <div class="duplicate-candidates">${content}</div>
    <div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-duplicate-close>Voltar</button>${blocking ? '' : '<button class="button button-primary" type="button" data-duplicate-continue>Continuar como novo</button>'}</div>
  </dialog>`;
}
