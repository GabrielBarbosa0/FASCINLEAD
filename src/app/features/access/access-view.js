import { DEFAULT_TEAM_PASSWORD, formatAccessStoreSummary } from '../../../utils/access.js';
import { formatBrazilianPhone } from '../../../utils/phone.js';
import { systemRoleProfileForRole } from '../../../utils/role-profile.js';
import { STORES } from '../../../utils/stores.js';
import { escapeHtml, profileInitials, roleLabel } from '../../shared/formatters.js';

function roleProfileLabel(access, roleProfiles) {
  return roleProfiles.find((profile) => profile.id === access.roleProfileId)?.name
    || roleLabel(access.role);
}

export function accessView({ access, profile, roleProfiles, allowed }) {
  if (!allowed) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem gerenciar acessos.</span></div>`;
  }

  const { accesses, loading, saving, error } = access;
  const editingAccess = accesses.find((item) => item.email === access.editingEmail) || null;
  const deletingAccess = accesses.find((item) => item.email === access.pendingDeleteEmail) || null;
  const selectedStoreId = editingAccess?.storeId || profile.storeId || STORES[0]?.id;
  const selectedRoleProfileId = editingAccess?.roleProfileId || systemRoleProfileForRole(editingAccess?.role || 'captor').id;
  const selectedStoreIds = editingAccess?.storeIds || [selectedStoreId];
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${selectedStoreId === store.id ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
  const storeChecks = STORES.map((store) => `<label class="access-store-option checkbox-label"><input type="checkbox" name="storeIds" value="${store.id}" ${selectedStoreIds.includes(store.id) ? 'checked' : ''} /><span>${store.label}</span></label>`).join('');
  const roleProfileOptions = roleProfiles.map((roleProfile) => `<option value="${escapeHtml(roleProfile.id)}" data-base-role="${escapeHtml(roleProfile.baseRole)}" ${selectedRoleProfileId === roleProfile.id ? 'selected' : ''}>${escapeHtml(roleProfile.name)}</option>`).join('');
  const rows = accesses.map((item) => {
    const isCurrentUser = item.email === profile.email?.toLowerCase();
    const storeSummary = formatAccessStoreSummary(item);
    return `<article class="access-row ${item.active ? '' : 'is-inactive'}">
      <div class="access-identity">
        <span class="avatar access-avatar">${escapeHtml(profileInitials(item.displayName))}</span>
        <div class="access-identity-copy"><strong>${escapeHtml(item.displayName)}</strong><span>${escapeHtml(item.email)}</span>${item.phone ? `<small>${escapeHtml(formatBrazilianPhone(item.phone))}</small>` : ''}</div>
      </div>
      <div class="access-detail"><span>Perfil</span><strong>${escapeHtml(roleProfileLabel(item, roleProfiles))}</strong></div>
      <div class="access-detail access-permissions"><span>Unidades</span><strong title="${escapeHtml(storeSummary.full)}">${escapeHtml(storeSummary.short)}</strong></div>
      <div class="access-detail"><span>Código SavWin</span><strong>${escapeHtml(item.savwinCode || 'Não informado')}</strong></div>
      <div class="access-status"><span class="status-badge status-${item.active ? 'success' : 'danger'}">${item.active ? 'Ativo' : 'Bloqueado'}</span><small>Primeiro acesso: ${item.hasLoggedIn ? 'realizado' : 'pendente'}</small></div>
      <div class="access-actions">
        <button class="icon-button" type="button" data-access-edit="${escapeHtml(item.email)}" title="Editar acesso" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
        <button class="button button-secondary access-toggle" type="button" data-access-email="${escapeHtml(item.email)}" data-access-active="${item.active}" ${isCurrentUser || saving ? 'disabled' : ''}>
          <i data-lucide="${item.active ? 'log-out' : 'circle-check'}"></i><span>${item.active ? 'Bloquear' : 'Reativar'}</span>
        </button>
        <button class="icon-button access-delete" type="button" data-access-delete="${escapeHtml(item.email)}" title="Excluir acesso" aria-label="Excluir acesso de ${escapeHtml(item.displayName)}" ${isCurrentUser || saving ? 'disabled' : ''}><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
  }).join('');

  return `
    <section class="page-toolbar">
      <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestão</span></button>
      <button class="button button-primary" type="button" data-access-new><i data-lucide="user-plus"></i><span>Novo acesso</span></button>
    </section>
    <section class="access-list-panel" aria-busy="${loading}">
      <div class="access-list-heading"><div><strong>Acessos cadastrados</strong><span>${accesses.length} pessoa(s)</span></div><button class="icon-button" type="button" data-action="reload-accesses" title="Atualizar acessos" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i></button></div>
      ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
      ${loading && !accesses.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando acessos...</strong></div>' : ''}
      ${!loading && !accesses.length ? '<div class="empty-state"><i data-lucide="users"></i><strong>Nenhum acesso cadastrado</strong><p>Crie o primeiro acesso da equipe.</p></div>' : `<div class="access-list">${rows}</div>`}
    </section>
    ${access.editorOpen ? `<dialog id="access-editor-dialog" class="access-editor-dialog" aria-labelledby="access-editor-title">
      <form id="access-form" class="access-form" novalidate>
        <header><div><span class="eyebrow">ACESSO DA EQUIPE</span><h2 id="access-editor-title">${editingAccess ? 'Editar acesso' : 'Novo acesso'}</h2><p>${editingAccess ? 'Atualize os dados e permissões desta pessoa.' : 'Cadastre os dados usados para entrar no LeadFlow.'}</p></div><button class="icon-button" type="button" data-access-editor-close title="Fechar" aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
        <div class="access-form-body">
          <div class="field access-field-wide" data-field="displayName"><label for="access-name">Nome</label><input id="access-name" name="displayName" maxlength="120" autocomplete="name" value="${escapeHtml(editingAccess?.displayName || '')}" required /><small class="field-error"></small></div>
          <div class="field access-field-wide" data-field="email"><label for="access-email">E-mail</label><input id="access-email" name="email" type="email" maxlength="254" autocomplete="email" value="${escapeHtml(editingAccess?.email || '')}" placeholder="nome@exemplo.com" ${editingAccess ? 'readonly' : ''} required /><small class="field-error"></small></div>
          ${editingAccess ? '' : `<div class="field access-field-wide" data-field="password"><label for="access-password">Senha inicial</label><input id="access-password" name="password" type="text" minlength="6" maxlength="72" autocomplete="new-password" value="${DEFAULT_TEAM_PASSWORD}" readonly required /><small data-access-password-help>Senha padrão para o primeiro acesso. A pessoa poderá alterá-la depois.</small><small class="field-error"></small></div>`}
          <div class="field" data-field="role"><label for="access-role-profile">Perfil / cargo</label><select id="access-role-profile" name="roleProfileId" required>${roleProfileOptions}</select><small class="field-error"></small></div>
          <div class="field" data-field="phone"><label for="access-phone">Telefone</label><input id="access-phone" name="phone" type="tel" inputmode="numeric" maxlength="16" autocomplete="tel" value="${escapeHtml(formatBrazilianPhone(editingAccess?.phone || ''))}" placeholder="(81) 99999-9999" required /><small class="field-error"></small></div>
          <div id="access-primary-store-field" class="field" data-field="storeId"><label for="access-store">Unidade principal</label><select id="access-store" name="storeId" required>${storeOptions}</select><small class="field-error"></small></div>
          <div class="field" data-field="savwinCode"><label for="access-savwin-code">Código SavWin</label><input id="access-savwin-code" name="savwinCode" maxlength="30" value="${escapeHtml(editingAccess?.savwinCode || '')}" placeholder="Opcional" /><small class="field-error"></small></div>
          <fieldset id="access-stores-field" class="field access-store-picker access-field-wide" data-field="storeIds" hidden><legend>Unidades permitidas</legend><div>${storeChecks}</div><small class="field-error"></small></fieldset>
        </div>
        <footer><button class="button button-secondary" type="button" data-access-editor-close>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : editingAccess ? 'Salvar alterações' : 'Criar acesso'}</span></button></footer>
      </form>
    </dialog>` : ''}
    ${deletingAccess ? `<dialog id="delete-access-dialog" class="confirmation-dialog" aria-labelledby="delete-access-title"><div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div><h2 id="delete-access-title">Excluir acesso?</h2><p>O acesso de <strong>${escapeHtml(deletingAccess.displayName)}</strong> será removido. O histórico de leads e atividades será preservado.</p><div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-access-delete-cancel>Cancelar</button><button class="button button-danger-solid" type="button" data-access-delete-confirm="${escapeHtml(deletingAccess.email)}" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i><span>Excluir acesso</span></button></div></dialog>` : ''}`;
}
