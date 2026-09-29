import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  ClipboardX,
  Clock3,
  CloudCheck,
  Download,
  FileDown,
  Filter,
  FlaskConical,
  HardDrive,
  House,
  Info,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  UserRoundCog,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  createIcons
} from 'lucide';
import { completeRedirectSignIn, loadAuthorizedProfile, observeAuth, signInWithGoogle, signOutUser } from '../firebase/auth.js';
import { isFirebaseConfigured } from '../firebase/client.js';
import { saveLead, subscribeToLeads, synchronizeNow, updateLead } from '../services/lead-service.js';
import { loadAccesses, saveAccess, setAccessActive } from '../services/access-service.js';
import { loadManagementLeads, MANAGEMENT_QUERY_LIMIT } from '../services/management-service.js';
import { downloadLeadsCsv } from '../utils/lead-export.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { INTERESTS } from '../utils/lead.js';
import { STORES } from '../utils/stores.js';
import { currentRoute, currentRouteParam, navigate } from './router.js';

const DEMO_SESSION_KEY = 'fascinlead:demo-session';

const appIcons = {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  ClipboardX,
  Clock3,
  CloudCheck,
  Download,
  FileDown,
  Filter,
  FlaskConical,
  HardDrive,
  House,
  Info,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  UserRoundCog,
  Users,
  Wifi,
  WifiOff,
  Wrench
};

const state = {
  route: currentRoute(),
  loading: true,
  profile: null,
  demoMode: false,
  leads: [],
  authError: '',
  dataError: '',
  toast: null,
  search: '',
  unsubscribeLeads: null,
  updateAction: null,
  management: {
    loading: false,
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    page: 1,
    pageSize: 20,
    filters: createDefaultManagementFilters()
  },
  access: {
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    accesses: [],
    storeIds: []
  }
};

function toLocalDateInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function createDefaultManagementFilters() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: toLocalDateInput(monthStart),
    endDate: toLocalDateInput(today),
    storeId: '',
    capturedByUid: '',
    search: ''
  };
}

