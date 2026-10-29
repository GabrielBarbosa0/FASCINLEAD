import { escapeHtml, storeLabel } from '../../shared/formatters.js';
import { serviceDialogs } from './service-dialog.js';

export function servicesView(settings) {
  const { services, saving } = settings;
  const rows = services.map((service) => `<article class="service-catalog-row ${service.active ? '' : 'is-inactive'}">
    <span class="service-catalog-icon"><i data-lucide="${service.name.toLocaleLowerCase('pt-BR').includes('limpeza') ? 'brush-cleaning' : 'stethoscope'}"></i></span>
    <div class="service-catalog-name"><strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(service.storeIds.map(storeLabel).join(' · '))}</span></div>
    <div class="service-catalog-duration"><span>Duração</span><strong>${service.durationMinutes} min</strong></div>
    <span class="status-badge status-${service.active ? 'success' : 'neutral'}">${service.active ? 'Ativo' : 'Inativo'}</span>
    <div class="service-catalog-actions">
      <button class="icon-button" type="button" data-service-edit="${escapeHtml(service.id)}" title="Editar serviço" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
      <button class="button button-secondary service-toggle-button" type="button" data-service-toggle="${escapeHtml(service.id)}" ${saving ? 'disabled' : ''}><i data-lucide="${service.active ? 'circle-x' : 'circle-check'}"></i><span>${service.active ? 'Desativar' : 'Ativar'}</span></button>
      <button class="icon-button role-delete-button" type="button" data-service-delete="${escapeHtml(service.id)}" title="Excluir serviço" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i></button>
    </div>
  </article>`).join('');

  return `<section class="service-catalog-panel">
    <div class="service-catalog-heading"><div><span class="eyebrow">AGENDA</span><h2>Serviços cadastrados</h2><p>Defina a duração dos atendimentos oferecidos em cada unidade.</p></div><button class="button button-primary" type="button" data-service-new><i data-lucide="circle-plus"></i><span>Novo serviço</span></button></div>
    ${rows ? `<div class="service-catalog-list">${rows}</div>` : '<div class="empty-state"><i data-lucide="stethoscope"></i><strong>Nenhum serviço cadastrado</strong><p>Crie o primeiro serviço da agenda.</p></div>'}
  </section>${serviceDialogs(settings)}`;
}
