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
  Copy,
  Download,
  Eye,
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
  Stethoscope,
  Target,
  Trash2,
  UserPlus,
  UserRoundCog,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
  createIcons
} from 'lucide';
import { completeRedirectSignIn, createEmailPasswordAccess, createTeamPasswordAccount, loadAuthorizedProfile, observeAuth, observeAuthorizedProfile, requestPasswordReset, signInWithEmail, signInWithGoogle, signOutUser } from '../firebase/auth.js';
import { isFirebaseConfigured } from '../firebase/client.js';
import { markDemoFollowUpContact, saveLead, subscribeToLeads, synchronizeNow, updateDemoAppointmentAttendance, updateLead } from '../services/lead-service.js';
import { markFollowUpContactStarted, subscribeToTeamFollowUps } from '../services/follow-up-service.js';
import { deleteAccess, loadAccesses, saveAccess, setAccessActive } from '../services/access-service.js';
import { deleteRoleProfile, loadRoleProfiles, resetSystemRolePermissions, saveRoleProfile, saveSystemRolePermissions } from '../services/role-profile-service.js';
import { deleteManagementLead, loadManagementLeads, MANAGEMENT_QUERY_LIMIT, updateManagementLead } from '../services/management-service.js';
import { createGoals, deleteGoalGroup, GOALS_LEAD_LIMIT, loadGoalsDashboard, updateGoalGroup } from '../services/goal-service.js';
import { APPOINTMENTS_QUERY_LIMIT, setAppointmentAttendance, subscribeToAppointments } from '../services/appointment-service.js';
import { backfillAppointmentSlots, loadStoreSchedule, loadStoreSchedules, saveStoreSchedule, subscribeToDayAppointments, subscribeToStoreSchedule } from '../services/schedule-service.js';
import { ensureDefaultAppointmentServices, loadAppointmentServices, saveAppointmentService, setAppointmentServiceActive } from '../services/service-catalog-service.js';
import { consultLocalSavwinSales, isLocalSavwinEnabled } from '../services/savwin-service.js';
import { downloadLeadsCsv } from '../utils/lead-export.js';
import { appointmentsByDate, calendarDays, formatMonthLabel, monthKeyFromDate, monthRange, shiftMonth } from '../utils/calendar.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { AMETROPIAS, INTERESTS, PATHOLOGIES, SEX_OPTIONS, calculateAge } from '../utils/lead.js';
import { appointmentQuotaStatus, buildAppointmentSlots, DEFAULT_STORE_SCHEDULE, WEEKDAY_OPTIONS } from '../utils/schedule.js';
import { appointmentFollowUps, buildWhatsAppFollowUpUrl, followUpAppointmentKey, followUpAvailableAt, isFollowUpContacted } from '../utils/follow-up.js';
import { STORES } from '../utils/stores.js';
import { profileStoreIds } from '../utils/permissions.js';
import { formatAccessStoreSummary } from '../utils/access.js';
import { PERMISSION_GROUPS, ROLE_SCOPES, SYSTEM_ROLE_PROFILES, hasPermission as profileHasPermission, normalizeRolePermissions, permissionsForScope, systemRoleProfileForId, systemRoleProfileForRole, validateRoleProfile } from '../utils/role-profile.js';
import { formatBrazilianCpf } from '../utils/savwin-matching.js';
import { duplicateGoalDraft } from '../utils/goal.js';
import { defaultAppointmentService, servicesForStore, validateAppointmentService } from '../utils/service-catalog.js';
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
  Copy,
  Download,
  Eye,
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
  Stethoscope,
  Target,
  Trash2,
  UserPlus,
  UserRoundCog,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X
};

