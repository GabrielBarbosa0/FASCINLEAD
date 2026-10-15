import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
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
  MessageCircle,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Target,
  Trash2,
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
import { markDemoFollowUpContact, saveLead, subscribeToLeads, synchronizeNow, updateDemoAppointmentAttendance, updateLead } from '../services/lead-service.js';
import { markFollowUpContactStarted, subscribeToTeamFollowUps } from '../services/follow-up-service.js';
import { loadAccesses, saveAccess, setAccessActive } from '../services/access-service.js';
import { deleteManagementLead, loadManagementLeads, MANAGEMENT_QUERY_LIMIT, updateManagementLead } from '../services/management-service.js';
import { createGoals, deleteGoal, GOALS_LEAD_LIMIT, loadGoalsDashboard } from '../services/goal-service.js';
import { APPOINTMENTS_QUERY_LIMIT, setAppointmentAttendance, subscribeToAppointments } from '../services/appointment-service.js';
import { backfillAppointmentSlots, loadStoreSchedules, saveStoreSchedule, subscribeToDayAppointments, subscribeToStoreSchedule } from '../services/schedule-service.js';
import { downloadLeadsCsv } from '../utils/lead-export.js';
import { appointmentsByDate, calendarDays, formatMonthLabel, monthKeyFromDate, monthRange, shiftMonth } from '../utils/calendar.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { INTERESTS } from '../utils/lead.js';
import { buildAppointmentSlots, DEFAULT_STORE_SCHEDULE } from '../utils/schedule.js';
import { appointmentFollowUps, buildWhatsAppFollowUpUrl, followUpAvailableAt, isFollowUpContacted } from '../utils/follow-up.js';
import { STORES } from '../utils/stores.js';
import { profileStoreIds } from '../utils/permissions.js';
import { formatAccessStoreSummary } from '../utils/access.js';
import { currentRoute, currentRouteParam, navigate } from './router.js';

const DEMO_SESSION_KEY = 'fascinlead:demo-session';
const DEMO_ROLE_KEY = 'fascinlead:demo-role';