const demoProfile = {
  uid: 'demo-user',
  displayName: 'Equipe Fascinante',
  email: 'modo.de.desenvolvimento@local',
  role: 'captor',
  storeId: 'loja-teste',
  active: true
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function roleLabel(role) {
  return { captor: 'Captador', manager: 'Gestor', admin: 'Administrador' }[role] || 'Colaborador';
}

function profileInitials(displayName = '') {
  return String(displayName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

function canManage() {
  return ['manager', 'admin'].includes(state.profile?.role);
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function storeLabel(storeId = '') {
  return storeId.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCapturedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponivel';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function filteredManagementRecords() {
  const { records, filters } = state.management;
  const search = filters.search.trim().toLowerCase();
  const phoneSearch = search.replace(/\D/g, '');

  return records.filter((lead) => {
    if (filters.storeId && lead.storeId !== filters.storeId) return false;
    if (filters.capturedByUid && lead.capturedByUid !== filters.capturedByUid) return false;
    if (!search) return true;
    return String(lead.fullName || '').toLowerCase().includes(search)
      || String(lead.capturedByName || '').toLowerCase().includes(search)
      || (phoneSearch && String(lead.phoneSearch || '').includes(phoneSearch));
  });
}

function syncLabel(lead) {
  if (lead.syncState === 'demo') return ['Somente neste navegador', 'neutral'];
  if (lead.syncState === 'pending') return ['Pendente', 'warning'];
  if (lead.syncState === 'error') return ['Erro', 'danger'];
  return ['Sincronizado', 'success'];
}

function loginView() {
  const configNotice = isFirebaseConfigured
    ? '<p class="login-note">Use a conta Google autorizada pela sua loja.</p>'
    : '<div class="notice notice-warning"><i data-lucide="wrench"></i><div><strong>Firebase ainda nao configurado</strong><span>Use o modo de desenvolvimento sem dados reais.</span></div></div>';

  return `
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <div class="brand-mark" aria-hidden="true">F</div>
        <p class="eyebrow">OTICAS FASCINANTE</p>
        <h1 id="login-title">FascinLead</h1>
        <p class="login-copy">Pre-cadastro rapido para quem encontra clientes onde eles estao.</p>
        ${configNotice}
        ${state.authError ? `<div class="notice notice-danger" role="alert"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.authError)}</span></div>` : ''}
        <button class="button button-primary button-block" type="button" data-action="google-login" ${!isFirebaseConfigured ? 'disabled' : ''}>
          <i data-lucide="log-in"></i><span>Entrar com Google</span>
        </button>
        ${import.meta.env.DEV ? `
          <button class="button button-secondary button-block" type="button" data-action="demo-login">
            <i data-lucide="flask-conical"></i><span>Abrir modo de desenvolvimento</span>
          </button>
        ` : ''}
        <p class="privacy-note"><i data-lucide="shield-check"></i> Acesso restrito a colaboradores autorizados.</p>
      </section>
    </main>`;
}

function headerView() {
  const online = navigator.onLine;
  return `
    <header class="app-header">
      <div class="header-inner ${['management', 'access'].includes(state.route) ? 'layout-wide' : ''}">
        <div>
          <p class="eyebrow">FASCINLEAD</p>
          <p class="header-store">${escapeHtml(state.profile.storeId.replaceAll('-', ' '))}</p>
        </div>
        <div class="header-actions">
          ${state.demoMode ? '<span class="mode-badge">DEMO</span>' : ''}
          <span class="connectivity ${online ? 'is-online' : 'is-offline'}">
            <i data-lucide="${online ? 'wifi' : 'wifi-off'}"></i>${online ? 'Online' : 'Offline'}
          </span>
          <button class="icon-button" type="button" data-action="logout" title="Sair"><i data-lucide="log-out"></i></button>
        </div>
      </div>
    </header>`;
}

function profileCard() {
  const initials = profileInitials(state.profile.displayName);

  return `
    <section class="profile-card">
      <div class="avatar">${escapeHtml(initials)}</div>
      <div>
        <strong>${escapeHtml(state.profile.displayName)}</strong>
        <span>${roleLabel(state.profile.role)}</span>
      </div>
      <i data-lucide="shield-check" class="profile-status"></i>
    </section>`;
}

function homeView() {
  const pending = state.leads.filter((lead) => lead.syncState === 'pending').length;
  const synced = state.leads.filter((lead) => lead.syncState === 'synced').length;

  return `
    <section class="page-heading">
      <p class="eyebrow">CAPTACAO EM CAMPO</p>
      <h1>Inicio</h1>
      <p>Cadastre um novo contato em poucos passos.</p>
    </section>
    ${profileCard()}
    ${state.demoMode ? '<div class="notice notice-warning"><i data-lucide="flask-conical"></i><div><strong>Modo de desenvolvimento</strong><span>Nao utilize dados reais. Os registros ficam somente neste navegador.</span></div></div>' : ''}
    <section class="action-grid" aria-label="Acoes principais">
      <button class="action-card action-card-primary" type="button" data-route="new">
        <span class="action-icon"><i data-lucide="user-plus"></i></span>
        <span><strong>Nova abordagem</strong><small>Cadastrar novo contato</small></span>
        <i data-lucide="chevron-right"></i>
      </button>
      <button class="action-card" type="button" data-route="leads">
        <span class="action-icon"><i data-lucide="clipboard-list"></i></span>
        <span><strong>Meus cadastros</strong><small>${state.leads.length} registro(s) neste acesso</small></span>
        <i data-lucide="chevron-right"></i>
      </button>
      <button class="action-card" type="button" data-route="sync">
        <span class="action-icon"><i data-lucide="refresh-cw"></i></span>
        <span><strong>Sincronizacao</strong><small>${pending} pendente(s), ${synced} sincronizado(s)</small></span>
        <i data-lucide="chevron-right"></i>
      </button>
      ${canManage() ? `<button class="action-card" type="button" data-route="management">
        <span class="action-icon"><i data-lucide="bar-chart-3"></i></span>
        <span><strong>Painel de gestao</strong><small>Consultar e exportar captacoes</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${isAdmin() ? `<button class="action-card" type="button" data-route="access">
        <span class="action-icon"><i data-lucide="user-round-cog"></i></span>
        <span><strong>Acessos da equipe</strong><small>Autorizar colaboradores e administradores</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
    </section>`;
}

function newLeadView() {
  const interests = INTERESTS.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  return `
    <section class="page-heading compact">
      <button class="back-button" type="button" data-route="home" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">NOVA ABORDAGEM</p><h1>Pre-cadastro</h1><p>Preencha somente o necessario.</p></div>
    </section>
    <form id="lead-form" class="form-panel" novalidate>
      <div class="field" data-field="fullName">
        <label for="fullName">Nome <span aria-hidden="true">*</span></label>
        <input id="fullName" name="fullName" autocomplete="name" maxlength="120" placeholder="Nome do cliente" required />
        <small class="field-error"></small>
      </div>
      <div class="field" data-field="phone">
        <label for="phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label>
        <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" placeholder="(00) 00000-0000" required />
        <small class="field-error"></small>
      </div>
      <div class="field">
        <label for="preferredName">Como prefere ser chamado</label>
        <input id="preferredName" name="preferredName" maxlength="60" placeholder="Apelido ou nome preferido" />
      </div>
      <div class="field-row">
        <div class="field"><label for="neighborhood">Bairro</label><input id="neighborhood" name="neighborhood" maxlength="80" /></div>
        <div class="field"><label for="city">Cidade</label><input id="city" name="city" maxlength="80" /></div>
        <div class="field field-state"><label for="state">UF</label><input id="state" name="state" maxlength="2" value="PE" /></div>
      </div>
      <div class="field">
        <label for="interestId">Interesse principal</label>
        <select id="interestId" name="interestId">${interests}</select>
      </div>
      <div class="field-row appointment-fields">
        <div class="field" data-field="appointmentDate"><label for="appointmentDate">Data do pre-agendamento</label><input id="appointmentDate" name="appointmentDate" type="date" /><small class="field-error"></small></div>
        <div class="field" data-field="appointmentTime"><label for="appointmentTime">Horario</label><input id="appointmentTime" name="appointmentTime" type="time" /><small class="field-error"></small></div>
      </div>
      <div class="field" data-field="notes">
        <label for="notes">Observacao rapida</label>
        <textarea id="notes" name="notes" maxlength="500" rows="3" placeholder="Ex.: prefere contato pela manha"></textarea>
        <small class="field-hint"><span id="notes-count">0</span>/500</small>
        <small class="field-error"></small>
      </div>
      <button class="button button-primary button-block" type="submit"><i data-lucide="save"></i><span>Salvar cadastro</span></button>
      <p class="form-footnote"><i data-lucide="shield-check"></i> O cadastro sera preservado neste aparelho se a conexao falhar.</p>
    </form>`;
}

function leadsView() {
  const needle = state.search.trim().toLowerCase().replace(/\D/g, '');
  const textNeedle = state.search.trim().toLowerCase();
  const filtered = state.leads.filter((lead) => {
    if (!textNeedle) return true;
    return lead.fullName.toLowerCase().includes(textNeedle) || lead.phoneSearch.includes(needle);
  });

  const list = filtered.length
    ? filtered.map((lead) => {
        const [label, tone] = syncLabel(lead);
        return `<button class="lead-item" type="button" data-lead-id="${escapeHtml(lead.id)}" aria-label="Ver cadastro de ${escapeHtml(lead.fullName)}">
          <div class="lead-avatar">${escapeHtml(lead.fullName[0]?.toUpperCase() || '?')}</div>
          <div class="lead-content"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(lead.interestLabel || 'Interesse nao informado')}</small></div>
          <span class="status-badge status-${tone}">${label}</span>
          <i class="lead-chevron" data-lucide="chevron-right"></i>
        </button>`;
      }).join('')
    : `<div class="empty-state"><i data-lucide="clipboard-x"></i><strong>Nenhum cadastro encontrado</strong><p>${state.search ? 'Tente outro nome ou telefone.' : 'Os contatos registrados aparecerao aqui.'}</p><button class="button button-primary" type="button" data-route="new"><i data-lucide="user-plus"></i>Novo cadastro</button></div>`;

  return `
    <section class="page-heading compact"><div><p class="eyebrow">CAPTACAO</p><h1>Meus cadastros</h1><p>${state.leads.length} registro(s) carregado(s)</p></div></section>
    <div class="search-box"><i data-lucide="search"></i><input id="lead-search" type="search" value="${escapeHtml(state.search)}" placeholder="Buscar por nome ou telefone" aria-label="Buscar cadastros" /></div>
    ${state.dataError ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.dataError)}</span></div>` : ''}
    <section class="lead-list">${list}</section>`;
}

function leadDetailView() {
  const lead = state.leads.find((item) => item.id === currentRouteParam());
  if (!lead) {
    return `<section class="page-heading compact">
      <button class="back-button" type="button" data-route="leads" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">CADASTRO</p><h1>Cadastro nao encontrado</h1><p>Volte para a lista e tente novamente.</p></div>
    </section>`;
  }

  const [syncStatus, syncTone] = syncLabel(lead);
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${lead.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  return `
    <section class="page-heading compact">
      <button class="back-button" type="button" data-route="leads" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">DETALHES DO CADASTRO</p><h1>${escapeHtml(lead.fullName)}</h1><p>Confira os dados e corrija o que for necessario.</p></div>
    </section>
    <section class="lead-detail-summary" aria-label="Informacoes do cadastro">
      <div><span>Status</span><strong class="status-badge status-${syncTone}">${syncStatus}</strong></div>
      <div><span>Loja</span><strong>${escapeHtml(storeLabel(lead.storeId))}</strong></div>
      <div><span>Cadastrado em</span><strong>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</strong></div>
    </section>
    <form id="edit-lead-form" class="form-panel" data-lead-id="${escapeHtml(lead.id)}" novalidate>
      <div class="field" data-field="fullName"><label for="edit-fullName">Nome <span aria-hidden="true">*</span></label><input id="edit-fullName" name="fullName" autocomplete="name" maxlength="120" value="${escapeHtml(lead.fullName)}" required /><small class="field-error"></small></div>
      <div class="field" data-field="phone"><label for="edit-phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label><input id="edit-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" value="${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}" required /><small class="field-error"></small></div>
      <div class="field"><label for="edit-preferredName">Como prefere ser chamado</label><input id="edit-preferredName" name="preferredName" maxlength="60" value="${escapeHtml(lead.preferredName)}" /></div>
      <div class="field-row">
        <div class="field"><label for="edit-neighborhood">Bairro</label><input id="edit-neighborhood" name="neighborhood" maxlength="80" value="${escapeHtml(lead.neighborhood)}" /></div>
        <div class="field"><label for="edit-city">Cidade</label><input id="edit-city" name="city" maxlength="80" value="${escapeHtml(lead.city)}" /></div>
        <div class="field field-state"><label for="edit-state">UF</label><input id="edit-state" name="state" maxlength="2" value="${escapeHtml(lead.state || 'PE')}" /></div>
      </div>
      <div class="field"><label for="edit-interestId">Interesse principal</label><select id="edit-interestId" name="interestId">${interests}</select></div>
      <div class="field-row appointment-fields">
        <div class="field" data-field="appointmentDate"><label for="edit-appointmentDate">Data do pre-agendamento</label><input id="edit-appointmentDate" name="appointmentDate" type="date" value="${escapeHtml(lead.appointmentDate)}" /><small class="field-error"></small></div>
        <div class="field" data-field="appointmentTime"><label for="edit-appointmentTime">Horario</label><input id="edit-appointmentTime" name="appointmentTime" type="time" value="${escapeHtml(lead.appointmentTime)}" /><small class="field-error"></small></div>
      </div>
      <div class="field" data-field="notes"><label for="edit-notes">Observacao rapida</label><textarea id="edit-notes" name="notes" maxlength="500" rows="3">${escapeHtml(lead.notes)}</textarea><small class="field-hint"><span id="edit-notes-count">${String(lead.notes || '').length}</span>/500</small><small class="field-error"></small></div>
      <button class="button button-primary button-block" type="submit"><i data-lucide="save"></i><span>Salvar alteracoes</span></button>
      <p class="form-footnote"><i data-lucide="shield-check"></i> Autor, loja e data original permanecem preservados.</p>
    </form>`;
}

function managementView() {
  if (!canManage()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Painel de gestao</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso aos dados gerenciais.</span></div>`;
  }

  const { filters, loaded, loading, error, records, truncated, pageSize } = state.management;
  const filtered = filteredManagementRecords();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(state.management.page, totalPages);
  const pageRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const captors = [...new Map(records
    .filter((lead) => lead.capturedByUid)
    .map((lead) => [lead.capturedByUid, lead.capturedByName || 'Captador'])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));

  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${filters.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const captorOptions = captors.map(([uid, name]) => `<option value="${escapeHtml(uid)}" ${filters.capturedByUid === uid ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');

  const tableRows = pageRecords.map((lead) => `<tr>
    <td><strong>${escapeHtml(lead.fullName)}</strong><small>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</small></td>
    <td>${escapeHtml(lead.capturedByName || 'Nao informado')}</td>
    <td>${escapeHtml(storeLabel(lead.storeId))}</td>
    <td>${escapeHtml(lead.interestLabel || 'Nao informado')}</td>
    <td>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</td>
  </tr>`).join('');

  const mobileRows = pageRecords.map((lead) => `<article class="management-card">
    <div><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span></div>
    <dl>
      <div><dt>Captador</dt><dd>${escapeHtml(lead.capturedByName || 'Nao informado')}</dd></div>
      <div><dt>Loja</dt><dd>${escapeHtml(storeLabel(lead.storeId))}</dd></div>
      <div><dt>Captado em</dt><dd>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</dd></div>
    </dl>
  </article>`).join('');

  const results = pageRecords.length
    ? `<div class="management-table-wrap"><table class="management-table">
        <thead><tr><th>Lead</th><th>Captador</th><th>Loja</th><th>Interesse</th><th>Captado em</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table></div>
      <div class="management-mobile-list">${mobileRows}</div>
      <div class="pagination">
        <span>${filtered.length} registro(s)</span>
        <div><button class="button button-secondary" type="button" data-management-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
        <strong>${currentPage} de ${totalPages}</strong>
        <button class="button button-secondary" type="button" data-management-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Proxima</button></div>
      </div>`
    : `<div class="empty-state management-empty"><i data-lucide="bar-chart-3"></i><strong>${loaded ? 'Nenhum cadastro no periodo' : 'Consulte as captacoes'}</strong><p>${loaded ? 'Ajuste os filtros para ampliar a busca.' : 'Escolha o periodo e carregue os resultados.'}</p></div>`;

  return `
    <section class="management-heading">
      <div><p class="eyebrow">GESTAO DA CAPTACAO</p><h1>Painel de leads</h1><p>Acompanhe os pre-cadastros recebidos pela equipe.</p></div>
      <div class="management-heading-actions">
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="access"><i data-lucide="user-round-cog"></i><span>Gerenciar acessos</span></button>' : ''}
        <button class="button button-secondary" type="button" data-action="export-management" ${filtered.length === 0 ? 'disabled' : ''}><i data-lucide="file-down"></i><span>Exportar CSV</span></button>
      </div>
    </section>
    <form id="management-filters" class="management-filters">
      <div class="filter-title"><i data-lucide="filter"></i><div><strong>Filtros</strong><span>Periodo maximo recomendado: 90 dias.</span></div></div>
      <div class="management-filter-grid">
        <div class="field"><label for="management-start">Data inicial</label><input id="management-start" name="startDate" type="date" value="${escapeHtml(filters.startDate)}" required /></div>
        <div class="field"><label for="management-end">Data final</label><input id="management-end" name="endDate" type="date" value="${escapeHtml(filters.endDate)}" required /></div>
        ${state.profile.role === 'admin' ? `<div class="field"><label for="management-store">Loja</label><select id="management-store" name="storeId"><option value="">Todas as lojas</option>${storeOptions}</select></div>` : ''}
        <div class="field"><label for="management-captor">Captador</label><select id="management-captor" name="capturedByUid"><option value="">Todos os captadores</option>${captorOptions}</select></div>
        <div class="field management-search-field"><label for="management-search">Nome ou telefone</label><input id="management-search" name="search" type="search" value="${escapeHtml(filters.search)}" placeholder="Buscar nos resultados" /></div>
        <button class="button button-primary management-filter-button" type="submit" ${loading ? 'disabled' : ''}><i data-lucide="search"></i><span>${loading ? 'Consultando...' : 'Aplicar filtros'}</span></button>
      </div>
    </form>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A consulta atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o periodo para obter a lista completa.</span></div>` : ''}
    <section class="management-metrics" aria-label="Resumo do periodo">
      <div><i data-lucide="clipboard-list"></i><span>Leads encontrados</span><strong>${filtered.length}</strong></div>
      <div><i data-lucide="users"></i><span>Captadores</span><strong>${new Set(filtered.map((lead) => lead.capturedByUid)).size}</strong></div>
      <div><i data-lucide="building-2"></i><span>Lojas</span><strong>${new Set(filtered.map((lead) => lead.storeId)).size}</strong></div>
    </section>
    <section class="management-results" aria-busy="${loading}">${results}</section>`;
}

function accessView() {
  if (!isAdmin()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Acessos da equipe</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem gerenciar acessos.</span></div>`;
  }

  const { accesses, loading, saving, error } = state.access;
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${state.profile.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const rows = accesses.map((access) => {
    const isCurrentUser = access.email === state.profile.email?.toLowerCase();
    return `<article class="access-row ${access.active ? '' : 'is-inactive'}">
      <div class="access-identity">
        <span class="avatar access-avatar">${escapeHtml(profileInitials(access.displayName))}</span>
        <div class="access-identity-copy"><strong>${escapeHtml(access.displayName)}</strong><span>${escapeHtml(access.email)}</span></div>
      </div>
      <div class="access-detail"><span>Perfil</span><strong>${roleLabel(access.role)}</strong></div>
      <div class="access-detail"><span>Loja</span><strong>${escapeHtml(storeLabel(access.storeId))}</strong></div>
      <div class="access-detail"><span>Primeiro acesso</span><strong>${access.hasLoggedIn ? 'Realizado' : 'Pendente'}</strong></div>
      <span class="status-badge status-${access.active ? 'success' : 'danger'}">${access.active ? 'Ativo' : 'Bloqueado'}</span>
      <div class="access-actions">
        <button class="icon-button" type="button" data-access-edit="${escapeHtml(access.email)}" title="Editar acesso" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
        <button class="button button-secondary access-toggle" type="button" data-access-email="${escapeHtml(access.email)}" data-access-active="${access.active}" ${isCurrentUser || saving ? 'disabled' : ''}>
          <i data-lucide="${access.active ? 'log-out' : 'circle-check'}"></i><span>${access.active ? 'Bloquear' : 'Reativar'}</span>
        </button>
      </div>
    </article>`;
  }).join('');

  return `
    <section class="management-heading access-heading">
      <div>
        <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button>
        <p class="eyebrow">ADMINISTRACAO</p><h1>Acessos da equipe</h1><p>Libere o e-mail Google antes do primeiro acesso ao FascinLead.</p>
      </div>
    </section>
    <section class="access-layout">
      <form id="access-form" class="access-form" novalidate>
        <div class="filter-title"><i data-lucide="key-round"></i><div><strong>Novo acesso</strong><span>O colaborador entrara usando esta conta Google.</span></div></div>
        <div class="field" data-field="displayName"><label for="access-name">Nome</label><input id="access-name" name="displayName" maxlength="120" autocomplete="name" required /><small class="field-error"></small></div>
        <div class="field" data-field="email"><label for="access-email">E-mail Google</label><input id="access-email" name="email" type="email" maxlength="254" autocomplete="email" placeholder="nome@gmail.com" required /><small class="field-error"></small></div>
        <div class="field" data-field="role"><label for="access-role">Perfil</label><select id="access-role" name="role" required><option value="captor">Colaborador (captador)</option><option value="manager">Gestor da loja</option><option value="admin">Administrador</option></select><small class="field-error"></small></div>
        <div class="field" data-field="storeId"><label for="access-store">Loja</label><select id="access-store" name="storeId" required>${storeOptions}</select><small class="field-error"></small></div>
        <button class="button button-primary button-block" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="user-plus"></i><span>${saving ? 'Salvando...' : 'Salvar acesso'}</span></button>
      </form>
      <section class="access-list-panel" aria-busy="${loading}">
        <div class="access-list-heading"><div><strong>Acessos cadastrados</strong><span>${accesses.length} pessoa(s)</span></div><button class="icon-button" type="button" data-action="reload-accesses" title="Atualizar acessos" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i></button></div>
        ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
        ${loading && !accesses.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando acessos...</strong></div>' : ''}
        ${!loading && !accesses.length ? '<div class="empty-state"><i data-lucide="users"></i><strong>Nenhum acesso cadastrado</strong><p>Use o formulario para liberar a primeira pessoa.</p></div>' : `<div class="access-list">${rows}</div>`}
      </section>
    </section>`;
}

function syncView() {
  const counts = state.leads.reduce((result, lead) => {
    result[lead.syncState] = (result[lead.syncState] || 0) + 1;
    return result;
  }, {});

  return `
    <section class="page-heading compact"><div><p class="eyebrow">STATUS DOS DADOS</p><h1>Sincronizacao</h1><p>Acompanhe os registros deste dispositivo.</p></div></section>
    ${state.demoMode ? '<div class="notice notice-warning"><i data-lucide="info"></i><span>No modo de desenvolvimento nao ha envio para a nuvem.</span></div>' : ''}
    <section class="sync-grid">
      <div class="metric metric-success"><span>Sincronizados</span><strong>${counts.synced || 0}</strong><i data-lucide="circle-check"></i></div>
      <div class="metric metric-warning"><span>Pendentes</span><strong>${counts.pending || 0}</strong><i data-lucide="clock-3"></i></div>
      <div class="metric"><span>Locais de teste</span><strong>${counts.demo || 0}</strong><i data-lucide="hard-drive"></i></div>
      <div class="metric metric-danger"><span>Com erro</span><strong>${counts.error || 0}</strong><i data-lucide="circle-alert"></i></div>
    </section>
    <button class="button button-primary button-block" type="button" data-action="sync"><i data-lucide="refresh-cw"></i><span>Sincronizar agora</span></button>
    <section class="info-band"><i data-lucide="wifi"></i><div><strong>Envio automatico</strong><p>O FascinLead tenta enviar ao abrir, recuperar a internet e voltar ao primeiro plano.</p></div></section>`;
}

function bottomNav() {
  const items = [
    ['home', 'house', 'Inicio'],
    ['new', 'circle-plus', 'Novo'],
    ['leads', 'clipboard-list', 'Cadastros'],
    ['sync', 'refresh-cw', 'Sync']
  ];
  if (canManage()) items.push(['management', 'bar-chart-3', 'Gestao']);
  return `<nav class="bottom-nav ${canManage() ? 'has-management' : ''}" aria-label="Navegacao principal">${items.map(([route, icon, label]) => `
    <button type="button" data-route="${route}" class="${state.route === route || (route === 'leads' && state.route === 'lead') ? 'is-active' : ''}" ${state.route === route || (route === 'leads' && state.route === 'lead') ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, lead: leadDetailView, sync: syncView, management: managementView, access: accessView };
  const page = pages[state.route] || homeView;
  const wideLayout = ['management', 'access'].includes(state.route);
  return `${headerView()}<main class="app-main ${wideLayout ? 'layout-wide' : ''}">${page()}</main>${bottomNav()}`;
}

function render() {
  const root = document.querySelector('#app');

  if (state.loading) {
    root.innerHTML = '<main class="loading-page"><div class="brand-mark">F</div><span>Preparando o FascinLead...</span></main>';
  } else {
    root.innerHTML = state.profile ? appView() : loginView();
  }

  if (state.toast) {
    root.insertAdjacentHTML('beforeend', `<div class="toast toast-${state.toast.tone}" role="status"><i data-lucide="${state.toast.icon}"></i><span>${escapeHtml(state.toast.message)}</span></div>`);
  }

  createIcons({ icons: appIcons });
  bindPageEvents();
}

function showToast(message, tone = 'success', icon = 'circle-check') {
  state.toast = { message, tone, icon };
  render();
  setTimeout(() => {
    state.toast = null;
    render();
  }, 3200);
}

function setFieldErrors(form, errors) {
  form.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
  form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });

  for (const [name, message] of Object.entries(errors)) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) continue;
    field.classList.add('has-error');
    field.querySelector('.field-error').textContent = message;
  }
}

function bindPageEvents() {
  const form = document.querySelector('#lead-form');
  if (form) {
    const phoneInput = form.elements.phone;
    const notesInput = form.elements.notes;
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#notes-count').textContent = notesInput.value.length; });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const result = saveLead(values, state.profile, state.demoMode, () => {
        state.dataError = 'Um cadastro nao foi aceito pela nuvem. Verifique o acesso e tente novamente.';
        render();
      });
      setFieldErrors(form, result.errors || {});
      if (!result.isValid) return;
      form.reset();
      navigate('leads');
      showToast(state.demoMode ? 'Cadastro salvo somente neste navegador.' : 'Cadastro salvo. A sincronizacao seguira automaticamente.');
    });
  }

  const editLeadForm = document.querySelector('#edit-lead-form');
  if (editLeadForm) {
    const phoneInput = editLeadForm.elements.phone;
    const notesInput = editLeadForm.elements.notes;
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#edit-notes-count').textContent = notesInput.value.length; });
    editLeadForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(editLeadForm));
      const result = updateLead(editLeadForm.dataset.leadId, values, state.demoMode, () => {
        state.dataError = 'A correcao nao foi aceita pela nuvem. Verifique o acesso e tente novamente.';
        render();
      });
      setFieldErrors(editLeadForm, result.errors || {});
      if (!result.isValid) {
        if (result.notFound) navigate('leads');
        return;
      }
      navigate('leads');
      showToast(state.demoMode ? 'Cadastro atualizado neste navegador.' : 'Alteracoes salvas. A sincronizacao seguira automaticamente.');
    });
  }

  const search = document.querySelector('#lead-search');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value;
      render();
      document.querySelector('#lead-search')?.focus();
    });
  }

  const managementForm = document.querySelector('#management-filters');
  if (managementForm) {
    managementForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(managementForm));
      state.management.filters = {
        startDate: values.startDate,
        endDate: values.endDate,
        storeId: values.storeId || '',
        capturedByUid: values.capturedByUid || '',
        search: values.search || ''
      };
      state.management.page = 1;
      loadManagementData();
    });

    const managementSearch = managementForm.elements.search;
    managementSearch?.addEventListener('input', () => {
      state.management.filters.search = managementSearch.value;
      state.management.page = 1;
      render();
      document.querySelector('#management-search')?.focus();
    });

    ['storeId', 'capturedByUid'].forEach((name) => {
      managementForm.elements[name]?.addEventListener('change', (event) => {
        state.management.filters[name] = event.target.value;
        state.management.page = 1;
        render();
      });
    });
  }

  const accessForm = document.querySelector('#access-form');
  if (accessForm) {
    accessForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.access.saving) return;
      state.access.saving = true;
      setFieldErrors(accessForm, {});
      const values = Object.fromEntries(new FormData(accessForm));

      try {
        const result = await saveAccess(state.profile, values);
        if (!result.isValid) {
          state.access.saving = false;
          setFieldErrors(accessForm, result.errors);
          return;
        }
        accessForm.reset();
        accessForm.elements.storeId.value = state.profile.storeId;
        await loadAccessData();
        showToast('Acesso salvo. A pessoa ja pode entrar com o Google.');
      } catch (error) {
        state.access.saving = false;
        state.access.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao possui permissao para gerenciar acessos.'
          : 'Nao foi possivel salvar o acesso. Verifique a conexao e tente novamente.';
        render();
      }
    });
  }
}

function subscribeProfileLeads() {
  state.unsubscribeLeads?.();
  state.unsubscribeLeads = subscribeToLeads(
    state.profile,
    state.demoMode,
    (leads) => {
      state.leads = leads;
      state.dataError = '';
      render();
    },
    () => {
      state.dataError = 'Nao foi possivel carregar os cadastros. Verifique sua conexao ou permissao.';
      render();
    }
  );
}

async function loadManagementData() {
  if (!canManage() || state.management.loading) return;
  const { startDate, endDate } = state.management.filters;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const rangeInDays = (end - start) / 86_400_000;

  if (!startDate || !endDate || Number.isNaN(rangeInDays) || rangeInDays < 0) {
    state.management.error = 'Informe um periodo valido.';
    render();
    return;
  }

  if (rangeInDays > 92) {
    state.management.error = 'Consulte no maximo 93 dias por vez para preservar a cota do sistema.';
    render();
    return;
  }

  state.management.loading = true;
  state.management.error = '';
  render();

  try {
    const result = await loadManagementLeads(state.profile, startDate, endDate);
    state.management.records = result.records;
    state.management.truncated = result.truncated;
    state.management.loaded = true;
    state.management.page = 1;
  } catch (error) {
    state.management.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao possui permissao para esta consulta.'
      : 'Nao foi possivel carregar o painel. Verifique a conexao e tente novamente.';
  } finally {
    state.management.loading = false;
    render();
  }
}

function ensureManagementData() {
  if (state.route === 'management' && canManage() && !state.management.loaded) {
    loadManagementData();
  }
}

async function loadAccessData() {
  if (!isAdmin() || state.access.loading) return;
  state.access.loading = true;
  state.access.error = '';
  render();
  try {
    const result = await loadAccesses(state.profile);
    state.access.accesses = result.accesses;
    state.access.storeIds = result.storeIds;
    state.access.loaded = true;
  } catch (error) {
    state.access.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao possui permissao para consultar acessos.'
      : 'Nao foi possivel carregar os acessos. Verifique a conexao e tente novamente.';
  } finally {
    state.access.loading = false;
    state.access.saving = false;
    render();
  }
}

function ensureAccessData() {
  if (state.route === 'access' && isAdmin() && !state.access.loaded) {
    loadAccessData();
  }
}

async function handleAction(action) {
  if (action === 'demo-login') {
    sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
    state.demoMode = true;
    state.profile = demoProfile;
    state.authError = '';
    subscribeProfileLeads();
    navigate('home');
    render();
  }

  if (action === 'google-login') {
    state.authError = '';
    state.loading = true;
    render();
    try {
      await signInWithGoogle();
    } catch (error) {
      state.loading = false;
      state.authError = error.message || 'Nao foi possivel entrar com o Google.';
      render();
    }
  }

  if (action === 'logout') {
    state.unsubscribeLeads?.();
    state.unsubscribeLeads = null;
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    await signOutUser();
    state.profile = null;
    state.demoMode = false;
    state.leads = [];
    state.management = {
      loading: false,
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      page: 1,
      pageSize: 20,
      filters: createDefaultManagementFilters()
    };
    state.access = {
      loading: false,
      loaded: false,
      saving: false,
      error: '',
      accesses: [],
      storeIds: []
    };
    render();
  }

  if (action === 'sync') {
    try {
      await synchronizeNow(state.demoMode);
      showToast(state.demoMode ? 'Modo local verificado.' : 'Sincronizacao concluida.');
    } catch {
      showToast('A sincronizacao ainda nao foi concluida.', 'danger', 'circle-alert');
    }
  }

  if (action === 'export-management') {
    const records = filteredManagementRecords();
    if (!records.length) return;
    downloadLeadsCsv(records, state.management.filters.startDate, state.management.filters.endDate);
    showToast(`${records.length} registro(s) exportado(s).`);
  }

  if (action === 'reload-accesses') {
    await loadAccessData();
  }
}

export async function startApp() {
  document.addEventListener('click', async (event) => {
    const leadButton = event.target.closest('[data-lead-id]');
    if (leadButton) navigate('lead', leadButton.dataset.leadId);
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) navigate(routeButton.dataset.route);
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) handleAction(actionButton.dataset.action);
    const pageButton = event.target.closest('[data-management-page]');
    if (pageButton && !pageButton.disabled) {
      state.management.page = Number(pageButton.dataset.managementPage);
      render();
      document.querySelector('.management-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const accessButton = event.target.closest('[data-access-email]');
    if (accessButton && !accessButton.disabled) {
      const access = state.access.accesses.find((item) => item.email === accessButton.dataset.accessEmail);
      if (!access) return;
      accessButton.disabled = true;
      try {
        await setAccessActive(state.profile, access, accessButton.dataset.accessActive !== 'true');
        await loadAccessData();
        showToast(access.active ? 'Acesso bloqueado.' : 'Acesso reativado.');
      } catch (error) {
        state.access.error = error.message || 'Nao foi possivel alterar o acesso.';
        render();
      }
    }
    const editAccessButton = event.target.closest('[data-access-edit]');
    if (editAccessButton && !editAccessButton.disabled) {
      const access = state.access.accesses.find((item) => item.email === editAccessButton.dataset.accessEdit);
      const form = document.querySelector('#access-form');
      if (!access || !form) return;
      form.elements.displayName.value = access.displayName;
      form.elements.email.value = access.email;
      form.elements.role.value = access.role;
      form.elements.storeId.value = access.storeId;
      form.elements.displayName.focus();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  window.addEventListener('hashchange', () => {
    state.route = currentRoute();
    render();
    ensureManagementData();
    ensureAccessData();
  });

  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.profile && !state.demoMode) {
      synchronizeNow(false).catch(() => {});
    }
  });

  if (sessionStorage.getItem(DEMO_SESSION_KEY) === 'true' && import.meta.env.DEV) {
    state.demoMode = true;
    state.profile = demoProfile;
    state.loading = false;
    subscribeProfileLeads();
    render();
    return;
  }

  try {
    await completeRedirectSignIn();
  } catch (error) {
    state.authError = error.message || 'Nao foi possivel concluir o acesso.';
  }

  observeAuth(async (firebaseUser) => {
    state.loading = true;
    render();
    if (!firebaseUser) {
      state.profile = null;
      state.loading = false;
      render();
      return;
    }

    try {
      state.profile = await loadAuthorizedProfile(firebaseUser);
      state.demoMode = false;
      state.authError = '';
      subscribeProfileLeads();
    } catch (error) {
      state.profile = null;
      state.authError = error.message || 'Acesso nao autorizado.';
    } finally {
      state.loading = false;
      render();
      ensureManagementData();
      ensureAccessData();
    }
  });
}

export function showOfflineReady() {
  showToast('Aplicativo pronto para abrir offline.', 'success', 'cloud-check');
}

export function showUpdateReady(updateAction) {
  state.updateAction = updateAction;
  showToast('Nova versao disponivel. Reabra o aplicativo para atualizar.', 'neutral', 'download');
}