const state = {
  route: currentRoute(),
  loading: true,
  profile: null,
  demoMode: false,
  leads: [],
  authError: '',
  authMessage: '',
  dataError: '',
  toast: null,
  search: '',
  unsubscribeProfile: null,
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
  appointmentCreate: {
    loading: false,
    saving: false,
    error: '',
    schedules: [],
    storeId: '',
    services: [],
    serviceId: '',
    draft: {}
  },
  newLeadSchedule: {
    loaded: false,
    loading: false,
    error: '',
    settings: { ...DEFAULT_STORE_SCHEDULE },
    appointmentDate: '',
    appointments: [],
    services: [],
    serviceId: ''
  },
  leadDetailSchedule: {
    loading: false,
    storeId: '',
    settings: { ...DEFAULT_STORE_SCHEDULE }
  },
  followUps: {
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    filter: 'all',
    settingsByStore: {},
    settings: { ...DEFAULT_STORE_SCHEDULE }
  },
  settings: {
    loaded: false,
    loading: false,
    saving: false,
    error: '',
    selectedStoreId: STORES[0]?.id || '',
    records: [],
    section: 'schedule',
    roleProfiles: SYSTEM_ROLE_PROFILES.map((item) => ({ ...item, permissions: [...item.permissions] })),
    services: [],
    serviceEditorOpen: false,
    editingServiceId: '',
    roleEditorOpen: false,
    roleDraft: createDefaultRoleDraft(),
    editingRoleId: '',
    pendingDeleteRoleId: '',
    detailsRoleId: '',
    detailsRolePermissions: []
  },
  access: {
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    accesses: [],
    storeIds: [],
    editorOpen: false,
    editingEmail: '',
    pendingDeleteEmail: ''
  },
  goals: {
    loading: false,
    loaded: false,
    saving: false,
    error: '',
    records: [],
    members: [],
    truncated: false,
    editingGroupId: '',
    duplicatingGroupId: '',
    pendingDeleteGroupId: '',
    draft: createDefaultGoalDraft()
  },
  savwin: {
    loading: false,
    error: '',
    result: null
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

function createDefaultRoleDraft(scope = 'own') {
  return { name: '', scope, permissions: permissionsForScope(scope) };
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
  if (role === 'mei') {
    const mei = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-mei');
    return {
      ...demoProfile,
      uid: 'demo-mei',
      displayName: 'MEI de Teste',
      role: mei.baseRole,
      roleProfileId: mei.id,
      roleProfileName: mei.name,
      permissions: [...mei.permissions],
      storeId: 'loja-06'
    };
  }
  if (role === 'receptionist') {
    const receptionist = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-receptionist');
    return {
      ...demoProfile,
      uid: 'demo-receptionist',
      displayName: 'Atendente de Teste',
      role: receptionist.baseRole,
      roleProfileId: receptionist.id,
      roleProfileName: receptionist.name,
      permissions: [...receptionist.permissions],
      storeId: 'loja-06',
      storeIds: ['loja-06']
    };
  }
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

function roleProfileLabel(access = {}) {
  return state.settings.roleProfiles.find((profile) => profile.id === access.roleProfileId)?.name
    || roleLabel(access.role);
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

function profileAccessSignature(profile) {
  if (!profile) return '';
  return JSON.stringify({
    displayName: profile.displayName,
    role: profile.role,
    roleProfileId: profile.roleProfileId,
    roleProfileName: profile.roleProfileName,
    permissions: profile.permissions,
    storeId: profile.storeId,
    storeIds: profile.storeIds,
    active: profile.active
  });
}

function canManage() {
  return hasAccess('management.view');
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function hasAccess(permission) {
  return profileHasPermission(state.profile, permission);
}

function canAccessRoute(route) {
  const accessByRoute = {
    home: () => true,
    new: () => hasAccess('leads.create'),
    leads: () => hasAccess('leads.view_own'),
    lead: () => hasAccess('leads.view_own'),
    sync: () => hasAccess('leads.create') || hasAccess('leads.edit_own'),
    'follow-ups': () => hasAccess('followups.own') || hasAccess('followups.team'),
    management: () => hasAccess('management.view'),
    'management-lead': () => hasAccess('management.view'),
    dashboard: () => hasAccess('dashboard.view'),
    reports: () => hasAccess('reports.view'),
    appointments: () => hasAccess('appointments.view'),
    access: () => isAdmin(),
    goals: () => hasAccess('goals.view_own') || hasAccess('goals.manage'),
    settings: () => isAdmin()
  };
  return Boolean(accessByRoute[route]?.());
}

function canManageGoals() {
  return hasAccess('goals.manage');
}

function pendingFollowUps() {
  const source = !state.demoMode && hasAccess('followups.team')
    ? state.followUps.records
    : state.leads;
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

function filteredReportRecords() {
  const { filters } = state.management;
  const source = state.demoMode ? state.leads : state.management.records;
  const startDate = filters.startDate || '';
  const endDate = filters.endDate || '';
  return source.filter((lead) => {
    const capturedDate = String(lead.capturedAtClient || '').slice(0, 10);
    if (startDate && capturedDate < startDate) return false;
    if (endDate && capturedDate > endDate) return false;
    if (filters.storeId && lead.storeId !== filters.storeId) return false;
    if (filters.capturedByUid && lead.capturedByUid !== filters.capturedByUid) return false;
    return true;
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
    ? ''
    : '<div class="notice notice-warning"><i data-lucide="wrench"></i><div><strong>Firebase ainda nao configurado</strong><span>Use o modo de desenvolvimento sem dados reais.</span></div></div>';

  return `
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <div class="brand-mark" aria-hidden="true">F</div>
        <p class="eyebrow">OTICAS FASCINANTE</p>
        <h1 id="login-title">FascinLead</h1>
        <p class="login-copy">Cadastro rapido para quem encontra clientes onde eles estao.</p>
        ${configNotice}
        ${state.authError ? `<div class="notice notice-danger" role="alert"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.authError)}</span></div>` : ''}
        ${state.authMessage ? `<div class="notice notice-success" role="status"><i data-lucide="circle-check"></i><span>${escapeHtml(state.authMessage)}</span></div>` : ''}
        <form id="email-login-form" class="email-login-form" novalidate>
          <div class="field"><label for="login-email">E-mail</label><input id="login-email" name="email" type="email" autocomplete="email" placeholder="nome@exemplo.com" required /></div>
          <div class="field"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" autocomplete="current-password" minlength="6" placeholder="Sua senha" required /></div>
          <button class="button button-primary button-block" type="submit" ${!isFirebaseConfigured ? 'disabled' : ''}>
            <i data-lucide="log-in"></i><span>Entrar</span>
          </button>
          <div class="login-secondary-actions">
            <button type="button" data-action="email-register">Criar primeiro acesso</button>
            <button type="button" data-action="password-reset">Esqueci minha senha</button>
          </div>
        </form>
        ${import.meta.env.DEV ? `
          <button class="button button-secondary button-block" type="button" data-action="demo-login">
            <i data-lucide="flask-conical"></i><span>Abrir modo de desenvolvimento</span>
          </button>
        ` : ''}
      </section>
    </main>`;
}

function currentPageTitle() {
  const titles = {
    home: 'Inicio',
    new: 'Cadastro',
    leads: 'Meus cadastros',
    lead: 'Detalhes do cadastro',
    sync: 'Sincronizacao',
    management: 'Painel de leads',
    'management-lead': 'Detalhes do lead',
    dashboard: 'Dashboard',
    reports: 'Relatorios',
    appointments: 'Agenda de exames',
    access: 'Acessos da equipe',
    goals: 'Metas',
    settings: 'Configuracoes'
  };
  if (state.route === 'follow-ups') return canManage() ? 'Retornos da equipe' : 'Retornos pendentes';
  return titles[state.route] || 'Inicio';
}

function headerView() {
  const online = navigator.onLine;
  return `
    <header class="app-header">
      <div class="header-inner ${['management', 'dashboard', 'reports', 'appointments', 'access', 'goals', 'settings'].includes(state.route) ? 'layout-wide' : ''}">
        <div>
          <p class="eyebrow">FASCINLEAD</p>
          <h1 class="header-page-title">${escapeHtml(currentPageTitle())}</h1>
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
        <span>${escapeHtml(state.profile.roleProfileName || roleLabel(state.profile.role))}</span>
      </div>
      <i data-lucide="shield-check" class="profile-status"></i>
    </section>`;
}

function homeView() {
  const pending = state.leads.filter((lead) => lead.syncState === 'pending').length;
  const synced = state.leads.filter((lead) => lead.syncState === 'synced').length;
  const followUps = pendingFollowUps();

  return `
    ${profileCard()}
    ${state.demoMode ? '<div class="notice notice-warning"><i data-lucide="flask-conical"></i><div><strong>Modo de desenvolvimento</strong><span>Nao utilize dados reais. Os registros ficam somente neste navegador.</span></div></div>' : ''}
    <section class="action-grid" aria-label="Acoes principais">
      ${hasAccess('leads.create') ? `<button class="action-card action-card-primary" type="button" data-route="new">
        <span class="action-icon"><i data-lucide="user-plus"></i></span>
        <span><strong>Nova abordagem</strong><small>Cadastrar novo contato</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('leads.view_own') ? `<button class="action-card" type="button" data-route="leads">
        <span class="action-icon"><i data-lucide="clipboard-list"></i></span>
        <span><strong>Meus cadastros</strong><small>${state.leads.length} registro(s) neste acesso</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${canAccessRoute('sync') ? `<button class="action-card" type="button" data-route="sync">
        <span class="action-icon"><i data-lucide="refresh-cw"></i></span>
        <span><strong>Sincronizacao</strong><small>${pending} pendente(s), ${synced} sincronizado(s)</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('followups.own') || hasAccess('followups.team') ? `<button class="action-card" type="button" data-route="follow-ups">
        <span class="action-icon"><i data-lucide="bell-ring"></i></span>
        <span><strong>${hasAccess('followups.team') ? 'Retornos da equipe' : 'Retornos pendentes'}</strong><small>${followUps.length ? `${followUps.length} cliente(s) em acompanhamento` : 'Nenhum retorno pendente'}</small></span>
        ${followUps.length ? `<span class="notification-count" aria-label="${followUps.length} pendencia(s)">${followUps.length}</span>` : '<i data-lucide="chevron-right"></i>'}
      </button>` : ''}
      ${canManage() ? `<button class="action-card" type="button" data-route="management">
        <span class="action-icon"><i data-lucide="bar-chart-3"></i></span>
        <span><strong>Painel de gestao</strong><small>Consultar e exportar captacoes</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('appointments.view') ? `<button class="action-card" type="button" data-route="appointments">
        <span class="action-icon"><i data-lucide="calendar-days"></i></span>
        <span><strong>Agenda de exames</strong><small>Visualizar os pre-agendamentos</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('goals.view_own') || canManageGoals() ? `<button class="action-card" type="button" data-route="goals">
        <span class="action-icon"><i data-lucide="target"></i></span>
        <span><strong>Metas</strong><small>${canManageGoals() ? 'Definir e acompanhar a equipe' : 'Acompanhar meu desempenho'}</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${isAdmin() ? `<button class="action-card" type="button" data-route="access">
        <span class="action-icon"><i data-lucide="user-round-cog"></i></span>
        <span><strong>Acessos da equipe</strong><small>Autorizar colaboradores e administradores</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${isAdmin() ? `<button class="action-card" type="button" data-route="settings">
        <span class="action-icon"><i data-lucide="wrench"></i></span>
        <span><strong>Configuracoes</strong><small>Agenda e preferencias do sistema</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
    </section>`;
}

function appointmentTimeField() {
  const { settings, appointmentDate, appointments, loading, error } = state.newLeadSchedule;
  const service = selectedNewLeadService();
  const serviceSchedule = { ...settings, appointmentDurationMinutes: service.durationMinutes };
  if (settings.schedulingMode === 'free') {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horario</label><input id="appointmentTime" name="appointmentTime" type="time" /><small class="field-error"></small></div>`;
  }

  const quota = appointmentQuotaStatus(settings, appointmentDate, appointments, state.profile);
  const slots = appointmentDate
    ? buildAppointmentSlots(serviceSchedule, appointments, '', { appointmentDate, profile: state.profile })
    : [];
  const availableSlots = slots.filter((slot) => slot.available);
  let placeholder = 'Escolha primeiro uma data';
  if (loading) placeholder = 'Consultando horarios...';
  else if (error) placeholder = 'Horarios indisponiveis';
  else if (quota.reason === 'mei-quota') placeholder = 'Sua cota de agendamentos foi atingida';
  else if (quota.reason === 'daily-limit') placeholder = 'Limite de vagas do dia atingido';
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
    ${appointmentDate && !loading && !error ? `<small class="schedule-availability">${quota.limited ? `${quota.dailyRemaining} vaga(s) restante(s) no dia${quota.isMei ? `; sua cota: ${quota.meiRemaining}` : ''}` : `${availableSlots.length} de ${slots.length} horario(s) disponivel(is)`}</small>` : ''}
  </div>`;
}

function selectedNewLeadService() {
  const available = servicesForStore(state.newLeadSchedule.services, state.profile?.storeId);
  return available.find((service) => service.id === state.newLeadSchedule.serviceId)
    || available[0]
    || defaultAppointmentService(state.profile?.storeId || '', state.newLeadSchedule.settings.appointmentDurationMinutes);
}

function ametropiaOptions(selectedIds = []) {
  return AMETROPIAS.map((item) => `<label class="ametropia-option checkbox-label">
    <input type="checkbox" name="ametropiaIds" value="${item.id}" ${selectedIds.includes(item.id) ? 'checked' : ''} />
    <span>${item.label}</span>
  </label>`).join('');
}

function pathologyOptions(selectedIds = []) {
  return PATHOLOGIES.map((item) => `<label class="ametropia-option checkbox-label">
    <input type="checkbox" name="pathologyIds" value="${item.id}" ${selectedIds.includes(item.id) ? 'checked' : ''} />
    <span>${item.label}</span>
  </label>`).join('');
}

function sexOptions(selectedId = '') {
  return SEX_OPTIONS.map((item) => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${item.label}</option>`).join('');
}

function leadFormValues(form) {
  const formData = new FormData(form);
  return {
    ...Object.fromEntries(formData),
    ametropiaIds: formData.getAll('ametropiaIds'),
    pathologyIds: formData.getAll('pathologyIds')
  };
}

function bindExclusiveOptions(form, fieldName) {
  const inputs = [...form.querySelectorAll(`[name="${fieldName}"]`)];
  inputs.forEach((input) => input.addEventListener('change', () => {
    if (!input.checked) return;
    const exclusive = ['none', 'unknown'];
    inputs.forEach((other) => {
      if (other === input) return;
      if (exclusive.includes(input.value) || exclusive.includes(other.value)) other.checked = false;
    });
  }));
}

function bindCpfInput(form) {
  const input = form.elements.customerCpf || form.elements.cpf;
  input?.addEventListener('input', () => { input.value = formatBrazilianCpf(input.value); });
}

function birthAgeText(value) {
  const age = calculateAge(value);
  return age === null ? 'A idade sera calculada automaticamente.' : `${age} ano${age === 1 ? '' : 's'}`;
}

function bindBirthDateInput(form) {
  const input = form.elements.birthDate;
  const output = form.querySelector('[data-birth-age]');
  if (!input || !output) return;
  const refresh = () => { output.textContent = birthAgeText(input.value); };
  input.addEventListener('input', refresh);
  refresh();
}

function newLeadView() {
  const interests = INTERESTS.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  const selectedService = selectedNewLeadService();
  const availableServices = servicesForStore(state.newLeadSchedule.services, state.profile.storeId);
  const serviceOptions = (availableServices.length ? availableServices : [selectedService])
    .map((service) => `<option value="${escapeHtml(service.id)}" ${service.id === selectedService.id ? 'selected' : ''}>${escapeHtml(service.name)} - ${service.durationMinutes} min</option>`)
    .join('');
  return `
    <section class="page-toolbar">
      <button class="back-button" type="button" data-route="home" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
    </section>
    <form id="lead-form" class="form-panel" novalidate>
      <input name="schedulingMode" type="hidden" value="${escapeHtml(state.newLeadSchedule.settings.schedulingMode)}" />
      <input name="appointmentServiceName" type="hidden" value="${escapeHtml(selectedService.name)}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${selectedService.durationMinutes}" />
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
      <div class="field-row identity-fields">
        <div class="field" data-field="customerCpf">
          <label for="customerCpf">CPF</label>
          <input id="customerCpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" />
          <small class="field-error"></small>
        </div>
        <div class="field" data-field="birthDate">
          <label for="birthDate">Data de nascimento</label>
          <input id="birthDate" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" />
          <small class="birth-age-hint" data-birth-age>A idade sera calculada automaticamente.</small>
          <small class="field-error"></small>
        </div>
        <div class="field" data-field="sex">
          <label for="sex">Sexo</label>
          <select id="sex" name="sex">${sexOptions()}</select>
          <small class="field-error"></small>
        </div>
      </div>
      <div class="field">
        <label for="preferredName">Como prefere ser chamado</label>
        <input id="preferredName" name="preferredName" maxlength="60" placeholder="Apelido ou nome preferido" />
      </div>
      <div class="field-row address-fields">
        <div class="field address-street" data-field="street"><label for="street">Rua</label><input id="street" name="street" maxlength="120" autocomplete="address-line1" /><small class="field-error"></small></div>
        <div class="field address-number" data-field="streetNumber"><label for="streetNumber">Numero</label><input id="streetNumber" name="streetNumber" maxlength="12" autocomplete="address-line2" placeholder="S/N" /><small class="field-error"></small></div>
        <div class="field address-neighborhood"><label for="neighborhood">Bairro</label><input id="neighborhood" name="neighborhood" maxlength="80" /></div>
        <div class="field address-city"><label for="city">Cidade</label><input id="city" name="city" maxlength="80" /></div>
        <div class="field field-state"><label for="state">UF</label><input id="state" name="state" maxlength="2" value="PE" /></div>
      </div>
      <div class="field-row interest-service-fields">
        <div class="field">
          <label for="interestId">Interesse principal</label>
          <select id="interestId" name="interestId">${interests}</select>
        </div>
        <div class="field" data-field="appointmentServiceId">
          <label for="appointmentServiceId">Servico do agendamento</label>
          <select id="appointmentServiceId" name="appointmentServiceId">${serviceOptions}</select>
          <small class="field-error"></small>
        </div>
      </div>
      ${state.newLeadSchedule.settings.showAmetropiaFields ? `<fieldset class="field ametropia-field">
        <legend>Ametropias</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${ametropiaOptions()}</div>
      </fieldset>` : ''}
      <fieldset class="field ametropia-field">
        <legend>Patologias e condicoes de saude</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${pathologyOptions()}</div>
      </fieldset>
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
    : `<div class="empty-state"><i data-lucide="clipboard-x"></i><strong>Nenhum cadastro encontrado</strong><p>${state.search ? 'Tente outro nome ou telefone.' : 'Os contatos registrados aparecerao aqui.'}</p>${hasAccess('leads.create') ? '<button class="button button-primary" type="button" data-route="new"><i data-lucide="user-plus"></i>Novo cadastro</button>' : ''}</div>`;

  return `
    <div class="search-box"><i data-lucide="search"></i><input id="lead-search" type="search" value="${escapeHtml(state.search)}" placeholder="Buscar por nome ou telefone" aria-label="Buscar cadastros" /></div>
    ${state.dataError ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.dataError)}</span></div>` : ''}
    <section class="lead-list">${list}</section>`;
}

function followUpsView() {
  if (!hasAccess('followups.own') && !hasAccess('followups.team')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Esta area e exclusiva para captadores e gestores.</span></div>`;
  }

  const allRecords = pendingFollowUps();
  const managerView = hasAccess('followups.team');
  const adminView = isAdmin();
  const activeFilter = state.followUps.filter || 'all';
  const records = activeFilter === 'waiting'
    ? allRecords.filter((lead) => !isFollowUpContacted(lead))
    : activeFilter === 'contacted'
      ? allRecords.filter(isFollowUpContacted)
      : allRecords;
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
          ${contacted ? `<div><dt>Contato por</dt><dd>${escapeHtml(lead.followUpContactedByName || 'Nao informado')}</dd></div>` : ''}
          ${adminView ? `<div><dt>Loja</dt><dd>${escapeHtml(storeLabel(lead.storeId))}</dd></div>` : ''}` : ''}
        </dl>
        <div class="follow-up-actions">
          <a class="button button-whatsapp" data-follow-up-whatsapp="${escapeHtml(lead.id)}" href="${escapeHtml(whatsAppUrl)}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i><span>Chamar no WhatsApp</span></a>
          <button class="button button-secondary" type="button" ${managerView ? `data-follow-up-reschedule="${escapeHtml(lead.id)}"` : `data-open-lead-id="${escapeHtml(lead.id)}"`}><i data-lucide="calendar-days"></i><span>Reagendar</span></button>
        </div>
      </article>`;
  };
  const contactedCount = allRecords.filter(isFollowUpContacted).length;
  const captorGroups = [...allRecords.reduce((groups, lead) => {
    const key = lead.capturedByUid || lead.capturedByName || 'captor';
    if (!groups.has(key)) groups.set(key, { name: lead.capturedByName || 'Captador nao informado', records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const visibleCaptorGroups = [...records.reduce((groups, lead) => {
    const key = lead.capturedByUid || lead.capturedByName || 'captor';
    if (!groups.has(key)) groups.set(key, { name: lead.capturedByName || 'Captador nao informado', records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const captorSummary = captorGroups.map((group) => {
    const groupContacted = group.records.filter(isFollowUpContacted).length;
    return `<article class="follow-up-captor-card"><span class="avatar">${escapeHtml(profileInitials(group.name))}</span><div><strong>${escapeHtml(group.name)}</strong><span>${group.records.length} retorno(s)</span></div><dl><div><dt>Aguardando</dt><dd>${group.records.length - groupContacted}</dd></div><div><dt>Iniciados</dt><dd>${groupContacted}</dd></div></dl></article>`;
  }).join('');
  const items = records.length
    ? (managerView && activeFilter === 'captors'
      ? `<section class="follow-up-captor-summary">${captorSummary}</section>`
      : managerView
      ? visibleCaptorGroups.map((group) => `<section class="follow-up-team-group">
          <header class="follow-up-team-heading"><span class="avatar">${escapeHtml(profileInitials(group.name))}</span><div><strong>${escapeHtml(group.name)}</strong><span>${group.records.length} retorno(s)</span></div></header>
          <div class="follow-up-list">${group.records.map(renderItem).join('')}</div>
        </section>`).join('')
      : records.map(renderItem).join(''))
    : `<div class="empty-state"><i data-lucide="circle-check"></i><strong>${activeFilter === 'all' ? 'Nenhum retorno pendente' : 'Nenhum retorno nesta categoria'}</strong><p>${activeFilter === 'all' ? 'As faltas registradas pela loja aparecerao aqui depois do tempo de tolerancia.' : 'Selecione outro indicador para consultar os contatos.'}</p></div>`;

  return `${state.followUps.error ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>${escapeHtml(state.followUps.error)}</span></div>` : ''}
    ${state.followUps.truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A lista atingiu o limite de 500 registros.</span></div>` : ''}
    ${managerView ? `<section class="follow-up-metrics" aria-label="Resumo dos retornos">
      <button class="metric follow-up-metric-filter ${activeFilter === 'all' ? 'is-active' : ''}" type="button" data-follow-up-filter="all" aria-pressed="${activeFilter === 'all'}"><span>Retornos</span><strong>${allRecords.length}</strong><i data-lucide="bell-ring"></i></button>
      <button class="metric metric-warning follow-up-metric-filter ${activeFilter === 'waiting' ? 'is-active' : ''}" type="button" data-follow-up-filter="waiting" aria-pressed="${activeFilter === 'waiting'}"><span>Aguardando contato</span><strong>${allRecords.length - contactedCount}</strong><i data-lucide="clock-3"></i></button>
      <button class="metric metric-success follow-up-metric-filter ${activeFilter === 'contacted' ? 'is-active' : ''}" type="button" data-follow-up-filter="contacted" aria-pressed="${activeFilter === 'contacted'}"><span>Contato iniciado</span><strong>${contactedCount}</strong><i data-lucide="message-circle"></i></button>
      <button class="metric follow-up-metric-filter ${activeFilter === 'captors' ? 'is-active' : ''}" type="button" data-follow-up-filter="captors" aria-pressed="${activeFilter === 'captors'}"><span>Captadores</span><strong>${captorGroups.length}</strong><i data-lucide="users"></i></button>
    </section>` : ''}
    <section class="${managerView ? 'follow-up-team-list' : 'follow-up-list'}">${items}</section>`;
}

function leadDetailView() {
  const managementMode = state.route === 'management-lead';
  if (managementMode && !canManage()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao pode alterar leads da equipe.</span></div>`;
  }

  const source = managementMode
    ? [...state.management.records, ...state.appointments.records]
    : state.leads;
  const lead = source.find((item) => item.id === currentRouteParam());
  const backRoute = managementMode ? 'management' : 'leads';
  if (!lead) {
    return `<section class="page-toolbar">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
    </section><div class="notice notice-warning"><i data-lucide="info"></i><span>Cadastro nao encontrado. Volte para a lista e tente novamente.</span></div>`;
  }

  const [syncStatus, syncTone] = managementMode ? ['Sincronizado', 'success'] : syncLabel(lead);
  const managerReschedule = managementMode && state.profile?.role === 'manager';
  const locked = managerReschedule ? 'disabled' : '';
  const showAmetropiaFields = state.leadDetailSchedule.storeId === lead.storeId
    && state.leadDetailSchedule.settings.showAmetropiaFields;
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${lead.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  return `
    <section class="page-toolbar detail-toolbar">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <h2>${escapeHtml(lead.fullName)}</h2>
    </section>
    <section class="lead-detail-summary" aria-label="Informacoes do cadastro">
      <div><span>Status</span><strong class="status-badge status-${syncTone}">${syncStatus}</strong></div>
      <div><span>Loja</span><strong>${escapeHtml(storeLabel(lead.storeId))}</strong></div>
      <div><span>Cadastrado em</span><strong>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</strong></div>
    </section>
    <form id="edit-lead-form" class="form-panel" data-lead-id="${escapeHtml(lead.id)}" data-management="${managementMode}" novalidate>
      <input name="schedulingMode" type="hidden" value="${escapeHtml(lead.appointmentSchedulingMode || 'free')}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${Number(lead.appointmentDurationMinutes) || 20}" />
      ${lead.appointmentServiceId ? `<input name="appointmentServiceId" type="hidden" value="${escapeHtml(lead.appointmentServiceId)}" /><input name="appointmentServiceName" type="hidden" value="${escapeHtml(lead.appointmentServiceName || 'Exame de vista')}" />` : ''}
      <div class="field" data-field="fullName"><label for="edit-fullName">Nome <span aria-hidden="true">*</span></label><input id="edit-fullName" name="fullName" autocomplete="name" maxlength="120" value="${escapeHtml(lead.fullName)}" required ${locked} /><small class="field-error"></small></div>
      <div class="field" data-field="phone"><label for="edit-phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label><input id="edit-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" value="${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}" required ${locked} /><small class="field-error"></small></div>
      <div class="field-row identity-fields"><div class="field" data-field="customerCpf"><label for="edit-customerCpf">CPF</label><input id="edit-customerCpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" value="${escapeHtml(formatBrazilianCpf(lead.customerCpf))}" placeholder="000.000.000-00" ${locked} /><small class="field-error"></small></div><div class="field" data-field="birthDate"><label for="edit-birthDate">Data de nascimento</label><input id="edit-birthDate" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" value="${escapeHtml(lead.birthDate)}" ${locked} /><small class="birth-age-hint" data-birth-age>${escapeHtml(birthAgeText(lead.birthDate))}</small><small class="field-error"></small></div><div class="field" data-field="sex"><label for="edit-sex">Sexo</label><select id="edit-sex" name="sex" ${locked}>${sexOptions(lead.sex)}</select><small class="field-error"></small></div></div>
      <div class="field"><label for="edit-preferredName">Como prefere ser chamado</label><input id="edit-preferredName" name="preferredName" maxlength="60" value="${escapeHtml(lead.preferredName)}" ${locked} /></div>
      <div class="field-row address-fields">
        <div class="field address-street" data-field="street"><label for="edit-street">Rua</label><input id="edit-street" name="street" maxlength="120" autocomplete="address-line1" value="${escapeHtml(lead.street)}" ${locked} /><small class="field-error"></small></div>
        <div class="field address-number" data-field="streetNumber"><label for="edit-streetNumber">Numero</label><input id="edit-streetNumber" name="streetNumber" maxlength="12" autocomplete="address-line2" value="${escapeHtml(lead.streetNumber)}" placeholder="S/N" ${locked} /><small class="field-error"></small></div>
        <div class="field address-neighborhood"><label for="edit-neighborhood">Bairro</label><input id="edit-neighborhood" name="neighborhood" maxlength="80" value="${escapeHtml(lead.neighborhood)}" ${locked} /></div>
        <div class="field address-city"><label for="edit-city">Cidade</label><input id="edit-city" name="city" maxlength="80" value="${escapeHtml(lead.city)}" ${locked} /></div>
        <div class="field field-state"><label for="edit-state">UF</label><input id="edit-state" name="state" maxlength="2" value="${escapeHtml(lead.state || 'PE')}" ${locked} /></div>
      </div>
      <div class="field"><label for="edit-interestId">Interesse principal</label><select id="edit-interestId" name="interestId" ${locked}>${interests}</select></div>
      ${showAmetropiaFields ? `<fieldset class="field ametropia-field" ${locked}>
        <legend>Ametropias</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${ametropiaOptions(lead.ametropiaIds || [])}</div>
      </fieldset>` : ''}
      <fieldset class="field ametropia-field" ${locked}>
        <legend>Patologias e condicoes de saude</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${pathologyOptions(lead.pathologyIds || [])}</div>
      </fieldset>
      <div class="field-row appointment-fields">
        <div class="field" data-field="appointmentDate"><label for="edit-appointmentDate">Data do pre-agendamento</label><input id="edit-appointmentDate" name="appointmentDate" type="date" value="${escapeHtml(lead.appointmentDate)}" /><small class="field-error"></small></div>
        <div class="field" data-field="appointmentTime"><label for="edit-appointmentTime">Horario</label><input id="edit-appointmentTime" name="appointmentTime" type="time" value="${escapeHtml(lead.appointmentTime)}" /><small class="field-error"></small></div>
      </div>
      <div class="field" data-field="notes"><label for="edit-notes">Observacao rapida</label><textarea id="edit-notes" name="notes" maxlength="500" rows="3" ${locked}>${escapeHtml(lead.notes)}</textarea><small class="field-hint"><span id="edit-notes-count">${String(lead.notes || '').length}</span>/500</small><small class="field-error"></small></div>
      <button class="button button-primary button-block" type="submit"><i data-lucide="save"></i><span>${managerReschedule ? 'Salvar reagendamento' : 'Salvar alteracoes'}</span></button>
      ${managementMode && isAdmin() ? `<button class="button button-danger button-block" type="button" data-delete-lead="${escapeHtml(lead.id)}"><i data-lucide="trash-2"></i><span>Excluir lead</span></button>` : ''}
      <p class="form-footnote"><i data-lucide="shield-check"></i> Autor, loja e data original permanecem preservados.</p>
    </form>
    ${managementMode && isAdmin() ? `<dialog id="delete-lead-dialog" class="confirmation-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
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
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso aos dados gerenciais.</span></div>`;
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
    <section class="management-heading management-dashboard-heading management-toolbar">
      <div class="management-heading-actions">
        ${hasAccess('appointments.view') ? '<button class="button button-secondary" type="button" data-route="appointments"><i data-lucide="calendar-days"></i><span>Agenda de exames</span></button>' : ''}
        ${hasAccess('followups.team') ? '<button class="button button-secondary" type="button" data-route="follow-ups"><i data-lucide="bell-ring"></i><span>Retornos da equipe</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="settings"><i data-lucide="wrench"></i><span>Configuracoes</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="access"><i data-lucide="user-round-cog"></i><span>Gerenciar acessos</span></button>' : ''}
        ${hasAccess('dashboard.view') ? '<button class="button button-secondary" type="button" data-route="dashboard"><i data-lucide="bar-chart-3"></i><span>Dashboard</span></button>' : ''}
        ${hasAccess('reports.view') ? '<button class="button button-secondary" type="button" data-route="reports"><i data-lucide="clipboard-list"></i><span>Relatorios</span></button>' : ''}
        ${hasAccess('leads.export') ? `<button class="button button-secondary" type="button" data-action="export-management" ${filtered.length === 0 ? 'disabled' : ''}><i data-lucide="file-down"></i><span>Exportar CSV</span></button>` : ''}
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

function reportGroupRows(records, keyFor, labelFor) {
  const groups = [...records.reduce((result, lead) => {
    const key = keyFor(lead) || 'not-informed';
    if (!result.has(key)) result.set(key, { label: labelFor(lead), records: [] });
    result.get(key).records.push(lead);
    return result;
  }, new Map()).values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  return groups.map((group) => {
    const scheduled = group.records.filter((lead) => lead.appointmentDate && lead.appointmentTime).length;
    const attended = group.records.filter((lead) => lead.appointmentAttendance === 'attended').length;
    const missed = group.records.filter((lead) => lead.appointmentAttendance === 'missed').length;
    const decided = attended + missed;
    const rate = decided ? Math.round((attended / decided) * 100) : 0;
    return `<tr><td><strong>${escapeHtml(group.label)}</strong></td><td>${group.records.length}</td><td>${scheduled}</td><td>${attended}</td><td>${missed}</td><td><strong>${rate}%</strong></td></tr>`;
  }).join('');
}

function reportsView() {
  if (!hasAccess('reports.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso aos relatorios.</span></div>`;
  }
  const records = filteredReportRecords();
  const scheduled = records.filter((lead) => lead.appointmentDate && lead.appointmentTime).length;
  const attended = records.filter((lead) => lead.appointmentAttendance === 'attended').length;
  const missed = records.filter((lead) => lead.appointmentAttendance === 'missed').length;
  const decided = attended + missed;
  const attendanceRate = decided ? Math.round((attended / decided) * 100) : 0;
  const storeRows = reportGroupRows(records, (lead) => lead.storeId, (lead) => storeLabel(lead.storeId));
  const captorRows = reportGroupRows(records, (lead) => lead.capturedByUid || lead.capturedByName, (lead) => lead.capturedByName || 'Nao informado');
  const { filters, loading, error, truncated } = state.management;
  const table = (title, icon, rows) => `<section class="report-panel"><div class="report-panel-heading"><i data-lucide="${icon}"></i><div><h2>${title}</h2><span>${records.length} cadastro(s) no periodo</span></div></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Nome</th><th>Cadastros</th><th>Agendados</th><th>Compareceram</th><th>Faltaram</th><th>Taxa</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;

  return `<section class="reports-toolbar"><button class="button button-secondary" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button><button class="button button-secondary" type="button" data-action="reload-reports" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${loading ? 'Atualizando...' : 'Atualizar'}</span></button></section>
    <section class="report-period"><i data-lucide="calendar-days"></i><div><span>Periodo analisado</span><strong>${formatGoalDate(filters.startDate)} a ${formatGoalDate(filters.endDate)}</strong></div></section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O relatorio atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o periodo para obter o resultado completo.</span></div>` : ''}
    <section class="report-metrics" aria-label="Indicadores do periodo"><div><span>Cadastros</span><strong>${records.length}</strong><i data-lucide="clipboard-list"></i></div><div><span>Agendamentos</span><strong>${scheduled}</strong><i data-lucide="calendar-days"></i></div><div><span>Comparecimentos</span><strong>${attended}</strong><i data-lucide="circle-check"></i></div><div><span>Taxa de comparecimento</span><strong>${attendanceRate}%</strong><i data-lucide="bar-chart-3"></i></div></section>
    ${records.length ? `<section class="reports-grid">${table('Resultados por unidade', 'building-2', storeRows)}${table('Resultados por captador', 'users', captorRows)}</section>` : `<div class="empty-state report-empty"><i data-lucide="bar-chart-3"></i><strong>Nenhum dado no periodo</strong><p>Volte para a gestao e ajuste os filtros da consulta.</p></div>`}`;
}

function dashboardGroupStats(records, keyFor, labelFor) {
  return [...records.reduce((groups, lead) => {
    const key = keyFor(lead) || 'not-informed';
    if (!groups.has(key)) groups.set(key, { label: labelFor(lead), records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].map((group) => {
    const scheduled = group.records.filter((lead) => lead.appointmentDate && lead.appointmentTime).length;
    const attended = group.records.filter((lead) => lead.appointmentAttendance === 'attended').length;
    const missed = group.records.filter((lead) => lead.appointmentAttendance === 'missed').length;
    return {
      label: group.label,
      total: group.records.length,
      scheduled,
      attended,
      missed,
      attendanceRate: attended + missed ? Math.round((attended / (attended + missed)) * 100) : 0
    };
  });
}

function dashboardView() {
  if (!hasAccess('dashboard.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso ao dashboard.</span></div>`;
  }

  const records = filteredReportRecords();
  const scheduled = records.filter((lead) => lead.appointmentDate && lead.appointmentTime).length;
  const attended = records.filter((lead) => lead.appointmentAttendance === 'attended').length;
  const missed = records.filter((lead) => lead.appointmentAttendance === 'missed').length;
  const pending = Math.max(0, scheduled - attended - missed);
  const attendanceRate = attended + missed ? Math.round((attended / (attended + missed)) * 100) : 0;
  const appointmentRate = records.length ? Math.round((scheduled / records.length) * 100) : 0;
  const { filters, loading, error, truncated } = state.management;

  const dailyData = [...records.reduce((days, lead) => {
    const date = String(lead.capturedAtClient || '').slice(0, 10);
    if (date) days.set(date, (days.get(date) || 0) + 1);
    return days;
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const dailyMax = Math.max(1, ...dailyData.map(([, count]) => count));
  const dailyBars = dailyData.map(([date, count]) => {
    const height = Math.max(8, Math.round((count / dailyMax) * 100));
    const label = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${date}T12:00:00`));
    return `<div class="dashboard-chart-column" title="${count} cadastro(s) em ${label}"><strong>${count}</strong><span class="dashboard-chart-bar"><i style="height:${height}%"></i></span><small>${label}</small></div>`;
  }).join('');

  const stores = dashboardGroupStats(records, (lead) => lead.storeId, (lead) => storeLabel(lead.storeId))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
  const storeMax = Math.max(1, ...stores.map((store) => store.total));
  const storeRows = stores.map((store) => `<div class="dashboard-performance-row"><div><strong>${escapeHtml(store.label)}</strong><span>${store.total} cadastro(s)</span></div><div class="dashboard-progress"><i style="width:${Math.round((store.total / storeMax) * 100)}%"></i></div><strong>${store.attendanceRate}% presença</strong></div>`).join('');

  const captors = dashboardGroupStats(records, (lead) => lead.capturedByUid || lead.capturedByName, (lead) => lead.capturedByName || 'Nao informado')
    .sort((a, b) => b.total - a.total || b.attendanceRate - a.attendanceRate || a.label.localeCompare(b.label, 'pt-BR'));
  const captorRows = captors.map((captor, index) => `<div class="dashboard-ranking-row"><span>${index + 1}</span><div><strong>${escapeHtml(captor.label)}</strong><small>${captor.scheduled} agendado(s) · ${captor.attended} comparecimento(s)</small></div><strong>${captor.total}</strong></div>`).join('');

  const attendanceItems = [
    ['Compareceram', attended, 'success'],
    ['Nao compareceram', missed, 'danger'],
    ['Aguardando definicao', pending, 'neutral']
  ].map(([label, count, tone]) => {
    const percentage = scheduled ? Math.round((count / scheduled) * 100) : 0;
    return `<div class="dashboard-status-row"><div><span class="dashboard-status-dot is-${tone}"></span><strong>${label}</strong><span>${count}</span></div><div class="dashboard-progress is-${tone}"><i style="width:${percentage}%"></i></div><small>${percentage}% dos agendamentos</small></div>`;
  }).join('');

  return `<section class="dashboard-toolbar"><button class="button button-secondary" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button><div>${isLocalSavwinEnabled ? `<button class="button button-secondary" type="button" data-action="consult-savwin" ${state.savwin.loading ? 'disabled' : ''}><i data-lucide="cloud-check"></i><span>${state.savwin.loading ? 'Consultando...' : 'Consultar SavWin'}</span></button>` : ''}${hasAccess('reports.view') ? '<button class="button button-secondary" type="button" data-route="reports"><i data-lucide="clipboard-list"></i><span>Ver relatorios</span></button>' : ''}<button class="button button-secondary" type="button" data-action="reload-reports" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${loading ? 'Atualizando...' : 'Atualizar'}</span></button></div></section>
    <form id="dashboard-period" class="dashboard-period-filter">
      <div class="dashboard-period-title"><i data-lucide="calendar-days"></i><div><span>Periodo analisado</span><strong>Defina o intervalo do dashboard</strong></div></div>
      <div class="field"><label for="dashboard-start">Data inicial</label><input id="dashboard-start" name="startDate" type="date" value="${escapeHtml(filters.startDate)}" required /></div>
      <div class="field"><label for="dashboard-end">Data final</label><input id="dashboard-end" name="endDate" type="date" value="${escapeHtml(filters.endDate)}" required /></div>
      <button class="button button-primary" type="submit" ${loading ? 'disabled' : ''}><i data-lucide="search"></i><span>${loading ? 'Aplicando...' : 'Aplicar periodo'}</span></button>
    </form>
    ${state.savwin.error ? `<div class="notice notice-danger" role="alert"><i data-lucide="circle-alert"></i><div><strong>Consulta SavWin</strong><span>${escapeHtml(state.savwin.error)}</span></div></div>` : ''}
    ${state.savwin.result ? `<div class="notice notice-success" role="status"><i data-lucide="cloud-check"></i><div><strong>SavWin conectado localmente</strong><span>${state.savwin.result.count} item(ns) encontrados em ${state.savwin.result.osCount} OS no periodo.</span></div></div>` : ''}
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O dashboard atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o periodo para obter o resultado completo.</span></div>` : ''}
    <section class="dashboard-metrics" aria-label="Indicadores do dashboard"><div><span>Cadastros</span><strong>${records.length}</strong><small>no periodo</small><i data-lucide="clipboard-list"></i></div><div><span>Agendamentos</span><strong>${scheduled}</strong><small>${appointmentRate}% dos cadastros</small><i data-lucide="calendar-days"></i></div><div><span>Comparecimentos</span><strong>${attended}</strong><small>${attendanceRate}% de presenca</small><i data-lucide="circle-check"></i></div><div><span>Captadores ativos</span><strong>${captors.length}</strong><small>${stores.length} unidade(s)</small><i data-lucide="users"></i></div></section>
    ${records.length ? `<section class="dashboard-grid"><article class="dashboard-panel dashboard-trend-panel"><header><div><span>Evolucao</span><h2>Cadastros por dia</h2></div><strong>Ultimos ${dailyData.length} dia(s) com registros</strong></header><div class="dashboard-chart" aria-label="Grafico de cadastros por dia">${dailyBars}</div></article><article class="dashboard-panel"><header><div><span>Agenda</span><h2>Situacao dos agendamentos</h2></div><strong>${scheduled} total</strong></header><div class="dashboard-status-list">${attendanceItems}</div></article><article class="dashboard-panel"><header><div><span>Unidades</span><h2>Desempenho por loja</h2></div><strong>${stores.length} analisada(s)</strong></header><div class="dashboard-performance-list">${storeRows}</div></article><article class="dashboard-panel"><header><div><span>Equipe</span><h2>Ranking de captadores</h2></div><strong>Por cadastros</strong></header><div class="dashboard-ranking-list">${captorRows}</div></article></section>` : `<div class="empty-state dashboard-empty"><i data-lucide="bar-chart-3"></i><strong>Nenhum dado para exibir</strong><p>Volte para a gestao e ajuste os filtros do periodo.</p></div>`}`;
}

function appointmentsView() {
  if (!hasAccess('appointments.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil nao possui acesso a agenda gerencial.</span></div>`;
  }

  const { loading, error, truncated, month, storeId, selectedDate, updatingId } = state.appointments;
  const backRoute = canManage() ? 'management' : 'home';
  const records = state.demoMode
    ? state.leads.filter((lead) => String(lead.appointmentDate || '').startsWith(`${month}-`))
    : state.appointments.records;
  const groups = appointmentsByDate(records);
  const days = calendarDays(month);
  const selected = groups[selectedDate] || [];
  const selectedDateCanBeScheduled = selectedDate >= toLocalDateInput(new Date());
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
        <div class="appointment-person"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(lead.appointmentServiceName || 'Exame de vista')} · ${Number(lead.appointmentDurationMinutes) || 20} min</small><small>${escapeHtml(storeLabel(lead.storeId))} · ${escapeHtml(lead.capturedByName || 'Captador nao informado')}</small></div>
        ${hasAccess('appointments.attendance') ? `<div class="appointment-attendance" role="group" aria-label="Comparecimento de ${escapeHtml(lead.fullName)}">
          <button class="attendance-button is-attended ${attendance === 'attended' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="attended" aria-pressed="${attendance === 'attended'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-check"></i><span>Compareceu</span></button>
          <button class="attendance-button is-missed ${attendance === 'missed' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="missed" aria-pressed="${attendance === 'missed'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-x"></i><span>Nao compareceu</span></button>
        </div>` : ''}
        ${isAdmin() ? `<button class="icon-button appointment-open" type="button" data-appointment-lead-id="${escapeHtml(lead.id)}" title="Abrir cadastro" aria-label="Abrir cadastro de ${escapeHtml(lead.fullName)}"><i data-lucide="chevron-right"></i></button>` : ''}
      </article>`;
    }).join('')
    : `<div class="agenda-empty"><i data-lucide="calendar-days"></i><strong>Nenhum exame neste dia</strong><p>Selecione uma data destacada no calendario.</p></div>`;

  const storeTotals = allowedStores
    .map((store) => ({ ...store, count: records.filter((lead) => lead.storeId === store.id).length }))
    .filter((store) => !storeId || store.id === storeId)
    .map((store) => `<div class="agenda-store-row"><span><i data-lucide="building-2"></i>${store.label}</span><strong>${store.count} exame(s)</strong></div>`)
    .join('');
  const createDialog = appointmentCreateDialog(allowedStores);

  return `<section class="management-heading page-actions-only agenda-heading">
      <button class="button button-secondary" type="button" data-route="${backRoute}"><i data-lucide="arrow-left"></i><span>${backRoute === 'management' ? 'Voltar para gestao' : 'Voltar ao inicio'}</span></button>
      ${hasAccess('leads.create') ? `<button class="button button-primary" type="button" data-create-appointment ${selectedDateCanBeScheduled ? '' : 'disabled title="Nao e possivel agendar em uma data passada"'}><i data-lucide="user-plus"></i><span>Novo agendamento</span></button>` : ''}
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
        <section class="agenda-day-details">
          <div class="agenda-day-heading">
            <div class="agenda-section-title"><i data-lucide="calendar-days"></i><div><h2>Agendamentos</h2><p>${escapeHtml(formatAppointmentDate(selectedDate))}</p></div></div>
          </div>
          <div class="appointment-list">${selectedItems}</div>
        </section>
      </aside>
    </section>${hasAccess('leads.create') ? createDialog : ''}`;
}

function appointmentCreateSchedule() {
  return state.appointmentCreate.schedules.find((item) => item.id === state.appointmentCreate.storeId)
    || { ...DEFAULT_STORE_SCHEDULE, id: state.appointmentCreate.storeId };
}

function appointmentCreateService() {
  const schedule = appointmentCreateSchedule();
  const available = servicesForStore(state.appointmentCreate.services, state.appointmentCreate.storeId);
  return available.find((service) => service.id === state.appointmentCreate.serviceId)
    || available[0]
    || defaultAppointmentService(state.appointmentCreate.storeId, schedule.appointmentDurationMinutes);
}

function appointmentCreateTimeField() {
  const schedule = appointmentCreateSchedule();
  const service = appointmentCreateService();
  if (state.appointmentCreate.loading) {
    return '<div id="appointment-create-time-field" class="field"><label>Horario</label><div class="readonly-field">Carregando horarios...</div></div>';
  }
  if (schedule.schedulingMode === 'free') {
    return '<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label for="agenda-lead-time">Horario</label><input id="agenda-lead-time" name="appointmentTime" type="time" required /><small class="field-error"></small></div>';
  }
  const records = (state.demoMode ? state.leads : state.appointments.records)
    .filter((lead) => lead.storeId === state.appointmentCreate.storeId
      && lead.appointmentDate === state.appointments.selectedDate);
  const available = buildAppointmentSlots(
    { ...schedule, appointmentDurationMinutes: service.durationMinutes },
    records,
    '',
    { appointmentDate: state.appointments.selectedDate, profile: state.profile }
  )
    .filter((slot) => slot.available);
  return `<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label for="agenda-lead-time">Horario disponivel</label><select id="agenda-lead-time" name="appointmentTime" required ${available.length ? '' : 'disabled'}><option value="">${available.length ? 'Selecione um horario' : 'Dia sem horarios disponiveis'}</option>${available.map((slot) => `<option value="${slot.time}">${slot.time} - ${slot.endTime}</option>`).join('')}</select><small class="field-error"></small></div>`;
}

function appointmentCreateDialog(allowedStores) {
  const { loading, saving, error, storeId } = state.appointmentCreate;
  const draft = state.appointmentCreate.draft || {};
  const schedule = appointmentCreateSchedule();
  const selectedService = appointmentCreateService();
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${draft.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${store.id === storeId ? 'selected' : ''}>${store.label}</option>`).join('');
  const availableServices = servicesForStore(state.appointmentCreate.services, storeId);
  const serviceOptions = (availableServices.length ? availableServices : [selectedService])
    .map((service) => `<option value="${escapeHtml(service.id)}" ${service.id === selectedService.id ? 'selected' : ''}>${escapeHtml(service.name)} - ${service.durationMinutes} min</option>`)
    .join('');
  return `<dialog id="appointment-create-dialog" class="appointment-create-dialog" aria-labelledby="appointment-create-title">
    <div class="appointment-create-header">
      <div><span>CADASTRO</span><h2 id="appointment-create-title">Novo agendamento</h2><p>${escapeHtml(formatAppointmentDate(state.appointments.selectedDate))}</p></div>
      <button class="icon-button" type="button" data-close-appointment-create aria-label="Fechar"><i data-lucide="circle-x"></i></button>
    </div>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    <form id="appointment-create-form" novalidate>
      <div class="appointment-create-content">
      <input name="schedulingMode" type="hidden" value="${escapeHtml(schedule.schedulingMode)}" />
      <input name="appointmentServiceName" type="hidden" value="${escapeHtml(selectedService.name)}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${selectedService.durationMinutes}" />
      <div class="appointment-create-grid">
        <div class="field" data-field="fullName"><label for="agenda-lead-name">Nome <span aria-hidden="true">*</span></label><input id="agenda-lead-name" name="fullName" maxlength="120" autocomplete="name" placeholder="Nome do cliente" value="${escapeHtml(draft.fullName || '')}" required /><small class="field-error"></small></div>
        <div class="field" data-field="phone"><label for="agenda-lead-phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label><input id="agenda-lead-phone" name="phone" type="tel" inputmode="numeric" maxlength="16" autocomplete="tel" placeholder="(00) 00000-0000" value="${escapeHtml(draft.phone || '')}" required /><small class="field-error"></small></div>
        <div class="field-row identity-fields">
          <div class="field" data-field="customerCpf"><label for="agenda-lead-cpf">CPF</label><input id="agenda-lead-cpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" value="${escapeHtml(draft.customerCpf || '')}" /><small class="field-error"></small></div>
          <div class="field" data-field="birthDate"><label for="agenda-lead-birth-date">Data de nascimento</label><input id="agenda-lead-birth-date" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" value="${escapeHtml(draft.birthDate || '')}" /><small class="birth-age-hint" data-birth-age>${birthAgeText(draft.birthDate || '')}</small><small class="field-error"></small></div>
          <div class="field" data-field="sex"><label for="agenda-lead-sex">Sexo</label><select id="agenda-lead-sex" name="sex">${sexOptions(draft.sex || '')}</select><small class="field-error"></small></div>
        </div>
        <div class="field"><label for="agenda-lead-preferred-name">Como prefere ser chamado</label><input id="agenda-lead-preferred-name" name="preferredName" maxlength="60" placeholder="Apelido ou nome preferido" value="${escapeHtml(draft.preferredName || '')}" /></div>
        <div class="field-row address-fields"><div class="field address-street" data-field="street"><label for="agenda-lead-street">Rua</label><input id="agenda-lead-street" name="street" maxlength="120" autocomplete="address-line1" value="${escapeHtml(draft.street || '')}" /><small class="field-error"></small></div><div class="field address-number" data-field="streetNumber"><label for="agenda-lead-street-number">Numero</label><input id="agenda-lead-street-number" name="streetNumber" maxlength="12" autocomplete="address-line2" placeholder="S/N" value="${escapeHtml(draft.streetNumber || '')}" /><small class="field-error"></small></div><div class="field address-neighborhood"><label for="agenda-lead-neighborhood">Bairro</label><input id="agenda-lead-neighborhood" name="neighborhood" maxlength="80" value="${escapeHtml(draft.neighborhood || '')}" /></div><div class="field address-city"><label for="agenda-lead-city">Cidade</label><input id="agenda-lead-city" name="city" maxlength="80" value="${escapeHtml(draft.city || '')}" /></div><div class="field field-state"><label for="agenda-lead-state">UF</label><input id="agenda-lead-state" name="state" maxlength="2" value="${escapeHtml(draft.state || 'PE')}" /></div></div>
        <div class="field" data-field="storeId"><label for="agenda-lead-store">Loja</label><select id="agenda-lead-store" name="storeId" ${loading ? 'disabled' : ''}>${storeOptions}</select><small class="field-error"></small></div>
        <div class="field-row interest-service-fields">
          <div class="field"><label for="agenda-lead-interest">Interesse principal</label><select id="agenda-lead-interest" name="interestId">${interests}</select></div>
          <div class="field" data-field="appointmentServiceId"><label for="agenda-lead-service">Servico do agendamento</label><select id="agenda-lead-service" name="appointmentServiceId" ${loading ? 'disabled' : ''}>${serviceOptions}</select><small class="field-error"></small></div>
        </div>
        ${schedule.showAmetropiaFields ? `<fieldset class="field ametropia-field"><legend>Ametropias</legend><small>Marque todas que se aplicam.</small><div class="ametropia-options">${ametropiaOptions(draft.ametropiaIds || [])}</div></fieldset>` : ''}
        <fieldset class="field ametropia-field"><legend>Patologias e condicoes de saude</legend><small>Marque todas que se aplicam.</small><div class="ametropia-options">${pathologyOptions(draft.pathologyIds || [])}</div></fieldset>
        <div class="field-row appointment-fields">
          <div class="field" data-field="appointmentDate"><label for="agenda-lead-date">Data do pre-agendamento</label><input id="agenda-lead-date" type="date" value="${escapeHtml(state.appointments.selectedDate)}" disabled /><input name="appointmentDate" type="hidden" value="${escapeHtml(state.appointments.selectedDate)}" /><small class="field-error"></small></div>
          ${appointmentCreateTimeField()}
        </div>
        <div class="field" data-field="notes"><label for="agenda-lead-notes">Observacao rapida</label><textarea id="agenda-lead-notes" name="notes" maxlength="500" rows="3" placeholder="Ex.: prefere contato pela manha">${escapeHtml(draft.notes || '')}</textarea><small class="field-hint"><span id="agenda-notes-count">${String(draft.notes || '').length}</span>/500</small><small class="field-error"></small></div>
      </div>
      </div>
      <div class="appointment-create-actions"><button class="button button-secondary" type="button" data-close-appointment-create>Cancelar</button><button class="button button-primary" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar cadastro'}</span></button></div>
    </form>
  </dialog>`;
}

function settingsView() {
  if (!isAdmin()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem alterar as configuracoes das lojas.</span></div>`;
  }

  const { records, selectedStoreId, loading, saving, error, section } = state.settings;
  const content = section === 'roles'
    ? roleProfilesSettingsView()
    : section === 'services'
      ? serviceCatalogSettingsView()
      : scheduleSettingsView();

  return `<section class="page-toolbar settings-toolbar">
      <div class="settings-tabs" role="tablist" aria-label="Categorias de configuracao">
        <button class="settings-tab ${section === 'schedule' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'schedule'}" data-settings-section="schedule"><i data-lucide="calendar-days"></i><span>Agenda</span></button>
        <button class="settings-tab ${section === 'services' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'services'}" data-settings-section="services"><i data-lucide="stethoscope"></i><span>Servicos</span></button>
        <button class="settings-tab ${section === 'roles' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'roles'}" data-settings-section="roles"><i data-lucide="shield-check"></i><span>Perfis e permissoes</span></button>
      </div>
      <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    <div aria-busy="${loading || saving}">${content}</div>`;
}

function serviceCatalogSettingsView() {
  const { services, saving, serviceEditorOpen, editingServiceId } = state.settings;
  const editing = services.find((service) => service.id === editingServiceId) || null;
  const rows = services.map((service) => `<article class="service-catalog-row ${service.active ? '' : 'is-inactive'}">
    <span class="service-catalog-icon"><i data-lucide="stethoscope"></i></span>
    <div class="service-catalog-name"><strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(service.storeIds.map(storeLabel).join(' · '))}</span></div>
    <div class="service-catalog-duration"><span>Duracao</span><strong>${service.durationMinutes} min</strong></div>
    <span class="status-badge status-${service.active ? 'success' : 'neutral'}">${service.active ? 'Ativo' : 'Inativo'}</span>
    <div class="service-catalog-actions">
      <button class="icon-button" type="button" data-service-edit="${escapeHtml(service.id)}" title="Editar servico" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
      <button class="button button-secondary" type="button" data-service-toggle="${escapeHtml(service.id)}" ${saving ? 'disabled' : ''}><i data-lucide="${service.active ? 'circle-x' : 'circle-check'}"></i><span>${service.active ? 'Desativar' : 'Ativar'}</span></button>
    </div>
  </article>`).join('');
  const selectedStoreIds = editing?.storeIds || [state.settings.selectedStoreId || STORES[0].id];
  const storeOptions = STORES.map((store) => `<label class="service-store-option">
    <input type="checkbox" name="storeIds" value="${store.id}" ${selectedStoreIds.includes(store.id) ? 'checked' : ''} />
    <span>${store.label}</span>
  </label>`).join('');

  return `<section class="service-catalog-panel">
    <div class="service-catalog-heading"><div><span class="eyebrow">AGENDA</span><h2>Servicos cadastrados</h2><p>Defina a duracao dos atendimentos oferecidos em cada unidade.</p></div><button class="button button-primary" type="button" data-service-new><i data-lucide="circle-plus"></i><span>Novo servico</span></button></div>
    ${rows ? `<div class="service-catalog-list">${rows}</div>` : '<div class="empty-state"><i data-lucide="stethoscope"></i><strong>Nenhum servico cadastrado</strong><p>Crie o primeiro servico da agenda.</p></div>'}
  </section>
  ${serviceEditorOpen ? `<dialog id="service-editor-dialog" class="access-editor-dialog service-editor-dialog" aria-labelledby="service-editor-title">
    <form id="service-form" class="access-form" novalidate>
      <header><div><span class="eyebrow">SERVICO DA AGENDA</span><h2 id="service-editor-title">${editing ? 'Editar servico' : 'Novo servico'}</h2><p>A duracao sera usada para calcular os horarios disponiveis.</p></div><button class="icon-button" type="button" data-service-editor-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
      <div class="access-form-body">
        <div class="field service-name-field" data-field="name"><label for="service-name">Nome do servico</label><input id="service-name" name="name" maxlength="80" value="${escapeHtml(editing?.name || '')}" placeholder="Ex.: Exame de vista" required /><small class="field-error"></small></div>
        <div class="field service-duration-field" data-field="durationMinutes"><label for="service-duration">Duracao</label><div class="number-with-unit"><input id="service-duration" name="durationMinutes" type="number" min="5" max="180" step="5" value="${editing?.durationMinutes || 30}" required /><span>min</span></div><small class="field-error"></small></div>
        <fieldset class="field access-field-wide service-store-field" data-field="storeIds"><legend>Lojas atendidas</legend><small>Marque todas as unidades que oferecem este servico.</small><div class="service-store-options">${storeOptions}</div><small class="field-error"></small></fieldset>
        <input name="active" type="hidden" value="${editing?.active === false ? 'false' : 'true'}" />
      </div>
      <footer><button class="button button-secondary" type="button" data-service-editor-close>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar servico'}</span></button></footer>
    </form>
  </dialog>` : ''}`;
}

function scheduleSettingsView() {
  const { records, selectedStoreId, loading, saving } = state.settings;
  const selected = records.find((item) => item.id === selectedStoreId)
    || { ...STORES.find((item) => item.id === selectedStoreId), ...DEFAULT_STORE_SCHEDULE };
  const previewSlots = buildAppointmentSlots(selected);
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${store.label}</option>`).join('');
  const limitedWeekdayOptions = WEEKDAY_OPTIONS.map((day) => `<label class="schedule-weekday-option checkbox-label"><input type="checkbox" name="limitedWeekdays" value="${day.id}" ${selected.limitedWeekdays.includes(day.id) ? 'checked' : ''} /><span>${day.label}</span></label>`).join('');
  const limitedDayLabels = WEEKDAY_OPTIONS.filter((day) => selected.limitedWeekdays.includes(day.id)).map((day) => day.label).join(', ');

  return `<section class="settings-layout">
      <form id="schedule-settings-form" class="settings-form" novalidate>
        <div class="filter-title"><i data-lucide="calendar-days"></i><div><strong>Configuracoes da agenda</strong><span>As alteracoes valem para novos pre-agendamentos.</span></div></div>
        <div class="field"><label for="settings-store">Loja</label><select id="settings-store" name="storeId">${storeOptions}</select></div>
        <div class="field" data-field="schedulingMode"><label for="settings-mode">Disponibilidade</label><select id="settings-mode" name="schedulingMode"><option value="controlled" ${selected.schedulingMode === 'controlled' ? 'selected' : ''}>Controlada por horarios</option><option value="free" ${selected.schedulingMode === 'free' ? 'selected' : ''}>Cadastro livre</option></select><small class="field-error"></small></div>
        <div class="schedule-settings-fields ${selected.schedulingMode === 'free' ? 'is-disabled' : ''}">
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
        <input name="showAmetropiaFields" type="hidden" value="false" />
        <label class="setting-toggle checkbox-label" for="settings-show-ametropias">
          <span><strong>Exibir ametropias no cadastro</strong><small>Mostra estas opcoes nos novos cadastros e agendamentos.</small></span>
          <input id="settings-show-ametropias" name="showAmetropiaFields" type="checkbox" value="true" ${selected.showAmetropiaFields ? 'checked' : ''} />
          <span class="setting-toggle-control" aria-hidden="true"></span>
        </label>
        <input name="limitedDaysEnabled" type="hidden" value="false" />
        <label class="setting-toggle checkbox-label" for="settings-limited-days">
          <span><strong>Limitar vagas em dias especificos</strong><small>Reduz a disponibilidade nos dias escolhidos e aplica a cota do MEI.</small></span>
          <input id="settings-limited-days" name="limitedDaysEnabled" type="checkbox" value="true" ${selected.limitedDaysEnabled ? 'checked' : ''} />
          <span class="setting-toggle-control" aria-hidden="true"></span>
        </label>
        <fieldset class="field schedule-limit-fields ${selected.limitedDaysEnabled ? '' : 'is-disabled'}" data-field="limitedWeekdays" ${selected.limitedDaysEnabled ? '' : 'disabled'}>
          <legend>Dias com vagas limitadas</legend>
          <small>Quarta e sabado ficam selecionados inicialmente, mas podem ser alterados.</small>
          <div class="schedule-weekday-options">${limitedWeekdayOptions}</div>
          <small class="field-error"></small>
          <div class="field-row schedule-limit-numbers">
            <div class="field" data-field="limitedDayCapacity"><label for="settings-day-capacity">Vagas totais por dia</label><div class="number-with-unit"><input id="settings-day-capacity" name="limitedDayCapacity" type="number" min="1" max="100" step="1" value="${selected.limitedDayCapacity}" /><span>vagas</span></div><small class="field-error"></small></div>
            <div class="field" data-field="meiDailyQuota"><label for="settings-mei-quota">Cota por MEI</label><div class="number-with-unit"><input id="settings-mei-quota" name="meiDailyQuota" type="number" min="1" max="100" step="1" value="${selected.meiDailyQuota}" /><span>vagas</span></div><small class="field-error"></small></div>
          </div>
        </fieldset>
        <button class="button button-primary button-block" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar configuracao'}</span></button>
      </form>
      <aside class="schedule-preview">
        <div class="filter-title"><i data-lucide="clock-3"></i><div><strong>Resumo do atendimento</strong><span>${escapeHtml(selected.label || storeLabel(selectedStoreId))}</span></div></div>
        ${selected.schedulingMode === 'free'
          ? '<div class="schedule-free-state"><i data-lucide="calendar-days"></i><strong>Cadastro livre</strong><span>O captador podera informar qualquer horario.</span></div>'
          : `<div class="schedule-summary-grid"><div><span>Expediente</span><strong>${selected.openingTime} - ${selected.closingTime}</strong></div><div><span>Alerta de falta</span><strong>${selected.noShowGraceMinutes} min</strong></div><div><span>Retorno automatico</span><strong>${selected.automaticPendingFollowUp ? 'Ativo' : 'Desativado'}</strong></div><div><span>Ametropias no cadastro</span><strong>${selected.showAmetropiaFields ? 'Ativas' : 'Desativadas'}</strong></div><div><span>Dias limitados</span><strong>${selected.limitedDaysEnabled ? escapeHtml(limitedDayLabels || 'Nao definidos') : 'Desativado'}</strong></div><div><span>Limites</span><strong>${selected.limitedDaysEnabled ? `${selected.limitedDayCapacity} vagas; MEI ${selected.meiDailyQuota}` : 'Sem limite especial'}</strong></div></div>
            <div class="schedule-slot-preview" aria-label="Exemplo de horarios">${previewSlots.slice(0, 12).map((slot) => `<span>${slot.time}</span>`).join('')}${previewSlots.length > 12 ? `<span>+${previewSlots.length - 12}</span>` : ''}</div>`}
      </aside>
    </section>`;
}

function roleProfilesSettingsView() {
  const { roleProfiles, roleEditorOpen, roleDraft, editingRoleId, pendingDeleteRoleId, detailsRoleId, detailsRolePermissions, saving } = state.settings;
  const compatiblePermissionIds = new Set(permissionsForScope(roleDraft.scope));
  const scopeOptions = ROLE_SCOPES.map((scope) => `<option value="${scope.id}" ${scope.id === roleDraft.scope ? 'selected' : ''}>${scope.label}</option>`).join('');
  const editorPermissionGroups = PERMISSION_GROUPS.map((group) => `<fieldset class="role-details-group"><legend>${escapeHtml(group.label)}</legend>${group.permissions.map((permission) => {
    const active = roleDraft.permissions.includes(permission.id);
    const canToggle = compatiblePermissionIds.has(permission.id);
    return `<label class="role-details-permission ${active ? 'is-active' : ''} ${canToggle ? 'is-editable' : 'is-locked'}"><span><strong>${escapeHtml(permission.label)}</strong><small>${active ? 'Ativada' : 'Desativada'}</small></span><input name="permissions" type="checkbox" value="${escapeHtml(permission.id)}" ${active ? 'checked' : ''} ${canToggle && !saving ? '' : 'disabled'} /><span class="setting-toggle-control" aria-hidden="true"></span></label>`;
  }).join('')}</fieldset>`);
  const editorPermissionLayout = `<div class="role-details-column">${editorPermissionGroups[0]}${editorPermissionGroups[2]}</div><div class="role-details-column">${editorPermissionGroups[1]}</div>`;
  const rows = roleProfiles.map((profile) => `<article class="service-catalog-row role-catalog-row ${editingRoleId === profile.id ? 'is-editing' : ''}">
    <span class="service-catalog-icon"><i data-lucide="shield-check"></i></span>
    <button class="role-catalog-name" type="button" data-role-details="${escapeHtml(profile.id)}" aria-label="Visualizar permissoes do perfil ${escapeHtml(profile.name)}"><strong>${escapeHtml(profile.name)}</strong><span>${profile.scope === 'admin' ? 'Acesso completo' : profile.scope === 'stores' ? 'Unidades permitidas' : 'Dados proprios'}</span></button>
    <div class="service-catalog-duration role-catalog-permissions"><span>Permissoes</span><strong>${profile.permissions.length} ativa(s)</strong></div>
    <span class="status-badge status-${profile.system ? 'neutral' : 'success'}">${profile.system ? profile.customized ? 'Padrao ajustado' : 'Padrao' : 'Personalizado'}</span>
    <div class="service-catalog-actions role-catalog-actions">
      ${profile.system
        ? `<button class="icon-button" type="button" data-role-details="${escapeHtml(profile.id)}" title="${profile.baseRole === 'admin' ? 'Visualizar permissoes' : 'Configurar permissoes'}" ${saving ? 'disabled' : ''}><i data-lucide="${profile.baseRole === 'admin' ? 'eye' : 'pencil'}"></i></button>`
        : `<button class="icon-button" type="button" data-role-edit="${escapeHtml(profile.id)}" title="Editar cargo" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button><button class="icon-button role-delete-button" type="button" data-role-delete="${escapeHtml(profile.id)}" title="Excluir cargo" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i></button>`}
    </div>
  </article>`).join('');
  const deleting = roleProfiles.find((profile) => profile.id === pendingDeleteRoleId);
  const detailsProfile = roleProfiles.find((profile) => profile.id === detailsRoleId);
  const detailsEditable = detailsProfile?.system && detailsProfile.baseRole !== 'admin';
  const activeDetailPermissions = detailsProfile && detailsRoleId === detailsProfile.id
    ? detailsRolePermissions
    : detailsProfile?.permissions || [];
  const compatibleDetailPermissions = new Set(detailsProfile ? permissionsForScope(detailsProfile.scope) : []);
  const detailGroups = detailsProfile ? PERMISSION_GROUPS.map((group) => `<fieldset class="role-details-group"><legend>${escapeHtml(group.label)}</legend>${group.permissions.map((permission) => {
    const active = activeDetailPermissions.includes(permission.id);
    const canToggle = detailsEditable && compatibleDetailPermissions.has(permission.id);
    return `<label class="role-details-permission ${active ? 'is-active' : ''} ${canToggle ? 'is-editable' : 'is-locked'}"><span><strong>${escapeHtml(permission.label)}</strong><small>${active ? 'Ativada' : 'Desativada'}</small></span><input type="checkbox" value="${escapeHtml(permission.id)}" data-system-role-permission ${active ? 'checked' : ''} ${canToggle && !saving ? '' : 'disabled'} /><span class="setting-toggle-control" aria-hidden="true"></span></label>`;
  }).join('')}</fieldset>`) : [];
  const detailGroupsLayout = detailsProfile
    ? `<div class="role-details-column">${detailGroups[0]}${detailGroups[2]}</div><div class="role-details-column">${detailGroups[1]}</div>`
    : '';

  return `<section class="service-catalog-panel role-catalog-panel">
    <div class="service-catalog-heading"><div><span class="eyebrow">EQUIPE</span><h2>Cargos cadastrados</h2><p>Defina o alcance e as permissoes de cada cargo da equipe.</p></div><button class="button button-primary" type="button" data-role-new><i data-lucide="circle-plus"></i><span>Adicionar cargo</span></button></div>
    <div class="service-catalog-list role-catalog-list">${rows}</div>
  </section>
  ${roleEditorOpen ? `<dialog id="role-editor-dialog" class="role-details-dialog role-editor-dialog" aria-labelledby="role-editor-title">
    <form id="role-profile-form" class="role-editor-form" novalidate>
      <header><div><span class="eyebrow">CARGO DA EQUIPE</span><h2 id="role-editor-title">${editingRoleId ? 'Editar cargo' : 'Novo cargo'}</h2><p>Configure individualmente o que este cargo podera acessar.</p></div><button class="icon-button" type="button" data-role-cancel aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
      <div class="role-editor-content">
        <div class="role-editor-basics">
          <div class="field" data-field="name"><label for="role-profile-name">Nome do cargo</label><input id="role-profile-name" name="name" maxlength="60" value="${escapeHtml(roleDraft.name)}" placeholder="Ex.: Supervisor de atendimento" required /><small class="field-error"></small></div>
          <div class="field" data-field="scope"><label for="role-profile-scope">Alcance dos dados</label><select id="role-profile-scope" name="scope">${scopeOptions}</select><small class="field-error"></small></div>
        </div>
        <div class="role-permissions-heading"><strong>Permissoes</strong><span>As opcoes indisponiveis nao pertencem ao alcance selecionado.</span></div>
        <div class="role-details-body role-editor-permissions-body" data-field="permissions">${editorPermissionLayout}<small class="field-error"></small></div>
      </div>
      <footer><span><strong data-role-editor-count>${roleDraft.permissions.length}</strong> de ${PERMISSION_GROUPS.flatMap((group) => group.permissions).length} permissoes ativadas</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-role-cancel>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : editingRoleId ? 'Salvar alteracoes' : 'Criar cargo'}</span></button></div></footer>
    </form>
  </dialog>` : ''}
  ${deleting ? `<dialog id="delete-role-dialog" class="confirmation-dialog" aria-labelledby="delete-role-title" aria-describedby="delete-role-description"><div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div><h2 id="delete-role-title">Excluir cargo?</h2><p id="delete-role-description">O cargo <strong>${escapeHtml(deleting.name)}</strong> sera removido. A exclusao so sera permitida se nenhuma pessoa estiver usando este cargo.</p><div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-role-delete-cancel>Cancelar</button><button class="button button-danger" type="button" data-role-delete-confirm="${escapeHtml(deleting.id)}" ${saving ? 'disabled' : ''}>Excluir cargo</button></div></dialog>` : ''}
  ${detailsProfile ? `<dialog id="role-details-dialog" class="role-details-dialog" aria-labelledby="role-details-title">
    <header><div><span class="eyebrow">PERFIL DE ACESSO</span><h2 id="role-details-title">${escapeHtml(detailsProfile.name)}</h2><p>${detailsProfile.scope === 'admin' ? 'Acesso completo ao sistema' : detailsProfile.scope === 'stores' ? 'Acesso limitado as unidades permitidas' : 'Acesso aos proprios dados'}</p></div><button class="icon-button" type="button" data-role-details-close title="Fechar" aria-label="Fechar permissoes"><i data-lucide="circle-x"></i></button></header>
    <div class="role-details-body">${detailGroupsLayout}</div>
    <footer><span><strong data-role-details-count>${activeDetailPermissions.length}</strong> de ${PERMISSION_GROUPS.flatMap((group) => group.permissions).length} permissoes ativadas</span><div class="role-details-actions">${detailsEditable ? `<button class="button button-secondary" type="button" data-system-role-reset="${escapeHtml(detailsProfile.id)}" ${saving ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>Restaurar padrao</span></button><button class="button button-secondary" type="button" data-role-details-close>Cancelar</button><button class="button button-primary" type="button" data-system-role-save="${escapeHtml(detailsProfile.id)}" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar permissoes'}</span></button>` : '<button class="button button-primary" type="button" data-role-details-close>Concluir</button>'}</div></footer>
  </dialog>` : ''}`;
}

function accessView() {
  if (!isAdmin()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem gerenciar acessos.</span></div>`;
  }

  const { accesses, loading, saving, error } = state.access;
  const editingAccess = accesses.find((item) => item.email === state.access.editingEmail) || null;
  const deletingAccess = accesses.find((item) => item.email === state.access.pendingDeleteEmail) || null;
  const selectedStoreId = editingAccess?.storeId || state.profile.storeId || STORES[0]?.id;
  const selectedRoleProfileId = editingAccess?.roleProfileId || systemRoleProfileForRole(editingAccess?.role || 'captor').id;
  const selectedStoreIds = editingAccess?.storeIds || [selectedStoreId];
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${selectedStoreId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const storeChecks = STORES.map((store) => `<label class="access-store-option checkbox-label"><input type="checkbox" name="storeIds" value="${store.id}" ${selectedStoreIds.includes(store.id) ? 'checked' : ''} /><span>${store.label}</span></label>`).join('');
  const roleProfileOptions = state.settings.roleProfiles.map((profile) => `<option value="${escapeHtml(profile.id)}" data-base-role="${escapeHtml(profile.baseRole)}" ${selectedRoleProfileId === profile.id ? 'selected' : ''}>${escapeHtml(profile.name)}</option>`).join('');
  const rows = accesses.map((access) => {
    const isCurrentUser = access.email === state.profile.email?.toLowerCase();
    const storeSummary = formatAccessStoreSummary(access);
    return `<article class="access-row ${access.active ? '' : 'is-inactive'}">
      <div class="access-identity">
        <span class="avatar access-avatar">${escapeHtml(profileInitials(access.displayName))}</span>
        <div class="access-identity-copy"><strong>${escapeHtml(access.displayName)}</strong><span>${escapeHtml(access.email)}</span>${access.phone ? `<small>${escapeHtml(formatBrazilianPhone(access.phone))}</small>` : ''}</div>
      </div>
      <div class="access-detail"><span>Perfil</span><strong>${escapeHtml(roleProfileLabel(access))}</strong></div>
      <div class="access-detail access-permissions"><span>Unidades</span><strong title="${escapeHtml(storeSummary.full)}">${escapeHtml(storeSummary.short)}</strong></div>
      <div class="access-detail"><span>Codigo SavWin</span><strong>${escapeHtml(access.savwinCode || 'Nao informado')}</strong></div>
      <div class="access-status"><span class="status-badge status-${access.active ? 'success' : 'danger'}">${access.active ? 'Ativo' : 'Bloqueado'}</span><small>Primeiro acesso: ${access.hasLoggedIn ? 'realizado' : 'pendente'}</small></div>
      <div class="access-actions">
        <button class="icon-button" type="button" data-access-edit="${escapeHtml(access.email)}" title="Editar acesso" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
        <button class="button button-secondary access-toggle" type="button" data-access-email="${escapeHtml(access.email)}" data-access-active="${access.active}" ${isCurrentUser || saving ? 'disabled' : ''}>
          <i data-lucide="${access.active ? 'log-out' : 'circle-check'}"></i><span>${access.active ? 'Bloquear' : 'Reativar'}</span>
        </button>
        <button class="icon-button access-delete" type="button" data-access-delete="${escapeHtml(access.email)}" title="Excluir acesso" aria-label="Excluir acesso de ${escapeHtml(access.displayName)}" ${isCurrentUser || saving ? 'disabled' : ''}><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
  }).join('');

  return `
    <section class="page-toolbar">
      <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestao</span></button>
      <button class="button button-primary" type="button" data-access-new><i data-lucide="user-plus"></i><span>Novo acesso</span></button>
    </section>
    <section class="access-list-panel" aria-busy="${loading}">
      <div class="access-list-heading"><div><strong>Acessos cadastrados</strong><span>${accesses.length} pessoa(s)</span></div><button class="icon-button" type="button" data-action="reload-accesses" title="Atualizar acessos" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i></button></div>
      ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
      ${loading && !accesses.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando acessos...</strong></div>' : ''}
      ${!loading && !accesses.length ? '<div class="empty-state"><i data-lucide="users"></i><strong>Nenhum acesso cadastrado</strong><p>Crie o primeiro acesso da equipe.</p></div>' : `<div class="access-list">${rows}</div>`}
    </section>
    ${state.access.editorOpen ? `<dialog id="access-editor-dialog" class="access-editor-dialog" aria-labelledby="access-editor-title">
      <form id="access-form" class="access-form" novalidate>
        <header><div><span class="eyebrow">ACESSO DA EQUIPE</span><h2 id="access-editor-title">${editingAccess ? 'Editar acesso' : 'Novo acesso'}</h2><p>${editingAccess ? 'Atualize os dados e permissoes desta pessoa.' : 'Cadastre os dados usados para entrar no FascinLead.'}</p></div><button class="icon-button" type="button" data-access-editor-close title="Fechar" aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
        <div class="access-form-body">
          <div class="field access-field-wide" data-field="displayName"><label for="access-name">Nome</label><input id="access-name" name="displayName" maxlength="120" autocomplete="name" value="${escapeHtml(editingAccess?.displayName || '')}" required /><small class="field-error"></small></div>
          <div class="field access-field-wide" data-field="email"><label for="access-email">E-mail</label><input id="access-email" name="email" type="email" maxlength="254" autocomplete="email" value="${escapeHtml(editingAccess?.email || '')}" placeholder="nome@exemplo.com" ${editingAccess ? 'readonly' : ''} required /><small class="field-error"></small></div>
          ${editingAccess ? '' : `<div class="field access-field-wide" data-field="password"><label for="access-password">Senha inicial</label><input id="access-password" name="password" type="password" minlength="6" maxlength="72" autocomplete="new-password" required /><small>A pessoa recebera um e-mail para confirmar a conta.</small><small class="field-error"></small></div>`}
          <div class="field" data-field="role"><label for="access-role-profile">Perfil / cargo</label><select id="access-role-profile" name="roleProfileId" required>${roleProfileOptions}</select><small class="field-error"></small></div>
          <div class="field" data-field="phone"><label for="access-phone">Telefone</label><input id="access-phone" name="phone" type="tel" inputmode="numeric" maxlength="16" autocomplete="tel" value="${escapeHtml(formatBrazilianPhone(editingAccess?.phone || ''))}" placeholder="(81) 99999-9999" required /><small class="field-error"></small></div>
          <div class="field" data-field="storeId"><label for="access-store">Unidade principal</label><select id="access-store" name="storeId" required>${storeOptions}</select><small class="field-error"></small></div>
          <div class="field" data-field="savwinCode"><label for="access-savwin-code">Codigo SavWin</label><input id="access-savwin-code" name="savwinCode" maxlength="30" value="${escapeHtml(editingAccess?.savwinCode || '')}" placeholder="Opcional" /><small class="field-error"></small></div>
          <fieldset id="access-stores-field" class="field access-store-picker access-field-wide" data-field="storeIds" hidden><legend>Unidades permitidas</legend><div>${storeChecks}</div><small class="field-error"></small></fieldset>
        </div>
        <footer><button class="button button-secondary" type="button" data-access-editor-close>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : editingAccess ? 'Salvar alteracoes' : 'Criar acesso'}</span></button></footer>
      </form>
    </dialog>` : ''}
    ${deletingAccess ? `<dialog id="delete-access-dialog" class="confirmation-dialog" aria-labelledby="delete-access-title"><div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div><h2 id="delete-access-title">Excluir acesso?</h2><p>O acesso de <strong>${escapeHtml(deletingAccess.displayName)}</strong> sera removido. O historico de leads e atividades sera preservado.</p><div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-access-delete-cancel>Cancelar</button><button class="button button-danger-solid" type="button" data-access-delete-confirm="${escapeHtml(deletingAccess.email)}" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i><span>Excluir acesso</span></button></div></dialog>` : ''}`;
}

function goalStatus(goal) {
  const today = toLocalDateInput(new Date());
  if (goal.completed >= goal.targetCount) return ['Concluida', 'success'];
  if (today < goal.startDate) return ['Agendada', 'neutral'];
  if (today > goal.endDate) return ['Encerrada', 'danger'];
  return ['Em andamento', 'warning'];
}

function groupGoalRecords(records) {
  const groups = new Map();
  records.forEach((goal) => {
    const groupId = goal.groupId || goal.id;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(goal);
  });
  return [...groups.entries()].map(([id, goals]) => {
    const first = goals[0];
    const completed = goals.reduce((total, goal) => total + goal.completed, 0);
    const targetCount = goals.reduce((total, goal) => total + goal.targetCount, 0);
    return {
      id,
      goals: goals.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName, 'pt-BR')),
      title: first.title,
      storeId: first.storeId,
      startDate: first.startDate,
      endDate: first.endDate,
      targetPerPerson: first.targetCount,
      completed,
      targetCount,
      remaining: Math.max(0, targetCount - completed),
      percentage: targetCount ? Math.min(100, Math.round((completed / targetCount) * 100)) : 0
    };
  });
}

function goalsView() {
  const { records, members, loading, saving, error, truncated, draft, editingGroupId, duplicatingGroupId, pendingDeleteGroupId } = state.goals;
  const groups = groupGoalRecords(records);
  const goalManagerView = canManageGoals();
  const visibleMembers = members.filter((member) => member.storeId === draft.storeId);
  const selectedCount = draft.assigneeUids.filter((uid) => visibleMembers.some((member) => member.uid === uid)).length;
  const completedGoals = groups.filter((goal) => goal.completed >= goal.targetCount).length;
  const totalCaptured = records.reduce((total, goal) => total + goal.completed, 0);
  const selectedGroup = groups.find((group) => group.id === pendingDeleteGroupId);
  const goalStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = goalStores.map((store) => `<option value="${store.id}" ${draft.storeId === store.id ? 'selected' : ''}>${store.label}</option>`).join('');
  const memberOptions = visibleMembers.length
    ? visibleMembers.map((member) => `<label class="goal-member-option">
        <input type="checkbox" name="assigneeUids" value="${escapeHtml(member.uid)}" ${draft.assigneeUids.includes(member.uid) ? 'checked' : ''} />
        <span class="avatar">${escapeHtml(profileInitials(member.displayName))}</span>
        <span><strong>${escapeHtml(member.displayName)}</strong><small>${escapeHtml(storeLabel(member.storeId))}</small></span>
      </label>`).join('')
    : '<p class="goal-members-empty">Nenhum captador ativo nesta loja.</p>';

  const goalCards = groups.length
    ? groups.map((group) => {
        const [status, tone] = goalStatus(group);
        const people = group.goals.map((goal) => `<div class="goal-person">
          <span class="avatar">${escapeHtml(profileInitials(goal.assigneeName))}</span>
          <div><strong>${escapeHtml(goal.assigneeName)}</strong><span>${goal.completed} de ${goal.targetCount} leads</span></div>
          <strong class="goal-person-percentage">${goal.percentage}%</strong>
        </div>`).join('');
        return `<article class="goal-card">
          <div class="goal-card-heading">
            <div><span class="status-badge status-${tone}">${status}</span><h2>${escapeHtml(group.title)}</h2></div>
            ${goalManagerView
              ? `<div class="goal-card-actions">
                  <button class="icon-button" type="button" data-edit-goal="${escapeHtml(group.id)}" title="Editar meta" aria-label="Editar meta"><i data-lucide="pencil"></i></button>
                  <button class="icon-button" type="button" data-duplicate-goal="${escapeHtml(group.id)}" title="Duplicar meta" aria-label="Duplicar meta"><i data-lucide="copy"></i></button>
                  <button class="icon-button goal-delete" type="button" data-delete-goal="${escapeHtml(group.id)}" title="Excluir meta" aria-label="Excluir meta"><i data-lucide="trash-2"></i></button>
                </div>`
              : `<div class="goal-percentage" aria-label="${group.percentage}% da meta atingida"><strong>${group.percentage}%</strong><span>da meta</span></div>`}
          </div>
          ${goalManagerView ? `<div class="goal-participants">${people}</div>` : ''}
          <div class="goal-progress-copy"><strong>${group.completed} de ${group.targetCount} leads</strong><span>${group.percentage}%</span></div>
          <div class="goal-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${group.percentage}"><span style="width: ${group.percentage}%"></span></div>
          <div class="goal-card-footer"><span>${formatGoalDate(group.startDate)} a ${formatGoalDate(group.endDate)} · ${escapeHtml(storeLabel(group.storeId))}</span><strong>${group.remaining ? `${group.remaining} restante(s)` : 'Meta alcancada'}</strong></div>
        </article>`;
      }).join('')
    : `<div class="empty-state goals-empty"><i data-lucide="target"></i><strong>Nenhuma meta cadastrada</strong><p>${goalManagerView ? 'Crie a primeira meta de captacao para a equipe.' : 'Quando uma meta for atribuida, ela aparecera aqui.'}</p></div>`;

  const creator = goalManagerView ? `<form id="goal-form" class="goal-form ${duplicatingGroupId ? 'is-duplicating' : ''}" novalidate>
      <div class="goal-form-heading"><div class="filter-title"><i data-lucide="${editingGroupId ? 'pencil' : duplicatingGroupId ? 'copy' : 'target'}"></i><div><strong>${editingGroupId ? 'Editar meta' : duplicatingGroupId ? 'Duplicar meta' : 'Nova meta'}</strong><span>${duplicatingGroupId ? 'Revise os dados da copia antes de criar.' : 'Quantidade de leads por colaborador no periodo.'}</span></div></div>${editingGroupId || duplicatingGroupId ? '<button class="icon-button" type="button" data-cancel-goal-edit title="Cancelar" aria-label="Cancelar"><i data-lucide="x"></i></button>' : ''}</div>
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
      <button class="button button-primary button-block" type="submit" ${saving || !visibleMembers.length ? 'disabled' : ''}><i data-lucide="${editingGroupId ? 'save' : duplicatingGroupId ? 'copy' : 'target'}"></i><span>${saving ? 'Salvando...' : editingGroupId ? 'Salvar alteracoes' : duplicatingGroupId ? 'Criar copia' : 'Criar metas'}</span></button>
    </form>` : '';
  const metrics = `<section class="goal-metrics" aria-label="Resumo das metas">
      <div><span>Metas</span><strong>${groups.length}</strong></div>
      <div><span>Concluidas</span><strong>${completedGoals}</strong></div>
      <div><span>Captacoes contabilizadas</span><strong>${totalCaptured}</strong></div>
    </section>`;
  const results = `<section class="goals-results" aria-busy="${loading}">
      <div class="access-list-heading"><div><strong>${goalManagerView ? 'Desempenho da equipe' : 'Minhas metas'}</strong><span>${groups.length} meta(s)</span></div></div>
      ${loading && !records.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando metas...</strong></div>' : goalCards}
    </section>`;

  return `
    <section class="management-heading page-actions-only goals-heading">
      <button class="button button-secondary" type="button" data-action="reload-goals" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>Atualizar</span></button>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O calculo atingiu ${GOALS_LEAD_LIMIT} leads. Reduza os periodos das metas para conferir o resultado completo.</span></div>` : ''}
    ${goalManagerView
      ? `${metrics}<section class="goals-layout">${creator}${results}</section>`
      : `<section class="personal-goals">${results}<h2 class="personal-goals-summary">Resumo</h2>${metrics}</section>`}
    ${selectedGroup ? `<dialog id="delete-goal-dialog" class="confirmation-dialog" aria-labelledby="delete-goal-title">
      <div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div>
      <div><p class="eyebrow">EXCLUIR META</p><h2 id="delete-goal-title">Remover esta meta?</h2><p>A meta &ldquo;${escapeHtml(selectedGroup.title)}&rdquo; sera removida de ${selectedGroup.goals.length} colaborador(es). As captacoes permanecem intactas.</p></div>
      <div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-close-goal-dialog>Cancelar</button><button class="button button-danger-solid" type="button" data-confirm-delete-goal="${escapeHtml(selectedGroup.id)}"><i data-lucide="trash-2"></i><span>Excluir meta</span></button></div>
    </dialog>` : ''}`;
}

function syncView() {
  const counts = state.leads.reduce((result, lead) => {
    result[lead.syncState] = (result[lead.syncState] || 0) + 1;
    return result;
  }, {});

  return `
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
  const items = [['home', 'house', 'Inicio']];
  if (hasAccess('leads.create')) items.push(['new', 'circle-plus', 'Novo']);
  if (hasAccess('leads.view_own')) items.push(['leads', 'clipboard-list', 'Cadastros']);
  if (canAccessRoute('sync')) items.push(['sync', 'refresh-cw', 'Sync']);
  if (hasAccess('followups.own') && !hasAccess('followups.team')) items.splice(3, 0, ['follow-ups', 'bell-ring', 'Retornos']);
  if (canManage()) items.push(['management', 'bar-chart-3', 'Gestao']);
  const followUpCount = pendingFollowUps().length;
  return `<nav class="bottom-nav ${items.length === 5 ? 'has-five-items' : ''}" aria-label="Navegacao principal">${items.map(([route, icon, label]) => `
    <button type="button" data-route="${route}" class="${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'reports', 'appointments', 'settings', 'follow-ups'].includes(state.route)) ? 'is-active' : ''}" ${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'reports', 'appointments', 'settings', 'follow-ups'].includes(state.route)) ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>${route === 'follow-ups' && followUpCount ? `<strong class="nav-notification-count">${followUpCount > 99 ? '99+' : followUpCount}</strong>` : ''}
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, lead: leadDetailView, sync: syncView, 'follow-ups': followUpsView, management: managementView, 'management-lead': leadDetailView, dashboard: dashboardView, reports: reportsView, appointments: appointmentsView, access: accessView, goals: goalsView, settings: settingsView };
  const page = pages[state.route] || homeView;
  const wideLayout = ['management', 'dashboard', 'reports', 'appointments', 'access', 'goals', 'settings'].includes(state.route);
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

  if (!state.loading && state.profile && !canAccessRoute(state.route)) {
    state.route = 'home';
    history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
  }

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
    bindCpfInput(form);
    bindBirthDateInput(form);
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#notes-count').textContent = notesInput.value.length; });
    form.elements.appointmentServiceId?.addEventListener('change', () => {
      state.newLeadSchedule.serviceId = form.elements.appointmentServiceId.value;
      const service = selectedNewLeadService();
      form.elements.appointmentServiceName.value = service.name;
      form.elements.appointmentDurationMinutes.value = service.durationMinutes;
      refreshAppointmentTimeControl();
    });
    appointmentDateInput.addEventListener('input', () => {
      state.newLeadSchedule.appointmentDate = appointmentDateInput.value;
      startDayAppointmentsSubscription();
    });
    bindExclusiveOptions(form, 'ametropiaIds');
    bindExclusiveOptions(form, 'pathologyIds');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = leadFormValues(form);
      const controlledAppointment = values.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime;
      if (state.newLeadSchedule.settings.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime) {
        const selectedSlot = buildAppointmentSlots({
          ...state.newLeadSchedule.settings,
          appointmentDurationMinutes: Number(values.appointmentDurationMinutes)
        }, state.newLeadSchedule.appointments, '', {
          appointmentDate: values.appointmentDate,
          profile: state.profile
        })
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
    bindCpfInput(editLeadForm);
    bindBirthDateInput(editLeadForm);
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#edit-notes-count').textContent = notesInput.value.length; });
    bindExclusiveOptions(editLeadForm, 'ametropiaIds');
    bindExclusiveOptions(editLeadForm, 'pathologyIds');
    editLeadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const managementEdit = editLeadForm.dataset.management === 'true';
      const existingLead = managementEdit
        ? state.management.records.find((lead) => lead.id === editLeadForm.dataset.leadId)
        : state.leads.find((lead) => lead.id === editLeadForm.dataset.leadId);
      let values = leadFormValues(editLeadForm);
      if (existingLead && !editLeadForm.querySelector('[name="ametropiaIds"]')) {
        values.ametropiaIds = existingLead.ametropiaIds || [];
      }
      if (managementEdit && state.profile?.role === 'manager' && existingLead) {
        values = {
          ...existingLead,
          phone: existingLead.phone || existingLead.phoneSearch,
          schedulingMode: existingLead.appointmentSchedulingMode || 'free',
          appointmentDurationMinutes: existingLead.appointmentDurationMinutes || 20,
          appointmentDate: editLeadForm.elements.appointmentDate.value,
          appointmentTime: editLeadForm.elements.appointmentTime.value,
          ametropiaIds: existingLead.ametropiaIds || [],
          pathologyIds: existingLead.pathologyIds || []
        };
      }
      const submitButton = editLeadForm.querySelector('[type="submit"]');
      submitButton.disabled = true;

      if (managementEdit) {
        try {
          const result = state.demoMode
            ? updateLead(editLeadForm.dataset.leadId, values, true, () => {}, existingLead)
            : await updateManagementLead(state.profile, existingLead, values);
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

  const emailLoginForm = document.querySelector('#email-login-form');
  emailLoginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(emailLoginForm));
    state.authError = '';
    state.authMessage = '';
    const submitButton = emailLoginForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      await signInWithEmail(values.email, values.password);
    } catch (error) {
      state.authError = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error?.code)
        ? 'E-mail ou senha incorretos.'
        : error.message || 'Nao foi possivel entrar.';
      render();
    }
  });

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

  const dashboardPeriodForm = document.querySelector('#dashboard-period');
  dashboardPeriodForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(dashboardPeriodForm));
    state.management.filters.startDate = values.startDate;
    state.management.filters.endDate = values.endDate;
    state.management.loaded = false;
    state.management.page = 1;
    state.savwin.error = '';
    state.savwin.result = null;
    loadManagementData();
  });

  const appointmentsStore = document.querySelector('#appointments-store');
  appointmentsStore?.addEventListener('change', () => {
    state.appointments.storeId = appointmentsStore.value;
    state.appointments.loaded = false;
    startAppointmentsSubscription();
  });

  const appointmentCreateForm = document.querySelector('#appointment-create-form');
  if (appointmentCreateForm) {
    const phoneInput = appointmentCreateForm.elements.phone;
    const notesInput = appointmentCreateForm.elements.notes;
    phoneInput?.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput?.addEventListener('input', () => { document.querySelector('#agenda-notes-count').textContent = notesInput.value.length; });
    bindCpfInput(appointmentCreateForm);
    bindBirthDateInput(appointmentCreateForm);
    bindExclusiveOptions(appointmentCreateForm, 'ametropiaIds');
    bindExclusiveOptions(appointmentCreateForm, 'pathologyIds');
    appointmentCreateForm.elements.storeId?.addEventListener('change', (event) => {
      state.appointmentCreate.draft = leadFormValues(appointmentCreateForm);
      state.appointmentCreate.storeId = event.target.value;
      const schedule = appointmentCreateSchedule();
      if (!servicesForStore(state.appointmentCreate.services, event.target.value).length) {
        state.appointmentCreate.services.push(defaultAppointmentService(event.target.value, schedule.appointmentDurationMinutes));
      }
      state.appointmentCreate.serviceId = servicesForStore(state.appointmentCreate.services, event.target.value)[0]?.id || '';
      render();
      document.querySelector('#appointment-create-dialog')?.showModal();
    });
    appointmentCreateForm.elements.appointmentServiceId?.addEventListener('change', () => {
      state.appointmentCreate.serviceId = appointmentCreateForm.elements.appointmentServiceId.value;
      const service = appointmentCreateService();
      appointmentCreateForm.elements.appointmentServiceName.value = service.name;
      appointmentCreateForm.elements.appointmentDurationMinutes.value = service.durationMinutes;
      const timeField = document.querySelector('#appointment-create-time-field');
      if (timeField) timeField.outerHTML = appointmentCreateTimeField();
    });
    appointmentCreateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = leadFormValues(appointmentCreateForm);
      const storeId = appointmentCreateForm.elements.storeId.value;
      if (!profileStoreIds(state.profile).includes(storeId)) {
        setFieldErrors(appointmentCreateForm, { storeId: 'Selecione uma loja permitida.' });
        return;
      }
      state.appointmentCreate.saving = true;
      const submitButton = appointmentCreateForm.querySelector('[type="submit"]');
      submitButton.disabled = true;
      const result = saveLead(values, { ...state.profile, storeId }, state.demoMode, () => {
        state.appointmentCreate.error = 'O cadastro nao foi aceito pela nuvem.';
        render();
      });
      setFieldErrors(appointmentCreateForm, result.errors || {});
      if (!result.isValid) {
        state.appointmentCreate.saving = false;
        submitButton.disabled = false;
        return;
      }
      try {
        if (result.writePromise) await result.writePromise;
        document.querySelector('#appointment-create-dialog')?.close();
        state.appointmentCreate.saving = false;
        state.appointmentCreate.error = '';
        showToast('Cadastro adicionado a agenda.');
      } catch {
        state.appointmentCreate.saving = false;
        setFieldErrors(appointmentCreateForm, { appointmentTime: 'Este horario acabou de ser ocupado. Escolha outro.' });
        submitButton.disabled = false;
      }
    });
  }

  const accessForm = document.querySelector('#access-form');
  if (accessForm) {
    const syncStorePicker = () => {
      const selected = state.settings.roleProfiles.find((profile) => profile.id === accessForm.elements.roleProfileId.value);
      const manager = selected?.baseRole === 'manager';
      const picker = document.querySelector('#access-stores-field');
      picker.hidden = !manager;
      if (manager && !new FormData(accessForm).getAll('storeIds').length) {
        const primary = accessForm.querySelector(`[name="storeIds"][value="${accessForm.elements.storeId.value}"]`);
        if (primary) primary.checked = true;
      }
    };
    accessForm.elements.roleProfileId.addEventListener('change', syncStorePicker);
    accessForm.elements.storeId.addEventListener('change', syncStorePicker);
    accessForm.elements.phone.addEventListener('input', () => {
      accessForm.elements.phone.value = formatBrazilianPhone(accessForm.elements.phone.value);
    });
    syncStorePicker();
    accessForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.access.saving) return;
      const creating = !state.access.editingEmail;
      state.access.saving = true;
      setFieldErrors(accessForm, {});
      const formData = new FormData(accessForm);
      const values = { ...Object.fromEntries(formData), storeIds: formData.getAll('storeIds') };
      const submitButton = accessForm.querySelector('[type="submit"]');
      submitButton.disabled = true;

      try {
        const result = await saveAccess(state.profile, values, state.settings.roleProfiles, { requirePassword: creating });
        if (!result.isValid) {
          state.access.saving = false;
          submitButton.disabled = false;
          setFieldErrors(accessForm, result.errors);
          return;
        }
        let credentialWarning = '';
        if (creating) {
          try {
            await createTeamPasswordAccount(result.data.email, result.data.password);
          } catch (error) {
            credentialWarning = error?.code === 'auth/email-already-in-use'
              ? ' O e-mail ja possuia uma conta; a senha nao foi alterada.'
              : ' A autorizacao foi salva, mas nao foi possivel criar a senha inicial.';
          }
        }
        state.access.editorOpen = false;
        state.access.editingEmail = '';
        await loadAccessData();
        showToast(`${creating ? 'Acesso criado.' : 'Acesso atualizado.'}${credentialWarning}`, credentialWarning ? 'warning' : 'success', credentialWarning ? 'circle-alert' : 'circle-check');
      } catch (error) {
        state.access.saving = false;
        state.access.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao possui permissao para gerenciar acessos.'
          : 'Nao foi possivel salvar o acesso. Verifique a conexao e tente novamente.';
        render();
      }
    });
  }

  const accessEditorDialog = document.querySelector('#access-editor-dialog');
  accessEditorDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    state.access.editorOpen = false;
    state.access.editingEmail = '';
    render();
  });

  const deleteAccessDialog = document.querySelector('#delete-access-dialog');
  deleteAccessDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    state.access.pendingDeleteEmail = '';
    render();
  });

  const roleProfileForm = document.querySelector('#role-profile-form');
  if (roleProfileForm) {
    roleProfileForm.elements.scope.addEventListener('change', () => {
      state.settings.roleDraft.scope = roleProfileForm.elements.scope.value;
      state.settings.roleDraft.permissions = normalizeRolePermissions(state.settings.roleDraft.scope, state.settings.roleDraft.permissions);
      render();
      document.querySelector('#role-editor-dialog')?.showModal();
    });
    roleProfileForm.querySelectorAll('[name="permissions"]').forEach((input) => {
      input.addEventListener('change', () => {
        const permissions = new Set([...roleProfileForm.querySelectorAll('[name="permissions"]:checked')].map((item) => item.value));
        const managementDependents = ['followups.team', 'goals.manage', 'reports.view', 'dashboard.view', 'leads.export'];
        if (input.checked && managementDependents.includes(input.value)) permissions.add('management.view');
        if (!input.checked && input.value === 'management.view') managementDependents.forEach((permission) => permissions.delete(permission));
        state.settings.roleDraft.permissions = [...permissions];

        roleProfileForm.querySelectorAll('[name="permissions"]').forEach((permissionInput) => {
          const active = permissions.has(permissionInput.value);
          permissionInput.checked = active;
          permissionInput.closest('.role-details-permission')?.classList.toggle('is-active', active);
          const status = permissionInput.closest('.role-details-permission')?.querySelector('small');
          if (status) status.textContent = active ? 'Ativada' : 'Desativada';
        });
        const count = roleProfileForm.querySelector('[data-role-editor-count]');
        if (count) count.textContent = String(permissions.size);
      });
    });
    roleProfileForm.elements.name.addEventListener('input', () => {
      state.settings.roleDraft.name = roleProfileForm.elements.name.value;
    });
    roleProfileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.settings.saving) return;
      const formData = new FormData(roleProfileForm);
      const values = { ...Object.fromEntries(formData), permissions: formData.getAll('permissions') };
      state.settings.saving = true;
      state.settings.error = '';
      setFieldErrors(roleProfileForm, {});
      try {
        const result = state.demoMode
          ? { ...validateRoleProfile(values), id: state.settings.editingRoleId || crypto.randomUUID() }
          : await saveRoleProfile(state.profile, values, state.settings.editingRoleId);
        if (!result.isValid) {
          state.settings.saving = false;
          setFieldErrors(roleProfileForm, result.errors);
          return;
        }
        if (state.demoMode) {
          const savedProfile = { id: result.id, ...result.data, active: true, system: false };
          state.settings.roleProfiles = state.settings.editingRoleId
            ? state.settings.roleProfiles.map((item) => item.id === result.id ? savedProfile : item)
            : [...state.settings.roleProfiles, savedProfile];
          state.settings.saving = false;
        }
        state.settings.roleDraft = createDefaultRoleDraft();
        state.settings.editingRoleId = '';
        state.settings.roleEditorOpen = false;
        if (!state.demoMode) await loadRoleProfilesData();
        showToast('Cargo salvo com sucesso.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode gerenciar perfis e permissoes.'
          : 'Nao foi possivel salvar o perfil.';
        render();
        document.querySelector('#role-editor-dialog')?.showModal();
      }
    });
  }

  const roleEditorDialog = document.querySelector('#role-editor-dialog');
  roleEditorDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    roleEditorDialog.close();
    state.settings.roleEditorOpen = false;
    state.settings.editingRoleId = '';
    state.settings.roleDraft = createDefaultRoleDraft();
    render();
  });
  roleEditorDialog?.addEventListener('click', (event) => {
    if (event.target !== roleEditorDialog) return;
    roleEditorDialog.close();
    state.settings.roleEditorOpen = false;
    state.settings.editingRoleId = '';
    state.settings.roleDraft = createDefaultRoleDraft();
    render();
  });

  const roleDetailsDialog = document.querySelector('#role-details-dialog');
  roleDetailsDialog?.querySelectorAll('[data-system-role-permission]').forEach((input) => {
    input.addEventListener('change', () => {
      const permissions = new Set(state.settings.detailsRolePermissions);
      if (input.checked) permissions.add(input.value);
      else permissions.delete(input.value);

      const managementDependents = ['followups.team', 'goals.manage', 'reports.view', 'dashboard.view', 'leads.export'];
      if (input.checked && managementDependents.includes(input.value)) permissions.add('management.view');
      if (!input.checked && input.value === 'management.view') managementDependents.forEach((permission) => permissions.delete(permission));
      state.settings.detailsRolePermissions = [...permissions];

      roleDetailsDialog.querySelectorAll('[data-system-role-permission]').forEach((permissionInput) => {
        const active = permissions.has(permissionInput.value);
        permissionInput.checked = active;
        permissionInput.closest('.role-details-permission')?.classList.toggle('is-active', active);
        const status = permissionInput.closest('.role-details-permission')?.querySelector('small');
        if (status) status.textContent = active ? 'Ativada' : 'Desativada';
      });
      const count = roleDetailsDialog.querySelector('[data-role-details-count]');
      if (count) count.textContent = String(permissions.size);
    });
  });
  roleDetailsDialog?.addEventListener('click', (event) => {
    if (event.target !== roleDetailsDialog) return;
    roleDetailsDialog.close();
    state.settings.detailsRoleId = '';
    state.settings.detailsRolePermissions = [];
    render();
  });
  roleDetailsDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    roleDetailsDialog.close();
    state.settings.detailsRoleId = '';
    state.settings.detailsRolePermissions = [];
    render();
  });

  const deleteRoleDialog = document.querySelector('#delete-role-dialog');
  deleteRoleDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    deleteRoleDialog.close();
    state.settings.pendingDeleteRoleId = '';
    render();
  });

  const serviceForm = document.querySelector('#service-form');
  if (serviceForm) {
    serviceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.settings.saving) return;
      const formData = new FormData(serviceForm);
      const values = { ...Object.fromEntries(formData), storeIds: formData.getAll('storeIds') };
      const editingId = state.settings.editingServiceId;
      state.settings.saving = true;
      setFieldErrors(serviceForm, {});
      try {
        const result = state.demoMode
          ? { ...validateAppointmentService(values), id: editingId || crypto.randomUUID() }
          : await saveAppointmentService(state.profile, values, editingId);
        if (!result.isValid) {
          state.settings.saving = false;
          setFieldErrors(serviceForm, result.errors);
          return;
        }
        if (state.demoMode) {
          const saved = { id: result.id, ...result.data };
          state.settings.services = editingId
            ? state.settings.services.map((item) => item.id === editingId ? saved : item)
            : [...state.settings.services, saved];
          state.settings.saving = false;
        }
        state.settings.serviceEditorOpen = false;
        state.settings.editingServiceId = '';
        if (!state.demoMode) await loadServiceCatalogData();
        else render();
        showToast('Servico salvo com sucesso.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode gerenciar servicos.'
          : 'Nao foi possivel salvar o servico.';
        render();
      }
    });
  }
  document.querySelector('#service-editor-dialog')?.addEventListener('cancel', (event) => {
    event.preventDefault();
    state.settings.serviceEditorOpen = false;
    state.settings.editingServiceId = '';
    render();
  });

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
    ['noShowGraceMinutes', 'openingTime', 'closingTime'].forEach((name) => {
      scheduleSettingsForm.elements[name]?.addEventListener('change', () => {
        const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
        if (!record) return;
        record[name] = name === 'noShowGraceMinutes'
          ? Number(scheduleSettingsForm.elements[name].value)
          : scheduleSettingsForm.elements[name].value;
      });
    });
    ['limitedDayCapacity', 'meiDailyQuota'].forEach((name) => {
      scheduleSettingsForm.elements[name]?.addEventListener('input', () => {
        const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
        if (record) record[name] = Number(scheduleSettingsForm.elements[name].value);
      });
    });
    scheduleSettingsForm.querySelectorAll('[name="limitedWeekdays"]').forEach((input) => {
      input.addEventListener('change', () => {
        const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
        if (record) record.limitedWeekdays = [...scheduleSettingsForm.querySelectorAll('[name="limitedWeekdays"]:checked')].map((item) => Number(item.value));
      });
    });
    document.querySelector('#settings-automatic-follow-up')?.addEventListener('change', (event) => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) record.automaticPendingFollowUp = event.target.checked;
      render();
    });
    document.querySelector('#settings-show-ametropias')?.addEventListener('change', (event) => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) record.showAmetropiaFields = event.target.checked;
      render();
    });
    document.querySelector('#settings-limited-days')?.addEventListener('change', (event) => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) record.limitedDaysEnabled = event.target.checked;
      render();
    });
    scheduleSettingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.settings.saving) return;
      const formData = new FormData(scheduleSettingsForm);
      const values = Object.fromEntries(formData);
      values.automaticPendingFollowUp = values.automaticPendingFollowUp === 'true';
      values.showAmetropiaFields = values.showAmetropiaFields === 'true';
      values.limitedDaysEnabled = values.limitedDaysEnabled === 'true';
      const current = state.settings.records.find((item) => item.id === values.storeId) || DEFAULT_STORE_SCHEDULE;
      values.appointmentDurationMinutes = current.appointmentDurationMinutes;
      values.limitedWeekdays = values.limitedDaysEnabled
        ? formData.getAll('limitedWeekdays').map(Number)
        : [...current.limitedWeekdays];
      values.limitedDayCapacity = values.limitedDaysEnabled ? Number(values.limitedDayCapacity) : current.limitedDayCapacity;
      values.meiDailyQuota = values.limitedDaysEnabled ? Number(values.meiDailyQuota) : current.meiDailyQuota;
      if (values.schedulingMode === 'free') {
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
            automaticPendingFollowUp: values.automaticPendingFollowUp,
            showAmetropiaFields: values.showAmetropiaFields,
            limitedDaysEnabled: values.limitedDaysEnabled,
            limitedWeekdays: values.limitedWeekdays,
            limitedDayCapacity: values.limitedDayCapacity,
            meiDailyQuota: values.meiDailyQuota
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
        const editingGroup = groupGoalRecords(state.goals.records).find((group) => group.id === state.goals.editingGroupId);
        const result = editingGroup
          ? await updateGoalGroup(state.profile, editingGroup.goals, state.goals.draft, state.goals.members)
          : await createGoals(state.profile, state.goals.draft, state.goals.members);
        if (!result.isValid) {
          state.goals.saving = false;
          setFieldErrors(goalForm, result.errors);
          return;
        }
        const createdCount = state.goals.draft.assigneeUids.length;
        state.goals.draft = createDefaultGoalDraft(state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId);
        state.goals.editingGroupId = '';
        state.goals.duplicatingGroupId = '';
        state.goals.loaded = false;
        await loadGoalsData();
        showToast(editingGroup ? 'Meta atualizada.' : `${createdCount} meta(s) criada(s).`);
      } catch (error) {
        state.goals.saving = false;
        state.goals.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao possui permissao para salvar esta meta.'
          : 'Nao foi possivel salvar a meta. Verifique a conexao e tente novamente.';
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
      ensureLeadDetailSchedule();
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
    filter: state.followUps.filter || 'all',
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

  if (hasAccess('followups.team')) {
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

  if (state.demoMode) {
    state.management.records = [...state.leads];
    state.management.loaded = true;
    state.management.error = '';
    state.management.truncated = false;
    state.management.page = 1;
    render();
    ensureLeadDetailSchedule();
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
    ensureLeadDetailSchedule();
  }
}

function ensureManagementData() {
  if (['management', 'management-lead', 'dashboard', 'reports'].includes(state.route) && canManage() && !state.management.loaded) {
    loadManagementData();
  }
}

async function ensureLeadDetailSchedule() {
  if (!['lead', 'management-lead'].includes(state.route) || !state.profile || state.leadDetailSchedule.loading) return;
  const source = state.route === 'management-lead'
    ? [...state.management.records, ...state.appointments.records]
    : state.leads;
  const lead = source.find((item) => item.id === currentRouteParam());
  if (!lead?.storeId || state.leadDetailSchedule.storeId === lead.storeId) return;

  state.leadDetailSchedule.loading = true;
  try {
    const settings = state.demoMode
      ? state.settings.records.find((item) => item.id === lead.storeId) || { ...DEFAULT_STORE_SCHEDULE, id: lead.storeId }
      : await loadStoreSchedule(state.profile, lead.storeId);
    state.leadDetailSchedule.storeId = lead.storeId;
    state.leadDetailSchedule.settings = { ...DEFAULT_STORE_SCHEDULE, ...settings };
  } catch {
    state.leadDetailSchedule.storeId = lead.storeId;
    state.leadDetailSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
  } finally {
    state.leadDetailSchedule.loading = false;
    render();
  }
}

function stopAppointmentsSubscription() {
  state.unsubscribeAppointments?.();
  state.unsubscribeAppointments = null;
}

function startAppointmentsSubscription() {
  if (!hasAccess('appointments.view') || state.demoMode || state.route !== 'appointments') return;
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

async function openAppointmentCreateDialog() {
  const allowedStores = STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const preferredStoreId = state.appointments.storeId
    || (allowedStores.some((store) => store.id === state.profile.storeId) ? state.profile.storeId : allowedStores[0]?.id)
    || '';
  state.appointmentCreate = {
    loading: true,
    saving: false,
    error: '',
    schedules: [],
    storeId: preferredStoreId,
    services: [],
    serviceId: '',
    draft: {}
  };
  render();
  document.querySelector('#appointment-create-dialog')?.showModal();
  try {
    if (state.demoMode) {
      state.appointmentCreate.schedules = allowedStores.map((store) => ({ ...store, ...DEFAULT_STORE_SCHEDULE }));
      state.appointmentCreate.services = state.settings.services.length
        ? state.settings.services.filter((service) => service.active)
        : [defaultAppointmentService(allowedStores.map((store) => store.id))];
    } else {
      [state.appointmentCreate.schedules, state.appointmentCreate.services] = await Promise.all([
        loadStoreSchedules(state.profile),
        loadAppointmentServices(state.profile)
      ]);
    }
    const schedule = state.appointmentCreate.schedules.find((item) => item.id === preferredStoreId) || DEFAULT_STORE_SCHEDULE;
    if (!servicesForStore(state.appointmentCreate.services, preferredStoreId).length) {
      state.appointmentCreate.services.push(defaultAppointmentService(preferredStoreId, schedule.appointmentDurationMinutes));
    }
    state.appointmentCreate.serviceId = servicesForStore(state.appointmentCreate.services, preferredStoreId)[0]?.id || '';
  } catch {
    state.appointmentCreate.error = 'Nao foi possivel carregar os horarios das lojas.';
  } finally {
    state.appointmentCreate.loading = false;
    render();
    document.querySelector('#appointment-create-dialog')?.showModal();
  }
}

function ensureAppointmentsData() {
  if (state.route === 'appointments' && hasAccess('appointments.view') && !state.demoMode && !state.unsubscribeAppointments) {
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
    ? buildAppointmentSlots(settings, appointments, '', { appointmentDate, profile: state.profile })
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

async function ensureNewLeadSchedule() {
  if (state.route !== 'new' || !state.profile || state.newLeadSchedule.loaded || state.newLeadSchedule.loading) return;
  state.newLeadSchedule.loading = true;
  if (state.demoMode) {
    const configured = state.settings.records.find((item) => item.id === state.profile.storeId);
    state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE, ...(configured || {}) };
    state.newLeadSchedule.services = servicesForStore(state.settings.services, state.profile.storeId);
    if (!state.newLeadSchedule.services.length) {
      state.newLeadSchedule.services = [defaultAppointmentService(state.profile.storeId, state.newLeadSchedule.settings.appointmentDurationMinutes)];
    }
    state.newLeadSchedule.serviceId = state.newLeadSchedule.services[0].id;
    state.newLeadSchedule.loaded = true;
    state.newLeadSchedule.loading = false;
    render();
    return;
  }
  try {
    state.newLeadSchedule.services = await loadAppointmentServices(state.profile);
    if (!servicesForStore(state.newLeadSchedule.services, state.profile.storeId).length) {
      state.newLeadSchedule.services = [defaultAppointmentService(state.profile.storeId, state.newLeadSchedule.settings.appointmentDurationMinutes)];
    }
    state.newLeadSchedule.serviceId = servicesForStore(state.newLeadSchedule.services, state.profile.storeId)[0]?.id || '';
  } catch {
    state.newLeadSchedule.services = [defaultAppointmentService(state.profile.storeId, state.newLeadSchedule.settings.appointmentDurationMinutes)];
    state.newLeadSchedule.serviceId = state.newLeadSchedule.services[0].id;
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
    const [records, roleProfiles, loadedServices] = state.demoMode
      ? [
          STORES.map((store) => ({ ...store, ...DEFAULT_STORE_SCHEDULE })),
          SYSTEM_ROLE_PROFILES,
          [defaultAppointmentService(STORES.map((store) => store.id), DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes)]
        ]
      : await Promise.all([
          loadStoreSchedules(state.profile),
          loadRoleProfiles(state.profile),
          loadAppointmentServices(state.profile, { includeInactive: true })
        ]);
    state.settings.records = records;
    state.settings.roleProfiles = roleProfiles.map((item) => ({ ...item, permissions: [...item.permissions] }));
    state.settings.services = state.demoMode
      ? loadedServices
      : await ensureDefaultAppointmentServices(state.profile, records, loadedServices);
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

async function loadRoleProfilesData() {
  if (!isAdmin()) return;
  try {
    const profiles = state.demoMode ? SYSTEM_ROLE_PROFILES : await loadRoleProfiles(state.profile);
    state.settings.roleProfiles = profiles.map((item) => ({ ...item, permissions: [...item.permissions] }));
    state.settings.saving = false;
    render();
  } catch (error) {
    state.settings.saving = false;
    state.settings.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao pode consultar os perfis de acesso.'
      : 'Nao foi possivel carregar os perfis de acesso.';
    render();
  }
}

async function loadServiceCatalogData() {
  if (!isAdmin()) return;
  try {
    state.settings.services = state.demoMode
      ? state.settings.services
      : await loadAppointmentServices(state.profile, { includeInactive: true });
    state.settings.saving = false;
    render();
  } catch (error) {
    state.settings.saving = false;
    state.settings.error = error?.code === 'permission-denied'
      ? 'Seu perfil nao pode consultar os servicos.'
      : 'Nao foi possivel carregar os servicos.';
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
    try {
      const roleProfiles = await loadRoleProfiles(state.profile);
      state.settings.roleProfiles = roleProfiles.map((item) => ({ ...item, permissions: [...item.permissions] }));
    } catch {
      state.settings.roleProfiles = SYSTEM_ROLE_PROFILES.map((item) => ({ ...item, permissions: [...item.permissions] }));
      state.access.error = 'Os acessos foram carregados, mas os perfis personalizados estao temporariamente indisponiveis.';
    }
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
    state.authMessage = '';
    subscribeProfileLeads();
    startFollowUpScheduleSubscription();
    navigate('home');
    render();
  }

  if (action === 'google-login') {
    state.authError = '';
    state.authMessage = '';
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

  if (action === 'email-register') {
    const form = document.querySelector('#email-login-form');
    const values = form ? Object.fromEntries(new FormData(form)) : {};
    state.authError = '';
    state.authMessage = '';
    try {
      await createEmailPasswordAccess(values.email, values.password);
      state.authMessage = 'Primeiro acesso criado. Confirme o link enviado ao seu e-mail e depois entre com sua senha.';
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        try {
          await requestPasswordReset(values.email);
          state.authMessage = 'Este acesso ja estava preparado. Enviamos um link para voce definir sua senha.';
        } catch (resetError) {
          state.authError = resetError.message || 'Nao foi possivel enviar a definicao de senha.';
        }
      } else {
        state.authError = error.message || 'Nao foi possivel criar o primeiro acesso.';
      }
    }
    render();
  }

  if (action === 'password-reset') {
    const email = document.querySelector('#login-email')?.value || '';
    state.authError = '';
    state.authMessage = '';
    try {
      await requestPasswordReset(email);
      state.authMessage = 'Enviamos as instrucoes de recuperacao para o e-mail informado.';
    } catch (error) {
      state.authError = error.message || 'Nao foi possivel enviar a recuperacao de senha.';
    }
    render();
  }

  if (action === 'logout') {
    state.unsubscribeProfile?.();
    state.unsubscribeProfile = null;
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
    state.savwin = { loading: false, error: '', result: null };
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
    state.appointmentCreate = {
      loading: false,
      saving: false,
      error: '',
      schedules: [],
      storeId: '',
      services: [],
      serviceId: ''
    };
    state.newLeadSchedule = {
      loaded: false,
      loading: false,
      error: '',
      settings: { ...DEFAULT_STORE_SCHEDULE },
      appointmentDate: '',
      appointments: [],
      services: [],
      serviceId: ''
    };
    state.leadDetailSchedule = {
      loading: false,
      storeId: '',
      settings: { ...DEFAULT_STORE_SCHEDULE }
    };
    state.followUps = {
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      filter: 'all',
      settingsByStore: {},
      settings: { ...DEFAULT_STORE_SCHEDULE }
    };
    state.settings = {
      loaded: false,
      loading: false,
      saving: false,
      error: '',
      selectedStoreId: STORES[0]?.id || '',
      records: [],
      section: 'schedule',
      roleProfiles: SYSTEM_ROLE_PROFILES.map((item) => ({ ...item, permissions: [...item.permissions] })),
      services: [],
      serviceEditorOpen: false,
      editingServiceId: '',
      roleEditorOpen: false,
      roleDraft: createDefaultRoleDraft(),
      editingRoleId: '',
      pendingDeleteRoleId: '',
      detailsRoleId: '',
      detailsRolePermissions: []
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
      editingGroupId: '',
      duplicatingGroupId: '',
      pendingDeleteGroupId: '',
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

  if (action === 'reload-reports') {
    state.management.loaded = false;
    await loadManagementData();
  }

  if (action === 'consult-savwin' && canManage() && isLocalSavwinEnabled) {
    const { startDate, endDate, storeId } = state.management.filters;
    state.savwin.loading = true;
    state.savwin.error = '';
    state.savwin.result = null;
    render();
    try {
      const storeIds = storeId ? [storeId] : profileStoreIds(state.profile);
      state.savwin.result = await consultLocalSavwinSales({ startDate, endDate, storeIds });
    } catch (error) {
      state.savwin.error = error.message || 'Nao foi possivel consultar o SavWin.';
    } finally {
      state.savwin.loading = false;
      render();
    }
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
    const settingsSectionButton = event.target.closest('[data-settings-section]');
    if (settingsSectionButton) {
      state.settings.section = settingsSectionButton.dataset.settingsSection;
      render();
    }
    const newServiceButton = event.target.closest('[data-service-new]');
    if (newServiceButton) {
      state.settings.editingServiceId = '';
      state.settings.serviceEditorOpen = true;
      render();
      document.querySelector('#service-editor-dialog')?.showModal();
      document.querySelector('#service-name')?.focus();
      return;
    }
    const editServiceButton = event.target.closest('[data-service-edit]');
    if (editServiceButton) {
      state.settings.editingServiceId = editServiceButton.dataset.serviceEdit;
      state.settings.serviceEditorOpen = true;
      render();
      document.querySelector('#service-editor-dialog')?.showModal();
      document.querySelector('#service-name')?.focus();
      return;
    }
    const closeServiceEditorButton = event.target.closest('[data-service-editor-close]');
    if (closeServiceEditorButton) {
      document.querySelector('#service-editor-dialog')?.close();
      state.settings.serviceEditorOpen = false;
      state.settings.editingServiceId = '';
      render();
      return;
    }
    const toggleServiceButton = event.target.closest('[data-service-toggle]');
    if (toggleServiceButton && !toggleServiceButton.disabled) {
      const service = state.settings.services.find((item) => item.id === toggleServiceButton.dataset.serviceToggle);
      if (!service) return;
      const uncoveredStoreIds = service.storeIds.filter((storeId) => !servicesForStore(
        state.settings.services.filter((item) => item.id !== service.id), storeId
      ).length);
      if (service.active && uncoveredStoreIds.length) {
        showToast('Mantenha pelo menos um servico ativo em cada unidade atendida.', 'warning', 'circle-alert');
        return;
      }
      state.settings.saving = true;
      toggleServiceButton.disabled = true;
      try {
        if (state.demoMode) {
          state.settings.services = state.settings.services.map((item) => item.id === service.id
            ? { ...item, active: !item.active }
            : item);
          state.settings.saving = false;
          render();
        } else {
          await setAppointmentServiceActive(state.profile, service, !service.active);
          await loadServiceCatalogData();
        }
        showToast(service.active ? 'Servico desativado.' : 'Servico ativado.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode alterar este servico.'
          : error?.code === 'last-active-service'
            ? error.message
            : 'Nao foi possivel alterar o servico.';
        render();
      }
      return;
    }
    const newRoleButton = event.target.closest('[data-role-new]');
    if (newRoleButton) {
      state.settings.editingRoleId = '';
      state.settings.roleDraft = createDefaultRoleDraft();
      state.settings.roleEditorOpen = true;
      render();
      document.querySelector('#role-editor-dialog')?.showModal();
      document.querySelector('#role-profile-name')?.focus();
      return;
    }
    const editRoleButton = event.target.closest('[data-role-edit]');
    if (editRoleButton) {
      const profile = state.settings.roleProfiles.find((item) => item.id === editRoleButton.dataset.roleEdit && !item.system);
      if (profile) {
        state.settings.editingRoleId = profile.id;
        state.settings.roleDraft = { name: profile.name, scope: profile.scope, permissions: [...profile.permissions] };
        state.settings.roleEditorOpen = true;
        render();
        document.querySelector('#role-editor-dialog')?.showModal();
        const form = document.querySelector('#role-profile-form');
        const nameInput = form?.elements.name;
        nameInput?.focus({ preventScroll: true });
        nameInput?.select();
      }
      return;
    }
    const roleDetailsButton = event.target.closest('[data-role-details]');
    if (roleDetailsButton) {
      state.settings.detailsRoleId = roleDetailsButton.dataset.roleDetails;
      const profile = state.settings.roleProfiles.find((item) => item.id === state.settings.detailsRoleId);
      state.settings.detailsRolePermissions = [...(profile?.permissions || [])];
      render();
      document.querySelector('#role-details-dialog')?.showModal();
    }
    const saveSystemRoleButton = event.target.closest('[data-system-role-save]');
    if (saveSystemRoleButton && !saveSystemRoleButton.disabled) {
      const roleProfileId = saveSystemRoleButton.dataset.systemRoleSave;
      const profile = state.settings.roleProfiles.find((item) => item.id === roleProfileId);
      if (!profile || profile.baseRole === 'admin') return;
      state.settings.saving = true;
      saveSystemRoleButton.disabled = true;
      try {
        if (state.demoMode) {
          const permissions = normalizeRolePermissions(profile.scope, state.settings.detailsRolePermissions);
          state.settings.roleProfiles = state.settings.roleProfiles.map((item) => item.id === roleProfileId
            ? { ...item, permissions, customized: true }
            : item);
          state.settings.saving = false;
        } else {
          const result = await saveSystemRolePermissions(state.profile, roleProfileId, state.settings.detailsRolePermissions);
          if (!result.isValid) {
            state.settings.saving = false;
            showToast(result.errors.permissions || 'Escolha permissoes validas.', 'danger', 'circle-alert');
            render();
            return;
          }
        }
        state.settings.detailsRoleId = '';
        state.settings.detailsRolePermissions = [];
        if (!state.demoMode) await loadRoleProfilesData();
        else render();
        showToast('Permissoes do perfil atualizadas.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode alterar estas permissoes.'
          : error?.message || 'Nao foi possivel salvar as permissoes.';
        render();
      }
      return;
    }
    const resetSystemRoleButton = event.target.closest('[data-system-role-reset]');
    if (resetSystemRoleButton && !resetSystemRoleButton.disabled) {
      const roleProfileId = resetSystemRoleButton.dataset.systemRoleReset;
      const defaultProfile = systemRoleProfileForId(roleProfileId);
      if (!defaultProfile || defaultProfile.baseRole === 'admin') return;
      state.settings.saving = true;
      resetSystemRoleButton.disabled = true;
      try {
        if (state.demoMode) {
          state.settings.roleProfiles = state.settings.roleProfiles.map((item) => item.id === roleProfileId
            ? { ...item, permissions: [...defaultProfile.permissions], customized: false }
            : item);
          state.settings.saving = false;
        } else {
          await resetSystemRolePermissions(state.profile, roleProfileId);
        }
        state.settings.detailsRoleId = '';
        state.settings.detailsRolePermissions = [];
        if (!state.demoMode) await loadRoleProfilesData();
        else render();
        showToast('Permissoes restauradas para o padrao.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil nao pode restaurar estas permissoes.'
          : error?.message || 'Nao foi possivel restaurar o perfil.';
        render();
      }
      return;
    }
    const closeRoleDetailsButton = event.target.closest('[data-role-details-close]');
    if (closeRoleDetailsButton) {
      document.querySelector('#role-details-dialog')?.close();
      state.settings.detailsRoleId = '';
      state.settings.detailsRolePermissions = [];
      render();
    }
    if (event.target.closest('[data-role-cancel]')) {
      document.querySelector('#role-editor-dialog')?.close();
      state.settings.roleEditorOpen = false;
      state.settings.editingRoleId = '';
      state.settings.roleDraft = createDefaultRoleDraft();
      render();
    }
    const deleteRoleButton = event.target.closest('[data-role-delete]');
    if (deleteRoleButton) {
      state.settings.pendingDeleteRoleId = deleteRoleButton.dataset.roleDelete;
      render();
      document.querySelector('#delete-role-dialog')?.showModal();
      return;
    }
    if (event.target.closest('[data-role-delete-cancel]')) {
      document.querySelector('#delete-role-dialog')?.close();
      state.settings.pendingDeleteRoleId = '';
      render();
      return;
    }
    const confirmRoleDeleteButton = event.target.closest('[data-role-delete-confirm]');
    if (confirmRoleDeleteButton && !confirmRoleDeleteButton.disabled) {
      const roleProfile = state.settings.roleProfiles.find((item) => item.id === confirmRoleDeleteButton.dataset.roleDeleteConfirm);
      if (roleProfile) {
        state.settings.saving = true;
        render();
        try {
          if (state.demoMode) {
            state.settings.roleProfiles = state.settings.roleProfiles.filter((item) => item.id !== roleProfile.id);
            state.settings.saving = false;
          } else {
            await deleteRoleProfile(state.profile, roleProfile);
          }
          state.settings.pendingDeleteRoleId = '';
          if (!state.demoMode) await loadRoleProfilesData();
          showToast('Cargo excluido.');
        } catch (error) {
          state.settings.saving = false;
          state.settings.pendingDeleteRoleId = '';
          state.settings.error = error?.code === 'role-in-use' ? error.message : 'Nao foi possivel excluir o perfil.';
          render();
        }
      }
    }
    const followUpFilterButton = event.target.closest('[data-follow-up-filter]');
    if (followUpFilterButton) {
      state.followUps.filter = followUpFilterButton.dataset.followUpFilter;
      render();
    }
    const followUpWhatsAppLink = event.target.closest('[data-follow-up-whatsapp]');
    if (followUpWhatsAppLink) {
      const lead = [...state.leads, ...state.followUps.records]
        .find((item) => item.id === followUpWhatsAppLink.dataset.followUpWhatsapp);
      if (lead) {
        try {
          if (state.demoMode) markDemoFollowUpContact(lead.id, state.profile);
          else await markFollowUpContactStarted(state.profile, lead);
          const contactUpdate = {
            followUpContactedAt: new Date().toISOString(),
            followUpContactedByUid: state.profile.uid,
            followUpContactedByName: state.profile.displayName,
            followUpContactedAppointmentKey: followUpAppointmentKey(lead)
          };
          state.leads = state.leads.map((item) => item.id === lead.id ? { ...item, ...contactUpdate } : item);
          state.followUps.records = state.followUps.records.map((item) => item.id === lead.id ? { ...item, ...contactUpdate } : item);
          if (state.followUps.filter === 'waiting') state.followUps.filter = 'contacted';
          render();
        } catch {
          showToast('O WhatsApp foi aberto, mas o contato nao foi registrado.', 'warning', 'circle-alert');
        }
      }
    }
    const leadButton = event.target.closest('[data-open-lead-id]');
    if (leadButton) navigate('lead', leadButton.dataset.openLeadId);
    const followUpRescheduleButton = event.target.closest('[data-follow-up-reschedule]');
    if (followUpRescheduleButton) {
      const lead = [...state.followUps.records, ...state.leads]
        .find((item) => item.id === followUpRescheduleButton.dataset.followUpReschedule);
      if (lead) {
        state.management.records = [lead, ...state.management.records.filter((item) => item.id !== lead.id)];
        navigate('management-lead', lead.id);
      }
    }
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
    const createAppointmentButton = event.target.closest('[data-create-appointment]');
    if (createAppointmentButton) await openAppointmentCreateDialog();
    const closeAppointmentCreateButton = event.target.closest('[data-close-appointment-create]');
    if (closeAppointmentCreateButton) closeAppointmentCreateButton.closest('dialog')?.close();
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
    const newAccessButton = event.target.closest('[data-access-new]');
    if (newAccessButton) {
      state.access.editingEmail = '';
      state.access.editorOpen = true;
      render();
      requestAnimationFrame(() => {
        document.querySelector('#access-editor-dialog')?.showModal();
        document.querySelector('#access-name')?.focus();
      });
    }
    const closeAccessEditorButton = event.target.closest('[data-access-editor-close]');
    if (closeAccessEditorButton) {
      document.querySelector('#access-editor-dialog')?.close();
      state.access.editorOpen = false;
      state.access.editingEmail = '';
      render();
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
      if (!access) return;
      state.access.editingEmail = access.email;
      state.access.editorOpen = true;
      render();
      requestAnimationFrame(() => {
        document.querySelector('#access-editor-dialog')?.showModal();
        document.querySelector('#access-name')?.focus();
      });
    }
    const deleteAccessButton = event.target.closest('[data-access-delete]');
    if (deleteAccessButton && !deleteAccessButton.disabled) {
      state.access.pendingDeleteEmail = deleteAccessButton.dataset.accessDelete;
      render();
      requestAnimationFrame(() => document.querySelector('#delete-access-dialog')?.showModal());
    }
    const cancelDeleteAccessButton = event.target.closest('[data-access-delete-cancel]');
    if (cancelDeleteAccessButton) {
      document.querySelector('#delete-access-dialog')?.close();
      state.access.pendingDeleteEmail = '';
      render();
    }
    const confirmDeleteAccessButton = event.target.closest('[data-access-delete-confirm]');
    if (confirmDeleteAccessButton && !confirmDeleteAccessButton.disabled) {
      const access = state.access.accesses.find((item) => item.email === confirmDeleteAccessButton.dataset.accessDeleteConfirm);
      if (!access) return;
      confirmDeleteAccessButton.disabled = true;
      state.access.saving = true;
      try {
        await deleteAccess(state.profile, access);
        state.access.pendingDeleteEmail = '';
        await loadAccessData();
        showToast('Acesso excluido. O historico da pessoa foi preservado.');
      } catch (error) {
        state.access.saving = false;
        confirmDeleteAccessButton.disabled = false;
        showToast(error?.message || 'Nao foi possivel excluir o acesso.', 'danger', 'circle-alert');
      }
    }
    const editGoalButton = event.target.closest('[data-edit-goal]');
    if (editGoalButton && !editGoalButton.disabled) {
      const group = groupGoalRecords(state.goals.records).find((item) => item.id === editGoalButton.dataset.editGoal);
      if (!group) return;
      state.goals.editingGroupId = group.id;
      state.goals.duplicatingGroupId = '';
      state.goals.draft = {
        title: group.title,
        targetCount: group.targetPerPerson,
        startDate: group.startDate,
        endDate: group.endDate,
        storeId: group.storeId,
        assigneeUids: group.goals.map((goal) => goal.assigneeUid)
      };
      render();
      document.querySelector('#goal-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector('#goal-title')?.focus();
    }
    const duplicateGoalButton = event.target.closest('[data-duplicate-goal]');
    if (duplicateGoalButton && !duplicateGoalButton.disabled) {
      const group = groupGoalRecords(state.goals.records).find((item) => item.id === duplicateGoalButton.dataset.duplicateGoal);
      if (!group) return;
      state.goals.editingGroupId = '';
      state.goals.duplicatingGroupId = group.id;
      state.goals.draft = duplicateGoalDraft(group);
      showToast('Meta duplicada no formulario. Revise e salve.');
      requestAnimationFrame(() => {
        document.querySelector('#goal-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const titleInput = document.querySelector('#goal-title');
        titleInput?.focus({ preventScroll: true });
        titleInput?.select();
      });
      return;
    }
    const cancelGoalEditButton = event.target.closest('[data-cancel-goal-edit]');
    if (cancelGoalEditButton) {
      const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId;
      state.goals.editingGroupId = '';
      state.goals.duplicatingGroupId = '';
      state.goals.draft = createDefaultGoalDraft(storeId);
      render();
    }
    const deleteGoalButton = event.target.closest('[data-delete-goal]');
    if (deleteGoalButton && !deleteGoalButton.disabled) {
      state.goals.pendingDeleteGroupId = deleteGoalButton.dataset.deleteGoal;
      render();
      document.querySelector('#delete-goal-dialog')?.showModal();
    }
    const closeGoalDialogButton = event.target.closest('[data-close-goal-dialog]');
    if (closeGoalDialogButton) {
      closeGoalDialogButton.closest('dialog')?.close();
      state.goals.pendingDeleteGroupId = '';
    }
    const confirmDeleteGoalButton = event.target.closest('[data-confirm-delete-goal]');
    if (confirmDeleteGoalButton && !confirmDeleteGoalButton.disabled) {
      const group = groupGoalRecords(state.goals.records).find((item) => item.id === confirmDeleteGoalButton.dataset.confirmDeleteGoal);
      if (!group) return;
      confirmDeleteGoalButton.disabled = true;
      try {
        await deleteGoalGroup(state.profile, group.goals);
        state.goals.pendingDeleteGroupId = '';
        state.goals.loaded = false;
        await loadGoalsData();
        showToast('Meta excluida.');
      } catch (error) {
        state.goals.pendingDeleteGroupId = '';
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
    const managementRoutes = ['management', 'management-lead', 'dashboard', 'reports'];
    if (managementRoutes.includes(state.route) && !managementRoutes.includes(previousRoute)) {
      state.management.loaded = false;
    }
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
    ensureLeadDetailSchedule();
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
    state.unsubscribeProfile?.();
    state.unsubscribeProfile = null;
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
      state.unsubscribeProfile = observeAuthorizedProfile(firebaseUser, (profile) => {
        if (profileAccessSignature(profile) === profileAccessSignature(state.profile)) return;
        state.profile = profile;
        state.management.loaded = false;
        state.management.records = [];
        state.access.loaded = false;
        state.goals.loaded = false;
        state.settings.loaded = false;
        if (!hasAccess('appointments.view')) stopAppointmentsSubscription();
        subscribeProfileLeads();
        startFollowUpScheduleSubscription();
        render();
        ensureManagementData();
        ensureAppointmentsData();
        ensureNewLeadSchedule();
        ensureLeadDetailSchedule();
        ensureAccessData();
        ensureGoalsData();
        ensureSettingsData();
      }, (error) => {
        state.dataError = error?.message || 'Nao foi possivel atualizar as permissoes deste acesso.';
        render();
      });
    } catch (error) {
      state.profile = null;
      state.authError = error.message || 'Acesso nao autorizado.';
    } finally {
      state.loading = false;
      render();
      ensureManagementData();
      ensureAppointmentsData();
      ensureNewLeadSchedule();
      ensureLeadDetailSchedule();
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