const appIcons = {
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
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
  MessageCircle,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Target,
  Trash2,
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
  unsubscribeAppointments: null,
  unsubscribeStoreSchedule: null,
  unsubscribeFollowUpSchedule: null,
  unsubscribeFollowUpLeads: null,
  unsubscribeDayAppointments: null,
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
  appointments: {
    loading: false,
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    updatingId: '',
    backfillingMonth: '',
    backfilledMonths: [],
    month: monthKeyFromDate(),
    storeId: '',
    selectedDate: toLocalDateInput(new Date())
  },
  newLeadSchedule: {
    loaded: false,
    loading: false,
    error: '',
    settings: { ...DEFAULT_STORE_SCHEDULE },
    appointmentDate: '',
    appointments: []
  },
  followUps: {
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    settingsByStore: {},
    settings: { ...DEFAULT_STORE_SCHEDULE }
  },
  settings: {
    loaded: false,
    loading: false,
    saving: false,
    error: '',
    selectedStoreId: STORES[0]?.id || '',
    records: []
  },
  access: {
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    accesses: [],
    storeIds: []
  },
  goals: {
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    records: [],
    members: [],
    truncated: false,
    pendingDeleteId: '',
    draft: createDefaultGoalDraft()
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

function createDefaultGoalDraft(storeId = '') {
  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    title: 'Meta de captacoes',
    targetCount: 20,
    startDate: toLocalDateInput(today),
    endDate: toLocalDateInput(monthEnd),
    storeId,
    assigneeUids: []
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

function createDemoProfile() {
  const role = sessionStorage.getItem(DEMO_ROLE_KEY);
  if (role === 'admin') return { ...demoProfile, uid: 'demo-admin', displayName: 'Administrador de Teste', role: 'admin', storeId: 'loja-06', storeIds: STORES.map((store) => store.id) };
  if (role === 'manager') return { ...demoProfile, uid: 'demo-manager', displayName: 'Gestor de Teste', role: 'manager', storeId: 'loja-06', storeIds: ['loja-06', 'loja-02'] };
  return demoProfile;
}

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

function pendingFollowUps() {
  const source = state.demoMode || state.profile?.role === 'captor'
    ? state.leads
    : state.followUps.records;
  return appointmentFollowUps(source, state.profile, {
    ...state.followUps.settings,
    byStore: state.followUps.settingsByStore
  });
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

function formatGoalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Data indisponivel';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}

function formatAppointmentDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Data indisponivel';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(new Date(`${value}T12:00:00`));
}

function formatFollowUpAvailableAt(lead) {
  const settings = state.followUps.settingsByStore[lead.storeId] || state.followUps.settings;
  const availableAt = followUpAvailableAt(lead, settings.noShowGraceMinutes);
  return availableAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(availableAt) : '';
}

function formatDateTimeValue(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
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
  const stores = profileStoreIds(state.profile);
  const storeText = state.profile.role === 'admin' ? 'Todas as lojas' : stores.length > 1 ? `${stores.length} unidades` : storeLabel(state.profile.storeId);
  return `
    <header class="app-header">
      <div class="header-inner ${['management', 'appointments', 'access', 'goals', 'settings'].includes(state.route) ? 'layout-wide' : ''}">
        <div>
          <p class="eyebrow">FASCINLEAD</p>
          <p class="header-store">${escapeHtml(storeText)}</p>
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
  const followUps = pendingFollowUps();

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
      ${['captor', 'manager', 'admin'].includes(state.profile.role) ? `<button class="action-card" type="button" data-route="follow-ups">
        <span class="action-icon"><i data-lucide="bell-ring"></i></span>
        <span><strong>${canManage() ? 'Retornos da equipe' : 'Retornos pendentes'}</strong><small>${followUps.length ? `${followUps.length} cliente(s) em acompanhamento` : 'Nenhum retorno pendente'}</small></span>
        ${followUps.length ? `<span class="notification-count" aria-label="${followUps.length} pendencia(s)">${followUps.length}</span>` : '<i data-lucide="chevron-right"></i>'}
      </button>` : ''}
      ${canManage() ? `<button class="action-card" type="button" data-route="management">
        <span class="action-icon"><i data-lucide="bar-chart-3"></i></span>
        <span><strong>Painel de gestao</strong><small>Consultar e exportar captacoes</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${canManage() ? `<button class="action-card" type="button" data-route="appointments">
        <span class="action-icon"><i data-lucide="calendar-days"></i></span>
        <span><strong>Agenda de exames</strong><small>Visualizar os pre-agendamentos</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      <button class="action-card" type="button" data-route="goals">
        <span class="action-icon"><i data-lucide="target"></i></span>
        <span><strong>Metas</strong><small>${canManage() ? 'Definir e acompanhar a equipe' : 'Acompanhar meu desempenho'}</small></span>
        <i data-lucide="chevron-right"></i>
      </button>
      ${isAdmin() ? `<button class="action-card" type="button" data-route="access">
        <span class="action-icon"><i data-lucide="user-round-cog"></i></span>
        <span><strong>Acessos da equipe</strong><small>Autorizar colaboradores e administradores</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${isAdmin() ? `<button class="action-card" type="button" data-route="settings">
        <span class="action-icon"><i data-lucide="wrench"></i></span>
        <span><strong>Configuracoes da agenda</strong><small>Definir horarios e duracao por loja</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
    </section>`;
}

function appointmentTimeField() {
  const { settings, appointmentDate, appointments, loading, error } = state.newLeadSchedule;
  if (settings.schedulingMode === 'free') {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horario</label><input id="appointmentTime" name="appointmentTime" type="time" /><small class="field-error"></small></div>`;
  }

  const slots = appointmentDate ? buildAppointmentSlots(settings, appointments) : [];
  const availableSlots = slots.filter((slot) => slot.available);
  let placeholder = 'Escolha primeiro uma data';
  if (loading) placeholder = 'Consultando horarios...';
  else if (error) placeholder = 'Horarios indisponiveis';
  else if (appointmentDate && !availableSlots.length) placeholder = 'Dia sem horarios disponiveis';
  else if (appointmentDate) placeholder = 'Selecione um horario';

  const options = availableSlots
    .map((slot) => `<option value="${slot.time}">${slot.time} - ${slot.endTime}</option>`)
    .join('');
  return `<div class="field" data-field="appointmentTime">
    <label for="appointmentTime">Horario disponivel</label>
    <select id="appointmentTime" name="appointmentTime" ${!appointmentDate || loading || error || !availableSlots.length ? 'disabled' : ''}>
      <option value="">${placeholder}</option>${options}
    </select>
    <small class="field-error"></small>
    ${appointmentDate && !loading && !error ? `<small class="schedule-availability">${availableSlots.length} de ${slots.length} horario(s) disponivel(is)</small>` : ''}
  </div>`;
}

function newLeadView() {
  const interests = INTERESTS.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  return `
    <section class="page-heading compact">
      <button class="back-button" type="button" data-route="home" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">NOVA ABORDAGEM</p><h1>Pre-cadastro</h1><p>Preencha somente o necessario.</p></div>
    </section>
    <form id="lead-form" class="form-panel" novalidate>
      <input name="schedulingMode" type="hidden" value="${escapeHtml(state.newLeadSchedule.settings.schedulingMode)}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${state.newLeadSchedule.settings.appointmentDurationMinutes}" />
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
        <div class="field" data-field="appointmentDate"><label for="appointmentDate">Data do pre-agendamento</label><input id="appointmentDate" name="appointmentDate" type="date" min="${toLocalDateInput(new Date())}" value="${escapeHtml(state.newLeadSchedule.appointmentDate)}" /><small class="schedule-date-status"></small><small class="field-error"></small></div>
        <div id="appointment-time-field">${appointmentTimeField()}</div>
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
        return `<button class="lead-item" type="button" data-open-lead-id="${escapeHtml(lead.id)}" aria-label="Ver cadastro de ${escapeHtml(lead.fullName)}">
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

function followUpsView() {
  if (!['captor', 'manager', 'admin'].includes(state.profile?.role)) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Retornos pendentes</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Esta area e exclusiva para captadores e gestores.</span></div>`;
  }

  const records = pendingFollowUps();
  const managerView = canManage();
  const adminView = isAdmin();
  const renderItem = (lead) => {
      const whatsAppUrl = buildWhatsAppFollowUpUrl(lead);
      const manuallyMissed = lead.appointmentAttendance === 'missed';
      const contacted = isFollowUpContacted(lead);
      return `<article class="follow-up-item">
        <div class="follow-up-heading">
          <span class="follow-up-icon"><i data-lucide="bell-ring"></i></span>
          <div><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span></div>
          <span class="status-badge ${contacted ? 'status-success' : 'status-warning'}">${contacted ? 'Contato iniciado' : 'Aguardando contato'}</span>
        </div>
        <dl class="follow-up-details">
          <div><dt>Agendamento</dt><dd>${escapeHtml(formatAppointmentDate(lead.appointmentDate))}, ${escapeHtml(lead.appointmentTime)}</dd></div>
          <div><dt>Retorno liberado</dt><dd>${escapeHtml(formatFollowUpAvailableAt(lead))}</dd></div>
          ${managerView ? `<div><dt>Situacao</dt><dd>${manuallyMissed ? 'Nao compareceu' : 'Sem confirmacao'}</dd></div>
          <div><dt>Ultimo contato</dt><dd>${contacted ? escapeHtml(formatDateTimeValue(lead.followUpContactedAt)) : 'Ainda nao iniciado'}</dd></div>
          ${adminView ? `<div><dt>Loja</dt><dd>${escapeHtml(storeLabel(lead.storeId))}</dd></div>` : ''}` : ''}
        </dl>
        ${managerView ? '' : `<div class="follow-up-actions">
          <a class="button button-whatsapp" data-follow-up-whatsapp="${escapeHtml(lead.id)}" href="${escapeHtml(whatsAppUrl)}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i><span>Chamar no WhatsApp</span></a>
          <button class="button button-secondary" type="button" data-open-lead-id="${escapeHtml(lead.id)}"><i data-lucide="calendar-days"></i><span>Reagendar</span></button>
        </div>`}
      </article>`;
  };
  const contactedCount = records.filter(isFollowUpContacted).length;
  const captorGroups = [...records.reduce((groups, lead) => {
    const key = lead.capturedByUid || lead.capturedByName || 'captor';
    if (!groups.has(key)) groups.set(key, { name: lead.capturedByName || 'Captador nao informado', records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const items = records.length
    ? (managerView
      ? captorGroups.map((group) => `<section class="follow-up-team-group">
          <header class="follow-up-team-heading"><span class="avatar">${escapeHtml(profileInitials(group.name))}</span><div><strong>${escapeHtml(group.name)}</strong><span>${group.records.length} retorno(s)</span></div></header>
          <div class="follow-up-list">${group.records.map(renderItem).join('')}</div>
        </section>`).join('')
      : records.map(renderItem).join(''))
    : `<div class="empty-state"><i data-lucide="circle-check"></i><strong>Nenhum retorno pendente</strong><p>As faltas registradas pela loja aparecerao aqui depois do tempo de tolerancia.</p></div>`;

  return `<section class="page-heading compact"><div><p class="eyebrow">ACOMPANHAMENTO</p><h1>${managerView ? 'Retornos da equipe' : 'Retornos pendentes'}</h1><p>${managerView ? 'Acompanhe os contatos realizados por cada colaborador.' : 'Retome o contato com clientes que nao compareceram.'}</p></div></section>
    ${state.followUps.error ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>${escapeHtml(state.followUps.error)}</span></div>` : ''}
    ${state.followUps.truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A lista atingiu o limite de 500 registros.</span></div>` : ''}
    ${managerView ? `<section class="follow-up-metrics" aria-label="Resumo dos retornos">
      <div class="metric"><span>Retornos</span><strong>${records.length}</strong><i data-lucide="bell-ring"></i></div>
      <div class="metric metric-warning"><span>Aguardando contato</span><strong>${records.length - contactedCount}</strong><i data-lucide="clock-3"></i></div>
      <div class="metric metric-success"><span>Contato iniciado</span><strong>${contactedCount}</strong><i data-lucide="message-circle"></i></div>
      <div class="metric"><span>Captadores</span><strong>${captorGroups.length}</strong><i data-lucide="users"></i></div>
    </section>` : ''}
    <section class="${managerView ? 'follow-up-team-list' : 'follow-up-list'}">${items}</section>`;
}

function leadDetailView() {
  const managementMode = state.route === 'management-lead';
  if (managementMode && !isAdmin()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Detalhes do lead</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem alterar leads da equipe.</span></div>`;
  }

  const source = managementMode
    ? [...state.management.records, ...state.appointments.records]
    : state.leads;
  const lead = source.find((item) => item.id === currentRouteParam());
  const backRoute = managementMode ? 'management' : 'leads';
  if (!lead) {
    return `<section class="page-heading compact">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">CADASTRO</p><h1>Cadastro nao encontrado</h1><p>Volte para a lista e tente novamente.</p></div>
    </section>`;
  }

  const [syncStatus, syncTone] = managementMode ? ['Sincronizado', 'success'] : syncLabel(lead);
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${lead.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  return `
    <section class="page-heading compact">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <div><p class="eyebrow">DETALHES DO CADASTRO</p><h1>${escapeHtml(lead.fullName)}</h1><p>Confira os dados e corrija o que for necessario.</p></div>
    </section>
    <section class="lead-detail-summary" aria-label="Informacoes do cadastro">
      <div><span>Status</span><strong class="status-badge status-${syncTone}">${syncStatus}</strong></div>
      <div><span>Loja</span><strong>${escapeHtml(storeLabel(lead.storeId))}</strong></div>
      <div><span>Cadastrado em</span><strong>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</strong></div>
    </section>
    <form id="edit-lead-form" class="form-panel" data-lead-id="${escapeHtml(lead.id)}" data-management="${managementMode}" novalidate>
      <input name="schedulingMode" type="hidden" value="${escapeHtml(lead.appointmentSchedulingMode || 'free')}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${Number(lead.appointmentDurationMinutes) || 20}" />
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
      ${managementMode ? `<button class="button button-danger button-block" type="button" data-delete-lead="${escapeHtml(lead.id)}"><i data-lucide="trash-2"></i><span>Excluir lead</span></button>` : ''}
      <p class="form-footnote"><i data-lucide="shield-check"></i> Autor, loja e data original permanecem preservados.</p>
    </form>
    ${managementMode ? `<dialog id="delete-lead-dialog" class="confirmation-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
      <div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div>
      <div class="confirmation-dialog-copy">
        <h2 id="delete-dialog-title">Excluir este lead?</h2>
        <p id="delete-dialog-description">O cadastro de <strong>${escapeHtml(lead.fullName)}</strong> sera excluido definitivamente. Essa acao nao pode ser desfeita.</p>
      </div>
      <div class="confirmation-dialog-actions">
        <button class="button button-secondary" type="button" data-close-delete-dialog>Cancelar</button>
        <button class="button button-danger-solid" type="button" data-confirm-delete="${escapeHtml(lead.id)}"><i data-lucide="trash-2"></i><span>Excluir definitivamente</span></button>
      </div>
    </dialog>` : ''}`;
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

  const allowedStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${filters.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const captorOptions = captors.map(([uid, name]) => `<option value="${escapeHtml(uid)}" ${filters.capturedByUid === uid ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');

  const tableRows = pageRecords.map((lead) => `<tr>
    <td>${isAdmin() ? `<button class="management-lead-link" type="button" data-management-lead-id="${escapeHtml(lead.id)}"><strong>${escapeHtml(lead.fullName)}</strong><small>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</small></button>` : `<strong>${escapeHtml(lead.fullName)}</strong><small>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</small>`}</td>
    <td>${escapeHtml(lead.capturedByName || 'Nao informado')}</td>
    <td>${escapeHtml(storeLabel(lead.storeId))}</td>
    <td>${escapeHtml(lead.interestLabel || 'Nao informado')}</td>
    <td>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</td>
  </tr>`).join('');

  const mobileRows = pageRecords.map((lead) => `<article class="management-card">
    <div>${isAdmin() ? `<button class="management-lead-link" type="button" data-management-lead-id="${escapeHtml(lead.id)}"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span></button>` : `<strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span>`}</div>
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
    <section class="management-heading management-dashboard-heading">
      <div class="management-heading-copy"><p class="eyebrow">GESTAO DA CAPTACAO</p><h1>Painel de leads</h1><p>Acompanhe os pre-cadastros recebidos pela equipe.</p></div>
      <div class="management-heading-actions">
        <button class="button button-secondary" type="button" data-route="appointments"><i data-lucide="calendar-days"></i><span>Agenda de exames</span></button>
        ${canManage() ? '<button class="button button-secondary" type="button" data-route="follow-ups"><i data-lucide="bell-ring"></i><span>Retornos da equipe</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="settings"><i data-lucide="wrench"></i><span>Configurar agenda</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="access"><i data-lucide="user-round-cog"></i><span>Gerenciar acessos</span></button>' : ''}
        <button class="button button-secondary" type="button" data-action="export-management" ${filtered.length === 0 ? 'disabled' : ''}><i data-lucide="file-down"></i><span>Exportar CSV</span></button>
      </div>
    </section>
    <form id="management-filters" class="management-filters">
      <div class="filter-title"><i data-lucide="filter"></i><div><strong>Filtros</strong><span>Periodo maximo recomendado: 90 dias.</span></div></div>
      <div class="management-filter-grid">
        <div class="field"><label for="management-start">Data inicial</label><input id="management-start" name="startDate" type="date" value="${escapeHtml(filters.startDate)}" required /></div>
        <div class="field"><label for="management-end">Data final</label><input id="management-end" name="endDate" type="date" value="${escapeHtml(filters.endDate)}" required /></div>
        ${canManage() && allowedStores.length > 1 ? `<div class="field"><label for="management-store">Loja</label><select id="management-store" name="storeId"><option value="">Todas as lojas permitidas</option>${storeOptions}</select></div>` : ''}
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

function appointmentsView() {
  if (!canManage()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Agenda de exames</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso a agenda gerencial.</span></div>`;
  }

  const { loading, error, truncated, month, storeId, selectedDate, updatingId } = state.appointments;
  const records = state.demoMode
    ? state.leads.filter((lead) => String(lead.appointmentDate || '').startsWith(`${month}-`))
    : state.appointments.records;
  const groups = appointmentsByDate(records);
  const days = calendarDays(month);
  const selected = groups[selectedDate] || [];
  const allowedStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const cells = days.map((day) => {
    const items = groups[day.date] || [];
    const first = items[0];
    const classes = [
      'calendar-day',
      day.inCurrentMonth ? '' : 'is-outside',
      day.isToday ? 'is-today' : '',
      day.date === selectedDate ? 'is-selected' : '',
      items.length ? 'has-appointments' : ''
    ].filter(Boolean).join(' ');
    return `<button class="${classes}" type="button" data-appointment-date="${day.date}" aria-label="${day.day} de ${escapeHtml(formatMonthLabel(month))}, ${items.length} agendamento(s)">
      <span class="calendar-day-number">${day.day}</span>
      ${items.length ? `<span class="calendar-count"><strong>${items.length}</strong><span> ${items.length === 1 ? 'exame' : 'exames'}</span></span>
        <span class="calendar-preview">${escapeHtml(first.appointmentTime)} · ${escapeHtml(first.preferredName || first.fullName)}</span>` : ''}
    </button>`;
  }).join('');

  const selectedItems = selected.length
    ? selected.map((lead) => {
      const attendance = lead.appointmentAttendance || 'pending';
      const updating = updatingId === lead.id;
      return `<article class="appointment-item">
        <div class="appointment-time"><i data-lucide="clock-3"></i><strong>${escapeHtml(lead.appointmentTime)}</strong></div>
        <div class="appointment-person"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(storeLabel(lead.storeId))} · ${escapeHtml(lead.capturedByName || 'Captador nao informado')}</small></div>
        <div class="appointment-attendance" role="group" aria-label="Comparecimento de ${escapeHtml(lead.fullName)}">
          <button class="attendance-button is-attended ${attendance === 'attended' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="attended" aria-pressed="${attendance === 'attended'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-check"></i><span>Compareceu</span></button>
          <button class="attendance-button is-missed ${attendance === 'missed' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="missed" aria-pressed="${attendance === 'missed'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-x"></i><span>Nao compareceu</span></button>
        </div>
        ${isAdmin() ? `<button class="icon-button appointment-open" type="button" data-appointment-lead-id="${escapeHtml(lead.id)}" title="Abrir cadastro" aria-label="Abrir cadastro de ${escapeHtml(lead.fullName)}"><i data-lucide="chevron-right"></i></button>` : ''}
      </article>`;
    }).join('')
    : `<div class="agenda-empty"><i data-lucide="calendar-days"></i><strong>Nenhum exame neste dia</strong><p>Selecione uma data destacada no calendario.</p></div>`;

  const storeTotals = allowedStores
    .map((store) => ({ ...store, count: records.filter((lead) => lead.storeId === store.id).length }))
    .filter((store) => !storeId || store.id === storeId)
    .map((store) => `<div class="agenda-store-row"><span><i data-lucide="building-2"></i>${store.label}</span><strong>${store.count} exame(s)</strong></div>`)
    .join('');

  return `<section class="management-heading agenda-heading">
      <div><p class="eyebrow">EXAMES</p><h1>Agenda de exames</h1><p>Visualize os pre-agendamentos registrados pela equipe.</p></div>
      <button class="button button-secondary" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A agenda atingiu o limite de ${APPOINTMENTS_QUERY_LIMIT} exames neste mes.</span></div>` : ''}
    <section class="agenda-layout" aria-busy="${loading}">
      <div class="calendar-panel">
        <div class="calendar-toolbar">
          <div class="calendar-navigation">
            <button class="icon-button" type="button" data-appointment-month="-1" aria-label="Mes anterior"><i data-lucide="chevron-left"></i></button>
            <h2>${escapeHtml(formatMonthLabel(month))}</h2>
            <button class="icon-button" type="button" data-appointment-month="1" aria-label="Proximo mes"><i data-lucide="chevron-right"></i></button>
          </div>
          <div class="calendar-toolbar-actions">
            ${allowedStores.length > 1 ? `<label class="calendar-store-filter"><span>Unidade</span><select id="appointments-store"><option value="">Todas as lojas permitidas</option>${storeOptions}</select></label>` : ''}
            <button class="button button-secondary calendar-today" type="button" data-action="appointments-today">Hoje</button>
          </div>
        </div>
        <div class="calendar-weekdays" aria-hidden="true"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span></div>
        ${loading ? '<div class="calendar-loading"><i data-lucide="refresh-cw"></i><span>Carregando agenda...</span></div>' : `<div class="calendar-grid">${cells}</div>`}
      </div>
      <aside class="agenda-sidebar">
        <section class="agenda-summary"><div class="agenda-section-title"><i data-lucide="building-2"></i><h2>Unidades</h2></div>${storeTotals}</section>
        <section class="agenda-day-details"><div class="agenda-section-title"><i data-lucide="calendar-days"></i><div><h2>Agendamentos</h2><p>${escapeHtml(formatAppointmentDate(selectedDate))}</p></div></div><div class="appointment-list">${selectedItems}</div></section>
      </aside>
    </section>`;
}

function settingsView() {
  if (!isAdmin()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Configuracoes</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem alterar as configuracoes das lojas.</span></div>`;
  }

  const { records, selectedStoreId, loading, saving, error } = state.settings;
  const selected = records.find((item) => item.id === selectedStoreId)
    || { ...STORES.find((item) => item.id === selectedStoreId), ...DEFAULT_STORE_SCHEDULE };
  const previewSlots = buildAppointmentSlots(selected);
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${store.label}</option>`).join('');

  return `<section class="management-heading settings-heading">
      <div><button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button><p class="eyebrow">ADMINISTRACAO</p><h1>Configuracoes da agenda</h1><p>Defina a disponibilidade de exames de cada unidade.</p></div>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    <section class="settings-layout" aria-busy="${loading}">
      <form id="schedule-settings-form" class="settings-form" novalidate>
        <div class="filter-title"><i data-lucide="calendar-days"></i><div><strong>Agenda da unidade</strong><span>As alteracoes valem para novos pre-agendamentos.</span></div></div>
        <div class="field"><label for="settings-store">Loja</label><select id="settings-store" name="storeId">${storeOptions}</select></div>
        <div class="field" data-field="schedulingMode"><label for="settings-mode">Disponibilidade</label><select id="settings-mode" name="schedulingMode"><option value="controlled" ${selected.schedulingMode === 'controlled' ? 'selected' : ''}>Controlada por horarios</option><option value="free" ${selected.schedulingMode === 'free' ? 'selected' : ''}>Cadastro livre</option></select><small class="field-error"></small></div>
        <div class="schedule-settings-fields ${selected.schedulingMode === 'free' ? 'is-disabled' : ''}">
          <div class="field" data-field="appointmentDurationMinutes"><label for="settings-duration">Duracao da consulta</label><div class="number-with-unit"><input id="settings-duration" name="appointmentDurationMinutes" type="number" min="5" max="180" step="5" value="${selected.appointmentDurationMinutes}" ${selected.schedulingMode === 'free' ? 'disabled' : ''} /><span>min</span></div><small class="field-error"></small></div>
          <div class="field-row schedule-hours">
            <div class="field" data-field="openingTime"><label for="settings-opening">Inicio</label><input id="settings-opening" name="openingTime" type="time" value="${selected.openingTime}" ${selected.schedulingMode === 'free' ? 'disabled' : ''} /><small class="field-error"></small></div>
            <div class="field" data-field="closingTime"><label for="settings-closing">Fim</label><input id="settings-closing" name="closingTime" type="time" value="${selected.closingTime}" ${selected.schedulingMode === 'free' ? 'disabled' : ''} /><small class="field-error"></small></div>
          </div>
        </div>
        <div class="field schedule-grace-field" data-field="noShowGraceMinutes"><label for="settings-no-show-grace">Tolerancia apos o horario</label><small id="settings-no-show-help" class="field-help">Tempo para liberar o retorno ao captador quando houver falta.</small><div class="number-with-unit"><input id="settings-no-show-grace" name="noShowGraceMinutes" type="number" min="0" max="240" step="5" value="${selected.noShowGraceMinutes}" aria-describedby="settings-no-show-help" /><span>min</span></div><small class="field-error"></small></div>
        <input name="automaticPendingFollowUp" type="hidden" value="false" />
        <label class="setting-toggle checkbox-label" for="settings-automatic-follow-up">
          <span><strong>Gerar retorno automaticamente</strong><small>Inclui agendamentos sem confirmacao depois da tolerancia.</small></span>
          <input id="settings-automatic-follow-up" name="automaticPendingFollowUp" type="checkbox" value="true" ${selected.automaticPendingFollowUp ? 'checked' : ''} />
          <span class="setting-toggle-control" aria-hidden="true"></span>
        </label>
        <button class="button button-primary button-block" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar configuracao'}</span></button>
      </form>
      <aside class="schedule-preview">
        <div class="filter-title"><i data-lucide="clock-3"></i><div><strong>Resumo do atendimento</strong><span>${escapeHtml(selected.label || storeLabel(selectedStoreId))}</span></div></div>
        ${selected.schedulingMode === 'free'
          ? '<div class="schedule-free-state"><i data-lucide="calendar-days"></i><strong>Cadastro livre</strong><span>O captador podera informar qualquer horario.</span></div>'
          : `<div class="schedule-summary-grid"><div><span>Duracao</span><strong>${selected.appointmentDurationMinutes} min</strong></div><div><span>Expediente</span><strong>${selected.openingTime} - ${selected.closingTime}</strong></div><div><span>Capacidade diaria</span><strong>${previewSlots.length} consulta(s)</strong></div><div><span>Alerta de falta</span><strong>${selected.noShowGraceMinutes} min</strong></div><div><span>Retorno automatico</span><strong>${selected.automaticPendingFollowUp ? 'Ativo' : 'Desativado'}</strong></div></div>
            <div class="schedule-slot-preview" aria-label="Exemplo de horarios">${previewSlots.slice(0, 12).map((slot) => `<span>${slot.time}</span>`).join('')}${previewSlots.length > 12 ? `<span>+${previewSlots.length - 12}</span>` : ''}</div>`}
      </aside>
    </section>`;
}

function accessView() {
  if (!isAdmin()) {
    return `<section class="page-heading"><p class="eyebrow">ACESSO RESTRITO</p><h1>Acessos da equipe</h1></section>
      <div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem gerenciar acessos.</span></div>`;
  }

  const { accesses, loading, saving, error } = state.access;
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${state.profile.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const storeChecks = STORES.map((store) => `<label class="access-store-option checkbox-label"><input type="checkbox" name="storeIds" value="${store.id}" /><span>${store.label}</span></label>`).join('');
  const rows = accesses.map((access) => {
    const isCurrentUser = access.email === state.profile.email?.toLowerCase();
    const storeSummary = formatAccessStoreSummary(access);
    return `<article class="access-row ${access.active ? '' : 'is-inactive'}">
      <div class="access-identity">
        <span class="avatar access-avatar">${escapeHtml(profileInitials(access.displayName))}</span>
        <div class="access-identity-copy"><strong>${escapeHtml(access.displayName)}</strong><span>${escapeHtml(access.email)}</span></div>
      </div>
      <div class="access-detail access-permissions"><span>Perfil e unidades</span><strong>${roleLabel(access.role)}</strong><small title="${escapeHtml(storeSummary.full)}">${escapeHtml(storeSummary.short)}</small></div>
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
        <div class="field" data-field="role"><label for="access-role">Perfil</label><select id="access-role" name="role" required><option value="captor">Colaborador (captador)</option><option value="manager">Gestor de unidades</option><option value="admin">Administrador</option></select><small class="field-error"></small></div>
        <div class="field" data-field="storeId"><label for="access-store">Loja</label><select id="access-store" name="storeId" required>${storeOptions}</select><small class="field-error"></small></div>
        <fieldset id="access-stores-field" class="field access-store-picker" data-field="storeIds" hidden><legend>Unidades permitidas</legend><div>${storeChecks}</div><small class="field-error"></small></fieldset>
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

function goalStatus(goal) {
  const today = toLocalDateInput(new Date());
  if (goal.completed >= goal.targetCount) return ['Concluida', 'success'];
  if (today < goal.startDate) return ['Agendada', 'neutral'];
  if (today > goal.endDate) return ['Encerrada', 'danger'];
  return ['Em andamento', 'warning'];
}

function goalsView() {
  const { records, members, loading, saving, error, truncated, draft, pendingDeleteId } = state.goals;
  const visibleMembers = members.filter((member) => member.storeId === draft.storeId);
  const selectedCount = draft.assigneeUids.filter((uid) => visibleMembers.some((member) => member.uid === uid)).length;
  const completedGoals = records.filter((goal) => goal.completed >= goal.targetCount).length;
  const totalCaptured = records.reduce((total, goal) => total + goal.completed, 0);
  const selectedGoal = records.find((goal) => goal.id === pendingDeleteId);
  const goalStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = goalStores.map((store) => `<option value="${store.id}" ${draft.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const memberOptions = visibleMembers.length
    ? visibleMembers.map((member) => `<label class="goal-member-option">
        <input type="checkbox" name="assigneeUids" value="${escapeHtml(member.uid)}" ${draft.assigneeUids.includes(member.uid) ? 'checked' : ''} />
        <span class="avatar">${escapeHtml(profileInitials(member.displayName))}</span>
        <span><strong>${escapeHtml(member.displayName)}</strong><small>${escapeHtml(storeLabel(member.storeId))}</small></span>
      </label>`).join('')
    : '<p class="goal-members-empty">Nenhum captador ativo nesta loja.</p>';

  const goalCards = records.length
    ? records.map((goal) => {
        const [status, tone] = goalStatus(goal);
        return `<article class="goal-card">
          <div class="goal-card-heading">
            <div><span class="status-badge status-${tone}">${status}</span><h2>${escapeHtml(goal.title)}</h2></div>
            ${canManage() ? `<button class="icon-button goal-delete" type="button" data-delete-goal="${escapeHtml(goal.id)}" title="Excluir meta"><i data-lucide="trash-2"></i></button>` : ''}
          </div>
          <div class="goal-person"><span class="avatar">${escapeHtml(profileInitials(goal.assigneeName))}</span><div><strong>${escapeHtml(goal.assigneeName)}</strong><span>${escapeHtml(storeLabel(goal.storeId))}</span></div></div>
          <div class="goal-progress-copy"><strong>${goal.completed} de ${goal.targetCount} leads</strong><span>${goal.percentage}%</span></div>
          <div class="goal-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${goal.percentage}"><span style="width: ${goal.percentage}%"></span></div>
          <div class="goal-card-footer"><span>${formatGoalDate(goal.startDate)} a ${formatGoalDate(goal.endDate)}</span><strong>${goal.remaining ? `${goal.remaining} restante(s)` : 'Meta alcancada'}</strong></div>
        </article>`;
      }).join('')
    : `<div class="empty-state goals-empty"><i data-lucide="target"></i><strong>Nenhuma meta cadastrada</strong><p>${canManage() ? 'Crie a primeira meta de captacao para a equipe.' : 'Quando uma meta for atribuida, ela aparecera aqui.'}</p></div>`;

  const creator = canManage() ? `<form id="goal-form" class="goal-form" novalidate>
      <div class="filter-title"><i data-lucide="target"></i><div><strong>Nova meta</strong><span>Quantidade de leads sincronizados no periodo.</span></div></div>
      <div class="field" data-field="title"><label for="goal-title">Titulo</label><input id="goal-title" name="title" maxlength="80" value="${escapeHtml(draft.title)}" required /><small class="field-error"></small></div>
      <div class="goal-form-grid">
        <div class="field" data-field="targetCount"><label for="goal-target">Quantidade</label><input id="goal-target" name="targetCount" type="number" min="1" max="10000" step="1" value="${draft.targetCount}" required /><small class="field-error"></small></div>
        <div class="field" data-field="startDate"><label for="goal-start">Inicio</label><input id="goal-start" name="startDate" type="date" value="${escapeHtml(draft.startDate)}" required /><small class="field-error"></small></div>
        <div class="field" data-field="endDate"><label for="goal-end">Fim</label><input id="goal-end" name="endDate" type="date" value="${escapeHtml(draft.endDate)}" required /><small class="field-error"></small></div>
      </div>
      <div class="field" data-field="storeId"><label for="goal-store">Loja</label>${isAdmin() || goalStores.length > 1
        ? `<select id="goal-store" name="storeId" required>${storeOptions}</select>`
        : `<input id="goal-store" name="storeId" value="${escapeHtml(draft.storeId)}" type="hidden" /><div class="readonly-field">${escapeHtml(storeLabel(draft.storeId))}</div>`}<small class="field-error"></small></div>
      <fieldset class="goal-members field" data-field="assigneeUids"><legend>Colaboradores <span>${selectedCount} selecionado(s)</span></legend><div class="goal-member-list">${memberOptions}</div><small class="field-error"></small></fieldset>
      <button class="button button-primary button-block" type="submit" ${saving || !visibleMembers.length ? 'disabled' : ''}><i data-lucide="target"></i><span>${saving ? 'Criando...' : 'Criar metas'}</span></button>
    </form>` : '';

  return `
    <section class="management-heading goals-heading">
      <div><p class="eyebrow">DESEMPENHO DE CAPTACAO</p><h1>Metas</h1><p>${canManage() ? 'Defina objetivos e acompanhe os resultados permitidos ao seu perfil.' : 'Acompanhe suas metas individuais de captacao.'}</p></div>
      <button class="button button-secondary" type="button" data-action="reload-goals" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>Atualizar</span></button>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O calculo atingiu ${GOALS_LEAD_LIMIT} leads. Reduza os periodos das metas para conferir o resultado completo.</span></div>` : ''}
    <section class="goal-metrics" aria-label="Resumo das metas">
      <div><span>Metas</span><strong>${records.length}</strong></div>
      <div><span>Concluidas</span><strong>${completedGoals}</strong></div>
      <div><span>Captacoes contabilizadas</span><strong>${totalCaptured}</strong></div>
    </section>
    <section class="goals-layout ${canManage() ? '' : 'goals-layout-personal'}">
      ${creator}
      <section class="goals-results" aria-busy="${loading}">
        <div class="access-list-heading"><div><strong>${canManage() ? 'Desempenho da equipe' : 'Minhas metas'}</strong><span>${records.length} meta(s)</span></div></div>
        ${loading && !records.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando metas...</strong></div>' : goalCards}
      </section>
    </section>
    ${selectedGoal ? `<dialog id="delete-goal-dialog" class="confirmation-dialog" aria-labelledby="delete-goal-title">
      <div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div>
      <div><p class="eyebrow">EXCLUIR META</p><h2 id="delete-goal-title">Remover esta meta?</h2><p>A meta de ${escapeHtml(selectedGoal.assigneeName)} sera excluida. As captacoes permanecem intactas.</p></div>
      <div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-close-goal-dialog>Cancelar</button><button class="button button-danger-solid" type="button" data-confirm-delete-goal="${escapeHtml(selectedGoal.id)}"><i data-lucide="trash-2"></i><span>Excluir meta</span></button></div>
    </dialog>` : ''}`;
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
    <button class="button button-primary button-block" type="button" data-action="sync"><i data-lucide="refresh-cw"></i><span>Sincronizar agora</span></button>`;
}

function bottomNav() {
  const items = [
    ['home', 'house', 'Inicio'],
    ['new', 'circle-plus', 'Novo'],
    ['leads', 'clipboard-list', 'Cadastros'],
    ['sync', 'refresh-cw', 'Sync']
  ];
  if (state.profile?.role === 'captor') items.splice(3, 0, ['follow-ups', 'bell-ring', 'Retornos']);
  if (canManage()) items.push(['management', 'bar-chart-3', 'Gestao']);
  const followUpCount = pendingFollowUps().length;
  return `<nav class="bottom-nav ${items.length === 5 ? 'has-five-items' : ''}" aria-label="Navegacao principal">${items.map(([route, icon, label]) => `
    <button type="button" data-route="${route}" class="${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'appointments', 'settings', 'follow-ups'].includes(state.route)) ? 'is-active' : ''}" ${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'appointments', 'settings', 'follow-ups'].includes(state.route)) ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>${route === 'follow-ups' && followUpCount ? `<strong class="nav-notification-count">${followUpCount > 99 ? '99+' : followUpCount}</strong>` : ''}
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, lead: leadDetailView, sync: syncView, 'follow-ups': followUpsView, management: managementView, 'management-lead': leadDetailView, appointments: appointmentsView, access: accessView, goals: goalsView, settings: settingsView };
  const page = pages[state.route] || homeView;
  const wideLayout = ['management', 'appointments', 'access', 'goals', 'settings'].includes(state.route);
  return `${headerView()}<main class="app-main ${wideLayout ? 'layout-wide' : ''}">${page()}</main>${bottomNav()}`;
}

function syncAgendaSidebarHeight() {
  const agendaLayout = document.querySelector('.agenda-layout');
  const calendarPanel = agendaLayout?.querySelector('.calendar-panel');
  if (!agendaLayout || !calendarPanel) return;

  if (window.matchMedia('(max-width: 760px)').matches) {
    agendaLayout.style.removeProperty('--agenda-calendar-height');
    return;
  }

  agendaLayout.style.setProperty('--agenda-calendar-height', `${calendarPanel.getBoundingClientRect().height}px`);
}

function render() {
  const root = document.querySelector('#app');

  if (state.loading) {
    root.innerHTML = '<main class="loading-page"><div class="brand-mark">F</div><span>Preparando o FascinLead...</span></main>';
  } else {
    root.innerHTML = state.profile ? appView() : loginView();
  }

  if (state.updateAction) {
    root.insertAdjacentHTML('beforeend', `<aside class="update-banner" role="status">
      <i data-lucide="download"></i>
      <span>Nova versao disponivel.</span>
      <button class="button button-primary" type="button" data-action="update-app">Atualizar agora</button>
    </aside>`);
  }

  if (state.toast) {
    root.insertAdjacentHTML('beforeend', `<div class="toast toast-${state.toast.tone}" role="status"><i data-lucide="${state.toast.icon}"></i><span>${escapeHtml(state.toast.message)}</span></div>`);
  }

  createIcons({ icons: appIcons });
  bindPageEvents();
  requestAnimationFrame(syncAgendaSidebarHeight);
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
    const appointmentDateInput = form.elements.appointmentDate;
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#notes-count').textContent = notesInput.value.length; });
    appointmentDateInput.addEventListener('input', () => {
      state.newLeadSchedule.appointmentDate = appointmentDateInput.value;
      startDayAppointmentsSubscription();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const controlledAppointment = values.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime;
      if (state.newLeadSchedule.settings.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime) {
        const selectedSlot = buildAppointmentSlots(state.newLeadSchedule.settings, state.newLeadSchedule.appointments)
          .find((slot) => slot.time === values.appointmentTime);
        if (!selectedSlot?.available) {
          setFieldErrors(form, { appointmentTime: 'Este horario nao esta mais disponivel. Escolha outro.' });
          startDayAppointmentsSubscription();
          return;
        }
      }
      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;
      const result = saveLead(values, state.profile, state.demoMode, () => {
        if (!controlledAppointment) {
          state.dataError = 'Um cadastro nao foi aceito pela nuvem. Verifique o acesso e tente novamente.';
          render();
        }
      });
      setFieldErrors(form, result.errors || {});
      if (!result.isValid) {
        submitButton.disabled = false;
        return;
      }
      if (controlledAppointment && result.writePromise) {
        try {
          await result.writePromise;
        } catch {
          submitButton.disabled = false;
          setFieldErrors(form, { appointmentTime: 'Este horario acabou de ser ocupado. Escolha outro.' });
          startDayAppointmentsSubscription();
          return;
        }
      }
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
    editLeadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(editLeadForm));
      const submitButton = editLeadForm.querySelector('[type="submit"]');
      submitButton.disabled = true;

      if (editLeadForm.dataset.management === 'true') {
        try {
          const existingLead = state.management.records.find((lead) => lead.id === editLeadForm.dataset.leadId);
          const result = await updateManagementLead(state.profile, existingLead, values);
          setFieldErrors(editLeadForm, result.errors || {});
          if (!result.isValid) {
            submitButton.disabled = false;
            return;
          }
          state.management.records = state.management.records.map((lead) => lead.id === editLeadForm.dataset.leadId
            ? { ...lead, ...result.data }
            : lead);
          state.appointments.records = state.appointments.records.map((lead) => lead.id === editLeadForm.dataset.leadId
            ? { ...lead, ...result.data }
            : lead);
          navigate('management');
          showToast('Lead atualizado com sucesso.');
        } catch (error) {
          submitButton.disabled = false;
          showToast(error?.code === 'permission-denied' ? 'Seu perfil nao pode alterar este lead.' : 'Nao foi possivel atualizar o lead.', 'danger', 'circle-alert');
        }
        return;
      }

      const existingLead = state.leads.find((lead) => lead.id === editLeadForm.dataset.leadId);
      const result = updateLead(editLeadForm.dataset.leadId, values, state.demoMode, () => {
        state.dataError = 'A correcao nao foi aceita pela nuvem. Verifique o acesso e tente novamente.';
        render();
      }, existingLead);
      setFieldErrors(editLeadForm, result.errors || {});
      if (!result.isValid) {
        submitButton.disabled = false;
        if (result.notFound) navigate('leads');
        return;
      }
      navigate('leads');
      showToast(state.demoMode ? 'Cadastro atualizado neste navegador.' : 'Alteracoes salvas. A sincronizacao seguira automaticamente.');
    });
  }

  const deleteLeadDialog = document.querySelector('#delete-lead-dialog');
  deleteLeadDialog?.addEventListener('click', (event) => {
    if (event.target === deleteLeadDialog) deleteLeadDialog.close();
  });

  const search = document.querySelector('#lead-search');
  if (search) {
    search.addEventListener('input', () => {
      const selectionStart = search.selectionStart;
      const selectionEnd = search.selectionEnd;
      state.search = search.value;
      render();
      const nextSearch = document.querySelector('#lead-search');
      nextSearch?.focus();
      nextSearch?.setSelectionRange(selectionStart, selectionEnd);
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
      const selectionStart = managementSearch.selectionStart;
      const selectionEnd = managementSearch.selectionEnd;
      state.management.filters.search = managementSearch.value;
      state.management.page = 1;
      render();
      const nextSearch = document.querySelector('#management-search');
      nextSearch?.focus();
      nextSearch?.setSelectionRange(selectionStart, selectionEnd);
    });

    ['storeId', 'capturedByUid'].forEach((name) => {
      managementForm.elements[name]?.addEventListener('change', (event) => {
        state.management.filters[name] = event.target.value;
        state.management.page = 1;
        render();
      });
    });
  }

  const appointmentsStore = document.querySelector('#appointments-store');
  appointmentsStore?.addEventListener('change', () => {
    state.appointments.storeId = appointmentsStore.value;
    state.appointments.loaded = false;
    startAppointmentsSubscription();
  });

  const accessForm = document.querySelector('#access-form');
  if (accessForm) {
    const syncStorePicker = () => {
      const manager = accessForm.elements.role.value === 'manager';
      const picker = document.querySelector('#access-stores-field');
      picker.hidden = !manager;
      if (manager && !new FormData(accessForm).getAll('storeIds').length) {
        const primary = accessForm.querySelector(`[name="storeIds"][value="${accessForm.elements.storeId.value}"]`);
        if (primary) primary.checked = true;
      }
    };
    accessForm.elements.role.addEventListener('change', syncStorePicker);
    accessForm.elements.storeId.addEventListener('change', syncStorePicker);
    syncStorePicker();
    accessForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.access.saving) return;
      state.access.saving = true;
      setFieldErrors(accessForm, {});
      const formData = new FormData(accessForm);
      const values = { ...Object.fromEntries(formData), storeIds: formData.getAll('storeIds') };

      try {
        const result = await saveAccess(state.profile, values);
        if (!result.isValid) {
          state.access.saving = false;
          setFieldErrors(accessForm, result.errors);
          return;
        }
        accessForm.reset();
        accessForm.elements.storeId.value = state.profile.storeId;
        syncStorePicker();
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

  const scheduleSettingsForm = document.querySelector('#schedule-settings-form');
  if (scheduleSettingsForm) {
    scheduleSettingsForm.elements.storeId.addEventListener('change', () => {
      state.settings.selectedStoreId = scheduleSettingsForm.elements.storeId.value;
      render();
    });
    scheduleSettingsForm.elements.schedulingMode.addEventListener('change', () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) record.schedulingMode = scheduleSettingsForm.elements.schedulingMode.value;
      render();
    });
    ['appointmentDurationMinutes', 'noShowGraceMinutes', 'openingTime', 'closingTime'].forEach((name) => {
      scheduleSettingsForm.elements[name]?.addEventListener('change', () => {
        const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
        if (!record) return;
        record[name] = ['appointmentDurationMinutes', 'noShowGraceMinutes'].includes(name)
          ? Number(scheduleSettingsForm.elements[name].value)
          : scheduleSettingsForm.elements[name].value;
      });
    });
    document.querySelector('#settings-automatic-follow-up')?.addEventListener('change', (event) => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) record.automaticPendingFollowUp = event.target.checked;
      render();
    });
    scheduleSettingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.settings.saving) return;
      const values = Object.fromEntries(new FormData(scheduleSettingsForm));
      values.automaticPendingFollowUp = values.automaticPendingFollowUp === 'true';
      if (values.schedulingMode === 'free') {
        const current = state.settings.records.find((item) => item.id === values.storeId) || DEFAULT_STORE_SCHEDULE;
        values.appointmentDurationMinutes = current.appointmentDurationMinutes;
        values.openingTime = current.openingTime;
        values.closingTime = current.closingTime;
      }
      state.settings.saving = true;
      state.settings.error = '';
      setFieldErrors(scheduleSettingsForm, {});
      try {
        if (state.demoMode) {
          const record = state.settings.records.find((item) => item.id === values.storeId);
          Object.assign(record, values, {
            appointmentDurationMinutes: Number(values.appointmentDurationMinutes),
            noShowGraceMinutes: Number(values.noShowGraceMinutes),
            automaticPendingFollowUp: values.automaticPendingFollowUp
          });
          if (values.storeId === state.profile.storeId) {
            state.newLeadSchedule.settings = { ...state.newLeadSchedule.settings, ...record };
            state.followUps.settings = { ...state.followUps.settings, ...record };
          }
        } else {
          const result = await saveStoreSchedule(state.profile, values.storeId, values);
          if (!result.isValid) {
            state.settings.saving = false;
            setFieldErrors(scheduleSettingsForm, result.errors);
            return;
          }
          const record = state.settings.records.find((item) => item.id === values.storeId);
          Object.assign(record, result.data);
        }
        state.settings.saving = false;
        render();
        showToast('Configuracao da agenda salva.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode alterar estas configuracoes.'
          : 'Nao foi possivel salvar a configuracao.';
        render();
      }
    });
  }

  const goalForm = document.querySelector('#goal-form');
  if (goalForm) {
    const readDraft = () => ({
      title: goalForm.elements.title.value,
      targetCount: Number(goalForm.elements.targetCount.value),
      startDate: goalForm.elements.startDate.value,
      endDate: goalForm.elements.endDate.value,
      storeId: goalForm.elements.storeId.value,
      assigneeUids: new FormData(goalForm).getAll('assigneeUids')
    });

    goalForm.elements.storeId.addEventListener('change', () => {
      state.goals.draft = { ...readDraft(), assigneeUids: [] };
      render();
    });

    goalForm.querySelectorAll('[name="assigneeUids"]').forEach((input) => {
      input.addEventListener('change', () => {
        state.goals.draft = readDraft();
        render();
      });
    });

    goalForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.goals.saving) return;
      state.goals.draft = readDraft();
      state.goals.saving = true;
      state.goals.error = '';
      setFieldErrors(goalForm, {});

      try {
        const result = await createGoals(state.profile, state.goals.draft, state.goals.members);
        if (!result.isValid) {
          state.goals.saving = false;
          setFieldErrors(goalForm, result.errors);
          return;
        }
        const createdCount = state.goals.draft.assigneeUids.length;
        state.goals.draft = createDefaultGoalDraft(state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId);
        state.goals.loaded = false;
        await loadGoalsData();
        showToast(`${createdCount} meta(s) criada(s).`);
      } catch (error) {
        state.goals.saving = false;
        state.goals.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao possui permissao para criar estas metas.'
          : 'Nao foi possivel criar as metas. Verifique a conexao e tente novamente.';
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
      if (state.route === 'new' && state.demoMode && state.newLeadSchedule.appointmentDate) {
        state.newLeadSchedule.appointments = leads.filter((lead) => lead.appointmentDate === state.newLeadSchedule.appointmentDate);
      }
      render();
    },
    () => {
      state.dataError = 'Nao foi possivel carregar os cadastros. Verifique sua conexao ou permissao.';
      render();
    }
  );
}

function stopFollowUpScheduleSubscription() {
  state.unsubscribeFollowUpSchedule?.();
  state.unsubscribeFollowUpSchedule = null;
  state.unsubscribeFollowUpLeads?.();
  state.unsubscribeFollowUpLeads = null;
}

function startFollowUpScheduleSubscription() {
  stopFollowUpScheduleSubscription();
  state.followUps = {
    loaded: state.demoMode || !['captor', 'manager', 'admin'].includes(state.profile?.role),
    error: '',
    records: [],
    truncated: false,
    settingsByStore: {},
    settings: { ...DEFAULT_STORE_SCHEDULE }
  };
  if (!['captor', 'manager', 'admin'].includes(state.profile?.role) || state.demoMode) return;

  if (state.profile.role === 'admin' || profileStoreIds(state.profile).length > 1) {
    loadStoreSchedules(state.profile)
      .then((records) => {
        state.followUps.settingsByStore = Object.fromEntries(records.map((record) => [record.id, record]));
        state.followUps.loaded = true;
        render();
      })
      .catch(() => {
        state.followUps.loaded = true;
        state.followUps.error = 'Nao foi possivel carregar as configuracoes das lojas. Usando 30 minutos.';
        render();
      });
  } else try {
    state.unsubscribeFollowUpSchedule = subscribeToStoreSchedule(
      state.profile,
      (settings) => {
        state.followUps.settings = settings;
        state.followUps.loaded = true;
        state.followUps.error = '';
        render();
      },
      () => {
        state.followUps.loaded = true;
        state.followUps.error = 'Nao foi possivel carregar a tolerancia da loja. Usando 30 minutos.';
        render();
      }
    );
  } catch {
    state.followUps.loaded = true;
    state.followUps.error = 'Nao foi possivel carregar a tolerancia da loja. Usando 30 minutos.';
  }

  if (['manager', 'admin'].includes(state.profile.role)) {
    try {
      state.unsubscribeFollowUpLeads = subscribeToTeamFollowUps(
        state.profile,
        (result) => {
          state.followUps.records = result.records;
          state.followUps.truncated = result.truncated;
          render();
        },
        (error) => {
          state.followUps.error = error?.code === 'permission-denied'
            ? 'Seu perfil nao pode consultar os retornos desta equipe.'
            : 'Nao foi possivel acompanhar os retornos da equipe.';
          render();
        }
      );
    } catch {
      state.followUps.error = 'Nao foi possivel acompanhar os retornos da equipe.';
    }
  }
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
  if (['management', 'management-lead'].includes(state.route) && canManage() && !state.management.loaded) {
    loadManagementData();
  }
}

function stopAppointmentsSubscription() {
  state.unsubscribeAppointments?.();
  state.unsubscribeAppointments = null;
}

function startAppointmentsSubscription() {
  if (!canManage() || state.demoMode || state.route !== 'appointments') return;
  stopAppointmentsSubscription();
  state.appointments.loading = true;
  state.appointments.loaded = false;
  state.appointments.error = '';
  render();
  state.unsubscribeAppointments = subscribeToAppointments(
    state.profile,
    state.appointments.month,
    state.appointments.storeId,
    (result) => {
      state.appointments.records = result.records;
      state.appointments.truncated = result.truncated;
      state.appointments.loaded = true;
      state.appointments.loading = false;
      render();
      if (isAdmin()
        && !state.appointments.backfilledMonths.includes(state.appointments.month)
        && state.appointments.backfillingMonth !== state.appointments.month) {
        const month = state.appointments.month;
        state.appointments.backfillingMonth = month;
        backfillAppointmentSlots(state.profile, result.records, month)
          .then(() => { state.appointments.backfilledMonths.push(month); })
          .catch(() => {})
          .finally(() => { state.appointments.backfillingMonth = ''; });
      }
    },
    (error) => {
      state.appointments.error = error?.code === 'permission-denied'
        ? 'Seu perfil nao possui permissao para consultar esta agenda.'
        : 'Nao foi possivel acompanhar a agenda. Verifique a conexao e tente novamente.';
      state.appointments.loading = false;
      state.appointments.loaded = false;
      stopAppointmentsSubscription();
      render();
    }
  );
}

function ensureAppointmentsData() {
  if (state.route === 'appointments' && canManage() && !state.demoMode && !state.unsubscribeAppointments) {
    startAppointmentsSubscription();
  }
}

function stopNewLeadScheduleSubscriptions() {
  state.unsubscribeStoreSchedule?.();
  state.unsubscribeStoreSchedule = null;
  state.unsubscribeDayAppointments?.();
  state.unsubscribeDayAppointments = null;
}

function refreshAppointmentTimeControl() {
  const container = document.querySelector('#appointment-time-field');
  if (container) container.innerHTML = appointmentTimeField();
  const dateField = document.querySelector('[data-field="appointmentDate"]');
  const dateStatus = dateField?.querySelector('.schedule-date-status');
  const { settings, appointmentDate, appointments, loading, error } = state.newLeadSchedule;
  const slots = appointmentDate && settings.schedulingMode === 'controlled'
    ? buildAppointmentSlots(settings, appointments)
    : [];
  const fullyBooked = Boolean(appointmentDate && !loading && !error && slots.length && !slots.some((slot) => slot.available));
  dateField?.classList.toggle('is-fully-booked', fullyBooked);
  if (dateStatus) dateStatus.textContent = fullyBooked ? 'Dia sem horarios disponiveis.' : '';
}

function startDayAppointmentsSubscription() {
  state.unsubscribeDayAppointments?.();
  state.unsubscribeDayAppointments = null;
  state.newLeadSchedule.appointments = [];
  state.newLeadSchedule.error = '';
  const appointmentDate = state.newLeadSchedule.appointmentDate;
  if (!appointmentDate || state.newLeadSchedule.settings.schedulingMode === 'free') {
    state.newLeadSchedule.loading = false;
    refreshAppointmentTimeControl();
    return;
  }

  if (state.demoMode) {
    state.newLeadSchedule.appointments = state.leads.filter((lead) => lead.appointmentDate === appointmentDate);
    state.newLeadSchedule.loading = false;
    refreshAppointmentTimeControl();
    return;
  }

  state.newLeadSchedule.loading = true;
  refreshAppointmentTimeControl();
  try {
    state.unsubscribeDayAppointments = subscribeToDayAppointments(
      state.profile,
      appointmentDate,
      (appointments) => {
        state.newLeadSchedule.appointments = appointments;
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = '';
        refreshAppointmentTimeControl();
      },
      () => {
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = 'Nao foi possivel consultar os horarios desta data.';
        refreshAppointmentTimeControl();
      }
    );
  } catch {
    state.newLeadSchedule.loading = false;
    state.newLeadSchedule.error = 'Nao foi possivel consultar os horarios desta data.';
    refreshAppointmentTimeControl();
  }
}

function ensureNewLeadSchedule() {
  if (state.route !== 'new' || !state.profile || state.newLeadSchedule.loaded) return;
  state.newLeadSchedule.loading = true;
  if (state.demoMode) {
    const configured = state.settings.records.find((item) => item.id === state.profile.storeId);
    state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE, ...(configured || {}) };
    state.newLeadSchedule.loaded = true;
    state.newLeadSchedule.loading = false;
    render();
    return;
  }
  try {
    state.unsubscribeStoreSchedule = subscribeToStoreSchedule(
      state.profile,
      (settings) => {
        state.newLeadSchedule.settings = settings;
        state.newLeadSchedule.loaded = true;
        state.newLeadSchedule.loading = false;
        refreshAppointmentTimeControl();
      },
      () => {
        state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
        state.newLeadSchedule.loaded = true;
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = 'Usando a configuracao padrao da agenda.';
        refreshAppointmentTimeControl();
      }
    );
  } catch {
    state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
    state.newLeadSchedule.loaded = true;
    state.newLeadSchedule.loading = false;
    render();
  }
}

async function loadSettingsData() {
  if (!isAdmin() || state.settings.loading) return;
  state.settings.loading = true;
  state.settings.error = '';
  render();
  try {
    state.settings.records = state.demoMode
      ? STORES.map((store) => ({ ...store, ...DEFAULT_STORE_SCHEDULE }))
      : await loadStoreSchedules(state.profile);
    state.settings.loaded = true;
  } catch (error) {
    state.settings.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao pode consultar estas configuracoes.'
      : 'Nao foi possivel carregar as configuracoes das lojas.';
  } finally {
    state.settings.loading = false;
    render();
  }
}

function ensureSettingsData() {
  if (state.route === 'settings' && isAdmin() && !state.settings.loaded) loadSettingsData();
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

async function loadGoalsData() {
  if (!state.profile || state.demoMode || state.goals.loading) return;
  state.goals.loading = true;
  state.goals.error = '';
  render();
  try {
    const result = await loadGoalsDashboard(state.profile);
    state.goals.records = result.goals;
    state.goals.members = result.members;
    state.goals.truncated = result.truncated;
    state.goals.loaded = true;
    if (!state.goals.draft.storeId) {
      state.goals.draft.storeId = state.profile.role === 'manager'
        ? state.profile.storeId
        : STORES[0]?.id || '';
    }
  } catch (error) {
    state.goals.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao possui permissao para consultar estas metas.'
      : 'Nao foi possivel carregar as metas. Verifique a conexao e tente novamente.';
  } finally {
    state.goals.loading = false;
    state.goals.saving = false;
    render();
  }
}

function ensureGoalsData() {
  if (state.route === 'goals' && state.profile && !state.demoMode && !state.goals.loaded) {
    loadGoalsData();
  }
}

async function handleAction(action) {
  if (action === 'update-app' && state.updateAction) {
    const updateAction = state.updateAction;
    state.updateAction = null;
    render();
    await updateAction();
    return;
  }

  if (action === 'demo-login') {
    sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
    state.demoMode = true;
    state.profile = createDemoProfile();
    state.authError = '';
    subscribeProfileLeads();
    startFollowUpScheduleSubscription();
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
    stopAppointmentsSubscription();
    stopNewLeadScheduleSubscriptions();
    stopFollowUpScheduleSubscription();
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
    state.appointments = {
      loading: false,
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      updatingId: '',
      backfillingMonth: '',
      backfilledMonths: [],
      month: monthKeyFromDate(),
      storeId: '',
      selectedDate: toLocalDateInput(new Date())
    };
    state.newLeadSchedule = {
      loaded: false,
      loading: false,
      error: '',
      settings: { ...DEFAULT_STORE_SCHEDULE },
      appointmentDate: '',
      appointments: []
    };
    state.followUps = {
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      settingsByStore: {},
      settings: { ...DEFAULT_STORE_SCHEDULE }
    };
    state.settings = {
      loaded: false,
      loading: false,
      saving: false,
      error: '',
      selectedStoreId: STORES[0]?.id || '',
      records: []
    };
    state.access = {
      loading: false,
      loaded: false,
      saving: false,
      error: '',
      accesses: [],
      storeIds: []
    };
    state.goals = {
      loading: false,
      loaded: false,
      saving: false,
      error: '',
      records: [],
      members: [],
      truncated: false,
      pendingDeleteId: '',
      draft: createDefaultGoalDraft()
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

  if (action === 'reload-goals') {
    state.goals.loaded = false;
    await loadGoalsData();
  }

  if (action === 'appointments-today') {
    const today = new Date();
    const todayMonth = monthKeyFromDate(today);
    state.appointments.selectedDate = toLocalDateInput(today);
    if (state.appointments.month !== todayMonth) {
      state.appointments.month = todayMonth;
      state.appointments.loaded = false;
      startAppointmentsSubscription();
    } else {
      render();
    }
  }
}

export async function startApp() {
  document.addEventListener('click', async (event) => {
    const followUpWhatsAppLink = event.target.closest('[data-follow-up-whatsapp]');
    if (followUpWhatsAppLink) {
      const lead = state.leads.find((item) => item.id === followUpWhatsAppLink.dataset.followUpWhatsapp);
      if (lead && state.profile?.role === 'captor') {
        try {
          if (state.demoMode) markDemoFollowUpContact(lead.id, state.profile);
          else await markFollowUpContactStarted(state.profile, lead);
        } catch {
          showToast('O WhatsApp foi aberto, mas o contato nao foi registrado.', 'warning', 'circle-alert');
        }
      }
    }
    const leadButton = event.target.closest('[data-open-lead-id]');
    if (leadButton) navigate('lead', leadButton.dataset.openLeadId);
    const managementLeadButton = event.target.closest('[data-management-lead-id]');
    if (managementLeadButton) navigate('management-lead', managementLeadButton.dataset.managementLeadId);
    const appointmentLeadButton = event.target.closest('[data-appointment-lead-id]');
    if (appointmentLeadButton) {
      const appointmentRecords = state.demoMode ? state.leads : state.appointments.records;
      const lead = appointmentRecords.find((item) => item.id === appointmentLeadButton.dataset.appointmentLeadId);
      if (lead) {
        state.management.records = [lead, ...state.management.records.filter((item) => item.id !== lead.id)];
        navigate('management-lead', lead.id);
      }
    }
    const attendanceButton = event.target.closest('[data-attendance-lead]');
    if (attendanceButton && !attendanceButton.disabled) {
      const appointmentRecords = state.demoMode ? state.leads : state.appointments.records;
      const lead = appointmentRecords.find((item) => item.id === attendanceButton.dataset.attendanceLead);
      if (!lead) return;
      state.appointments.updatingId = lead.id;
      render();
      try {
        const attendance = attendanceButton.dataset.attendanceStatus;
        if (state.demoMode) {
          updateDemoAppointmentAttendance(lead.id, attendance, state.profile);
        } else {
          await setAppointmentAttendance(state.profile, lead, attendance);
          state.appointments.records = state.appointments.records.map((item) => item.id === lead.id
            ? { ...item, appointmentAttendance: attendance }
            : item);
        }
        showToast(attendance === 'attended' ? 'Comparecimento registrado.' : 'Falta registrada.');
      } catch (error) {
        showToast(error?.code === 'permission-denied'
          ? 'Seu perfil nao pode alterar este agendamento.'
          : 'Nao foi possivel salvar o comparecimento.', 'danger', 'circle-alert');
      } finally {
        state.appointments.updatingId = '';
        render();
      }
    }
    const appointmentDayButton = event.target.closest('[data-appointment-date]');
    if (appointmentDayButton) {
      state.appointments.selectedDate = appointmentDayButton.dataset.appointmentDate;
      render();
    }
    const appointmentMonthButton = event.target.closest('[data-appointment-month]');
    if (appointmentMonthButton && !state.appointments.loading) {
      state.appointments.month = shiftMonth(state.appointments.month, Number(appointmentMonthButton.dataset.appointmentMonth));
      state.appointments.selectedDate = monthRange(state.appointments.month).startDate;
      state.appointments.loaded = false;
      startAppointmentsSubscription();
    }
    const deleteLeadButton = event.target.closest('[data-delete-lead]');
    if (deleteLeadButton && !deleteLeadButton.disabled) {
      const lead = state.management.records.find((item) => item.id === deleteLeadButton.dataset.deleteLead);
      const dialog = document.querySelector('#delete-lead-dialog');
      if (lead && dialog) dialog.showModal();
    }
    const closeDeleteDialogButton = event.target.closest('[data-close-delete-dialog]');
    if (closeDeleteDialogButton) {
      closeDeleteDialogButton.closest('dialog')?.close();
    }
    const confirmDeleteButton = event.target.closest('[data-confirm-delete]');
    if (confirmDeleteButton && !confirmDeleteButton.disabled) {
      const lead = state.management.records.find((item) => item.id === confirmDeleteButton.dataset.confirmDelete);
      if (!lead) return;
      confirmDeleteButton.disabled = true;
      try {
        await deleteManagementLead(state.profile, lead);
        state.management.records = state.management.records.filter((item) => item.id !== lead.id);
        state.appointments.records = state.appointments.records.filter((item) => item.id !== lead.id);
        navigate('management');
        showToast('Lead excluido definitivamente.');
      } catch (error) {
        confirmDeleteButton.disabled = false;
        showToast(error?.code === 'permission-denied' ? 'Seu perfil nao pode excluir este lead.' : 'Nao foi possivel excluir o lead.', 'danger', 'circle-alert');
      }
    }
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
      form.querySelectorAll('[name="storeIds"]').forEach((input) => {
        input.checked = access.storeIds.includes(input.value);
      });
      form.elements.role.dispatchEvent(new Event('change'));
      form.elements.displayName.focus();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const deleteGoalButton = event.target.closest('[data-delete-goal]');
    if (deleteGoalButton && !deleteGoalButton.disabled) {
      state.goals.pendingDeleteId = deleteGoalButton.dataset.deleteGoal;
      render();
      document.querySelector('#delete-goal-dialog')?.showModal();
    }
    const closeGoalDialogButton = event.target.closest('[data-close-goal-dialog]');
    if (closeGoalDialogButton) {
      closeGoalDialogButton.closest('dialog')?.close();
      state.goals.pendingDeleteId = '';
    }
    const confirmDeleteGoalButton = event.target.closest('[data-confirm-delete-goal]');
    if (confirmDeleteGoalButton && !confirmDeleteGoalButton.disabled) {
      const goal = state.goals.records.find((item) => item.id === confirmDeleteGoalButton.dataset.confirmDeleteGoal);
      if (!goal) return;
      confirmDeleteGoalButton.disabled = true;
      try {
        await deleteGoal(state.profile, goal);
        state.goals.pendingDeleteId = '';
        state.goals.loaded = false;
        await loadGoalsData();
        showToast('Meta excluida.');
      } catch (error) {
        state.goals.pendingDeleteId = '';
        state.goals.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode excluir esta meta.'
          : 'Nao foi possivel excluir a meta.';
        render();
      }
    }
  });

  window.addEventListener('hashchange', () => {
    const previousRoute = state.route;
    state.route = currentRoute();
    if (state.route !== 'appointments') stopAppointmentsSubscription();
    if (state.route !== 'new') {
      stopNewLeadScheduleSubscriptions();
      state.newLeadSchedule.loaded = false;
      state.newLeadSchedule.appointmentDate = '';
      state.newLeadSchedule.appointments = [];
    } else if (previousRoute !== 'new') {
      state.newLeadSchedule.loaded = false;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    render();
    ensureManagementData();
    ensureAppointmentsData();
    ensureNewLeadSchedule();
    ensureAccessData();
    ensureGoalsData();
    ensureSettingsData();
  });

  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  window.addEventListener('resize', syncAgendaSidebarHeight);
  window.setInterval(() => {
    if (['captor', 'manager', 'admin'].includes(state.profile?.role) && ['home', 'follow-ups'].includes(state.route)) render();
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.profile && !state.demoMode) {
      synchronizeNow(false).catch(() => {});
    }
  });

  if (sessionStorage.getItem(DEMO_SESSION_KEY) === 'true' && import.meta.env.DEV) {
    state.demoMode = true;
    state.profile = createDemoProfile();
    state.loading = false;
    subscribeProfileLeads();
    startFollowUpScheduleSubscription();
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
      startFollowUpScheduleSubscription();
    } catch (error) {
      state.profile = null;
      state.authError = error.message || 'Acesso nao autorizado.';
    } finally {
      state.loading = false;
      render();
      ensureManagementData();
      ensureAppointmentsData();
      ensureNewLeadSchedule();
      ensureAccessData();
      ensureGoalsData();
      ensureSettingsData();
    }
  });
}

export function showOfflineReady() {
  showToast('Aplicativo pronto para abrir offline.', 'success', 'cloud-check');
}

export function showUpdateReady(updateAction) {
  state.updateAction = updateAction;
  render();
}
