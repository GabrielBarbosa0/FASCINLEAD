import { formatBrazilianPhone } from '../../../utils/phone.js';
import { escapeHtml, formatCapturedAt, storeLabel } from '../../shared/formatters.js';

export function reportToolbar({ permissions, adminView, recordCount }) {
  return `<section class="management-heading management-dashboard-heading management-toolbar"><div class="management-heading-actions">
    ${permissions.appointments ? '<button class="button button-secondary" type="button" data-route="appointments"><i data-lucide="calendar-days"></i><span>Agenda de exames</span></button>' : ''}
    ${permissions.followUps ? '<button class="button button-secondary" type="button" data-route="follow-ups"><i data-lucide="bell-ring"></i><span>Retornos da equipe</span></button>' : ''}
    ${adminView ? '<button class="button button-secondary" type="button" data-route="settings"><i data-lucide="settings"></i><span>Configurações</span></button><button class="button button-secondary" type="button" data-route="access"><i data-lucide="user-round-cog"></i><span>Gerenciar acessos</span></button>' : ''}
    ${permissions.dashboard ? '<button class="button button-secondary" type="button" data-route="dashboard"><i data-lucide="bar-chart-3"></i><span>Dashboard</span></button>' : ''}
    ${permissions.kanban ? '<button class="button button-secondary" type="button" data-route="kanban"><i data-lucide="layout-dashboard"></i><span>Kanban</span></button>' : ''}
    ${permissions.export ? `<button class="button button-secondary" type="button" data-action="export-management" ${recordCount === 0 ? 'disabled' : ''}><i data-lucide="file-down"></i><span>Exportar CSV</span></button>` : ''}
  </div></section>`;
}

export function paginateReportRecords(records, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return {
    currentPage,
    totalPages,
    pageRecords: records.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  };
}

function reportLeadIdentity(lead, adminView, compact = false) {
  const name = escapeHtml(lead.fullName);
  const phone = escapeHtml(formatBrazilianPhone(lead.phoneSearch));
  return adminView
    ? `<button class="management-lead-link" type="button" data-management-lead-id="${escapeHtml(lead.id)}"><strong>${name}</strong><${compact ? 'span' : 'small'}>${phone}</${compact ? 'span' : 'small'}></button>`
    : `<strong>${name}</strong><${compact ? 'span' : 'small'}>${phone}</${compact ? 'span' : 'small'}>`;
}

export function reportResultsView({ records, loaded, adminView, currentPage, totalPages, totalRecords }) {
  if (!records.length) {
    return `<div class="empty-state management-empty"><i data-lucide="bar-chart-3"></i><strong>${loaded ? 'Nenhum cadastro no período' : 'Consulte as captações'}</strong><p>${loaded ? 'Ajuste os filtros para ampliar a busca.' : 'Escolha o período e carregue os resultados.'}</p></div>`;
  }

  const tableRows = records.map((lead) => `<tr><td>${reportLeadIdentity(lead, adminView)}</td><td>${escapeHtml(lead.capturedByName || 'Não informado')}</td><td>${escapeHtml(storeLabel(lead.storeId))}</td><td>${escapeHtml(lead.interestLabel || 'Não informado')}</td><td>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</td></tr>`).join('');
  const mobileRows = records.map((lead) => `<article class="management-card"><div>${reportLeadIdentity(lead, adminView, true)}</div><dl><div><dt>Captador</dt><dd>${escapeHtml(lead.capturedByName || 'Não informado')}</dd></div><div><dt>Loja</dt><dd>${escapeHtml(storeLabel(lead.storeId))}</dd></div><div><dt>Captado em</dt><dd>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</dd></div></dl></article>`).join('');

  return `<div class="management-table-wrap"><table class="management-table"><thead><tr><th>Lead</th><th>Captador</th><th>Loja</th><th>Interesse</th><th>Captado em</th></tr></thead><tbody>${tableRows}</tbody></table></div>
    <div class="management-mobile-list">${mobileRows}</div>
    <div class="pagination"><span>${totalRecords} registro(s)</span><div><button class="button button-secondary" type="button" data-management-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button><strong>${currentPage} de ${totalPages}</strong><button class="button button-secondary" type="button" data-management-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button></div></div>`;
}

export function reportMetricsView(records) {
  return `<section class="management-metrics" aria-label="Resumo do período">
    <div><i data-lucide="clipboard-list"></i><span>Leads encontrados</span><strong>${records.length}</strong></div>
    <div><i data-lucide="users"></i><span>Captadores</span><strong>${new Set(records.map((lead) => lead.capturedByUid)).size}</strong></div>
    <div><i data-lucide="building-2"></i><span>Lojas</span><strong>${new Set(records.map((lead) => lead.storeId)).size}</strong></div>
  </section>`;
}

export function reportNoticesView({ error, truncated, queryLimit }) {
  return `${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A consulta atingiu o limite de ${queryLimit} registros. Reduza o período para obter a lista completa.</span></div>` : ''}`;
}
