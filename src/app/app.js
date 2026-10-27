import {
  ArrowLeft,
  BarChart3,
  BellRing,
  BrushCleaning,
  Building2,
  BusFront,
  CalendarDays,
  Check,
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
  RotateCcw,
  Save,
  Search,
  Settings,
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
import { markDemoAppointmentReminderDone, markDemoFollowUpContact, saveLead, subscribeToLeads, synchronizeNow, undoDemoAppointmentReminderDone, updateDemoAppointmentAttendance, updateLead } from '../services/lead-service.js';
import { markFollowUpContactStarted, subscribeToTeamFollowUps } from '../services/follow-up-service.js';
import { deleteAccess, loadAccesses, saveAccess, setAccessActive } from '../services/access-service.js';
import { deleteRoleProfile, loadRoleProfiles, resetSystemRolePermissions, saveRoleProfile, saveSystemRolePermissions } from '../services/role-profile-service.js';
import { deleteManagementLead, loadManagementLeads, MANAGEMENT_QUERY_LIMIT, updateManagementLead } from '../services/management-service.js';
import { createGoals, deleteGoalGroup, GOALS_LEAD_LIMIT, loadGoalsDashboard, updateGoalGroup } from '../services/goal-service.js';
import { APPOINTMENTS_QUERY_LIMIT, markAppointmentReminderDone, setAppointmentAttendance, subscribeToAppointmentConfirmations, subscribeToAppointments, undoAppointmentReminderDone } from '../services/appointment-service.js';
import { backfillAppointmentSlots, loadStoreSchedule, loadStoreSchedules, saveStoreSchedule, subscribeToDayAppointments, subscribeToStoreSchedule } from '../services/schedule-service.js';
import { deleteAppointmentService, ensureDefaultAppointmentServices, loadAppointmentServices, saveAppointmentService, setAppointmentServiceActive } from '../services/service-catalog-service.js';
import { consultLocalSavwinSales, isLocalSavwinEnabled } from '../services/savwin-service.js';
import { downloadLeadsCsv } from '../utils/lead-export.js';
import { appointmentsByDate, calendarDays, formatMonthLabel, monthKeyFromDate, monthRange, shiftMonth } from '../utils/calendar.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { AMETROPIAS, EYE_SURGERIES, EYE_SURGERY_STATUS_OPTIONS, INTERESTS, PATHOLOGIES, SEX_OPTIONS, calculateAge, examPricing, ophthalmologyTriage } from '../utils/lead.js';
import { appointmentQuotaStatus, buildAppointmentSlots, DEFAULT_STORE_SCHEDULE, isOphthalmologyDateAllowed, isStoreDateAllowed, isTransportAppointmentAllowed, isTransportDateAllowed, ophthalmologyAppointmentSchedule, transportHoursForDate, validateStoreSchedule, WEEKDAY_OPTIONS } from '../utils/schedule.js';
import { appointmentFollowUps, buildWhatsAppAppointmentReminderUrl, buildWhatsAppFollowUpUrl, followUpAppointmentKey, followUpAvailableAt, followUpStage, isAppointmentReminderDone, isFollowUpContacted } from '../utils/follow-up.js';
import { STORES } from '../utils/stores.js';
import { profileStoreIds } from '../utils/permissions.js';
import { DEFAULT_TEAM_PASSWORD, formatAccessStoreSummary } from '../utils/access.js';
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
  BrushCleaning,
  Building2,
  BusFront,
  CalendarDays,
  Check,
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
  RotateCcw,
  Save,
  Search,
  Settings,
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

function readableAuthError(error, fallback) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const blockedDomain = code.startsWith('auth/requests-from-referer-')
    || code === 'auth/unauthorized-domain'
    || message.includes('requests-from-referer-')
    || message.includes('auth/unauthorized-domain');

  if (blockedDomain) {
    return 'O acesso por este endereço ainda está sendo configurado. Avise o administrador e tente novamente mais tarde.';
  }

  return message || fallback;
}

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
  unsubscribeConfirmations: null,
  unsubscribeStoreSchedule: null,
  unsubscribeOfflineCapture: null,
  unsubscribeFollowUpSchedule: null,
  unsubscribeFollowUpLeads: null,
  unsubscribeDayAppointments: null,
  updateAction: null,
  management: {
    loading: false,
    loaded: false,
    error: '',
    records: [],
    activeLead: null,
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
  confirmations: {
    loading: false,
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    filter: 'pending',
    updatingId: ''
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
    storeId: '',
    settings: { ...DEFAULT_STORE_SCHEDULE },
    appointmentDate: '',
    appointments: [],
    services: [],
    serviceId: '',
    triage: {},
    draft: {}
  },
  leadDetailSchedule: {
    loading: false,
    appointmentLoading: false,
    leadId: '',
    storeId: '',
    appointmentDate: '',
    appointments: [],
    services: [],
    serviceId: '',
    error: '',
    settings: { ...DEFAULT_STORE_SCHEDULE }
  },
  offlineCapture: {
    loaded: false,
    enabled: false
  },
  followUps: {
    loaded: false,
    error: '',
    records: [],
    truncated: false,
    filter: 'all',
    selectedCaptorId: '',
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
    pendingDeleteServiceId: '',
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
    editorOpen: false,
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
let toastTimeoutId = null;

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
    title: 'Meta de captações',
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
  storeId: 'loja-06',
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
      storeId: 'loja-06',
      storeIds: STORES.map((store) => store.id)
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
    'follow-ups': () => hasAccess('followups.own') || hasAccess('followups.team'),
    management: () => hasAccess('management.view'),
    'management-lead': () => hasAccess('management.view'),
    dashboard: () => hasAccess('dashboard.view'),
    reports: () => hasAccess('reports.view'),
    appointments: () => hasAccess('appointments.view'),
    confirmations: () => hasAccess('appointments.view'),
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
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function formatGoalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}

function formatAppointmentDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(new Date(`${value}T12:00:00`));
}

function addDaysToDateInput(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateInput(date);
}

function storeDisplayLabel(storeId = '') {
  return STORES.find((store) => store.id === storeId)?.displayLabel || storeLabel(storeId);
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
  if (lead.syncState === 'error') return ['Não sincronizado', 'danger'];
  if (lead.syncState === 'syncing') return ['Sincronizando', 'warning'];
  if (lead.syncState === 'pending') return ['Pendente de sincronização', 'warning'];
  if (!lead.appointmentDate || !lead.appointmentTime) return ['Aguardando agendamento', 'warning'];
  return ['Agendado', 'success'];
}

function offlineSyncDetail(lead) {
  if (lead.syncState === 'syncing') return 'Enviando cadastro para a nuvem.';
  if (lead.syncState === 'pending') return 'Salvo neste aparelho. Sincronização automática pendente.';
  if (lead.syncState === 'error') return 'Não foi possível sincronizar. O cadastro continua salvo neste aparelho.';
  return '';
}

function loginView() {
  const configNotice = isFirebaseConfigured
    ? ''
    : '<div class="notice notice-warning"><i data-lucide="wrench"></i><div><strong>Firebase ainda não configurado</strong><span>Use o modo de desenvolvimento sem dados reais.</span></div></div>';

  return `
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <img class="brand-logo brand-logo-login" src="${import.meta.env.BASE_URL}leadflow-logo.png" alt="" aria-hidden="true" />
        <p class="eyebrow">GESTÃO DE RELACIONAMENTO</p>
        <h1 id="login-title">LeadFlow</h1>
        <p class="login-copy">Cadastro rápido para quem encontra clientes onde eles estão.</p>
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
    home: 'Início',
    new: 'Cadastro',
    leads: 'Meus cadastros',
    lead: 'Detalhes do cadastro',
    management: 'Painel de leads',
    'management-lead': 'Detalhes do lead',
    dashboard: 'Dashboard',
    reports: 'Relatórios',
    appointments: 'Agenda de exames',
    confirmations: 'Confirmações',
    access: 'Acessos da equipe',
    goals: 'Metas',
    settings: 'Configurações'
  };
  if (state.route === 'follow-ups') return canManage() ? 'Retornos da equipe' : 'Retornos pendentes';
  return titles[state.route] || 'Início';
}

function headerView() {
  const online = navigator.onLine;
  const storeSummary = formatAccessStoreSummary(state.profile);
  const permittedStoreIds = profileStoreIds(state.profile);
  const permittedStoreLabels = STORES
    .filter((store) => permittedStoreIds.includes(store.id))
    .map((store) => store.label);
  const storeIndicator = storeSummary.short === 'TODAS'
    ? 'Todas'
    : permittedStoreLabels.join(' · ') || storeSummary.short;
  const multipleStoreIndicator = permittedStoreLabels.length > 1 && storeSummary.short !== 'TODAS';
  return `
    <header class="app-header">
      <div class="header-inner ${['management', 'dashboard', 'reports', 'appointments', 'confirmations', 'access', 'goals', 'settings'].includes(state.route) ? 'layout-wide' : ''}">
        <div class="header-brand">
          <img class="brand-logo brand-logo-header" src="${import.meta.env.BASE_URL}leadflow-logo.png" alt="" aria-hidden="true" />
          <div>
            <p class="eyebrow">LEADFLOW</p>
            <h1 class="header-page-title">${escapeHtml(currentPageTitle())}</h1>
          </div>
        </div>
        <div class="header-actions">
          ${state.demoMode ? '<span class="mode-badge">DEMO</span>' : ''}
          <span class="store-indicator ${multipleStoreIndicator ? 'is-multiple' : ''}" title="${escapeHtml(storeSummary.full)}" aria-label="Lojas: ${escapeHtml(storeSummary.full)}">
            <i data-lucide="building-2"></i><span>${escapeHtml(storeIndicator)}</span>
          </span>
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
  const followUps = pendingFollowUps();

  return `
    ${profileCard()}
    ${state.demoMode ? '<div class="notice notice-warning"><i data-lucide="flask-conical"></i><div><strong>Modo de desenvolvimento</strong><span>Não utilize dados reais. Os registros ficam somente neste navegador.</span></div></div>' : ''}
    <section class="action-grid" aria-label="Ações principais">
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
      ${hasAccess('followups.own') || hasAccess('followups.team') ? `<button class="action-card" type="button" data-route="follow-ups">
        <span class="action-icon"><i data-lucide="bell-ring"></i></span>
        <span><strong>${hasAccess('followups.team') ? 'Retornos da equipe' : 'Retornos pendentes'}</strong><small>${followUps.length ? `${followUps.length} cliente(s) em acompanhamento` : 'Nenhum retorno pendente'}</small></span>
        ${followUps.length ? `<span class="notification-count" aria-label="${followUps.length} pendência(s)">${followUps.length}</span>` : '<i data-lucide="chevron-right"></i>'}
      </button>` : ''}
      ${canManage() ? `<button class="action-card" type="button" data-route="management">
        <span class="action-icon"><i data-lucide="bar-chart-3"></i></span>
        <span><strong>Painel de gestão</strong><small>Consultar e exportar captações</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('appointments.view') ? `<button class="action-card" type="button" data-route="appointments">
        <span class="action-icon"><i data-lucide="calendar-days"></i></span>
        <span><strong>Agenda de exames</strong><small>Visualizar os pré-agendamentos</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
      ${hasAccess('appointments.view') ? `<button class="action-card" type="button" data-route="confirmations">
        <span class="action-icon"><i data-lucide="message-circle"></i></span>
        <span><strong>Confirmações</strong><small>Enviar lembretes aos clientes</small></span>
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
        <span class="action-icon"><i data-lucide="settings"></i></span>
        <span><strong>Configurações</strong><small>Agenda e preferências do sistema</small></span>
        <i data-lucide="chevron-right"></i>
      </button>` : ''}
    </section>`;
}

function appointmentTimeField() {
  const { settings, appointmentDate, appointments, loading, error } = state.newLeadSchedule;
  const service = selectedNewLeadService();
  const triage = ophthalmologyTriage(state.newLeadSchedule.triage || {}, settings);
  const needsTransport = state.newLeadSchedule.triage?.needsTransport === true || state.newLeadSchedule.triage?.needsTransport === 'true';
  const ophthalmologyDateBlocked = triage.careRoute === 'ophthalmologist'
    && appointmentDate
    && !isOphthalmologyDateAllowed(settings, appointmentDate);
  const storeDateBlocked = triage.careRoute !== 'ophthalmologist'
    && appointmentDate
    && !isStoreDateAllowed(settings, appointmentDate);
  const transportDateBlocked = needsTransport && appointmentDate && !isTransportDateAllowed(settings, appointmentDate);
  const baseSchedule = triage.careRoute === 'ophthalmologist'
    ? ophthalmologyAppointmentSchedule(settings)
    : settings;
  const serviceSchedule = { ...baseSchedule, appointmentDurationMinutes: service.durationMinutes };
  if (!navigator.onLine) {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">Conecte-se para consultar os horários</option></select><small class="field-error"></small><small class="schedule-availability">Agendamentos exigem conexão com a agenda atualizada.</small></div>`;
  }
  if (ophthalmologyDateBlocked) {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">O oftalmologista não atende neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dos dias configurados para atendimento oftalmológico.</small></div>`;
  }
  if (storeDateBlocked) {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">A loja não funciona neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dia configurado no horário de funcionamento da loja.</small></div>`;
  }
  if (transportDateBlocked) {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário disponível</label><select id="appointmentTime" name="appointmentTime" disabled><option value="">Transporte indisponível neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha um dia configurado para transporte.</small></div>`;
  }
  if (settings.schedulingMode === 'free') {
    return `<div class="field" data-field="appointmentTime"><label for="appointmentTime">Horário</label><input id="appointmentTime" name="appointmentTime" type="time" /><small class="field-error"></small></div>`;
  }

  const quota = appointmentQuotaStatus(settings, appointmentDate, appointments, state.profile);
  const slots = appointmentDate
    ? buildAppointmentSlots(serviceSchedule, appointments, '', { appointmentDate, profile: state.profile })
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

function isMeiProfile(profile = state.profile) {
  return profile?.roleProfileId === 'system-mei';
}

function captureStoreIds(profile = state.profile) {
  return profileStoreIds(profile).filter((storeId) => STORES.some((store) => store.id === storeId));
}

function requiresCaptureStoreChoice(profile = state.profile) {
  return profile?.role === 'admin' || isMeiProfile(profile) || captureStoreIds(profile).length > 1;
}

function selectedNewLeadStoreId() {
  return state.newLeadSchedule.storeId
    || (requiresCaptureStoreChoice() ? '' : state.profile?.storeId || '');
}

function newLeadCaptureProfile() {
  return { ...state.profile, storeId: selectedNewLeadStoreId() };
}

function selectedNewLeadService() {
  const storeId = selectedNewLeadStoreId();
  const available = servicesForStore(state.newLeadSchedule.services, storeId);
  return available.find((service) => service.id === state.newLeadSchedule.serviceId)
    || available[0]
    || defaultAppointmentService(storeId, state.newLeadSchedule.settings.appointmentDurationMinutes);
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

function eyeSurgeryStatusOptions(selectedId = '') {
  return EYE_SURGERY_STATUS_OPTIONS.map((item) => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${item.label}</option>`).join('');
}

function eyeSurgeryOptions(selectedId = '') {
  return EYE_SURGERIES.map((item) => `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${item.label}</option>`).join('');
}

function triageConfigFields(settings) {
  return `<input name="ophthalmologyRoutingEnabled" type="hidden" value="${settings.ophthalmologyRoutingEnabled}" />
    <input name="ophthalmologyMinimumAge" type="hidden" value="${settings.ophthalmologyMinimumAge}" />
    <input name="transportEnabled" type="hidden" value="${settings.transportEnabled}" />
    <input name="transportAllowedWeekdays" type="hidden" value="${escapeHtml(JSON.stringify(settings.transportHoursRules.map((rule) => rule.weekday)))}" />`;
}

function transportFields(values = {}, settings = DEFAULT_STORE_SCHEDULE, idPrefix = 'transport', locked = false) {
  const needsTransport = values.needsTransport === true || values.needsTransport === 'true';
  const hasCompanion = needsTransport && (values.hasCompanion === true || values.hasCompanion === 'true');
  const appointmentDate = values.appointmentDate || '';
  const hours = appointmentDate ? transportHoursForDate(settings, appointmentDate) : null;
  const status = !needsTransport
    ? ''
    : !settings.transportEnabled
      ? 'O transporte ainda não está configurado para esta loja.'
      : !appointmentDate
        ? 'Escolha a data para consultar a disponibilidade do transporte.'
        : hours
          ? `Transporte disponível das ${hours.openingTime} às ${hours.closingTime}.`
          : 'Não há transporte disponível nesta data.';
  return `<section class="transport-section" data-transport-section>
    ${locked ? `<input type="hidden" name="needsTransport" value="${needsTransport}" /><input type="hidden" name="hasCompanion" value="${hasCompanion}" />` : ''}
    <div class="field-row transport-fields">
      <div class="field" data-field="needsTransport"><label for="${idPrefix}-needed">Transporte</label><select id="${idPrefix}-needed" name="needsTransport" ${locked ? 'disabled' : ''}><option value="false" ${needsTransport ? '' : 'selected'}>Sem transporte</option><option value="true" ${needsTransport ? 'selected' : ''}>Com transporte</option></select><small class="field-error"></small></div>
      <div class="field ${needsTransport ? '' : 'is-disabled'}" data-transport-companion data-field="hasCompanion"><label for="${idPrefix}-companion">Tem acompanhante?</label><select id="${idPrefix}-companion" name="hasCompanion" ${locked || !needsTransport ? 'disabled' : ''}><option value="false" ${hasCompanion ? '' : 'selected'}>Não</option><option value="true" ${hasCompanion ? 'selected' : ''}>Sim</option></select><small class="field-help">Limite de 1 acompanhante por cliente.</small><small class="field-error"></small></div>
    </div>
    <div class="transport-status" data-transport-status ${status ? '' : 'hidden'}><i data-lucide="bus-front"></i><span>${escapeHtml(status)}</span></div>
  </section>`;
}

function bindTransportFields(form, settings, onChange = () => {}) {
  const section = form.querySelector('[data-transport-section]');
  if (!section) return;
  const transportInput = section.querySelector('select[name="needsTransport"]');
  const companionInput = section.querySelector('select[name="hasCompanion"]');
  const companionField = section.querySelector('[data-transport-companion]');
  const status = section.querySelector('[data-transport-status]');
  const refresh = () => {
    const needsTransport = transportInput.value === 'true';
    companionInput.disabled = !needsTransport;
    companionField.classList.toggle('is-disabled', !needsTransport);
    if (!needsTransport) companionInput.value = 'false';
    const appointmentDate = form.elements.appointmentDate?.value || '';
    const hours = appointmentDate ? transportHoursForDate(settings, appointmentDate) : null;
    const message = !needsTransport
      ? ''
      : !settings.transportEnabled
        ? 'O transporte ainda não está configurado para esta loja.'
        : !appointmentDate
          ? 'Escolha a data para consultar a disponibilidade do transporte.'
          : hours
            ? `Transporte disponível das ${hours.openingTime} às ${hours.closingTime}.`
            : 'Não há transporte disponível nesta data.';
    status.hidden = !message;
    status.querySelector('span').textContent = message;
    onChange(leadFormValues(form));
  };
  transportInput.addEventListener('change', refresh);
  companionInput.addEventListener('change', refresh);
  form.elements.appointmentDate?.addEventListener('input', refresh);
  refresh();
}

function eyeTriageFields(values = {}, settings = DEFAULT_STORE_SCHEDULE, idPrefix = 'eye') {
  const triage = ophthalmologyTriage(values, settings);
  const pricing = examPricing(triage.careRoute, values.examPaymentType);
  const showSurgeryQuestion = triage.surgeryQuestionRequired || Boolean(values.eyeSurgeryStatus);
  const showSurgeryType = values.eyeSurgeryStatus === 'yes';
  return `<section class="eye-triage-section" data-eye-triage>
    <div class="field-row eye-surgery-fields" data-eye-surgery-question ${showSurgeryQuestion ? '' : 'hidden'}>
      <div class="field" data-field="eyeSurgeryStatus">
        <label for="${idPrefix}-surgery-status">Já realizou cirurgia nos olhos? <span aria-hidden="true">*</span></label>
        <select id="${idPrefix}-surgery-status" name="eyeSurgeryStatus">${eyeSurgeryStatusOptions(values.eyeSurgeryStatus || '')}</select>
        <small class="field-help">Pergunta obrigatória a partir de ${settings.ophthalmologyMinimumAge} anos.</small>
        <small class="field-error"></small>
      </div>
      <div class="field eye-surgery-dependent ${showSurgeryType ? '' : 'is-disabled'}" data-field="eyeSurgeryType" data-eye-surgery-type>
        <label for="${idPrefix}-surgery-type">Qual cirurgia? <span aria-hidden="true">*</span></label>
        <select id="${idPrefix}-surgery-type" name="eyeSurgeryType" ${showSurgeryType ? '' : 'disabled'}>${eyeSurgeryOptions(values.eyeSurgeryType || '')}</select>
        <small class="field-error"></small>
      </div>
      <div class="field" data-field="eyeSurgeryDetails" data-eye-surgery-details ${showSurgeryType && values.eyeSurgeryType === 'other' ? '' : 'hidden'}>
        <label for="${idPrefix}-surgery-details">Nome da cirurgia <span aria-hidden="true">*</span></label>
        <input id="${idPrefix}-surgery-details" name="eyeSurgeryDetails" maxlength="120" value="${escapeHtml(values.eyeSurgeryDetails || '')}" placeholder="Informe a cirurgia" />
        <small class="field-error"></small>
      </div>
    </div>
    <div class="field-row exam-billing-fields">
      <div class="field eye-route-override"><label for="${idPrefix}-care-route">Encaminhamento</label><select id="${idPrefix}-care-route" name="careRouteOverride"><option value="automatic" ${!values.careRouteOverride || values.careRouteOverride === 'automatic' ? 'selected' : ''}>Automático</option><option value="optometrist" ${values.careRouteOverride === 'optometrist' ? 'selected' : ''}>Optometrista</option><option value="ophthalmologist" ${values.careRouteOverride === 'ophthalmologist' ? 'selected' : ''}>Oftalmologista</option></select></div>
      <div class="field"><label for="${idPrefix}-exam-payment">Tipo do exame</label><select id="${idPrefix}-exam-payment" name="examPaymentType"><option value="paid" ${values.examPaymentType !== 'courtesy' ? 'selected' : ''}>Exame pago</option><option value="courtesy" ${values.examPaymentType === 'courtesy' ? 'selected' : ''}>Cortesia</option></select></div>
      <div class="field exam-price-field"><span class="exam-price-label">Valor do exame</span><div class="exam-price-display"><strong data-exam-price>${pricing.examPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small data-exam-price-detail>${triage.careRoute === 'ophthalmologist' ? 'Oftalmologista' : 'Optometrista'}</small></div></div>
    </div>
    <div class="eye-route-status ${triage.careRoute === 'ophthalmologist' ? 'is-ophthalmology' : ''}" data-eye-route-status ${triage.careRoute === 'ophthalmologist' ? '' : 'hidden'}><i data-lucide="stethoscope"></i><span>Encaminhamento para oftalmologista. A agenda mostrará somente os dias configurados.</span></div>
  </section>`;
}

function enrichLeadTriage(values, settings) {
  const triage = ophthalmologyTriage(values, settings);
  const pricing = examPricing(triage.careRoute, values.examPaymentType);
  return {
    ...values,
    ophthalmologyRoutingEnabled: settings.ophthalmologyRoutingEnabled,
    ophthalmologyMinimumAge: settings.ophthalmologyMinimumAge,
    ophthalmologyPathologyIds: settings.ophthalmologyPathologyIds,
    ophthalmologySurgeryIds: settings.ophthalmologySurgeryIds,
    ophthalmologyAllowedWeekdays: settings.ophthalmologyWeekdays,
    transportEnabled: settings.transportEnabled,
    transportAllowedWeekdays: settings.transportHoursRules.map((rule) => rule.weekday),
    transportHoursRules: settings.transportHoursRules,
    eyeSurgeryStatus: triage.eyeSurgeryStatus,
    eyeSurgeryType: triage.eyeSurgeryType,
    eyeSurgeryDetails: triage.eyeSurgeryDetails,
    careRoute: triage.careRoute,
    careRouteOverride: triage.careRouteOverride,
    careRouteReasons: triage.careRouteReasons,
    examPaymentType: pricing.examPaymentType,
    examPrice: pricing.examPrice
  };
}

function bindEyeTriage(form, settings, onChange = () => {}) {
  const section = form.querySelector('[data-eye-triage]');
  if (!section) return;
  const refresh = () => {
    const values = leadFormValues(form);
    const triage = ophthalmologyTriage(values, settings);
    const question = section.querySelector('[data-eye-surgery-question]');
    const typeField = section.querySelector('[data-eye-surgery-type]');
    const detailsField = section.querySelector('[data-eye-surgery-details]');
    const routeStatus = section.querySelector('[data-eye-route-status]');
    const price = section.querySelector('[data-exam-price]');
    const priceDetail = section.querySelector('[data-exam-price-detail]');
    question.hidden = !triage.surgeryQuestionRequired && !values.eyeSurgeryStatus;
    const surgeryTypeEnabled = values.eyeSurgeryStatus === 'yes';
    typeField.classList.toggle('is-disabled', !surgeryTypeEnabled);
    form.elements.eyeSurgeryType.disabled = !surgeryTypeEnabled;
    detailsField.hidden = values.eyeSurgeryStatus !== 'yes' || values.eyeSurgeryType !== 'other';
    form.elements.eyeSurgeryStatus.required = triage.surgeryQuestionRequired;
    form.elements.eyeSurgeryType.required = surgeryTypeEnabled;
    form.elements.eyeSurgeryDetails.required = values.eyeSurgeryStatus === 'yes' && values.eyeSurgeryType === 'other';
    routeStatus.hidden = triage.careRoute !== 'ophthalmologist';
    routeStatus.classList.toggle('is-ophthalmology', triage.careRoute === 'ophthalmologist');
    const pricing = examPricing(triage.careRoute, values.examPaymentType);
    price.textContent = pricing.examPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    priceDetail.textContent = pricing.examPaymentType === 'courtesy'
      ? 'Cortesia'
      : triage.careRoute === 'ophthalmologist' ? 'Oftalmologista' : 'Optometrista';
    onChange(values, triage);
  };
  form.elements.birthDate?.addEventListener('input', refresh);
  form.elements.eyeSurgeryStatus?.addEventListener('change', refresh);
  form.elements.eyeSurgeryType?.addEventListener('change', refresh);
  form.elements.careRouteOverride?.addEventListener('change', refresh);
  form.elements.examPaymentType?.addEventListener('change', refresh);
  form.querySelectorAll('[name="pathologyIds"]').forEach((input) => input.addEventListener('change', refresh));
  refresh();
}

function leadFormValues(form) {
  const formData = new FormData(form);
  return {
    ...Object.fromEntries(formData),
    ametropiaIds: formData.getAll('ametropiaIds'),
    pathologyIds: formData.getAll('pathologyIds')
  };
}

const NEW_LEAD_DRAFT_FIELDS = [
  'fullName', 'phone', 'customerRg', 'customerCpf', 'birthDate', 'sex', 'preferredName',
  'street', 'streetNumber', 'neighborhood', 'city', 'state', 'interestId', 'appointmentServiceId',
  'ametropiaIds', 'pathologyIds', 'eyeSurgeryStatus', 'eyeSurgeryType', 'eyeSurgeryDetails',
  'careRouteOverride', 'examPaymentType', 'needsTransport', 'hasCompanion', 'notes'
];

function captureNewLeadDraft(form) {
  const values = leadFormValues(form);
  return Object.fromEntries(NEW_LEAD_DRAFT_FIELDS
    .filter((name) => Object.hasOwn(values, name))
    .map((name) => [name, values[name]]));
}

function restoreNewLeadDraft(form, draft = {}) {
  NEW_LEAD_DRAFT_FIELDS.forEach((name) => {
    if (!Object.hasOwn(draft, name) || name === 'appointmentServiceId') return;
    const controls = [...form.querySelectorAll(`[name="${name}"]`)];
    if (!controls.length) return;
    const values = Array.isArray(draft[name]) ? draft[name].map(String) : [String(draft[name] ?? '')];
    controls.forEach((control) => {
      if (control.type === 'checkbox' || control.type === 'radio') control.checked = values.includes(control.value);
      else control.value = values[0];
    });
  });
  if (draft.eyeSurgeryStatus === 'yes' && form.elements.eyeSurgeryType) {
    form.elements.eyeSurgeryType.disabled = false;
    form.elements.eyeSurgeryType.value = draft.eyeSurgeryType || '';
  }
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
  return age === null ? 'A idade será calculada automaticamente.' : `${age} ano${age === 1 ? '' : 's'}`;
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
  if (!navigator.onLine && !state.offlineCapture.enabled) {
    return `
      <section class="page-toolbar">
        <button class="back-button" type="button" data-route="home" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      </section>
      <div class="empty-state"><i data-lucide="wifi-off"></i><strong>Cadastro offline desativado</strong><p>Conecte-se à internet para iniciar um novo cadastro. Esta proteção evita registros incompletos enquanto o modo offline está em refinamento.</p></div>`;
  }
  const interests = INTERESTS.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  const selectedStoreId = selectedNewLeadStoreId();
  const allowedStoreIds = captureStoreIds();
  const storeChoice = requiresCaptureStoreChoice();
  const storeOptions = STORES.filter((store) => allowedStoreIds.includes(store.id))
    .map((store) => `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${store.displayLabel}</option>`)
    .join('');
  const selectedService = selectedNewLeadService();
  const availableServices = servicesForStore(state.newLeadSchedule.services, selectedStoreId);
  const serviceOptions = (availableServices.length ? availableServices : selectedStoreId ? [selectedService] : [])
    .map((service) => `<option value="${escapeHtml(service.id)}" ${service.id === selectedService.id ? 'selected' : ''}>${escapeHtml(service.name)} - ${service.durationMinutes} min</option>`)
    .join('');
  return `
    <section class="page-toolbar">
      <button class="back-button" type="button" data-route="home" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
    </section>
    <form id="lead-form" class="form-panel" novalidate>
      <div class="notice notice-warning" data-offline-capture-notice ${navigator.onLine ? 'hidden' : ''}><i data-lucide="wifi-off"></i><span>Cadastro offline ativo. Os dados do lead serão preservados, mas data e horário só poderão ser escolhidos com internet.</span></div>
      <div class="field" data-field="storeId">
        <label for="capture-store">Loja de destino <span aria-hidden="true">*</span></label>
        <select id="capture-store" name="storeId" required ${storeChoice ? '' : 'aria-disabled="true" tabindex="-1"'}>
          ${storeChoice ? '<option value="">Selecione a loja</option>' : ''}${storeOptions}
        </select>
        <small>${storeChoice ? 'Os serviços, horários e limites serão carregados para esta unidade.' : 'Unidade definida no acesso deste colaborador.'}</small>
        <small class="field-error"></small>
      </div>
      ${selectedStoreId && !state.newLeadSchedule.loaded ? '<div class="notice notice-info" data-schedule-loading><i data-lucide="refresh-cw"></i><span>Carregando agenda, transporte e horários desta loja...</span></div>' : ''}
      <input name="schedulingMode" type="hidden" value="${escapeHtml(state.newLeadSchedule.settings.schedulingMode)}" />
      ${triageConfigFields(state.newLeadSchedule.settings)}
      <input name="appointmentServiceName" type="hidden" value="${escapeHtml(selectedService.name)}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${selectedService.durationMinutes}" />
      <div class="field" data-field="fullName">
        <label for="fullName">Nome <span aria-hidden="true">*</span></label>
        <input id="fullName" name="fullName" autocomplete="name" maxlength="120" placeholder="Nome do cliente" required />
        <small class="field-error"></small>
      </div>
      <div class="field-row contact-fields">
        <div class="field" data-field="phone">
          <label for="phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label>
          <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" placeholder="(00) 00000-0000" required />
          <small class="field-error"></small>
        </div>
        <div class="field" data-field="customerRg">
          <label for="customerRg">RG</label>
          <input id="customerRg" name="customerRg" maxlength="20" autocomplete="off" placeholder="0.000.000" />
          <small class="field-error"></small>
        </div>
      </div>
      <div class="field-row identity-fields">
        <div class="field" data-field="customerCpf">
          <label for="customerCpf">CPF</label>
          <input id="customerCpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" />
          <small class="field-error"></small>
        </div>
        <div class="field" data-field="birthDate">
          <label for="birthDate">Data de nascimento <span aria-hidden="true">*</span></label>
          <input id="birthDate" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" required />
          <small class="birth-age-hint" data-birth-age>A idade será calculada automaticamente.</small>
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
        <div class="field address-number" data-field="streetNumber"><label for="streetNumber">Número</label><input id="streetNumber" name="streetNumber" maxlength="12" autocomplete="address-line2" placeholder="S/N" /><small class="field-error"></small></div>
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
          <label for="appointmentServiceId">Serviço do agendamento</label>
          <select id="appointmentServiceId" name="appointmentServiceId" ${selectedStoreId ? '' : 'disabled'}><option value="">${selectedStoreId ? 'Selecione o serviço' : 'Escolha primeiro a loja'}</option>${serviceOptions}</select>
          <small class="field-error"></small>
        </div>
      </div>
      ${state.newLeadSchedule.settings.showAmetropiaFields ? `<fieldset id="new-lead-ametropias" class="field ametropia-field">
        <legend>Ametropias</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${ametropiaOptions()}</div>
      </fieldset>` : ''}
      <fieldset id="new-lead-pathologies" class="field ametropia-field">
        <legend>Patologias e condições de saúde</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${pathologyOptions()}</div>
      </fieldset>
      ${eyeTriageFields({}, state.newLeadSchedule.settings, 'new-lead-eye')}
      ${state.newLeadSchedule.settings.transportEnabled
        ? transportFields({ appointmentDate: state.newLeadSchedule.appointmentDate }, state.newLeadSchedule.settings, 'new-lead-transport')
        : ''}
      <div class="field-row appointment-fields" data-online-appointment ${navigator.onLine ? '' : 'hidden'}>
        <div class="field" data-field="appointmentDate"><label for="appointmentDate">Data do pré-agendamento</label><input id="appointmentDate" name="appointmentDate" type="date" min="${toLocalDateInput(new Date())}" value="${navigator.onLine ? escapeHtml(state.newLeadSchedule.appointmentDate) : ''}" ${navigator.onLine && selectedStoreId ? '' : 'disabled'} /><small class="schedule-date-status">${!navigator.onLine ? 'Conecte-se para escolher uma data.' : !selectedStoreId ? 'Escolha primeiro a loja de destino.' : ''}</small><small class="field-error"></small></div>
        <div id="appointment-time-field">${appointmentTimeField()}</div>
      </div>
      <div class="field" data-field="notes">
        <label for="notes">Observação rápida</label>
        <textarea id="notes" name="notes" maxlength="500" rows="3" placeholder="Ex.: prefere contato pela manhã"></textarea>
        <small class="field-hint"><span id="notes-count">0</span>/500</small>
        <small class="field-error"></small>
      </div>
      <button class="button button-primary button-block" type="submit"><i data-lucide="save"></i><span>Salvar cadastro</span></button>
      <p class="form-footnote"><i data-lucide="shield-check"></i> ${state.offlineCapture.enabled ? 'Quando offline, somente os dados do lead serão salvos; o agendamento será feito depois.' : 'O cadastro exige conexão com a internet nesta loja.'}</p>
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
          <div class="lead-content"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(offlineSyncDetail(lead) || lead.interestLabel || 'Interesse não informado')}</small></div>
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
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Esta área e exclusiva para captadores e gestores.</span></div>`;
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
      const followUpSettings = state.followUps.settingsByStore[lead.storeId] || state.followUps.settings;
      const stage = followUpStage(lead, followUpSettings);
      const rescheduleRecommended = stage === 'reschedule';
      const whatsAppUrl = buildWhatsAppFollowUpUrl(lead, stage, state.profile.displayName);
      const manuallyMissed = lead.appointmentAttendance === 'missed';
      const contacted = isFollowUpContacted(lead);
      return `<article class="follow-up-item">
        <div class="follow-up-heading">
          <span class="follow-up-icon"><i data-lucide="bell-ring"></i></span>
          <div><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span></div>
          <span class="status-badge ${rescheduleRecommended ? 'status-danger' : contacted ? 'status-success' : 'status-warning'}">${rescheduleRecommended ? 'Reagendamento recomendado' : contacted ? 'Contato iniciado' : 'Cliente atrasado'}</span>
        </div>
        <dl class="follow-up-details">
          <div><dt>Agendamento</dt><dd>${escapeHtml(formatAppointmentDate(lead.appointmentDate))}, ${escapeHtml(lead.appointmentTime)}</dd></div>
          <div><dt>Retorno liberado</dt><dd>${escapeHtml(formatFollowUpAvailableAt(lead))}</dd></div>
          <div><dt>Ação sugerida</dt><dd>${rescheduleRecommended ? 'Oferecer uma nova data' : 'Confirmar se está a caminho'}</dd></div>
          ${managerView ? `<div><dt>Situação</dt><dd>${manuallyMissed ? 'Não compareceu' : 'Sem confirmação'}</dd></div>
          <div><dt>Último contato</dt><dd>${contacted ? escapeHtml(formatDateTimeValue(lead.followUpContactedAt)) : 'Ainda não iniciado'}</dd></div>
          ${contacted ? `<div><dt>Contato por</dt><dd>${escapeHtml(lead.followUpContactedByName || 'Não informado')}</dd></div>` : ''}
          ${adminView ? `<div><dt>Loja</dt><dd>${escapeHtml(storeLabel(lead.storeId))}</dd></div>` : ''}` : ''}
        </dl>
        <div class="follow-up-actions">
          <a class="button button-whatsapp" data-follow-up-whatsapp="${escapeHtml(lead.id)}" href="${escapeHtml(whatsAppUrl)}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i><span>Chamar no WhatsApp</span></a>
          <button class="button button-secondary" type="button" ${managerView ? `data-follow-up-reschedule="${escapeHtml(lead.id)}"` : `data-open-lead-id="${escapeHtml(lead.id)}"`}><i data-lucide="${rescheduleRecommended ? 'calendar-days' : 'clipboard-list'}"></i><span>${rescheduleRecommended ? 'Reagendar' : 'Ver cadastro'}</span></button>
        </div>
      </article>`;
  };
  const contactedCount = allRecords.filter(isFollowUpContacted).length;
  const captorGroups = [...allRecords.reduce((groups, lead) => {
    const key = lead.capturedByUid || lead.capturedByName || 'captor';
    if (!groups.has(key)) groups.set(key, { id: key, name: lead.capturedByName || 'Captador não informado', records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const visibleCaptorGroups = [...records.reduce((groups, lead) => {
    const key = lead.capturedByUid || lead.capturedByName || 'captor';
    if (!groups.has(key)) groups.set(key, { id: key, name: lead.capturedByName || 'Captador não informado', records: [] });
    groups.get(key).records.push(lead);
    return groups;
  }, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const captorSummary = captorGroups.map((group) => {
    const groupContacted = group.records.filter(isFollowUpContacted).length;
    return `<article class="follow-up-captor-card"><span class="avatar">${escapeHtml(profileInitials(group.name))}</span><button class="follow-up-captor-open" type="button" data-follow-up-captor="${escapeHtml(group.id)}" aria-label="Ver retornos aguardando de ${escapeHtml(group.name)}"><strong>${escapeHtml(group.name)}</strong><span>${group.records.length} retorno(s)</span></button><dl><div><dt>Aguardando</dt><dd>${group.records.length - groupContacted}</dd></div><div><dt>Iniciados</dt><dd>${groupContacted}</dd></div></dl></article>`;
  }).join('');
  const selectedCaptor = captorGroups.find((group) => group.id === state.followUps.selectedCaptorId);
  const selectedCaptorPending = selectedCaptor?.records.filter((lead) => !isFollowUpContacted(lead)) || [];
  const captorDialog = selectedCaptor ? `<dialog id="follow-up-captor-dialog" class="appointment-create-dialog follow-up-captor-dialog" aria-labelledby="follow-up-captor-title">
      <div class="appointment-create-header">
        <div><span>RETORNOS PENDENTES</span><h2 id="follow-up-captor-title">${escapeHtml(selectedCaptor.name)}</h2><p>${selectedCaptorPending.length} lead(s) aguardando contato</p></div>
        <button class="icon-button" type="button" data-follow-up-captor-close aria-label="Fechar"><i data-lucide="circle-x"></i></button>
      </div>
      <div class="follow-up-captor-dialog-content follow-up-list">
        ${selectedCaptorPending.length
          ? selectedCaptorPending.map(renderItem).join('')
          : '<div class="empty-state"><i data-lucide="circle-check"></i><strong>Nenhum contato aguardando</strong><p>Todos os retornos deste captador já tiveram o contato iniciado.</p></div>'}
      </div>
      <div class="appointment-create-actions"><button class="button button-secondary" type="button" data-follow-up-captor-close>Fechar</button></div>
    </dialog>` : '';
  const items = records.length
    ? (managerView && activeFilter === 'captors'
      ? `<section class="follow-up-captor-summary">${captorSummary}</section>`
      : managerView
      ? visibleCaptorGroups.map((group) => `<section class="follow-up-team-group">
          <header class="follow-up-team-heading"><span class="avatar">${escapeHtml(profileInitials(group.name))}</span><div><strong>${escapeHtml(group.name)}</strong><span>${group.records.length} retorno(s)</span></div></header>
          <div class="follow-up-list">${group.records.map(renderItem).join('')}</div>
        </section>`).join('')
      : records.map(renderItem).join(''))
    : `<div class="empty-state"><i data-lucide="circle-check"></i><strong>${activeFilter === 'all' ? 'Nenhum retorno pendente' : 'Nenhum retorno nesta categoria'}</strong><p>${activeFilter === 'all' ? 'Os clientes atrasados aparecerao aqui depois do tempo de alerta.' : 'Selecione outro indicador para consultar os contatos.'}</p></div>`;

  return `${state.followUps.error ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>${escapeHtml(state.followUps.error)}</span></div>` : ''}
    ${state.followUps.truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A lista atingiu o limite de 500 registros.</span></div>` : ''}
    ${managerView ? `<section class="follow-up-metrics" aria-label="Resumo dos retornos">
      <button class="metric follow-up-metric-filter ${activeFilter === 'all' ? 'is-active' : ''}" type="button" data-follow-up-filter="all" aria-pressed="${activeFilter === 'all'}"><span>Retornos</span><strong>${allRecords.length}</strong><i data-lucide="bell-ring"></i></button>
      <button class="metric metric-warning follow-up-metric-filter ${activeFilter === 'waiting' ? 'is-active' : ''}" type="button" data-follow-up-filter="waiting" aria-pressed="${activeFilter === 'waiting'}"><span>Aguardando contato</span><strong>${allRecords.length - contactedCount}</strong><i data-lucide="clock-3"></i></button>
      <button class="metric metric-success follow-up-metric-filter ${activeFilter === 'contacted' ? 'is-active' : ''}" type="button" data-follow-up-filter="contacted" aria-pressed="${activeFilter === 'contacted'}"><span>Contato iniciado</span><strong>${contactedCount}</strong><i data-lucide="message-circle"></i></button>
      <button class="metric follow-up-metric-filter ${activeFilter === 'captors' ? 'is-active' : ''}" type="button" data-follow-up-filter="captors" aria-pressed="${activeFilter === 'captors'}"><span>Captadores</span><strong>${captorGroups.length}</strong><i data-lucide="users"></i></button>
    </section>` : ''}
    <section class="${managerView ? 'follow-up-team-list' : 'follow-up-list'}">${items}</section>
    ${captorDialog}`;
}

function findManagementLead(leadId) {
  return state.management.records.find((item) => item.id === leadId)
    || state.appointments.records.find((item) => item.id === leadId)
    || (state.management.activeLead?.id === leadId ? state.management.activeLead : null);
}

function selectedLeadDetailService(lead) {
  const available = servicesForStore(state.leadDetailSchedule.services, lead?.storeId);
  return available.find((service) => service.id === state.leadDetailSchedule.serviceId)
    || available.find((service) => service.id === lead?.appointmentServiceId)
    || available[0]
    || defaultAppointmentService(lead?.storeId, lead?.appointmentDurationMinutes || state.leadDetailSchedule.settings.appointmentDurationMinutes);
}

function leadDetailAppointmentTimeField(lead) {
  const { settings, appointmentDate, appointments, appointmentLoading, error } = state.leadDetailSchedule;
  const selectedTime = appointmentDate === lead.appointmentDate ? lead.appointmentTime : '';
  if (!navigator.onLine) {
    return '<div id="edit-appointment-time-field" class="field" data-field="appointmentTime"><label for="edit-appointmentTime">Horário disponível</label><select id="edit-appointmentTime" name="appointmentTime" disabled><option>Conecte-se para consultar os horários</option></select><small class="field-error"></small></div>';
  }
  if (settings.schedulingMode === 'free') {
    return `<div id="edit-appointment-time-field" class="field" data-field="appointmentTime"><label for="edit-appointmentTime">Horário</label><input id="edit-appointmentTime" name="appointmentTime" type="time" value="${escapeHtml(selectedTime)}" /><small class="field-error"></small></div>`;
  }

  const triage = ophthalmologyTriage(lead, settings);
  const routeAllowed = triage.careRoute === 'ophthalmologist'
    ? isOphthalmologyDateAllowed(settings, appointmentDate)
    : isStoreDateAllowed(settings, appointmentDate);
  const transportAllowed = !lead.needsTransport || isTransportDateAllowed(settings, appointmentDate);
  const durationMinutes = selectedLeadDetailService(lead).durationMinutes;
  const serviceSchedule = {
    ...(triage.careRoute === 'ophthalmologist' ? ophthalmologyAppointmentSchedule(settings) : settings),
    appointmentDurationMinutes: durationMinutes
  };
  const quota = appointmentQuotaStatus(settings, appointmentDate, appointments, state.profile, lead.id);
  const available = appointmentDate && routeAllowed && transportAllowed && !appointmentLoading && !error
    ? buildAppointmentSlots(serviceSchedule, appointments, lead.id, { appointmentDate, profile: state.profile })
      .filter((slot) => slot.available && (!lead.needsTransport || isTransportAppointmentAllowed(
        settings,
        appointmentDate,
        slot.time,
        durationMinutes
      )))
    : [];
  let placeholder = appointmentDate ? 'Selecione um horário' : 'Escolha primeiro uma data';
  if (appointmentLoading) placeholder = 'Consultando horários...';
  else if (error) placeholder = 'Horários indisponíveis';
  else if (appointmentDate && !routeAllowed) placeholder = triage.careRoute === 'ophthalmologist'
    ? 'O oftalmologista não atende neste dia'
    : 'A loja não funciona neste dia';
  else if (appointmentDate && !transportAllowed) placeholder = 'Transporte indisponível neste dia';
  else if (quota.reason === 'mei-day-not-allowed') placeholder = 'MEI sem cota para este dia';
  else if (quota.reason === 'mei-quota' || quota.reason === 'daily-limit') placeholder = 'Limite de agendamentos atingido';
  else if (appointmentDate && !available.length) placeholder = 'Dia sem horários disponíveis';

  return `<div id="edit-appointment-time-field" class="field" data-field="appointmentTime"><label for="edit-appointmentTime">Horário disponível</label><select id="edit-appointmentTime" name="appointmentTime" ${available.length && !quota.blocked ? '' : 'disabled'}><option value="">${placeholder}</option>${available.map((slot) => `<option value="${slot.time}" ${slot.time === selectedTime ? 'selected' : ''}>${slot.time} - ${slot.endTime}</option>`).join('')}</select><small class="field-error"></small></div>`;
}

function leadDetailView() {
  const managementMode = state.route === 'management-lead';
  if (managementMode && !canManage()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não pode alterar leads da equipe.</span></div>`;
  }

  const leadId = currentRouteParam();
  const lead = managementMode
    ? findManagementLead(leadId)
    : state.leads.find((item) => item.id === leadId);
  const backRoute = managementMode ? 'management' : 'leads';
  if (!lead) {
    return `<section class="page-toolbar">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
    </section><div class="notice notice-warning"><i data-lucide="info"></i><span>Cadastro não encontrado. Volte para a lista e tente novamente.</span></div>`;
  }

  const [syncStatus, syncTone] = managementMode ? ['Sincronizado', 'success'] : syncLabel(lead);
  const managerReschedule = managementMode && state.profile?.role === 'manager';
  const offlineEdit = !navigator.onLine;
  const locked = managerReschedule || offlineEdit ? 'disabled' : '';
  const showAmetropiaFields = state.leadDetailSchedule.storeId === lead.storeId
    && state.leadDetailSchedule.settings.showAmetropiaFields;
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${lead.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  const selectedService = selectedLeadDetailService(lead);
  const availableServices = servicesForStore(state.leadDetailSchedule.services, lead.storeId);
  const serviceOptions = (availableServices.length ? availableServices : [selectedService])
    .map((service) => `<option value="${escapeHtml(service.id)}" ${service.id === selectedService.id ? 'selected' : ''}>${escapeHtml(service.name)} - ${service.durationMinutes} min</option>`)
    .join('');
  return `
    <section class="page-toolbar detail-toolbar">
      <button class="back-button" type="button" data-route="${backRoute}" aria-label="Voltar"><i data-lucide="arrow-left"></i></button>
      <h2>${escapeHtml(lead.fullName)}</h2>
    </section>
    <section class="lead-detail-summary" aria-label="Informações do cadastro">
      <div><span>Status</span><strong class="status-badge status-${syncTone}">${syncStatus}</strong></div>
      <div><span>Loja</span><strong>${escapeHtml(storeLabel(lead.storeId))}</strong></div>
      <div><span>Cadastrado em</span><strong>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</strong></div>
    </section>
    <form id="edit-lead-form" class="form-panel" data-lead-id="${escapeHtml(lead.id)}" data-management="${managementMode}" novalidate>
      ${offlineEdit ? '<div class="notice notice-warning"><i data-lucide="wifi-off"></i><span>O cadastro pode ser consultado offline, mas alterações e agendamento exigem internet.</span></div>' : ''}
      <input name="schedulingMode" type="hidden" value="${escapeHtml(state.leadDetailSchedule.settings.schedulingMode || lead.appointmentSchedulingMode || 'controlled')}" />
      ${triageConfigFields(state.leadDetailSchedule.settings)}
      <input name="appointmentDurationMinutes" type="hidden" value="${selectedService.durationMinutes}" />
      <input name="appointmentServiceName" type="hidden" value="${escapeHtml(selectedService.name)}" />
      <div class="field" data-field="fullName"><label for="edit-fullName">Nome <span aria-hidden="true">*</span></label><input id="edit-fullName" name="fullName" autocomplete="name" maxlength="120" value="${escapeHtml(lead.fullName)}" required ${locked} /><small class="field-error"></small></div>
      <div class="field-row contact-fields"><div class="field" data-field="phone"><label for="edit-phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label><input id="edit-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="16" value="${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}" required ${locked} /><small class="field-error"></small></div><div class="field" data-field="customerRg"><label for="edit-customerRg">RG</label><input id="edit-customerRg" name="customerRg" maxlength="20" autocomplete="off" value="${escapeHtml(lead.customerRg || '')}" placeholder="0.000.000" ${locked} /><small class="field-error"></small></div></div>
      <div class="field-row identity-fields"><div class="field" data-field="customerCpf"><label for="edit-customerCpf">CPF</label><input id="edit-customerCpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" value="${escapeHtml(formatBrazilianCpf(lead.customerCpf))}" placeholder="000.000.000-00" ${locked} /><small class="field-error"></small></div><div class="field" data-field="birthDate"><label for="edit-birthDate">Data de nascimento</label><input id="edit-birthDate" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" value="${escapeHtml(lead.birthDate)}" ${locked} /><small class="birth-age-hint" data-birth-age>${escapeHtml(birthAgeText(lead.birthDate))}</small><small class="field-error"></small></div><div class="field" data-field="sex"><label for="edit-sex">Sexo</label><select id="edit-sex" name="sex" ${locked}>${sexOptions(lead.sex)}</select><small class="field-error"></small></div></div>
      <div class="field"><label for="edit-preferredName">Como prefere ser chamado</label><input id="edit-preferredName" name="preferredName" maxlength="60" value="${escapeHtml(lead.preferredName)}" ${locked} /></div>
      <div class="field-row address-fields">
        <div class="field address-street" data-field="street"><label for="edit-street">Rua</label><input id="edit-street" name="street" maxlength="120" autocomplete="address-line1" value="${escapeHtml(lead.street)}" ${locked} /><small class="field-error"></small></div>
        <div class="field address-number" data-field="streetNumber"><label for="edit-streetNumber">Número</label><input id="edit-streetNumber" name="streetNumber" maxlength="12" autocomplete="address-line2" value="${escapeHtml(lead.streetNumber)}" placeholder="S/N" ${locked} /><small class="field-error"></small></div>
        <div class="field address-neighborhood"><label for="edit-neighborhood">Bairro</label><input id="edit-neighborhood" name="neighborhood" maxlength="80" value="${escapeHtml(lead.neighborhood)}" ${locked} /></div>
        <div class="field address-city"><label for="edit-city">Cidade</label><input id="edit-city" name="city" maxlength="80" value="${escapeHtml(lead.city)}" ${locked} /></div>
        <div class="field field-state"><label for="edit-state">UF</label><input id="edit-state" name="state" maxlength="2" value="${escapeHtml(lead.state || 'PE')}" ${locked} /></div>
      </div>
      <div class="field-row interest-service-fields">
        <div class="field"><label for="edit-interestId">Interesse principal</label><select id="edit-interestId" name="interestId" ${locked}>${interests}</select></div>
        <div class="field" data-field="appointmentServiceId"><label for="edit-appointmentServiceId">Serviço do agendamento</label><select id="edit-appointmentServiceId" name="appointmentServiceId" ${locked}><option value="">Selecione o serviço</option>${serviceOptions}</select><small class="field-error"></small></div>
      </div>
      ${showAmetropiaFields ? `<fieldset class="field ametropia-field" ${locked}>
        <legend>Ametropias</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${ametropiaOptions(lead.ametropiaIds || [])}</div>
      </fieldset>` : ''}
      <fieldset class="field ametropia-field" ${locked}>
        <legend>Patologias e condições de saúde</legend>
        <small>Marque todas que se aplicam.</small>
        <div class="ametropia-options">${pathologyOptions(lead.pathologyIds || [])}</div>
      </fieldset>
      ${eyeTriageFields(lead, state.leadDetailSchedule.settings, 'edit-lead-eye')}
      ${transportFields(lead, state.leadDetailSchedule.settings, 'edit-lead-transport', Boolean(locked))}
      <div class="field-row appointment-fields">
        <div class="field" data-field="appointmentDate"><label for="edit-appointmentDate">Data do pré-agendamento</label><input id="edit-appointmentDate" name="appointmentDate" type="date" min="${toLocalDateInput(new Date())}" value="${escapeHtml(state.leadDetailSchedule.appointmentDate || lead.appointmentDate)}" ${locked} /><small class="schedule-date-status">${offlineEdit ? 'Conecte-se para escolher uma data.' : ''}</small><small class="field-error"></small></div>
        ${leadDetailAppointmentTimeField(lead)}
      </div>
      <div class="field" data-field="notes"><label for="edit-notes">Observação rápida</label><textarea id="edit-notes" name="notes" maxlength="500" rows="3" ${locked}>${escapeHtml(lead.notes)}</textarea><small class="field-hint"><span id="edit-notes-count">${String(lead.notes || '').length}</span>/500</small><small class="field-error"></small></div>
      <button class="button button-primary button-block" type="submit" ${offlineEdit ? 'disabled' : ''}><i data-lucide="save"></i><span>${managerReschedule ? 'Salvar reagendamento' : 'Salvar alterações'}</span></button>
      ${hasAccess('leads.delete') ? `<button class="button button-danger button-block" type="button" data-delete-lead="${escapeHtml(lead.id)}"><i data-lucide="trash-2"></i><span>Excluir lead</span></button>` : ''}
      <p class="form-footnote"><i data-lucide="shield-check"></i> Autor, loja e data original permanecem preservados.</p>
    </form>
    ${hasAccess('leads.delete') ? `<dialog id="delete-lead-dialog" class="confirmation-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
      <div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div>
      <div class="confirmation-dialog-copy">
        <h2 id="delete-dialog-title">Excluir este lead?</h2>
        <p id="delete-dialog-description">O cadastro de <strong>${escapeHtml(lead.fullName)}</strong> será excluído definitivamente. Essa ação não pode ser desfeita.</p>
      </div>
      <div class="confirmation-dialog-actions">
        <button class="button button-secondary" type="button" data-close-delete-dialog>Cancelar</button>
        <button class="button button-danger-solid" type="button" data-confirm-delete="${escapeHtml(lead.id)}"><i data-lucide="trash-2"></i><span>Excluir definitivamente</span></button>
      </div>
    </dialog>` : ''}`;
}

function managementView() {
  if (!canManage()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso aos dados gerenciais.</span></div>`;
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
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${filters.storeId === store.id ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
  const captorOptions = captors.map(([uid, name]) => `<option value="${escapeHtml(uid)}" ${filters.capturedByUid === uid ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');

  const tableRows = pageRecords.map((lead) => `<tr>
    <td>${isAdmin() ? `<button class="management-lead-link" type="button" data-management-lead-id="${escapeHtml(lead.id)}"><strong>${escapeHtml(lead.fullName)}</strong><small>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</small></button>` : `<strong>${escapeHtml(lead.fullName)}</strong><small>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</small>`}</td>
    <td>${escapeHtml(lead.capturedByName || 'Não informado')}</td>
    <td>${escapeHtml(storeLabel(lead.storeId))}</td>
    <td>${escapeHtml(lead.interestLabel || 'Não informado')}</td>
    <td>${escapeHtml(formatCapturedAt(lead.capturedAtClient))}</td>
  </tr>`).join('');

  const mobileRows = pageRecords.map((lead) => `<article class="management-card">
    <div>${isAdmin() ? `<button class="management-lead-link" type="button" data-management-lead-id="${escapeHtml(lead.id)}"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span></button>` : `<strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span>`}</div>
    <dl>
      <div><dt>Captador</dt><dd>${escapeHtml(lead.capturedByName || 'Não informado')}</dd></div>
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
    : `<div class="empty-state management-empty"><i data-lucide="bar-chart-3"></i><strong>${loaded ? 'Nenhum cadastro no período' : 'Consulte as captações'}</strong><p>${loaded ? 'Ajuste os filtros para ampliar a busca.' : 'Escolha o período e carregue os resultados.'}</p></div>`;

  return `
    <section class="management-heading management-dashboard-heading management-toolbar">
      <div class="management-heading-actions">
        ${hasAccess('appointments.view') ? '<button class="button button-secondary" type="button" data-route="appointments"><i data-lucide="calendar-days"></i><span>Agenda de exames</span></button>' : ''}
        ${hasAccess('followups.team') ? '<button class="button button-secondary" type="button" data-route="follow-ups"><i data-lucide="bell-ring"></i><span>Retornos da equipe</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="settings"><i data-lucide="settings"></i><span>Configurações</span></button>' : ''}
        ${isAdmin() ? '<button class="button button-secondary" type="button" data-route="access"><i data-lucide="user-round-cog"></i><span>Gerenciar acessos</span></button>' : ''}
        ${hasAccess('dashboard.view') ? '<button class="button button-secondary" type="button" data-route="dashboard"><i data-lucide="bar-chart-3"></i><span>Dashboard</span></button>' : ''}
        ${hasAccess('reports.view') ? '<button class="button button-secondary" type="button" data-route="reports"><i data-lucide="clipboard-list"></i><span>Relatórios</span></button>' : ''}
        ${hasAccess('leads.export') ? `<button class="button button-secondary" type="button" data-action="export-management" ${filtered.length === 0 ? 'disabled' : ''}><i data-lucide="file-down"></i><span>Exportar CSV</span></button>` : ''}
      </div>
    </section>
    <form id="management-filters" class="management-filters">
      <div class="filter-title"><i data-lucide="filter"></i><div><strong>Filtros</strong><span>Período máximo recomendado: 90 dias.</span></div></div>
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
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A consulta atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o período para obter a lista completa.</span></div>` : ''}
    <section class="management-metrics" aria-label="Resumo do período">
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

function reportAppointmentDistribution(records) {
  const appointments = records.filter((lead) => lead.appointmentDate && lead.appointmentTime);
  const weekdays = [
    { index: 1, label: 'Segunda' },
    { index: 2, label: 'Terca' },
    { index: 3, label: 'Quarta' },
    { index: 4, label: 'Quinta' },
    { index: 5, label: 'Sexta' },
    { index: 6, label: 'Sabado' },
    { index: 0, label: 'Domingo' }
  ].map((day) => ({
    label: day.label,
    count: appointments.filter((lead) => new Date(`${lead.appointmentDate}T12:00:00`).getDay() === day.index).length
  }));
  const periods = [
    { label: 'Madrugada', start: 0, end: 6 },
    { label: 'Manhã', start: 6, end: 12 },
    { label: 'Tarde', start: 12, end: 18 },
    { label: 'Noite', start: 18, end: 24 }
  ].map((period) => ({
    label: period.label,
    count: appointments.filter((lead) => {
      const hour = Number(String(lead.appointmentTime).slice(0, 2));
      return Number.isFinite(hour) && hour >= period.start && hour < period.end;
    }).length
  }));
  const highestCount = Math.max(0, ...periods.map((period) => period.count));
  const leaders = periods.filter((period) => period.count === highestCount && highestCount > 0);

  return {
    appointments,
    weekdays,
    periods,
    predominantPeriod: leaders.length === 1 ? leaders[0].label : ''
  };
}

function reportDistributionPanel(title, description, icon, items, total, highlightLabel = '') {
  const highestCount = Math.max(1, ...items.map((item) => item.count));
  const rows = items.map((item) => {
    const percentage = total ? Math.round((item.count / total) * 100) : 0;
    const width = item.count ? Math.max(5, Math.round((item.count / highestCount) * 100)) : 0;
    const highlighted = item.label === highlightLabel;
    return `<div class="report-distribution-row ${highlighted ? 'is-predominant' : ''}">
      <div><strong>${escapeHtml(item.label)}</strong><span>${item.count} agendamento(s)</span></div>
      <div class="report-distribution-bar"><i style="width:${width}%"></i></div>
      <strong>${percentage}%</strong>
    </div>`;
  }).join('');

  return `<article class="report-analysis-panel">
    <header><i data-lucide="${icon}"></i><div><h2>${title}</h2><span>${description}</span></div></header>
    <div class="report-distribution-list">${rows}</div>
  </article>`;
}

function reportsView() {
  if (!hasAccess('reports.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso aos relatórios.</span></div>`;
  }
  const records = filteredReportRecords();
  const scheduled = records.filter((lead) => lead.appointmentDate && lead.appointmentTime).length;
  const attended = records.filter((lead) => lead.appointmentAttendance === 'attended').length;
  const missed = records.filter((lead) => lead.appointmentAttendance === 'missed').length;
  const decided = attended + missed;
  const attendanceRate = decided ? Math.round((attended / decided) * 100) : 0;
  const storeRows = reportGroupRows(records, (lead) => lead.storeId, (lead) => storeLabel(lead.storeId));
  const captorRows = reportGroupRows(records, (lead) => lead.capturedByUid || lead.capturedByName, (lead) => lead.capturedByName || 'Não informado');
  const appointmentDistribution = reportAppointmentDistribution(records);
  const periodSummary = appointmentDistribution.predominantPeriod
    ? `Predominio: ${appointmentDistribution.predominantPeriod}`
    : (scheduled ? 'Sem predominio no período' : 'Nenhum agendamento no período');
  const appointmentAnalysis = `${reportDistributionPanel('Agendamentos por dia da semana', `${scheduled} agendamento(s) distribuídos por dia`, 'calendar-days', appointmentDistribution.weekdays, scheduled)}
    ${reportDistributionPanel('Agendamentos por horário', periodSummary, 'clock-3', appointmentDistribution.periods, scheduled, appointmentDistribution.predominantPeriod)}`;
  const { filters, loading, error, truncated } = state.management;
  const table = (title, icon, rows) => `<section class="report-panel"><div class="report-panel-heading"><i data-lucide="${icon}"></i><div><h2>${title}</h2><span>${records.length} cadastro(s) no período</span></div></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Nome</th><th>Cadastros</th><th>Agendados</th><th>Compareceram</th><th>Faltaram</th><th>Taxa</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;

  return `<section class="reports-toolbar"><button class="button button-secondary" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestão</span></button><button class="button button-secondary" type="button" data-action="reload-reports" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${loading ? 'Atualizando...' : 'Atualizar'}</span></button></section>
    <form id="reports-period" class="dashboard-period-filter">
      <div class="dashboard-period-title"><i data-lucide="calendar-days"></i><div><span>Período analisado</span><strong>Defina o intervalo do relatório</strong></div></div>
      <div class="field"><label for="reports-start">Data inicial</label><input id="reports-start" name="startDate" type="date" value="${escapeHtml(filters.startDate)}" required /></div>
      <div class="field"><label for="reports-end">Data final</label><input id="reports-end" name="endDate" type="date" value="${escapeHtml(filters.endDate)}" required /></div>
      <button class="button button-primary" type="submit" ${loading ? 'disabled' : ''}><i data-lucide="search"></i><span>${loading ? 'Aplicando...' : 'Aplicar período'}</span></button>
    </form>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O relatório atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o período para obter o resultado completo.</span></div>` : ''}
    <section class="report-metrics" aria-label="Indicadores do período"><div><span>Cadastros</span><strong>${records.length}</strong><i data-lucide="clipboard-list"></i></div><div><span>Agendamentos</span><strong>${scheduled}</strong><i data-lucide="calendar-days"></i></div><div><span>Comparecimentos</span><strong>${attended}</strong><i data-lucide="circle-check"></i></div><div><span>Taxa de comparecimento</span><strong>${attendanceRate}%</strong><i data-lucide="bar-chart-3"></i></div></section>
    ${records.length ? `<section class="report-analysis-grid">${appointmentAnalysis}</section><section class="reports-grid">${table('Resultados por unidade', 'building-2', storeRows)}${table('Resultados por captador', 'users', captorRows)}</section>` : `<div class="empty-state report-empty"><i data-lucide="bar-chart-3"></i><strong>Nenhum dado no período</strong><p>Ajuste o período analisado para ampliar a busca.</p></div>`}`;
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
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso ao dashboard.</span></div>`;
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

  const captors = dashboardGroupStats(records, (lead) => lead.capturedByUid || lead.capturedByName, (lead) => lead.capturedByName || 'Não informado')
    .sort((a, b) => b.total - a.total || b.attendanceRate - a.attendanceRate || a.label.localeCompare(b.label, 'pt-BR'));
  const captorRows = captors.map((captor, index) => `<div class="dashboard-ranking-row"><span>${index + 1}</span><div><strong>${escapeHtml(captor.label)}</strong><small>${captor.scheduled} agendado(s) · ${captor.attended} comparecimento(s)</small></div><strong>${captor.total}</strong></div>`).join('');

  const attendanceItems = [
    ['Compareceram', attended, 'success'],
    ['Não compareceram', missed, 'danger'],
    ['Aguardando definição', pending, 'neutral']
  ].map(([label, count, tone]) => {
    const percentage = scheduled ? Math.round((count / scheduled) * 100) : 0;
    return `<div class="dashboard-status-row"><div><span class="dashboard-status-dot is-${tone}"></span><strong>${label}</strong><span>${count}</span></div><div class="dashboard-progress is-${tone}"><i style="width:${percentage}%"></i></div><small>${percentage}% dos agendamentos</small></div>`;
  }).join('');

  return `<section class="dashboard-toolbar"><button class="button button-secondary" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestão</span></button><div>${isLocalSavwinEnabled ? `<button class="button button-secondary" type="button" data-action="consult-savwin" ${state.savwin.loading ? 'disabled' : ''}><i data-lucide="cloud-check"></i><span>${state.savwin.loading ? 'Consultando...' : 'Consultar SavWin'}</span></button>` : ''}${hasAccess('reports.view') ? '<button class="button button-secondary" type="button" data-route="reports"><i data-lucide="clipboard-list"></i><span>Ver relatórios</span></button>' : ''}<button class="button button-secondary" type="button" data-action="reload-reports" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>${loading ? 'Atualizando...' : 'Atualizar'}</span></button></div></section>
    <form id="dashboard-period" class="dashboard-period-filter">
      <div class="dashboard-period-title"><i data-lucide="calendar-days"></i><div><span>Período analisado</span><strong>Defina o intervalo do dashboard</strong></div></div>
      <div class="field"><label for="dashboard-start">Data inicial</label><input id="dashboard-start" name="startDate" type="date" value="${escapeHtml(filters.startDate)}" required /></div>
      <div class="field"><label for="dashboard-end">Data final</label><input id="dashboard-end" name="endDate" type="date" value="${escapeHtml(filters.endDate)}" required /></div>
      <button class="button button-primary" type="submit" ${loading ? 'disabled' : ''}><i data-lucide="search"></i><span>${loading ? 'Aplicando...' : 'Aplicar período'}</span></button>
    </form>
    ${state.savwin.error ? `<div class="notice notice-danger" role="alert"><i data-lucide="circle-alert"></i><div><strong>Consulta SavWin</strong><span>${escapeHtml(state.savwin.error)}</span></div></div>` : ''}
    ${state.savwin.result ? `<div class="notice notice-success" role="status"><i data-lucide="cloud-check"></i><div><strong>SavWin conectado localmente</strong><span>${state.savwin.result.count} item(ns) encontrados em ${state.savwin.result.osCount} OS no período.</span></div></div>` : ''}
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O dashboard atingiu o limite de ${MANAGEMENT_QUERY_LIMIT} registros. Reduza o período para obter o resultado completo.</span></div>` : ''}
    <section class="dashboard-metrics" aria-label="Indicadores do dashboard"><div><span>Cadastros</span><strong>${records.length}</strong><small>no período</small><i data-lucide="clipboard-list"></i></div><div><span>Agendamentos</span><strong>${scheduled}</strong><small>${appointmentRate}% dos cadastros</small><i data-lucide="calendar-days"></i></div><div><span>Comparecimentos</span><strong>${attended}</strong><small>${attendanceRate}% de presença</small><i data-lucide="circle-check"></i></div><div><span>Captadores ativos</span><strong>${captors.length}</strong><small>${stores.length} unidade(s)</small><i data-lucide="users"></i></div></section>
    ${records.length ? `<section class="dashboard-grid"><article class="dashboard-panel dashboard-trend-panel"><header><div><span>Evolução</span><h2>Cadastros por dia</h2></div><strong>Últimos ${dailyData.length} dia(s) com registros</strong></header><div class="dashboard-chart" aria-label="Gráfico de cadastros por dia">${dailyBars}</div></article><article class="dashboard-panel"><header><div><span>Agenda</span><h2>Situação dos agendamentos</h2></div><strong>${scheduled} total</strong></header><div class="dashboard-status-list">${attendanceItems}</div></article><article class="dashboard-panel"><header><div><span>Unidades</span><h2>Desempenho por loja</h2></div><strong>${stores.length} analisada(s)</strong></header><div class="dashboard-performance-list">${storeRows}</div></article><article class="dashboard-panel"><header><div><span>Equipe</span><h2>Ranking de captadores</h2></div><strong>Por cadastros</strong></header><div class="dashboard-ranking-list">${captorRows}</div></article></section>` : `<div class="empty-state dashboard-empty"><i data-lucide="bar-chart-3"></i><strong>Nenhum dado para exibir</strong><p>Volte para a gestão e ajuste os filtros do período.</p></div>`}`;
}

function appointmentsView() {
  if (!hasAccess('appointments.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso a agenda gerencial.</span></div>`;
  }

  const { loading, error, truncated, month, storeId, selectedDate, updatingId } = state.appointments;
  const backRoute = canManage() ? 'management' : 'home';
  const records = state.demoMode
    ? state.leads.filter((lead) => String(lead.appointmentDate || '').startsWith(`${month}-`))
    : state.appointments.records;
  const groups = appointmentsByDate(records);
  const days = calendarDays(month);
  const selected = groups[selectedDate] || [];
  const transportCustomers = selected.filter((lead) => lead.needsTransport);
  const transportSeats = transportCustomers.reduce((total, lead) => total + (Number(lead.transportSeats) || (lead.hasCompanion ? 2 : 1)), 0);
  const selectedDateCanBeScheduled = selectedDate >= toLocalDateInput(new Date());
  const allowedStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${storeId === store.id ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
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
        <div class="appointment-person"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(lead.appointmentServiceName || 'Exame de vista')} · ${Number(lead.appointmentDurationMinutes) || 20} min</small><small>${escapeHtml(storeLabel(lead.storeId))} · ${escapeHtml(lead.capturedByName || 'Captador não informado')}</small></div>
        ${lead.needsTransport ? `<div class="appointment-transport"><i data-lucide="bus-front"></i><span>${lead.hasCompanion ? '<strong>Transporte + acompanhante</strong>' : '<strong>Transporte individual</strong>'}</span></div>` : ''}
        ${hasAccess('appointments.attendance') ? `<div class="appointment-attendance" role="group" aria-label="Comparecimento de ${escapeHtml(lead.fullName)}">
          <button class="attendance-button is-attended ${attendance === 'attended' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="attended" aria-pressed="${attendance === 'attended'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-check"></i><span>Compareceu</span></button>
          <button class="attendance-button is-missed ${attendance === 'missed' ? 'is-active' : ''}" type="button" data-attendance-lead="${escapeHtml(lead.id)}" data-attendance-status="missed" aria-pressed="${attendance === 'missed'}" ${updating ? 'disabled' : ''}><i data-lucide="circle-x"></i><span>Não compareceu</span></button>
        </div>` : ''}
        ${isAdmin() ? `<button class="icon-button appointment-open" type="button" data-appointment-lead-id="${escapeHtml(lead.id)}" title="Abrir cadastro" aria-label="Abrir cadastro de ${escapeHtml(lead.fullName)}"><i data-lucide="chevron-right"></i></button>` : ''}
      </article>`;
    }).join('')
    : `<div class="agenda-empty"><i data-lucide="calendar-days"></i><strong>Nenhum exame neste dia</strong><p>Selecione uma data destacada no calendário.</p></div>`;

  const storeTotals = allowedStores
    .map((store) => ({ ...store, count: records.filter((lead) => lead.storeId === store.id).length }))
    .filter((store) => !storeId || store.id === storeId)
    .map((store) => `<div class="agenda-store-row"><span><i data-lucide="building-2"></i>${store.label}</span><strong>${store.count} exame(s)</strong></div>`)
    .join('');
  const createDialog = appointmentCreateDialog(allowedStores);

  return `<section class="management-heading page-actions-only agenda-heading">
      <button class="button button-secondary" type="button" data-route="${backRoute}"><i data-lucide="arrow-left"></i><span>${backRoute === 'management' ? 'Voltar para gestão' : 'Voltar ao início'}</span></button>
      ${hasAccess('leads.create') ? `<button class="button button-primary" type="button" data-create-appointment ${selectedDateCanBeScheduled ? '' : 'disabled title="Não é possível agendar em uma data passada"'}><i data-lucide="user-plus"></i><span>Novo agendamento</span></button>` : ''}
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A agenda atingiu o limite de ${APPOINTMENTS_QUERY_LIMIT} exames neste mes.</span></div>` : ''}
    <section class="agenda-layout" aria-busy="${loading}">
      <div class="calendar-panel">
        <div class="calendar-toolbar">
          <div class="calendar-navigation">
            <button class="icon-button" type="button" data-appointment-month="-1" aria-label="Mes anterior"><i data-lucide="chevron-left"></i></button>
            <h2>${escapeHtml(formatMonthLabel(month))}</h2>
            <button class="icon-button" type="button" data-appointment-month="1" aria-label="Próximo mes"><i data-lucide="chevron-right"></i></button>
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
            ${transportCustomers.length ? `<div class="transport-day-summary"><i data-lucide="bus-front"></i><span><strong>${transportCustomers.length}</strong> ${transportCustomers.length === 1 ? 'cliente' : 'clientes'} · <strong>${transportSeats}</strong> ${transportSeats === 1 ? 'assento' : 'assentos'}</span></div>` : ''}
          </div>
          <div class="appointment-list">${selectedItems}</div>
        </section>
      </aside>
    </section>${hasAccess('leads.create') ? createDialog : ''}`;
}

function confirmationsView() {
  if (!hasAccess('appointments.view')) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso às confirmações da agenda.</span></div>`;
  }

  const today = toLocalDateInput(new Date());
  const endDate = addDaysToDateInput(today, 6);
  const source = state.demoMode ? state.leads : state.confirmations.records;
  const allRecords = source.filter((lead) => lead.appointmentDate >= today
    && lead.appointmentDate <= endDate
    && lead.appointmentTime
    && !['attended', 'missed'].includes(lead.appointmentAttendance))
    .sort((a, b) => String(a.appointmentDate).localeCompare(String(b.appointmentDate))
      || String(a.appointmentTime).localeCompare(String(b.appointmentTime))
      || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR'));
  const activeFilter = state.confirmations.filter || 'pending';
  const doneCount = allRecords.filter(isAppointmentReminderDone).length;
  const records = activeFilter === 'done'
    ? allRecords.filter(isAppointmentReminderDone)
    : activeFilter === 'all'
      ? allRecords
      : allRecords.filter((lead) => !isAppointmentReminderDone(lead));
  const groups = records.reduce((result, lead) => {
    if (!result.has(lead.appointmentDate)) result.set(lead.appointmentDate, []);
    result.get(lead.appointmentDate).push(lead);
    return result;
  }, new Map());
  const content = records.length
    ? [...groups.entries()].map(([date, leads]) => `<section class="reminder-day-group">
        <header class="reminder-day-heading"><div><i data-lucide="calendar-days"></i><h2>${escapeHtml(formatAppointmentDate(date))}</h2></div><span>${leads.length} ${leads.length === 1 ? 'agendamento' : 'agendamentos'}</span></header>
        <div class="reminder-list">${leads.map((lead) => {
          const professional = lead.careRoute === 'ophthalmologist' ? 'Oftalmologista' : 'Optometrista';
          const whatsAppUrl = buildWhatsAppAppointmentReminderUrl(lead, state.profile.displayName, storeDisplayLabel(lead.storeId));
          const done = isAppointmentReminderDone(lead);
          const updating = state.confirmations.updatingId === lead.id;
          return `<article class="reminder-item">
            <div class="reminder-time"><i data-lucide="clock-3"></i><strong>${escapeHtml(lead.appointmentTime)}</strong></div>
            <div class="reminder-person"><div class="reminder-person-heading"><strong>${escapeHtml(lead.fullName)}</strong><span class="status-badge ${done ? 'status-success' : 'status-warning'}">${done ? 'Feito' : 'Pendente'}</span></div><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch || lead.phone))}</span><small>${professional} · ${escapeHtml(storeDisplayLabel(lead.storeId))}</small>${done ? `<small class="reminder-completion">Marcado por ${escapeHtml(lead.appointmentReminderSentByName || 'Não informado')} em ${escapeHtml(formatDateTimeValue(lead.appointmentReminderSentAt))}</small>` : ''}</div>
            <div class="reminder-actions">
              <a class="button button-whatsapp reminder-whatsapp" href="${escapeHtml(whatsAppUrl)}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i><span>Abrir WhatsApp</span></a>
              ${done
                ? `<button class="button button-secondary reminder-done" type="button" data-confirmation-undo="${escapeHtml(lead.id)}" ${updating ? 'disabled' : ''}><i data-lucide="rotate-ccw"></i><span>${updating ? 'Salvando...' : 'Desfazer'}</span></button>`
                : `<button class="button button-primary reminder-done" type="button" data-confirmation-done="${escapeHtml(lead.id)}" ${updating ? 'disabled' : ''}><i data-lucide="circle-check"></i><span>${updating ? 'Salvando...' : 'Marcar como feito'}</span></button>`}
            </div>
          </article>`;
        }).join('')}</div>
      </section>`).join('')
    : `<div class="empty-state"><i data-lucide="${activeFilter === 'done' ? 'circle-check' : 'message-circle'}"></i><strong>${activeFilter === 'done' ? 'Nenhum lembrete feito' : activeFilter === 'all' ? 'Nenhuma confirmação no período' : 'Nenhuma confirmação pendente'}</strong><p>${activeFilter === 'done' ? 'Os lembretes marcados como feitos aparecerão aqui.' : activeFilter === 'all' ? 'Não há atendimentos nos próximos sete dias.' : 'Todos os lembretes deste período foram concluídos.'}</p></div>`;

  return `<section class="management-heading page-actions-only reminder-toolbar">
      <div class="reminder-period"><span>Próximos 7 dias</span><strong>${allRecords.length} ${allRecords.length === 1 ? 'cliente' : 'clientes'}</strong></div>
      <button class="button button-secondary" type="button" data-route="home"><i data-lucide="arrow-left"></i><span>Voltar ao início</span></button>
    </section>
    ${state.confirmations.error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.confirmations.error)}</span></div>` : ''}
    ${state.confirmations.truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>A lista atingiu o limite de ${APPOINTMENTS_QUERY_LIMIT} agendamentos.</span></div>` : ''}
    <section class="confirmation-metrics" aria-label="Resumo das confirmações">
      <button class="metric follow-up-metric-filter ${activeFilter === 'all' ? 'is-active' : ''}" type="button" data-confirmation-filter="all" aria-pressed="${activeFilter === 'all'}"><span>Todos</span><strong>${allRecords.length}</strong><i data-lucide="calendar-days"></i></button>
      <button class="metric metric-warning follow-up-metric-filter ${activeFilter === 'pending' ? 'is-active' : ''}" type="button" data-confirmation-filter="pending" aria-pressed="${activeFilter === 'pending'}"><span>Pendentes</span><strong>${allRecords.length - doneCount}</strong><i data-lucide="clock-3"></i></button>
      <button class="metric metric-success follow-up-metric-filter ${activeFilter === 'done' ? 'is-active' : ''}" type="button" data-confirmation-filter="done" aria-pressed="${activeFilter === 'done'}"><span>Feitos</span><strong>${doneCount}</strong><i data-lucide="circle-check"></i></button>
    </section>
    <section class="reminder-content" aria-busy="${state.confirmations.loading}">
      ${state.confirmations.loading ? '<div class="calendar-loading"><i data-lucide="refresh-cw"></i><span>Carregando confirmações...</span></div>' : content}
    </section>`;
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
  const triage = ophthalmologyTriage(state.appointmentCreate.draft || {}, schedule);
  const needsTransport = state.appointmentCreate.draft?.needsTransport === true || state.appointmentCreate.draft?.needsTransport === 'true';
  const ophthalmologyDateBlocked = triage.careRoute === 'ophthalmologist'
    && !isOphthalmologyDateAllowed(schedule, state.appointments.selectedDate);
  const storeDateBlocked = triage.careRoute !== 'ophthalmologist'
    && !isStoreDateAllowed(schedule, state.appointments.selectedDate);
  const transportDateBlocked = needsTransport && !isTransportDateAllowed(schedule, state.appointments.selectedDate);
  if (state.appointmentCreate.loading) {
    return '<div id="appointment-create-time-field" class="field"><label>Horário</label><div class="readonly-field">Carregando horários...</div></div>';
  }
  if (ophthalmologyDateBlocked) {
    return '<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label>Horário disponível</label><select name="appointmentTime" disabled><option>O oftalmologista não atende neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha outro dia na agenda.</small></div>';
  }
  if (storeDateBlocked) {
    return '<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label>Horário disponível</label><select name="appointmentTime" disabled><option>A loja não funciona neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha outro dia na agenda.</small></div>';
  }
  if (transportDateBlocked) {
    return '<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label>Horário disponível</label><select name="appointmentTime" disabled><option>Transporte indisponível neste dia</option></select><small class="field-error"></small><small class="schedule-availability">Escolha outro dia na agenda.</small></div>';
  }
  if (schedule.schedulingMode === 'free') {
    return '<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label for="agenda-lead-time">Horário</label><input id="agenda-lead-time" name="appointmentTime" type="time" required /><small class="field-error"></small></div>';
  }
  const records = (state.demoMode ? state.leads : state.appointments.records)
    .filter((lead) => lead.storeId === state.appointmentCreate.storeId
      && lead.appointmentDate === state.appointments.selectedDate);
  const available = buildAppointmentSlots(
    { ...(triage.careRoute === 'ophthalmologist' ? ophthalmologyAppointmentSchedule(schedule) : schedule), appointmentDurationMinutes: service.durationMinutes },
    records,
    '',
    { appointmentDate: state.appointments.selectedDate, profile: state.profile }
  )
    .filter((slot) => slot.available && (!needsTransport || isTransportAppointmentAllowed(
      schedule,
      state.appointments.selectedDate,
      slot.time,
      service.durationMinutes
    )));
  return `<div id="appointment-create-time-field" class="field" data-field="appointmentTime"><label for="agenda-lead-time">Horário disponível</label><select id="agenda-lead-time" name="appointmentTime" required ${available.length ? '' : 'disabled'}><option value="">${available.length ? 'Selecione um horário' : triage.careRoute === 'ophthalmologist' ? 'Sem horários do oftalmologista neste dia' : 'Dia sem horários disponíveis'}</option>${available.map((slot) => `<option value="${slot.time}">${slot.time} - ${slot.endTime}</option>`).join('')}</select><small class="field-error"></small></div>`;
}

function appointmentCreateDialog(allowedStores) {
  const { loading, saving, error, storeId } = state.appointmentCreate;
  const draft = state.appointmentCreate.draft || {};
  const schedule = appointmentCreateSchedule();
  const selectedService = appointmentCreateService();
  const interests = INTERESTS.map((item) => `<option value="${item.id}" ${draft.interestId === item.id ? 'selected' : ''}>${item.label}</option>`).join('');
  const storeOptions = allowedStores.map((store) => `<option value="${store.id}" ${store.id === storeId ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
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
      ${triageConfigFields(schedule)}
      <input name="appointmentServiceName" type="hidden" value="${escapeHtml(selectedService.name)}" />
      <input name="appointmentDurationMinutes" type="hidden" value="${selectedService.durationMinutes}" />
      <div class="appointment-create-grid">
        <div class="field" data-field="fullName"><label for="agenda-lead-name">Nome <span aria-hidden="true">*</span></label><input id="agenda-lead-name" name="fullName" maxlength="120" autocomplete="name" placeholder="Nome do cliente" value="${escapeHtml(draft.fullName || '')}" required /><small class="field-error"></small></div>
        <div class="field-row contact-fields"><div class="field" data-field="phone"><label for="agenda-lead-phone">Telefone ou WhatsApp <span aria-hidden="true">*</span></label><input id="agenda-lead-phone" name="phone" type="tel" inputmode="numeric" maxlength="16" autocomplete="tel" placeholder="(00) 00000-0000" value="${escapeHtml(draft.phone || '')}" required /><small class="field-error"></small></div><div class="field" data-field="customerRg"><label for="agenda-lead-rg">RG</label><input id="agenda-lead-rg" name="customerRg" maxlength="20" autocomplete="off" placeholder="0.000.000" value="${escapeHtml(draft.customerRg || '')}" /><small class="field-error"></small></div></div>
        <div class="field-row identity-fields">
          <div class="field" data-field="customerCpf"><label for="agenda-lead-cpf">CPF</label><input id="agenda-lead-cpf" name="customerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" value="${escapeHtml(draft.customerCpf || '')}" /><small class="field-error"></small></div>
          <div class="field" data-field="birthDate"><label for="agenda-lead-birth-date">Data de nascimento <span aria-hidden="true">*</span></label><input id="agenda-lead-birth-date" name="birthDate" type="date" autocomplete="bday" max="${toLocalDateInput(new Date())}" value="${escapeHtml(draft.birthDate || '')}" required /><small class="birth-age-hint" data-birth-age>${birthAgeText(draft.birthDate || '')}</small><small class="field-error"></small></div>
          <div class="field" data-field="sex"><label for="agenda-lead-sex">Sexo</label><select id="agenda-lead-sex" name="sex">${sexOptions(draft.sex || '')}</select><small class="field-error"></small></div>
        </div>
        <div class="field"><label for="agenda-lead-preferred-name">Como prefere ser chamado</label><input id="agenda-lead-preferred-name" name="preferredName" maxlength="60" placeholder="Apelido ou nome preferido" value="${escapeHtml(draft.preferredName || '')}" /></div>
        <div class="field-row address-fields"><div class="field address-street" data-field="street"><label for="agenda-lead-street">Rua</label><input id="agenda-lead-street" name="street" maxlength="120" autocomplete="address-line1" value="${escapeHtml(draft.street || '')}" /><small class="field-error"></small></div><div class="field address-number" data-field="streetNumber"><label for="agenda-lead-street-number">Número</label><input id="agenda-lead-street-number" name="streetNumber" maxlength="12" autocomplete="address-line2" placeholder="S/N" value="${escapeHtml(draft.streetNumber || '')}" /><small class="field-error"></small></div><div class="field address-neighborhood"><label for="agenda-lead-neighborhood">Bairro</label><input id="agenda-lead-neighborhood" name="neighborhood" maxlength="80" value="${escapeHtml(draft.neighborhood || '')}" /></div><div class="field address-city"><label for="agenda-lead-city">Cidade</label><input id="agenda-lead-city" name="city" maxlength="80" value="${escapeHtml(draft.city || '')}" /></div><div class="field field-state"><label for="agenda-lead-state">UF</label><input id="agenda-lead-state" name="state" maxlength="2" value="${escapeHtml(draft.state || 'PE')}" /></div></div>
        <div class="field" data-field="storeId"><label for="agenda-lead-store">Loja</label><select id="agenda-lead-store" name="storeId" ${loading ? 'disabled' : ''}>${storeOptions}</select><small class="field-error"></small></div>
        <div class="field-row interest-service-fields">
          <div class="field"><label for="agenda-lead-interest">Interesse principal</label><select id="agenda-lead-interest" name="interestId">${interests}</select></div>
          <div class="field" data-field="appointmentServiceId"><label for="agenda-lead-service">Serviço do agendamento</label><select id="agenda-lead-service" name="appointmentServiceId" ${loading ? 'disabled' : ''}>${serviceOptions}</select><small class="field-error"></small></div>
        </div>
        ${schedule.showAmetropiaFields ? `<fieldset class="field ametropia-field"><legend>Ametropias</legend><small>Marque todas que se aplicam.</small><div class="ametropia-options">${ametropiaOptions(draft.ametropiaIds || [])}</div></fieldset>` : ''}
        <fieldset class="field ametropia-field"><legend>Patologias e condições de saúde</legend><small>Marque todas que se aplicam.</small><div class="ametropia-options">${pathologyOptions(draft.pathologyIds || [])}</div></fieldset>
        ${eyeTriageFields(draft, schedule, 'agenda-lead-eye')}
        ${schedule.transportEnabled
          ? transportFields({ ...draft, appointmentDate: state.appointments.selectedDate }, schedule, 'agenda-lead-transport')
          : ''}
        <div class="field-row appointment-fields">
          <div class="field" data-field="appointmentDate"><label for="agenda-lead-date">Data do pré-agendamento</label><input id="agenda-lead-date" type="date" value="${escapeHtml(state.appointments.selectedDate)}" disabled /><input name="appointmentDate" type="hidden" value="${escapeHtml(state.appointments.selectedDate)}" /><small class="field-error"></small></div>
          ${appointmentCreateTimeField()}
        </div>
        <div class="field" data-field="notes"><label for="agenda-lead-notes">Observação rápida</label><textarea id="agenda-lead-notes" name="notes" maxlength="500" rows="3" placeholder="Ex.: prefere contato pela manhã">${escapeHtml(draft.notes || '')}</textarea><small class="field-hint"><span id="agenda-notes-count">${String(draft.notes || '').length}</span>/500</small><small class="field-error"></small></div>
      </div>
      </div>
      <div class="appointment-create-actions"><button class="button button-secondary" type="button" data-close-appointment-create>Cancelar</button><button class="button button-primary" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar cadastro'}</span></button></div>
    </form>
  </dialog>`;
}

function settingsView() {
  if (!isAdmin()) {
    return `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Somente administradores podem alterar as configurações das lojas.</span></div>`;
  }

  const { records, selectedStoreId, loading, saving, error, section } = state.settings;
  const content = section === 'roles'
    ? roleProfilesSettingsView()
    : section === 'services'
      ? serviceCatalogSettingsView()
      : scheduleSettingsView();

  return `<section class="page-toolbar settings-toolbar">
      <div class="settings-tabs" role="tablist" aria-label="Categorias de configuração">
        <button class="settings-tab ${section === 'schedule' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'schedule'}" data-settings-section="schedule"><i data-lucide="calendar-days"></i><span>Agenda</span></button>
        <button class="settings-tab ${section === 'services' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'services'}" data-settings-section="services"><i data-lucide="stethoscope"></i><span>Serviços</span></button>
        <button class="settings-tab ${section === 'roles' ? 'is-active' : ''}" type="button" role="tab" aria-selected="${section === 'roles'}" data-settings-section="roles"><i data-lucide="shield-check"></i><span>Perfis e permissões</span></button>
      </div>
      <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestão</span></button>
    </section>
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    <div aria-busy="${loading || saving}">${content}</div>`;
}

function serviceCatalogSettingsView() {
  const { services, saving, serviceEditorOpen, editingServiceId, pendingDeleteServiceId } = state.settings;
  const editing = services.find((service) => service.id === editingServiceId) || null;
  const rows = services.map((service) => `<article class="service-catalog-row ${service.active ? '' : 'is-inactive'}">
    <span class="service-catalog-icon"><i data-lucide="${service.name.toLocaleLowerCase('pt-BR').includes('limpeza') ? 'brush-cleaning' : 'stethoscope'}"></i></span>
    <div class="service-catalog-name"><strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(service.storeIds.map(storeLabel).join(' · '))}</span></div>
    <div class="service-catalog-duration"><span>Duração</span><strong>${service.durationMinutes} min</strong></div>
    <span class="status-badge status-${service.active ? 'success' : 'neutral'}">${service.active ? 'Ativo' : 'Inativo'}</span>
    <div class="service-catalog-actions">
      <button class="icon-button" type="button" data-service-edit="${escapeHtml(service.id)}" title="Editar serviço" ${saving ? 'disabled' : ''}><i data-lucide="pencil"></i></button>
      <button class="button button-secondary" type="button" data-service-toggle="${escapeHtml(service.id)}" ${saving ? 'disabled' : ''}><i data-lucide="${service.active ? 'circle-x' : 'circle-check'}"></i><span>${service.active ? 'Desativar' : 'Ativar'}</span></button>
      <button class="icon-button role-delete-button" type="button" data-service-delete="${escapeHtml(service.id)}" title="Excluir serviço" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i></button>
    </div>
  </article>`).join('');
  const deleting = services.find((service) => service.id === pendingDeleteServiceId) || null;
  const selectedStoreIds = editing?.storeIds || [state.settings.selectedStoreId || STORES[0].id];
  const storeOptions = STORES.map((store) => `<label class="service-store-option">
    <input type="checkbox" name="storeIds" value="${store.id}" ${selectedStoreIds.includes(store.id) ? 'checked' : ''} />
    <span>${store.label}</span>
  </label>`).join('');

  return `<section class="service-catalog-panel">
    <div class="service-catalog-heading"><div><span class="eyebrow">AGENDA</span><h2>Serviços cadastrados</h2><p>Defina a duração dos atendimentos oferecidos em cada unidade.</p></div><button class="button button-primary" type="button" data-service-new><i data-lucide="circle-plus"></i><span>Novo serviço</span></button></div>
    ${rows ? `<div class="service-catalog-list">${rows}</div>` : '<div class="empty-state"><i data-lucide="stethoscope"></i><strong>Nenhum serviço cadastrado</strong><p>Crie o primeiro serviço da agenda.</p></div>'}
  </section>
  ${serviceEditorOpen ? `<dialog id="service-editor-dialog" class="access-editor-dialog service-editor-dialog" aria-labelledby="service-editor-title">
    <form id="service-form" class="access-form" novalidate>
      <header><div><span class="eyebrow">SERVIÇO DA AGENDA</span><h2 id="service-editor-title">${editing ? 'Editar serviço' : 'Novo serviço'}</h2><p>A duração será usada para calcular os horários disponíveis.</p></div><button class="icon-button" type="button" data-service-editor-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
      <div class="access-form-body">
        <div class="field service-name-field" data-field="name"><label for="service-name">Nome do serviço</label><input id="service-name" name="name" maxlength="80" value="${escapeHtml(editing?.name || '')}" placeholder="Ex.: Exame de vista" required /><small class="field-error"></small></div>
        <div class="field service-duration-field" data-field="durationMinutes"><label for="service-duration">Duração</label><div class="number-with-unit"><input id="service-duration" name="durationMinutes" type="number" min="10" max="180" step="10" value="${editing?.durationMinutes || 30}" required /><span>min</span></div><small class="field-error"></small></div>
        <fieldset class="field access-field-wide service-store-field" data-field="storeIds"><legend>Lojas atendidas</legend><small>Marque todas as unidades que oferecem este serviço.</small><div class="service-store-options">${storeOptions}</div><small class="field-error"></small></fieldset>
        <input name="active" type="hidden" value="${editing?.active === false ? 'false' : 'true'}" />
      </div>
      <footer><button class="button button-secondary" type="button" data-service-editor-close>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar serviço'}</span></button></footer>
    </form>
  </dialog>` : ''}
  ${deleting ? `<dialog id="delete-service-dialog" class="confirmation-dialog" aria-labelledby="delete-service-title" aria-describedby="delete-service-description"><div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div><h2 id="delete-service-title">Excluir serviço?</h2><p id="delete-service-description">O serviço <strong>${escapeHtml(deleting.name)}</strong> será removido do catalogo e não aparecera em novos agendamentos. Os agendamentos já cadastrados serão preservados.</p><div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-service-delete-cancel>Cancelar</button><button class="button button-danger-solid" type="button" data-service-delete-confirm="${escapeHtml(deleting.id)}" ${saving ? 'disabled' : ''}><i data-lucide="trash-2"></i><span>Excluir serviço</span></button></div></dialog>` : ''}`;
}

function scheduleSettingsView() {
  const { records, selectedStoreId, loading, saving } = state.settings;
  const selected = records.find((item) => item.id === selectedStoreId)
    || { ...STORES.find((item) => item.id === selectedStoreId), ...DEFAULT_STORE_SCHEDULE };
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
  const limitedDayRuleRows = WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.limitedDayRules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row ${rule ? 'is-active' : ''}" data-limited-day-row="${day.id}">
      <label class="schedule-rule-day checkbox-label"><input type="checkbox" name="limitedDayWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label>
      <div class="number-with-unit"><input aria-label="Vagas de ${day.label}" name="limitedDayCapacity-${day.id}" type="number" min="1" max="100" step="1" value="${rule?.capacity || selected.limitedDayCapacity}" ${rule ? '' : 'disabled'} /><span>vagas</span></div>
    </div>`;
  }).join('');
  const meiQuotaRuleRows = WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.meiQuotaRules.find((item) => item.weekday === day.id);
    const morning = rule?.morningQuota ?? selected.meiMorningQuota;
    const afternoon = rule?.afternoonQuota ?? selected.meiAfternoonQuota;
    return `<div class="schedule-rule-row schedule-mei-rule-row ${rule ? 'is-active' : ''}" data-mei-day-row="${day.id}">
      <label class="schedule-rule-day checkbox-label"><input type="checkbox" name="meiQuotaWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label>
      <div class="number-with-unit"><input aria-label="Cota da manhã de ${day.label}" name="meiMorningQuota-${day.id}" type="number" min="0" max="100" step="1" value="${morning}" ${rule ? '' : 'disabled'} /><span>manhã</span></div>
      <div class="number-with-unit"><input aria-label="Cota da tarde de ${day.label}" name="meiAfternoonQuota-${day.id}" type="number" min="0" max="100" step="1" value="${afternoon}" ${rule ? '' : 'disabled'} /><span>tarde</span></div>
      <strong class="schedule-rule-total" data-mei-day-total>${morning + afternoon} total</strong>
    </div>`;
  }).join('');
  const storeHoursRuleRows = WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.storeHoursRules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row schedule-hours-rule-row ${rule ? 'is-active' : ''}" data-store-hours-row="${day.id}">
      <label class="schedule-rule-day checkbox-label"><input type="checkbox" name="storeHoursWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label>
      <input aria-label="Início de ${day.label}" name="storeOpeningTime-${day.id}" type="time" value="${rule?.openingTime || selected.openingTime}" ${rule ? '' : 'disabled'} />
      <input aria-label="Fim de ${day.label}" name="storeClosingTime-${day.id}" type="time" value="${rule?.closingTime || selected.closingTime}" ${rule ? '' : 'disabled'} />
    </div>`;
  }).join('');
  const ophthalmologyHoursRuleRows = WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.ophthalmologyHoursRules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row schedule-hours-rule-row ${rule ? 'is-active' : ''}" data-ophthalmology-hours-row="${day.id}">
      <label class="schedule-rule-day checkbox-label"><input type="checkbox" name="ophthalmologyWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label>
      <input aria-label="Início do oftalmologista em ${day.label}" name="ophthalmologyOpeningTime-${day.id}" type="time" value="${rule?.openingTime || selected.ophthalmologyOpeningTime}" ${rule ? '' : 'disabled'} />
      <input aria-label="Fim do oftalmologista em ${day.label}" name="ophthalmologyClosingTime-${day.id}" type="time" value="${rule?.closingTime || selected.ophthalmologyClosingTime}" ${rule ? '' : 'disabled'} />
    </div>`;
  }).join('');
  const transportHoursRuleRows = WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.transportHoursRules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row schedule-hours-rule-row ${rule ? 'is-active' : ''}" data-transport-hours-row="${day.id}">
      <label class="schedule-rule-day checkbox-label"><input type="checkbox" name="transportWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label>
      <input aria-label="Início do transporte em ${day.label}" name="transportOpeningTime-${day.id}" type="time" value="${rule?.openingTime || '08:00'}" ${rule ? '' : 'disabled'} />
      <input aria-label="Fim do transporte em ${day.label}" name="transportClosingTime-${day.id}" type="time" value="${rule?.closingTime || '18:00'}" ${rule ? '' : 'disabled'} />
    </div>`;
  }).join('');

  return `<section class="settings-layout">
      <form id="schedule-settings-form" class="settings-form" novalidate>
        <div class="filter-title"><i data-lucide="calendar-days"></i><div><strong>Configurações da agenda</strong><span>As alterações valem para novos pré-agendamentos.</span></div></div>
        <div class="field"><label for="settings-store">Loja</label><select id="settings-store" name="storeId">${storeOptions}</select></div>
        <div class="schedule-config-grid">
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="calendar-days"></i></span>
            <span><strong>Configurações gerais</strong><small data-general-schedule-summary>${selected.schedulingMode === 'free' ? 'Cadastro livre' : `${selected.storeHoursRules.length} ${selected.storeHoursRules.length === 1 ? 'dia aberto' : 'dias abertos'}`}</small></span>
            <button class="button button-secondary" type="button" data-general-schedule-open><i data-lucide="wrench"></i><span>Configurar agenda</span></button>
          </div>
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="calendar-days"></i></span>
            <span><strong>Limite de vagas</strong><small data-limited-days-summary>${selected.limitedDaysEnabled ? `${selected.limitedDayRules.length} ${selected.limitedDayRules.length === 1 ? 'dia configurado' : 'dias configurados'}` : 'Desativado'}</small></span>
            <button class="button button-secondary" type="button" data-limited-days-open><i data-lucide="wrench"></i><span>Configurar limite</span></button>
          </div>
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="users"></i></span>
            <span><strong>Cotas do MEI</strong><small data-mei-quota-summary>${selected.meiQuotaEnabled ? `${selected.meiQuotaRules.length} ${selected.meiQuotaRules.length === 1 ? 'dia configurado' : 'dias configurados'}` : 'Desativadas'}</small></span>
            <button class="button button-secondary" type="button" data-mei-quota-open><i data-lucide="wrench"></i><span>Configurar cotas</span></button>
          </div>
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="stethoscope"></i></span>
            <span><strong>Atendimento oftalmológico</strong><small data-ophthalmology-summary>${selected.ophthalmologyRoutingEnabled ? `${selected.ophthalmologyWeekdays.length} ${selected.ophthalmologyWeekdays.length === 1 ? 'dia configurado' : 'dias configurados'}` : 'Desativado'}</small></span>
            <button class="button button-secondary" type="button" data-ophthalmology-open><i data-lucide="wrench"></i><span>Configurar triagem</span></button>
          </div>
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="bus-front"></i></span>
            <span><strong>Transporte</strong><small data-transport-summary>${selected.transportEnabled ? `${selected.transportHoursRules.length} ${selected.transportHoursRules.length === 1 ? 'dia configurado' : 'dias configurados'}` : 'Desativado'}</small></span>
            <button class="button button-secondary" type="button" data-transport-open><i data-lucide="wrench"></i><span>Configurar transporte</span></button>
          </div>
          <div class="schedule-config-launch">
            <span class="schedule-config-launch-icon"><i data-lucide="hard-drive"></i></span>
            <span><strong>Cadastro offline</strong><small data-offline-capture-summary>${selected.offlineCaptureEnabled ? 'Ativado' : 'Desativado'}</small></span>
            <button class="button button-secondary" type="button" data-offline-capture-open><i data-lucide="wrench"></i><span>Configurar modo offline</span></button>
          </div>
        </div>
        <dialog id="general-schedule-dialog" class="role-details-dialog schedule-rule-dialog" aria-labelledby="general-schedule-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="general-schedule-title">Configurações gerais</h2><p>Defina a disponibilidade e as regras gerais da agenda.</p></div><button class="icon-button" type="button" data-general-schedule-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body general-schedule-dialog-body">
            <div class="field" data-field="schedulingMode"><label for="settings-mode">Disponibilidade</label><select id="settings-mode" name="schedulingMode"><option value="controlled" ${selected.schedulingMode === 'controlled' ? 'selected' : ''}>Controlada por horários</option><option value="free" ${selected.schedulingMode === 'free' ? 'selected' : ''}>Cadastro livre</option></select><small class="field-error"></small></div>
            <div class="schedule-settings-fields ${selected.schedulingMode === 'free' ? 'is-disabled' : ''}">
              <input name="openingTime" type="hidden" value="${selected.openingTime}" />
              <input name="closingTime" type="hidden" value="${selected.closingTime}" />
              <input name="storeHoursRules" type="hidden" value="${escapeHtml(JSON.stringify(selected.storeHoursRules))}" />
              <fieldset class="field schedule-limit-fields schedule-hours-rules" data-field="storeHoursRules"><legend>Funcionamento da loja</legend><small>Ative os dias de funcionamento e defina o expediente de cada um.</small><div class="schedule-hours-rule-header" aria-hidden="true"><span>Dia</span><span>Início</span><span>Fim</span></div><div class="schedule-rule-list">${storeHoursRuleRows}</div><small class="field-error"></small></fieldset>
            </div>
            <div class="schedule-follow-up-times">
              <div class="field schedule-grace-field" data-field="noShowGraceMinutes"><label for="settings-no-show-grace">Alertar atraso após</label><small id="settings-no-show-help" class="field-help">Libera o retorno para perguntar se o cliente está a caminho.</small><div class="number-with-unit"><input id="settings-no-show-grace" name="noShowGraceMinutes" type="number" min="0" max="240" step="5" value="${selected.noShowGraceMinutes}" aria-describedby="settings-no-show-help" /><span>min</span></div><small class="field-error"></small></div>
              <div class="field schedule-grace-field" data-field="rescheduleAfterMinutes"><label for="settings-reschedule-after">Sugerir reagendamento após</label><small id="settings-reschedule-help" class="field-help">Muda o retorno e a mensagem para oferecer uma nova data.</small><div class="number-with-unit"><input id="settings-reschedule-after" name="rescheduleAfterMinutes" type="number" min="1" max="1440" step="5" value="${selected.rescheduleAfterMinutes}" aria-describedby="settings-reschedule-help" /><span>min</span></div><small class="field-error"></small></div>
            </div>
            <input name="automaticPendingFollowUp" type="hidden" value="false" />
            <label class="setting-toggle checkbox-label" for="settings-automatic-follow-up">
              <span><strong>Gerar retorno automaticamente</strong><small>Inclui agendamentos sem confirmação depois do alerta de atraso.</small></span>
              <input id="settings-automatic-follow-up" name="automaticPendingFollowUp" type="checkbox" value="true" ${selected.automaticPendingFollowUp ? 'checked' : ''} />
              <span class="setting-toggle-control" aria-hidden="true"></span>
            </label>
            <input name="showAmetropiaFields" type="hidden" value="false" />
            <label class="setting-toggle checkbox-label" for="settings-show-ametropias">
              <span><strong>Exibir ametropias no cadastro</strong><small>Mostra estas opções nos novos cadastros e agendamentos.</small></span>
              <input id="settings-show-ametropias" name="showAmetropiaFields" type="checkbox" value="true" ${selected.showAmetropiaFields ? 'checked' : ''} />
              <span class="setting-toggle-control" aria-hidden="true"></span>
            </label>
          </div>
          <footer><span>As alterações serão salvas com a configuração da loja.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-general-schedule-close>Cancelar</button><button class="button button-primary" type="button" data-general-schedule-apply><i data-lucide="check"></i><span>Aplicar configurações</span></button></div></footer>
        </dialog>
        <dialog id="limited-days-dialog" class="role-details-dialog schedule-rule-dialog" aria-labelledby="limited-days-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="limited-days-title">Limite de vagas</h2><p>Defina os dias e a quantidade maxima de clientes.</p></div><button class="icon-button" type="button" data-limited-days-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body">
            <input name="limitedDaysEnabled" type="hidden" value="false" />
            <input name="limitedDayRules" type="hidden" value="${escapeHtml(JSON.stringify(selected.limitedDayRules))}" />
            <label class="setting-toggle checkbox-label" for="settings-limited-days">
              <span><strong>Limitar vagas em dias específicos</strong><small>Define o total de clientes que a loja pode receber nos dias escolhidos.</small></span>
              <input id="settings-limited-days" name="limitedDaysEnabled" type="checkbox" value="true" ${selected.limitedDaysEnabled ? 'checked' : ''} />
              <span class="setting-toggle-control" aria-hidden="true"></span>
            </label>
            <fieldset class="field schedule-limit-fields ${selected.limitedDaysEnabled ? '' : 'is-disabled'}" data-field="limitedDayRules" ${selected.limitedDaysEnabled ? '' : 'disabled'}>
              <legend>Limite por dia da semana</legend>
              <small>Selecione os dias e informe a capacidade de cada um.</small>
              <div class="schedule-rule-list">${limitedDayRuleRows}</div>
              <small class="field-error"></small>
            </fieldset>
          </div>
          <footer><span>O limite vale para cada dia selecionado.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-limited-days-close>Cancelar</button><button class="button button-primary" type="button" data-limited-days-apply><i data-lucide="check"></i><span>Aplicar limite</span></button></div></footer>
        </dialog>
        <dialog id="mei-quota-dialog" class="role-details-dialog mei-quota-dialog" aria-labelledby="mei-quota-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="mei-quota-title">Cotas do MEI</h2><p>Defina os dias e os limites de agendamento por período.</p></div><button class="icon-button" type="button" data-mei-quota-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body">
            <input name="meiQuotaEnabled" type="hidden" value="false" />
            <input name="meiQuotaRules" type="hidden" value="${escapeHtml(JSON.stringify(selected.meiQuotaRules))}" />
            <label class="setting-toggle checkbox-label" for="settings-mei-quota-enabled">
              <span><strong>Aplicar cotas ao cargo MEI</strong><small>Limita separadamente os agendamentos da manhã e da tarde.</small></span>
              <input id="settings-mei-quota-enabled" name="meiQuotaEnabled" type="checkbox" value="true" ${selected.meiQuotaEnabled ? 'checked' : ''} />
              <span class="setting-toggle-control" aria-hidden="true"></span>
            </label>
            <fieldset class="field schedule-limit-fields ${selected.meiQuotaEnabled ? '' : 'is-disabled'}" data-field="meiQuotaRules" ${selected.meiQuotaEnabled ? '' : 'disabled'}>
              <legend>Cotas por dia da semana</legend>
              <small>O período e definido pelo horário agendado para o cliente.</small>
              <div class="schedule-rule-list">${meiQuotaRuleRows}</div>
              <small class="field-error"></small>
              <small>Manhã: antes das 12:00. Tarde: a partir das 12:00.</small>
            </fieldset>
          </div>
          <footer><span>As cotas sao individuais para cada MEI.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-mei-quota-close>Cancelar</button><button class="button button-primary" type="button" data-mei-quota-apply><i data-lucide="check"></i><span>Aplicar cotas</span></button></div></footer>
        </dialog>
        <dialog id="ophthalmology-dialog" class="role-details-dialog schedule-rule-dialog" aria-labelledby="ophthalmology-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="ophthalmology-title">Atendimento oftalmológico</h2><p>Defina quando a triagem deve encaminhar o cliente ao oftalmologista.</p></div><button class="icon-button" type="button" data-ophthalmology-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body">
            <input name="ophthalmologyRoutingEnabled" type="hidden" value="false" />
            <input name="ophthalmologyWeekdays" type="hidden" value="${escapeHtml(JSON.stringify(selected.ophthalmologyWeekdays))}" />
            <input name="ophthalmologyHoursRules" type="hidden" value="${escapeHtml(JSON.stringify(selected.ophthalmologyHoursRules))}" />
            <input name="ophthalmologyOpeningTime" type="hidden" value="${selected.ophthalmologyOpeningTime}" />
            <input name="ophthalmologyClosingTime" type="hidden" value="${selected.ophthalmologyClosingTime}" />
            <input name="ophthalmologyPathologyIds" type="hidden" value="${escapeHtml(JSON.stringify(selected.ophthalmologyPathologyIds))}" />
            <input name="ophthalmologySurgeryIds" type="hidden" value="${escapeHtml(JSON.stringify(selected.ophthalmologySurgeryIds))}" />
            <label class="setting-toggle checkbox-label" for="settings-ophthalmology-enabled"><span><strong>Ativar triagem para oftalmologista</strong><small>Catarata informada na patologia ou na cirurgia direciona para esta agenda.</small></span><input id="settings-ophthalmology-enabled" name="ophthalmologyRoutingEnabled" type="checkbox" value="true" ${selected.ophthalmologyRoutingEnabled ? 'checked' : ''} /><span class="setting-toggle-control" aria-hidden="true"></span></label>
            <div class="ophthalmology-settings ${selected.ophthalmologyRoutingEnabled ? '' : 'is-disabled'}" data-ophthalmology-fields>
              <div class="field" data-field="ophthalmologyMinimumAge"><label for="settings-ophthalmology-age">Perguntar sobre cirurgia a partir de</label><div class="number-with-unit"><input id="settings-ophthalmology-age" name="ophthalmologyMinimumAge" type="number" min="0" max="120" step="1" value="${selected.ophthalmologyMinimumAge}" /><span>anos</span></div><small class="field-error"></small></div>
              <fieldset class="field schedule-limit-fields schedule-hours-rules" data-field="ophthalmologyHoursRules"><legend>Escala do oftalmologista</legend><small>Ative os dias e defina o horário específico de cada atendimento.</small><div class="schedule-hours-rule-header" aria-hidden="true"><span>Dia</span><span>Início</span><span>Fim</span></div><div class="schedule-rule-list">${ophthalmologyHoursRuleRows}</div><small class="field-error"></small></fieldset>
              <div class="notice notice-info ophthalmology-criteria"><i data-lucide="info"></i><span>Critérios iniciais: patologia Catarata ou cirurgia de Catarata. Novos critérios podem ser adicionados depois.</span></div>
            </div>
          </div>
          <footer><span>A configuração vale somente para esta loja.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-ophthalmology-close>Cancelar</button><button class="button button-primary" type="button" data-ophthalmology-apply><i data-lucide="check"></i><span>Aplicar triagem</span></button></div></footer>
        </dialog>
        <dialog id="transport-dialog" class="role-details-dialog schedule-rule-dialog" aria-labelledby="transport-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="transport-title">Transporte</h2><p>Defina os dias e horários em que a loja oferece transporte.</p></div><button class="icon-button" type="button" data-transport-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body">
            <input name="transportEnabled" type="hidden" value="false" />
            <input name="transportHoursRules" type="hidden" value="${escapeHtml(JSON.stringify(selected.transportHoursRules))}" />
            <label class="setting-toggle checkbox-label" for="settings-transport-enabled"><span><strong>Disponibilizar transporte</strong><small>Permite registrar clientes e acompanhantes que precisam do veículo.</small></span><input id="settings-transport-enabled" name="transportEnabled" type="checkbox" value="true" ${selected.transportEnabled ? 'checked' : ''} /><span class="setting-toggle-control" aria-hidden="true"></span></label>
            <fieldset class="field schedule-limit-fields schedule-hours-rules ${selected.transportEnabled ? '' : 'is-disabled'}" data-field="transportHoursRules" data-transport-fields ${selected.transportEnabled ? '' : 'disabled'}><legend>Disponibilidade semanal</legend><small>Ative os dias e informe a faixa em que o transporte está disponível.</small><div class="schedule-hours-rule-header" aria-hidden="true"><span>Dia</span><span>Início</span><span>Fim</span></div><div class="schedule-rule-list">${transportHoursRuleRows}</div><small class="field-error"></small></fieldset>
          </div>
          <footer><span>Não define viagens nem fechamento do veículo.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-transport-close>Cancelar</button><button class="button button-primary" type="button" data-transport-apply><i data-lucide="check"></i><span>Aplicar transporte</span></button></div></footer>
        </dialog>
        <dialog id="offline-capture-dialog" class="role-details-dialog schedule-rule-dialog" aria-labelledby="offline-capture-title">
          <header><div><span class="eyebrow">AGENDA</span><h2 id="offline-capture-title">Cadastro offline</h2><p>Controle se a equipe pode cadastrar leads sem conexão nesta loja.</p></div><button class="icon-button" type="button" data-offline-capture-close aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
          <div class="schedule-rule-dialog-body">
            <input name="offlineCaptureEnabled" type="hidden" value="false" />
            <label class="setting-toggle checkbox-label" for="settings-offline-capture-enabled">
              <span><strong>Permitir cadastros sem internet</strong><small>Quando ativo, somente os dados do lead podem ser salvos offline. Data e horário continuam bloqueados.</small></span>
              <input id="settings-offline-capture-enabled" name="offlineCaptureEnabled" type="checkbox" value="true" ${selected.offlineCaptureEnabled ? 'checked' : ''} />
              <span class="setting-toggle-control" aria-hidden="true"></span>
            </label>
            <div class="notice notice-info"><i data-lucide="info"></i><span>Os cadastros offline aparecem em Meus cadastros e sincronizam automaticamente. Ao desativar, novos cadastros passam a exigir conexão; registros pendentes não sao apagados.</span></div>
          </div>
          <footer><span>O recurso permanece desativado por padrão.</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-offline-capture-close>Cancelar</button><button class="button button-primary" type="button" data-offline-capture-apply><i data-lucide="check"></i><span>Aplicar configuração</span></button></div></footer>
        </dialog>
        <button class="button button-primary button-block" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar configuração'}</span></button>
      </form>
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
    <button class="role-catalog-name" type="button" data-role-details="${escapeHtml(profile.id)}" aria-label="Visualizar permissões do perfil ${escapeHtml(profile.name)}"><strong>${escapeHtml(profile.name)}</strong><span>${profile.scope === 'admin' ? 'Acesso completo' : profile.scope === 'stores' ? 'Unidades permitidas' : 'Dados próprios'}</span></button>
    <div class="service-catalog-duration role-catalog-permissions"><span>Permissões</span><strong>${profile.permissions.length} ativa(s)</strong></div>
    <span class="status-badge status-${profile.system ? 'neutral' : 'success'}">${profile.system ? profile.customized ? 'Padrão ajustado' : 'Padrão' : 'Personalizado'}</span>
    <div class="service-catalog-actions role-catalog-actions">
      ${profile.system
        ? `<button class="icon-button" type="button" data-role-details="${escapeHtml(profile.id)}" title="${profile.baseRole === 'admin' ? 'Visualizar permissões' : 'Configurar permissões'}" ${saving ? 'disabled' : ''}><i data-lucide="${profile.baseRole === 'admin' ? 'eye' : 'pencil'}"></i></button>`
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
    <div class="service-catalog-heading"><div><span class="eyebrow">EQUIPE</span><h2>Cargos cadastrados</h2><p>Defina o alcance e as permissões de cada cargo da equipe.</p></div><button class="button button-primary" type="button" data-role-new><i data-lucide="circle-plus"></i><span>Adicionar cargo</span></button></div>
    <div class="service-catalog-list role-catalog-list">${rows}</div>
  </section>
  ${roleEditorOpen ? `<dialog id="role-editor-dialog" class="role-details-dialog role-editor-dialog" aria-labelledby="role-editor-title">
    <form id="role-profile-form" class="role-editor-form" novalidate>
      <header><div><span class="eyebrow">CARGO DA EQUIPE</span><h2 id="role-editor-title">${editingRoleId ? 'Editar cargo' : 'Novo cargo'}</h2><p>Configure individualmente o que este cargo poderá acessar.</p></div><button class="icon-button" type="button" data-role-cancel aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
      <div class="role-editor-content">
        <div class="role-editor-basics">
          <div class="field" data-field="name"><label for="role-profile-name">Nome do cargo</label><input id="role-profile-name" name="name" maxlength="60" value="${escapeHtml(roleDraft.name)}" placeholder="Ex.: Supervisor de atendimento" required /><small class="field-error"></small></div>
          <div class="field" data-field="scope"><label for="role-profile-scope">Alcance dos dados</label><select id="role-profile-scope" name="scope">${scopeOptions}</select><small class="field-error"></small></div>
        </div>
        <div class="role-permissions-heading"><strong>Permissões</strong><span>As opções indisponíveis não pertencem ao alcance selecionado.</span></div>
        <div class="role-details-body role-editor-permissions-body" data-field="permissions">${editorPermissionLayout}<small class="field-error"></small></div>
      </div>
      <footer><span><strong data-role-editor-count>${roleDraft.permissions.length}</strong> de ${PERMISSION_GROUPS.flatMap((group) => group.permissions).length} permissões ativadas</span><div class="role-details-actions"><button class="button button-secondary" type="button" data-role-cancel>Cancelar</button><button class="button button-primary" type="submit" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : editingRoleId ? 'Salvar alterações' : 'Criar cargo'}</span></button></div></footer>
    </form>
  </dialog>` : ''}
  ${deleting ? `<dialog id="delete-role-dialog" class="confirmation-dialog" aria-labelledby="delete-role-title" aria-describedby="delete-role-description"><div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div><h2 id="delete-role-title">Excluir cargo?</h2><p id="delete-role-description">O cargo <strong>${escapeHtml(deleting.name)}</strong> será removido. A exclusão só será permitida se nenhuma pessoa estiver usando este cargo.</p><div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-role-delete-cancel>Cancelar</button><button class="button button-danger" type="button" data-role-delete-confirm="${escapeHtml(deleting.id)}" ${saving ? 'disabled' : ''}>Excluir cargo</button></div></dialog>` : ''}
  ${detailsProfile ? `<dialog id="role-details-dialog" class="role-details-dialog" aria-labelledby="role-details-title">
    <header><div><span class="eyebrow">PERFIL DE ACESSO</span><h2 id="role-details-title">${escapeHtml(detailsProfile.name)}</h2><p>${detailsProfile.scope === 'admin' ? 'Acesso completo ao sistema' : detailsProfile.scope === 'stores' ? 'Acesso limitado às unidades permitidas' : 'Acesso aos próprios dados'}</p></div><button class="icon-button" type="button" data-role-details-close title="Fechar" aria-label="Fechar permissões"><i data-lucide="circle-x"></i></button></header>
    <div class="role-details-body">${detailGroupsLayout}</div>
    <footer><span><strong data-role-details-count>${activeDetailPermissions.length}</strong> de ${PERMISSION_GROUPS.flatMap((group) => group.permissions).length} permissões ativadas</span><div class="role-details-actions">${detailsEditable ? `<button class="button button-secondary" type="button" data-system-role-reset="${escapeHtml(detailsProfile.id)}" ${saving ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>Restaurar padrão</span></button><button class="button button-secondary" type="button" data-role-details-close>Cancelar</button><button class="button button-primary" type="button" data-system-role-save="${escapeHtml(detailsProfile.id)}" ${saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar permissões'}</span></button>` : '<button class="button button-primary" type="button" data-role-details-close>Concluir</button>'}</div></footer>
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
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${selectedStoreId === store.id ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
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
      <div class="access-detail"><span>Código SavWin</span><strong>${escapeHtml(access.savwinCode || 'Não informado')}</strong></div>
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
      <button class="back-link" type="button" data-route="management"><i data-lucide="arrow-left"></i><span>Voltar para gestão</span></button>
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
  const { records, members, loading, saving, error, truncated, draft, editorOpen, editingGroupId, duplicatingGroupId, pendingDeleteGroupId } = state.goals;
  const groups = groupGoalRecords(records);
  const goalManagerView = canManageGoals();
  const visibleMembers = members.filter((member) => member.storeId === draft.storeId);
  const selectedCount = draft.assigneeUids.filter((uid) => visibleMembers.some((member) => member.uid === uid)).length;
  const completedGoals = groups.filter((goal) => goal.completed >= goal.targetCount).length;
  const totalCaptured = records.reduce((total, goal) => total + goal.completed, 0);
  const selectedGroup = groups.find((group) => group.id === pendingDeleteGroupId);
  const goalStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  const storeOptions = goalStores.map((store) => `<option value="${store.id}" ${draft.storeId === store.id ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
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
    : `<div class="empty-state goals-empty"><i data-lucide="target"></i><strong>Nenhuma meta cadastrada</strong><p>${goalManagerView ? 'Crie a primeira meta de captação para a equipe.' : 'Quando uma meta for atribuida, ela aparecera aqui.'}</p></div>`;

  const creator = goalManagerView && editorOpen ? `<dialog id="goal-editor-dialog" class="access-editor-dialog goal-editor-dialog" aria-labelledby="goal-editor-title">
    <form id="goal-form" class="goal-form ${duplicatingGroupId ? 'is-duplicating' : ''}" novalidate>
      <header><div><span class="eyebrow">META DA EQUIPE</span><h2 id="goal-editor-title">${editingGroupId ? 'Editar meta' : duplicatingGroupId ? 'Duplicar meta' : 'Nova meta'}</h2><p>${duplicatingGroupId ? 'Revise os dados da cópia antes de criar.' : 'Defina a quantidade de leads por colaborador no período.'}</p></div><button class="icon-button" type="button" data-cancel-goal-edit aria-label="Fechar"><i data-lucide="circle-x"></i></button></header>
      <div class="goal-editor-body">
        <div class="field" data-field="title"><label for="goal-title">Título</label><input id="goal-title" name="title" maxlength="80" value="${escapeHtml(draft.title)}" required /><small class="field-error"></small></div>
        <div class="goal-form-grid">
          <div class="field" data-field="targetCount"><label for="goal-target">Quantidade</label><input id="goal-target" name="targetCount" type="number" min="1" max="10000" step="1" value="${draft.targetCount}" required /><small class="field-error"></small></div>
          <div class="field" data-field="startDate"><label for="goal-start">Início</label><input id="goal-start" name="startDate" type="date" value="${escapeHtml(draft.startDate)}" required /><small class="field-error"></small></div>
          <div class="field" data-field="endDate"><label for="goal-end">Fim</label><input id="goal-end" name="endDate" type="date" value="${escapeHtml(draft.endDate)}" required /><small class="field-error"></small></div>
        </div>
        <div class="field" data-field="storeId"><label for="goal-store">Loja</label>${isAdmin() || goalStores.length > 1
          ? `<select id="goal-store" name="storeId" required>${storeOptions}</select>`
          : `<input id="goal-store" name="storeId" value="${escapeHtml(draft.storeId)}" type="hidden" /><div class="readonly-field">${escapeHtml(storeLabel(draft.storeId))}</div>`}<small class="field-error"></small></div>
        <fieldset class="goal-members field" data-field="assigneeUids"><legend>Colaboradores <span data-goal-selected-count>${selectedCount} selecionado(s)</span></legend><div class="goal-member-list">${memberOptions}</div><small class="field-error"></small></fieldset>
      </div>
      <footer><button class="button button-secondary" type="button" data-cancel-goal-edit>Cancelar</button><button class="button button-primary" type="submit" ${saving || !visibleMembers.length ? 'disabled' : ''}><i data-lucide="${editingGroupId ? 'save' : duplicatingGroupId ? 'copy' : 'target'}"></i><span>${saving ? 'Salvando...' : editingGroupId ? 'Salvar alterações' : duplicatingGroupId ? 'Criar cópia' : 'Criar metas'}</span></button></footer>
    </form>
  </dialog>` : '';
  const metrics = `<section class="goal-metrics" aria-label="Resumo das metas">
      <div><span>Metas</span><strong>${groups.length}</strong></div>
      <div><span>Concluidas</span><strong>${completedGoals}</strong></div>
      <div><span>Captações contabilizadas</span><strong>${totalCaptured}</strong></div>
    </section>`;
  const results = `<section class="goals-results" aria-busy="${loading}">
      <div class="access-list-heading"><div><strong>${goalManagerView ? 'Desempenho da equipe' : 'Objetivos atribuídos'}</strong><span>${groups.length} meta(s)</span></div></div>
      ${loading && !records.length ? '<div class="empty-state"><i data-lucide="refresh-cw"></i><strong>Carregando metas...</strong></div>' : goalCards}
    </section>`;

  return `
    ${goalManagerView ? `<section class="service-catalog-heading goals-heading">
      <div><span class="eyebrow">METAS</span><h2>${goalManagerView ? 'Metas da equipe' : 'Minhas metas'}</h2><p>${goalManagerView ? 'Defina objetivos de captação e acompanhe o desempenho da equipe.' : 'Acompanhe seus objetivos e o progresso das captações.'}</p></div>
      <div class="goals-heading-actions"><button class="button button-secondary" type="button" data-action="reload-goals" ${loading ? 'disabled' : ''}><i data-lucide="refresh-cw"></i><span>Atualizar</span></button>${goalManagerView ? '<button class="button button-primary" type="button" data-goal-new><i data-lucide="circle-plus"></i><span>Nova meta</span></button>' : ''}</div>
    </section>` : ''}
    ${error ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(error)}</span></div>` : ''}
    ${truncated ? `<div class="notice notice-warning"><i data-lucide="info"></i><span>O calculo atingiu ${GOALS_LEAD_LIMIT} leads. Reduza os periodos das metas para conferir o resultado completo.</span></div>` : ''}
    ${goalManagerView
      ? `${metrics}${results}${creator}`
      : `<section class="personal-goals">${metrics}${results}</section>`}
    ${selectedGroup ? `<dialog id="delete-goal-dialog" class="confirmation-dialog" aria-labelledby="delete-goal-title">
      <div class="confirmation-dialog-icon"><i data-lucide="trash-2"></i></div>
      <div><p class="eyebrow">EXCLUIR META</p><h2 id="delete-goal-title">Remover esta meta?</h2><p>A meta &ldquo;${escapeHtml(selectedGroup.title)}&rdquo; será removida de ${selectedGroup.goals.length} colaborador(es). As captações permanecem intactas.</p></div>
      <div class="confirmation-dialog-actions"><button class="button button-secondary" type="button" data-close-goal-dialog>Cancelar</button><button class="button button-danger-solid" type="button" data-confirm-delete-goal="${escapeHtml(selectedGroup.id)}"><i data-lucide="trash-2"></i><span>Excluir meta</span></button></div>
    </dialog>` : ''}`;
}

function bottomNav() {
  const items = [['home', 'house', 'Início']];
  if (hasAccess('leads.create')) items.push(['new', 'circle-plus', 'Novo']);
  if (hasAccess('leads.view_own')) items.push(['leads', 'clipboard-list', 'Cadastros']);
  if (hasAccess('followups.own') && !hasAccess('followups.team')) items.splice(3, 0, ['follow-ups', 'bell-ring', 'Retornos']);
  if (canManage()) items.push(['management', 'bar-chart-3', 'Gestão']);
  const followUpCount = pendingFollowUps().length;
  return `<nav class="bottom-nav ${items.length === 5 ? 'has-five-items' : ''}" aria-label="Navegação principal">${items.map(([route, icon, label]) => `
    <button type="button" data-route="${route}" class="${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'reports', 'appointments', 'confirmations', 'settings', 'follow-ups'].includes(state.route)) ? 'is-active' : ''}" ${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'reports', 'appointments', 'confirmations', 'settings', 'follow-ups'].includes(state.route)) ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>${route === 'follow-ups' && followUpCount ? `<strong class="nav-notification-count">${followUpCount > 99 ? '99+' : followUpCount}</strong>` : ''}
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, lead: leadDetailView, 'follow-ups': followUpsView, management: managementView, 'management-lead': leadDetailView, dashboard: dashboardView, reports: reportsView, appointments: appointmentsView, confirmations: confirmationsView, access: accessView, goals: goalsView, settings: settingsView };
  const page = pages[state.route] || homeView;
  const wideLayout = ['management', 'dashboard', 'reports', 'appointments', 'confirmations', 'access', 'goals', 'settings'].includes(state.route);
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
    root.innerHTML = `<main class="loading-page"><img class="brand-logo brand-logo-loading" src="${import.meta.env.BASE_URL}leadflow-logo.png" alt="" aria-hidden="true" /><span>Preparando o LeadFlow...</span></main>`;
  } else {
    root.innerHTML = state.profile ? appView() : loginView();
  }

  if (state.updateAction) {
    root.insertAdjacentHTML('beforeend', `<aside class="update-banner" role="status">
      <i data-lucide="download"></i>
      <span>Nova versão disponível.</span>
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

function syncConnectivityIndicator() {
  const indicator = document.querySelector('.connectivity');
  if (!indicator) return;
  const online = navigator.onLine;
  indicator.classList.toggle('is-online', online);
  indicator.classList.toggle('is-offline', !online);
  indicator.innerHTML = `<i data-lucide="${online ? 'wifi' : 'wifi-off'}"></i>${online ? 'Online' : 'Offline'}`;
  createIcons({ icons: appIcons });
}

function handleConnectivityChange() {
  syncConnectivityIndicator();
  if (navigator.onLine && state.profile && !state.demoMode) {
    synchronizePendingRegistrations(true);
  }
  if (state.route !== 'new') return;

  const form = document.querySelector('#lead-form');
  if (!form) {
    render();
    return;
  }

  const online = navigator.onLine;
  const blocked = !online && !state.offlineCapture.enabled;
  const notice = form.querySelector('[data-offline-capture-notice]');
  const appointmentFields = form.querySelector('[data-online-appointment]');
  const dateInput = form.elements.appointmentDate;
  const submitButton = form.querySelector('[type="submit"]');
  if (notice) {
    notice.hidden = online;
    notice.querySelector('span').textContent = blocked
      ? 'Cadastro offline desativado. Reconecte-se antes de salvar este cadastro.'
      : 'Cadastro offline ativo. Os dados do lead serão preservados, mas data e horário só poderão ser escolhidos com internet.';
  }
  if (!online) {
    state.newLeadSchedule.appointmentDate = '';
    dateInput.value = '';
  }
  if (appointmentFields) appointmentFields.hidden = !online;
  dateInput.disabled = !online || !selectedNewLeadStoreId();
  submitButton.disabled = blocked;
  refreshAppointmentTimeControl();
  createIcons({ icons: appIcons });
}

function showToast(message, tone = 'success', icon = 'circle-check') {
  state.toast = { message, tone, icon };
  clearTimeout(toastTimeoutId);
  const root = document.querySelector('#app');
  root?.querySelector('.toast')?.remove();
  root?.insertAdjacentHTML('beforeend', `<div class="toast toast-${tone}" role="status"><i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span></div>`);
  createIcons({ icons: appIcons });
  toastTimeoutId = setTimeout(() => {
    state.toast = null;
    document.querySelector('#app .toast')?.remove();
    toastTimeoutId = null;
  }, 3200);
}

async function synchronizePendingRegistrations(announce = false) {
  try {
    const result = await synchronizeNow(false, state.profile);
    if (result.failed > 0) {
      showToast(
        `${result.failed} cadastro(s) não foram confirmados pela nuvem e continuam salvos neste aparelho.`,
        'danger',
        'circle-alert'
      );
    } else if (announce && result.synchronized > 0) {
      showToast(`${result.synchronized} cadastro(s) sincronizado(s) e salvo(s) na nuvem.`, 'success', 'cloud-check');
    }
    return result;
  } catch (error) {
    if (announce) {
      showToast('Não foi possível confirmar os cadastros na nuvem. Eles continuam salvos neste aparelho.', 'danger', 'circle-alert');
    }
    return { synchronized: 0, failed: 0, error };
  }
}

function setFieldErrors(form, errors) {
  form.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
  form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });

  let firstInvalidField = null;
  for (const [name, message] of Object.entries(errors)) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) continue;
    firstInvalidField ||= field;
    field.classList.add('has-error');
    const errorElement = field.querySelector('.field-error');
    if (errorElement) errorElement.textContent = message;
  }
  return firstInvalidField;
}

function revealFirstFormError(field) {
  if (!field) return;
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const control = field.querySelector('input:not([type="hidden"]), select, textarea');
  setTimeout(() => control?.focus({ preventScroll: true }), 250);
}

function bindPageEvents() {
  const form = document.querySelector('#lead-form');
  if (form) {
    const phoneInput = form.elements.phone;
    const notesInput = form.elements.notes;
    const appointmentDateInput = form.elements.appointmentDate;
    restoreNewLeadDraft(form, state.newLeadSchedule.draft);
    document.querySelector('#notes-count').textContent = notesInput.value.length;
    bindCpfInput(form);
    bindBirthDateInput(form);
    phoneInput.addEventListener('input', () => { phoneInput.value = formatBrazilianPhone(phoneInput.value); });
    notesInput.addEventListener('input', () => { document.querySelector('#notes-count').textContent = notesInput.value.length; });
    form.elements.storeId?.addEventListener('change', () => {
      const storeId = form.elements.storeId.value;
      if (!captureStoreIds().includes(storeId)) return;
      state.newLeadSchedule.draft = state.newLeadSchedule.loaded
        ? captureNewLeadDraft(form)
        : state.newLeadSchedule.draft;
      stopNewLeadScheduleSubscriptions();
      state.newLeadSchedule.storeId = storeId;
      state.newLeadSchedule.loaded = false;
      state.newLeadSchedule.loading = false;
      state.newLeadSchedule.error = '';
      state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
      state.newLeadSchedule.appointmentDate = '';
      state.newLeadSchedule.appointments = [];
      state.newLeadSchedule.serviceId = '';
      state.newLeadSchedule.triage = {};
      render();
      ensureNewLeadSchedule();
    });
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
    bindEyeTriage(form, state.newLeadSchedule.settings, (values) => {
      state.newLeadSchedule.triage = values;
      refreshAppointmentTimeControl();
    });
    bindTransportFields(form, state.newLeadSchedule.settings, (values) => {
      state.newLeadSchedule.triage = values;
      refreshAppointmentTimeControl();
    });
    if (!selectedNewLeadStoreId() || !state.newLeadSchedule.loaded) {
      [...form.elements].forEach((control) => {
        if (control.name !== 'storeId') control.disabled = true;
      });
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!navigator.onLine && !state.offlineCapture.enabled) {
        showToast('O cadastro offline está desativado. Reconecte-se para salvar.', 'danger', 'wifi-off');
        return;
      }
      const rawValues = leadFormValues(form);
      const storeId = rawValues.storeId;
      if (!captureStoreIds().includes(storeId)) {
        const field = setFieldErrors(form, { storeId: 'Selecione uma loja permitida.' });
        showToast('Selecione a loja de destino para continuar.', 'danger', 'circle-alert');
        revealFirstFormError(field);
        return;
      }
      if (!navigator.onLine) {
        rawValues.appointmentDate = '';
        rawValues.appointmentTime = '';
      }
      const values = enrichLeadTriage(rawValues, state.newLeadSchedule.settings);
      const controlledAppointment = values.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime;
      if (state.newLeadSchedule.settings.schedulingMode === 'controlled' && values.appointmentDate && values.appointmentTime) {
        const selectedSlot = buildAppointmentSlots({
          ...(values.careRoute === 'ophthalmologist'
            ? ophthalmologyAppointmentSchedule(state.newLeadSchedule.settings)
            : state.newLeadSchedule.settings),
          appointmentDurationMinutes: Number(values.appointmentDurationMinutes)
        }, state.newLeadSchedule.appointments, '', {
          appointmentDate: values.appointmentDate,
          profile: { ...state.profile, storeId }
        })
          .find((slot) => slot.time === values.appointmentTime);
        if (!selectedSlot?.available) {
          const field = setFieldErrors(form, { appointmentTime: 'Este horário não está mais disponível. Escolha outro.' });
          showToast('O horário escolhido não está mais disponível.', 'danger', 'circle-alert');
          revealFirstFormError(field);
          startDayAppointmentsSubscription();
          return;
        }
      }
      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;
      let result;
      try {
        result = saveLead(values, { ...state.profile, storeId }, state.demoMode, () => {});
      } catch {
        submitButton.disabled = false;
        showToast(
          navigator.onLine ? 'Não foi possível preparar este cadastro.' : 'Não foi possível salvar o cadastro neste aparelho.',
          'danger',
          'circle-alert'
        );
        return;
      }
      const firstInvalidField = setFieldErrors(form, result.errors || {});
      if (!result.isValid) {
        submitButton.disabled = false;
        showToast('Revise os campos destacados antes de salvar.', 'danger', 'circle-alert');
        revealFirstFormError(firstInvalidField);
        return;
      }
      if (result.localSavePromise) {
        try {
          await result.localSavePromise;
        } catch {
          submitButton.disabled = false;
          showToast('Não foi possível salvar o cadastro neste aparelho.', 'danger', 'circle-alert');
          return;
        }
      }
      if (result.writePromise) {
        try {
          await result.writePromise;
        } catch (error) {
          submitButton.disabled = false;
          if (controlledAppointment) {
            const field = setFieldErrors(form, { appointmentTime: 'Não foi possível confirmar este horário. Atualize e escolha novamente.' });
            revealFirstFormError(field);
            startDayAppointmentsSubscription();
          }
          const message = error?.code === 'permission-denied'
            ? 'O cadastro não foi aceito pelo servidor. Seus dados foram mantidos; atualize a página e tente novamente.'
            : 'Não foi possível salvar o cadastro. Verifique a conexão e tente novamente.';
          showToast(message, 'danger', 'circle-alert');
          return;
        }
      }
      form.reset();
      state.newLeadSchedule.draft = {};
      navigate('leads');
      showToast(state.demoMode
        ? 'Cadastro salvo somente neste navegador.'
        : navigator.onLine
          ? 'Cadastro salvo com sucesso.'
          : 'Cadastro salvo neste aparelho. Ele será sincronizado quando a internet voltar.');
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
    bindEyeTriage(editLeadForm, state.leadDetailSchedule.settings);
    bindTransportFields(editLeadForm, state.leadDetailSchedule.settings);
    editLeadForm.elements.appointmentServiceId?.addEventListener('change', () => {
      state.leadDetailSchedule.serviceId = editLeadForm.elements.appointmentServiceId.value;
      const service = selectedLeadDetailService(existingLeadForDetail());
      editLeadForm.elements.appointmentServiceName.value = service.name;
      editLeadForm.elements.appointmentDurationMinutes.value = service.durationMinutes;
      refreshLeadDetailAppointmentTime(existingLeadForDetail());
    });
    editLeadForm.elements.appointmentDate?.addEventListener('input', () => {
      state.leadDetailSchedule.appointmentDate = editLeadForm.elements.appointmentDate.value;
      startLeadDetailDayAppointmentsSubscription(existingLeadForDetail());
    });
    editLeadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!navigator.onLine) {
        showToast('Conecte-se à internet para alterar ou agendar este cadastro.', 'danger', 'wifi-off');
        return;
      }
      const managementEdit = editLeadForm.dataset.management === 'true';
      const existingLead = managementEdit
        ? findManagementLead(editLeadForm.dataset.leadId)
        : state.leads.find((lead) => lead.id === editLeadForm.dataset.leadId);
      let values = enrichLeadTriage(leadFormValues(editLeadForm), state.leadDetailSchedule.settings);
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
          state.management.activeLead = existingLead
            ? { ...existingLead, ...result.data }
            : state.management.activeLead;
          navigate('management');
          showToast('Lead atualizado com sucesso.');
        } catch (error) {
          submitButton.disabled = false;
          showToast(error?.code === 'permission-denied' ? 'Seu perfil não pode alterar este lead.' : 'Não foi possível atualizar o lead.', 'danger', 'circle-alert');
        }
        return;
      }

      const result = updateLead(editLeadForm.dataset.leadId, values, state.demoMode, () => {
        if (!values.appointmentDate || !values.appointmentTime) {
          state.dataError = 'A correção não foi aceita pela nuvem. Verifique o acesso e tente novamente.';
          render();
        }
      }, existingLead);
      setFieldErrors(editLeadForm, result.errors || {});
      if (!result.isValid) {
        submitButton.disabled = false;
        if (result.notFound) navigate('leads');
        return;
      }
      if (values.appointmentDate && values.appointmentTime && result.writePromise) {
        try {
          await result.writePromise;
        } catch (error) {
          submitButton.disabled = false;
          if (error?.code === 'appointment-slot-unavailable') {
            const field = setFieldErrors(editLeadForm, { appointmentTime: 'Este horário acabou de ser ocupado. Escolha outro.' });
            showToast('O horário escolhido acabou de ser ocupado.', 'danger', 'circle-alert');
            revealFirstFormError(field);
            startLeadDetailDayAppointmentsSubscription(existingLeadForDetail());
          } else if (error?.code === 'permission-denied') {
            showToast('Seu perfil não possui permissão para alterar este cadastro.', 'danger', 'circle-alert');
          } else {
            showToast('Não foi possível salvar o agendamento. Verifique a conexão e tente novamente.', 'danger', 'circle-alert');
          }
          return;
        }
      }
      navigate('leads');
      showToast(state.demoMode ? 'Cadastro atualizado neste navegador.' : values.appointmentDate ? 'Agendamento salvo com sucesso.' : 'Alterações salvas com sucesso.');
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
        : readableAuthError(error, 'Não foi possível entrar.');
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

  const dashboardPeriodForm = document.querySelector('#dashboard-period, #reports-period');
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
    bindEyeTriage(appointmentCreateForm, appointmentCreateSchedule(), (values) => {
      state.appointmentCreate.draft = values;
      const timeField = document.querySelector('#appointment-create-time-field');
      if (timeField) timeField.outerHTML = appointmentCreateTimeField();
    });
    bindTransportFields(appointmentCreateForm, appointmentCreateSchedule(), (values) => {
      state.appointmentCreate.draft = values;
      const timeField = document.querySelector('#appointment-create-time-field');
      if (timeField) timeField.outerHTML = appointmentCreateTimeField();
    });
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
      const values = enrichLeadTriage(leadFormValues(appointmentCreateForm), appointmentCreateSchedule());
      const storeId = appointmentCreateForm.elements.storeId.value;
      if (!profileStoreIds(state.profile).includes(storeId)) {
        setFieldErrors(appointmentCreateForm, { storeId: 'Selecione uma loja permitida.' });
        return;
      }
      state.appointmentCreate.saving = true;
      const submitButton = appointmentCreateForm.querySelector('[type="submit"]');
      submitButton.disabled = true;
      const result = saveLead(values, { ...state.profile, storeId }, state.demoMode, () => {
        state.appointmentCreate.error = 'O cadastro não foi aceito pela nuvem.';
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
        setFieldErrors(appointmentCreateForm, { appointmentTime: 'Este horário acabou de ser ocupado. Escolha outro.' });
        submitButton.disabled = false;
      }
    });
  }

  const accessForm = document.querySelector('#access-form');
  if (accessForm) {
    const creatingAccess = !state.access.editingEmail;
    const syncStorePicker = () => {
      const selected = state.settings.roleProfiles.find((profile) => profile.id === accessForm.elements.roleProfileId.value);
      const manager = selected?.baseRole === 'manager';
      const administrator = selected?.baseRole === 'admin';
      const mei = selected?.id === 'system-mei';
      const multiStore = manager || mei;
      const picker = document.querySelector('#access-stores-field');
      const primaryStoreField = document.querySelector('#access-primary-store-field');
      picker.hidden = !multiStore;
      primaryStoreField.hidden = mei;
      if (creatingAccess) {
        const passwordInput = accessForm.elements.password;
        const passwordHelp = accessForm.querySelector('[data-access-password-help]');
        passwordInput.readOnly = !administrator;
        passwordInput.type = administrator ? 'password' : 'text';
        passwordInput.value = administrator ? '' : DEFAULT_TEAM_PASSWORD;
        passwordHelp.textContent = administrator
          ? 'Defina uma senha exclusiva para o acesso administrativo.'
          : 'Senha padrão para o primeiro acesso. A pessoa poderá alterá-la depois.';
      }
      if (mei && creatingAccess && new FormData(accessForm).getAll('storeIds').length <= 1) {
        accessForm.querySelectorAll('[name="storeIds"]').forEach((input) => { input.checked = true; });
      }
      const selectedStoreIds = new FormData(accessForm).getAll('storeIds');
      if (manager) {
        const primary = accessForm.querySelector(`[name="storeIds"][value="${accessForm.elements.storeId.value}"]`);
        if (primary) primary.checked = true;
      } else if (multiStore && !selectedStoreIds.length) {
        const primary = accessForm.querySelector(`[name="storeIds"][value="${accessForm.elements.storeId.value}"]`);
        if (primary) primary.checked = true;
      }
      if (mei) {
        const firstStore = new FormData(accessForm).getAll('storeIds')[0];
        if (firstStore) accessForm.elements.storeId.value = firstStore;
      }
    };
    accessForm.elements.roleProfileId.addEventListener('change', syncStorePicker);
    accessForm.elements.storeId.addEventListener('change', syncStorePicker);
    accessForm.querySelectorAll('[name="storeIds"]').forEach((input) => input.addEventListener('change', () => {
      const selected = state.settings.roleProfiles.find((profile) => profile.id === accessForm.elements.roleProfileId.value);
      const selectedStoreIds = new FormData(accessForm).getAll('storeIds');
      if (selected?.id === 'system-mei') {
        const firstStore = selectedStoreIds[0];
        if (firstStore) accessForm.elements.storeId.value = firstStore;
        return;
      }
      if (selected?.baseRole !== 'manager') return;
      if (!selectedStoreIds.length) {
        input.checked = true;
        return;
      }
      if (!selectedStoreIds.includes(accessForm.elements.storeId.value)) {
        accessForm.elements.storeId.value = selectedStoreIds[0];
      }
    }));
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
              ? ' O e-mail já possuía uma conta; a senha não foi alterada.'
              : ' A autorização foi salva, mas não foi possível criar a senha inicial.';
          }
        }
        state.access.editorOpen = false;
        state.access.editingEmail = '';
        await loadAccessData();
        showToast(`${creating ? 'Acesso criado.' : 'Acesso atualizado.'}${credentialWarning}`, credentialWarning ? 'warning' : 'success', credentialWarning ? 'circle-alert' : 'circle-check');
      } catch (error) {
        state.access.saving = false;
        state.access.error = error?.code === 'permission-denied'
          ? 'Seu perfil não possui permissão para gerenciar acessos.'
          : 'Não foi possível salvar o acesso. Verifique a conexão e tente novamente.';
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
          ? 'Seu perfil não pode gerenciar perfis e permissões.'
          : 'Não foi possível salvar o perfil.';
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
        showToast('Serviço salvo com sucesso.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode gerenciar serviços.'
          : 'Não foi possível salvar o serviço.';
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
  const deleteServiceDialog = document.querySelector('#delete-service-dialog');
  deleteServiceDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    deleteServiceDialog.close();
    state.settings.pendingDeleteServiceId = '';
    render();
  });

  const scheduleSettingsForm = document.querySelector('#schedule-settings-form');
  if (scheduleSettingsForm) {
    scheduleSettingsForm.elements.storeId.addEventListener('change', () => {
      state.settings.selectedStoreId = scheduleSettingsForm.elements.storeId.value;
      render();
    });
    const generalScheduleDialog = document.querySelector('#general-schedule-dialog');
    const generalScheduleFields = generalScheduleDialog?.querySelector('.schedule-settings-fields');
    const setGeneralScheduleMode = () => {
      const isFree = scheduleSettingsForm.elements.schedulingMode.value === 'free';
      generalScheduleFields?.classList.toggle('is-disabled', isFree);
    };
    const syncGeneralScheduleDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !generalScheduleDialog) return;
      scheduleSettingsForm.elements.schedulingMode.value = record.schedulingMode;
      scheduleSettingsForm.elements.openingTime.value = record.openingTime;
      scheduleSettingsForm.elements.closingTime.value = record.closingTime;
      generalScheduleDialog.querySelector('[name="storeHoursRules"]').value = JSON.stringify(record.storeHoursRules);
      generalScheduleDialog.querySelectorAll('[data-store-hours-row]').forEach((row) => {
        const weekday = Number(row.dataset.storeHoursRow);
        const rule = record.storeHoursRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="storeHoursWeekday"]');
        const openingInput = row.querySelector(`[name="storeOpeningTime-${weekday}"]`);
        const closingInput = row.querySelector(`[name="storeClosingTime-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        openingInput.value = rule?.openingTime || record.openingTime;
        closingInput.value = rule?.closingTime || record.closingTime;
        openingInput.disabled = !rule;
        closingInput.disabled = !rule;
        row.classList.toggle('is-active', Boolean(rule));
      });
      scheduleSettingsForm.elements.noShowGraceMinutes.value = record.noShowGraceMinutes;
      scheduleSettingsForm.elements.rescheduleAfterMinutes.value = record.rescheduleAfterMinutes;
      document.querySelector('#settings-automatic-follow-up').checked = record.automaticPendingFollowUp;
      document.querySelector('#settings-show-ametropias').checked = record.showAmetropiaFields;
      setGeneralScheduleMode();
      setFieldErrors(generalScheduleDialog, {});
    };
    const discardGeneralScheduleDraft = () => {
      syncGeneralScheduleDraft();
      generalScheduleDialog.close();
    };

    document.querySelector('[data-general-schedule-open]')?.addEventListener('click', () => {
      syncGeneralScheduleDraft();
      generalScheduleDialog?.showModal();
    });
    generalScheduleDialog?.querySelectorAll('[data-general-schedule-close]').forEach((button) => {
      button.addEventListener('click', discardGeneralScheduleDraft);
    });
    generalScheduleDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardGeneralScheduleDraft();
    });
    scheduleSettingsForm.elements.schedulingMode.addEventListener('change', () => {
      setGeneralScheduleMode();
      setFieldErrors(generalScheduleDialog, {});
    });
    generalScheduleDialog?.querySelectorAll('[data-store-hours-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="storeHoursWeekday"]');
      const timeInputs = [...row.querySelectorAll('input[type="time"]')];
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        timeInputs.forEach((input) => { input.disabled = !checkbox.checked; });
      });
    });
    generalScheduleDialog?.querySelector('[data-general-schedule-apply]')?.addEventListener('click', () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record) return;
      const schedulingMode = scheduleSettingsForm.elements.schedulingMode.value;
      const storeHoursRules = [...generalScheduleDialog.querySelectorAll('[name="storeHoursWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          openingTime: generalScheduleDialog.querySelector(`[name="storeOpeningTime-${weekday}"]`).value,
          closingTime: generalScheduleDialog.querySelector(`[name="storeClosingTime-${weekday}"]`).value
        };
      });
      const primaryHours = storeHoursRules[0] || { openingTime: record.openingTime, closingTime: record.closingTime };
      const candidate = {
        ...record,
        schedulingMode,
        openingTime: primaryHours.openingTime,
        closingTime: primaryHours.closingTime,
        storeHoursRules,
        noShowGraceMinutes: Number(scheduleSettingsForm.elements.noShowGraceMinutes.value),
        rescheduleAfterMinutes: Number(scheduleSettingsForm.elements.rescheduleAfterMinutes.value),
        automaticPendingFollowUp: document.querySelector('#settings-automatic-follow-up').checked,
        showAmetropiaFields: document.querySelector('#settings-show-ametropias').checked
      };
      const validation = validateStoreSchedule(candidate);
      const errors = Object.fromEntries(Object.entries(validation.errors).filter(([name]) => (
        ['storeHoursRules', 'noShowGraceMinutes', 'rescheduleAfterMinutes'].includes(name)
      )));
      setFieldErrors(generalScheduleDialog, errors);
      if (Object.keys(errors).length) return;

      Object.assign(record, candidate);
      generalScheduleDialog.querySelector('[name="storeHoursRules"]').value = JSON.stringify(storeHoursRules);
      scheduleSettingsForm.elements.openingTime.value = primaryHours.openingTime;
      scheduleSettingsForm.elements.closingTime.value = primaryHours.closingTime;
      document.querySelector('[data-general-schedule-summary]').textContent = schedulingMode === 'free'
        ? 'Cadastro livre'
        : `${storeHoursRules.length} ${storeHoursRules.length === 1 ? 'dia aberto' : 'dias abertos'}`;
      generalScheduleDialog.close();
    });
    const limitedDaysDialog = document.querySelector('#limited-days-dialog');
    const limitedDaysEnabledInput = document.querySelector('#settings-limited-days');
    const limitedDaysFields = limitedDaysDialog?.querySelector('[data-field="limitedDayRules"]');
    const syncLimitedDaysDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !limitedDaysDialog) return;
      limitedDaysEnabledInput.checked = record.limitedDaysEnabled;
      limitedDaysDialog.querySelector('[name="limitedDayRules"]').value = JSON.stringify(record.limitedDayRules);
      limitedDaysDialog.querySelectorAll('[data-limited-day-row]').forEach((row) => {
        const weekday = Number(row.dataset.limitedDayRow);
        const rule = record.limitedDayRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="limitedDayWeekday"]');
        const capacityInput = row.querySelector(`[name="limitedDayCapacity-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        capacityInput.value = rule?.capacity || record.limitedDayCapacity;
        capacityInput.disabled = !rule || !record.limitedDaysEnabled;
        row.classList.toggle('is-active', Boolean(rule));
      });
      limitedDaysFields.disabled = !record.limitedDaysEnabled;
      limitedDaysFields.classList.toggle('is-disabled', !record.limitedDaysEnabled);
      setFieldErrors(limitedDaysDialog, {});
    };
    const discardLimitedDaysDraft = () => {
      syncLimitedDaysDraft();
      limitedDaysDialog.close();
    };

    document.querySelector('[data-limited-days-open]')?.addEventListener('click', () => {
      syncLimitedDaysDraft();
      limitedDaysDialog?.showModal();
    });
    limitedDaysDialog?.querySelectorAll('[data-limited-days-close]').forEach((button) => {
      button.addEventListener('click', discardLimitedDaysDraft);
    });
    limitedDaysDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardLimitedDaysDraft();
    });
    limitedDaysEnabledInput?.addEventListener('change', () => {
      limitedDaysFields.disabled = !limitedDaysEnabledInput.checked;
      limitedDaysFields.classList.toggle('is-disabled', !limitedDaysEnabledInput.checked);
      limitedDaysDialog.querySelectorAll('[data-limited-day-row]').forEach((row) => {
        const checked = row.querySelector('[name="limitedDayWeekday"]').checked;
        row.querySelector('input[type="number"]').disabled = !limitedDaysEnabledInput.checked || !checked;
      });
      setFieldErrors(limitedDaysDialog, {});
    });
    limitedDaysDialog?.querySelectorAll('[name="limitedDayWeekday"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const row = checkbox.closest('[data-limited-day-row]');
        row.classList.toggle('is-active', checkbox.checked);
        row.querySelector('input[type="number"]').disabled = !checkbox.checked;
      });
    });
    limitedDaysDialog?.querySelector('[data-limited-days-apply]')?.addEventListener('click', () => {
      const enabled = limitedDaysEnabledInput.checked;
      const rules = [...limitedDaysDialog.querySelectorAll('[name="limitedDayWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          capacity: Number(limitedDaysDialog.querySelector(`[name="limitedDayCapacity-${weekday}"]`).value)
        };
      });
      const errors = {};

      if (enabled && !rules.length) errors.limitedDayRules = 'Selecione pelo menos um dia.';
      if (enabled && rules.some((rule) => !Number.isInteger(rule.capacity) || rule.capacity < 1 || rule.capacity > 100)) {
        errors.limitedDayRules = 'Informe entre 1 e 100 vagas em cada dia selecionado.';
      }
      setFieldErrors(limitedDaysDialog, errors);
      if (Object.keys(errors).length) return;

      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) {
        record.limitedDaysEnabled = enabled;
        if (enabled) {
          record.limitedDayRules = rules;
          record.limitedWeekdays = rules.map((rule) => rule.weekday);
          record.limitedDayCapacity = rules[0].capacity;
        }
      }
      limitedDaysDialog.querySelector('[name="limitedDayRules"]').value = JSON.stringify(enabled ? rules : record.limitedDayRules);
      document.querySelector('[data-limited-days-summary]').textContent = enabled
        ? `${rules.length} ${rules.length === 1 ? 'dia configurado' : 'dias configurados'}`
        : 'Desativado';
      limitedDaysDialog.close();
    });
    const meiQuotaDialog = document.querySelector('#mei-quota-dialog');
    const meiQuotaEnabledInput = document.querySelector('#settings-mei-quota-enabled');
    const meiQuotaFields = meiQuotaDialog?.querySelector('[data-field="meiQuotaRules"]');
    const syncMeiQuotaDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !meiQuotaDialog) return;
      meiQuotaEnabledInput.checked = record.meiQuotaEnabled;
      meiQuotaDialog.querySelector('[name="meiQuotaRules"]').value = JSON.stringify(record.meiQuotaRules);
      meiQuotaDialog.querySelectorAll('[data-mei-day-row]').forEach((row) => {
        const weekday = Number(row.dataset.meiDayRow);
        const rule = record.meiQuotaRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="meiQuotaWeekday"]');
        const morningInput = row.querySelector(`[name="meiMorningQuota-${weekday}"]`);
        const afternoonInput = row.querySelector(`[name="meiAfternoonQuota-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        morningInput.value = rule?.morningQuota ?? record.meiMorningQuota;
        afternoonInput.value = rule?.afternoonQuota ?? record.meiAfternoonQuota;
        morningInput.disabled = !rule || !record.meiQuotaEnabled;
        afternoonInput.disabled = !rule || !record.meiQuotaEnabled;
        row.classList.toggle('is-active', Boolean(rule));
        row.querySelector('[data-mei-day-total]').textContent = `${Number(morningInput.value) + Number(afternoonInput.value)} total`;
      });
      meiQuotaFields.disabled = !record.meiQuotaEnabled;
      meiQuotaFields.classList.toggle('is-disabled', !record.meiQuotaEnabled);
      setFieldErrors(meiQuotaDialog, {});
    };
    const discardMeiQuotaDraft = () => {
      syncMeiQuotaDraft();
      meiQuotaDialog.close();
    };

    document.querySelector('[data-mei-quota-open]')?.addEventListener('click', () => {
      syncMeiQuotaDraft();
      meiQuotaDialog?.showModal();
    });
    meiQuotaDialog?.querySelectorAll('[data-mei-quota-close]').forEach((button) => {
      button.addEventListener('click', discardMeiQuotaDraft);
    });
    meiQuotaDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardMeiQuotaDraft();
    });
    meiQuotaEnabledInput?.addEventListener('change', () => {
      meiQuotaFields.disabled = !meiQuotaEnabledInput.checked;
      meiQuotaFields.classList.toggle('is-disabled', !meiQuotaEnabledInput.checked);
      meiQuotaDialog.querySelectorAll('[data-mei-day-row]').forEach((row) => {
        const checked = row.querySelector('[name="meiQuotaWeekday"]').checked;
        row.querySelectorAll('input[type="number"]').forEach((input) => {
          input.disabled = !meiQuotaEnabledInput.checked || !checked;
        });
      });
      setFieldErrors(meiQuotaDialog, {});
    });
    meiQuotaDialog?.querySelectorAll('[data-mei-day-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="meiQuotaWeekday"]');
      const quotaInputs = [...row.querySelectorAll('input[type="number"]')];
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        quotaInputs.forEach((input) => { input.disabled = !checkbox.checked; });
      });
      quotaInputs.forEach((input) => input.addEventListener('input', () => {
        row.querySelector('[data-mei-day-total]').textContent = `${Number(quotaInputs[0].value) + Number(quotaInputs[1].value)} total`;
      }));
    });
    meiQuotaDialog?.querySelector('[data-mei-quota-apply]')?.addEventListener('click', () => {
      const enabled = meiQuotaEnabledInput.checked;
      const rules = [...meiQuotaDialog.querySelectorAll('[name="meiQuotaWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          morningQuota: Number(meiQuotaDialog.querySelector(`[name="meiMorningQuota-${weekday}"]`).value),
          afternoonQuota: Number(meiQuotaDialog.querySelector(`[name="meiAfternoonQuota-${weekday}"]`).value)
        };
      });
      const errors = {};

      if (enabled && !rules.length) errors.meiQuotaRules = 'Selecione pelo menos um dia.';
      if (enabled && rules.some((rule) => !Number.isInteger(rule.morningQuota) || rule.morningQuota < 0 || rule.morningQuota > 100
        || !Number.isInteger(rule.afternoonQuota) || rule.afternoonQuota < 0 || rule.afternoonQuota > 100
        || rule.morningQuota + rule.afternoonQuota < 1)) {
        errors.meiQuotaRules = 'Informe cotas válidas em cada dia selecionado.';
      }
      setFieldErrors(meiQuotaDialog, errors);
      if (Object.keys(errors).length) return;

      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (record) {
        record.meiQuotaEnabled = enabled;
        if (enabled) {
          record.meiQuotaRules = rules;
          record.meiQuotaWeekdays = rules.map((rule) => rule.weekday);
          record.meiMorningQuota = rules[0].morningQuota;
          record.meiAfternoonQuota = rules[0].afternoonQuota;
          record.meiDailyQuota = rules[0].morningQuota + rules[0].afternoonQuota;
        }
      }
      meiQuotaDialog.querySelector('[name="meiQuotaRules"]').value = JSON.stringify(enabled ? rules : record.meiQuotaRules);
      document.querySelector('[data-mei-quota-summary]').textContent = enabled
        ? `${rules.length} ${rules.length === 1 ? 'dia configurado' : 'dias configurados'}`
        : 'Desativadas';
      meiQuotaDialog.close();
    });
    const ophthalmologyDialog = document.querySelector('#ophthalmology-dialog');
    const ophthalmologyEnabledInput = document.querySelector('#settings-ophthalmology-enabled');
    const ophthalmologyFields = ophthalmologyDialog?.querySelector('[data-ophthalmology-fields]');
    const setOphthalmologyFieldsState = () => {
      const enabled = ophthalmologyEnabledInput.checked;
      ophthalmologyFields.classList.toggle('is-disabled', !enabled);
    };
    const syncOphthalmologyDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !ophthalmologyDialog) return;
      ophthalmologyEnabledInput.checked = record.ophthalmologyRoutingEnabled;
      scheduleSettingsForm.elements.ophthalmologyMinimumAge.value = record.ophthalmologyMinimumAge;
      scheduleSettingsForm.elements.ophthalmologyOpeningTime.value = record.ophthalmologyOpeningTime;
      scheduleSettingsForm.elements.ophthalmologyClosingTime.value = record.ophthalmologyClosingTime;
      ophthalmologyDialog.querySelector('[name="ophthalmologyHoursRules"]').value = JSON.stringify(record.ophthalmologyHoursRules);
      ophthalmologyDialog.querySelectorAll('[data-ophthalmology-hours-row]').forEach((row) => {
        const weekday = Number(row.dataset.ophthalmologyHoursRow);
        const rule = record.ophthalmologyHoursRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="ophthalmologyWeekday"]');
        const openingInput = row.querySelector(`[name="ophthalmologyOpeningTime-${weekday}"]`);
        const closingInput = row.querySelector(`[name="ophthalmologyClosingTime-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        openingInput.value = rule?.openingTime || record.ophthalmologyOpeningTime;
        closingInput.value = rule?.closingTime || record.ophthalmologyClosingTime;
        openingInput.disabled = !rule;
        closingInput.disabled = !rule;
        row.classList.toggle('is-active', Boolean(rule));
      });
      ophthalmologyDialog.querySelector('[name="ophthalmologyWeekdays"]').value = JSON.stringify(record.ophthalmologyWeekdays);
      setOphthalmologyFieldsState();
      setFieldErrors(ophthalmologyDialog, {});
    };
    const discardOphthalmologyDraft = () => {
      syncOphthalmologyDraft();
      ophthalmologyDialog.close();
    };
    document.querySelector('[data-ophthalmology-open]')?.addEventListener('click', () => {
      syncOphthalmologyDraft();
      ophthalmologyDialog?.showModal();
    });
    ophthalmologyDialog?.querySelectorAll('[data-ophthalmology-close]').forEach((button) => button.addEventListener('click', discardOphthalmologyDraft));
    ophthalmologyDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardOphthalmologyDraft();
    });
    ophthalmologyEnabledInput?.addEventListener('change', setOphthalmologyFieldsState);
    ophthalmologyDialog?.querySelectorAll('[data-ophthalmology-hours-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="ophthalmologyWeekday"]');
      const timeInputs = [...row.querySelectorAll('input[type="time"]')];
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        timeInputs.forEach((input) => { input.disabled = !checkbox.checked; });
      });
    });
    ophthalmologyDialog?.querySelector('[data-ophthalmology-apply]')?.addEventListener('click', () => {
      const enabled = ophthalmologyEnabledInput.checked;
      const ophthalmologyHoursRules = [...ophthalmologyDialog.querySelectorAll('[name="ophthalmologyWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          openingTime: ophthalmologyDialog.querySelector(`[name="ophthalmologyOpeningTime-${weekday}"]`).value,
          closingTime: ophthalmologyDialog.querySelector(`[name="ophthalmologyClosingTime-${weekday}"]`).value
        };
      });
      const primaryHours = ophthalmologyHoursRules[0] || {
        openingTime: scheduleSettingsForm.elements.ophthalmologyOpeningTime.value,
        closingTime: scheduleSettingsForm.elements.ophthalmologyClosingTime.value
      };
      const candidate = {
        ophthalmologyRoutingEnabled: enabled,
        ophthalmologyMinimumAge: Number(scheduleSettingsForm.elements.ophthalmologyMinimumAge.value),
        ophthalmologyWeekdays: ophthalmologyHoursRules.map((rule) => rule.weekday),
        ophthalmologyOpeningTime: primaryHours.openingTime,
        ophthalmologyClosingTime: primaryHours.closingTime,
        ophthalmologyHoursRules,
        ophthalmologyPathologyIds: ['cataract'],
        ophthalmologySurgeryIds: ['cataract']
      };
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      const validation = validateStoreSchedule({ ...record, ...candidate });
      const errors = Object.fromEntries(Object.entries(validation.errors).filter(([name]) => name.startsWith('ophthalmology')));
      setFieldErrors(ophthalmologyDialog, errors);
      if (Object.keys(errors).length) return;
      Object.assign(record, candidate);
      ophthalmologyDialog.querySelector('[name="ophthalmologyWeekdays"]').value = JSON.stringify(candidate.ophthalmologyWeekdays);
      ophthalmologyDialog.querySelector('[name="ophthalmologyHoursRules"]').value = JSON.stringify(ophthalmologyHoursRules);
      scheduleSettingsForm.elements.ophthalmologyOpeningTime.value = primaryHours.openingTime;
      scheduleSettingsForm.elements.ophthalmologyClosingTime.value = primaryHours.closingTime;
      document.querySelector('[data-ophthalmology-summary]').textContent = enabled
        ? `${ophthalmologyHoursRules.length} ${ophthalmologyHoursRules.length === 1 ? 'dia configurado' : 'dias configurados'}`
        : 'Desativado';
      ophthalmologyDialog.close();
    });
    const transportDialog = document.querySelector('#transport-dialog');
    const transportEnabledInput = document.querySelector('#settings-transport-enabled');
    const transportFieldsGroup = transportDialog?.querySelector('[data-transport-fields]');
    const setTransportFieldsState = () => {
      const enabled = transportEnabledInput.checked;
      transportFieldsGroup.disabled = !enabled;
      transportFieldsGroup.classList.toggle('is-disabled', !enabled);
      transportDialog.querySelectorAll('[data-transport-hours-row]').forEach((row) => {
        const checked = row.querySelector('[name="transportWeekday"]').checked;
        row.querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = !enabled || !checked; });
      });
    };
    const syncTransportDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !transportDialog) return;
      transportEnabledInput.checked = record.transportEnabled;
      transportDialog.querySelector('[name="transportHoursRules"]').value = JSON.stringify(record.transportHoursRules);
      transportDialog.querySelectorAll('[data-transport-hours-row]').forEach((row) => {
        const weekday = Number(row.dataset.transportHoursRow);
        const rule = record.transportHoursRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="transportWeekday"]');
        const openingInput = row.querySelector(`[name="transportOpeningTime-${weekday}"]`);
        const closingInput = row.querySelector(`[name="transportClosingTime-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        openingInput.value = rule?.openingTime || '08:00';
        closingInput.value = rule?.closingTime || '18:00';
        row.classList.toggle('is-active', Boolean(rule));
      });
      setTransportFieldsState();
      setFieldErrors(transportDialog, {});
    };
    const discardTransportDraft = () => {
      syncTransportDraft();
      transportDialog.close();
    };
    document.querySelector('[data-transport-open]')?.addEventListener('click', () => {
      syncTransportDraft();
      transportDialog.showModal();
    });
    transportDialog?.querySelectorAll('[data-transport-close]').forEach((button) => button.addEventListener('click', discardTransportDraft));
    transportDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardTransportDraft();
    });
    transportEnabledInput?.addEventListener('change', setTransportFieldsState);
    transportDialog?.querySelectorAll('[data-transport-hours-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="transportWeekday"]');
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        row.querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = !checkbox.checked; });
      });
    });
    transportDialog?.querySelector('[data-transport-apply]')?.addEventListener('click', () => {
      const enabled = transportEnabledInput.checked;
      const rules = [...transportDialog.querySelectorAll('[name="transportWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          openingTime: transportDialog.querySelector(`[name="transportOpeningTime-${weekday}"]`).value,
          closingTime: transportDialog.querySelector(`[name="transportClosingTime-${weekday}"]`).value
        };
      });
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      const candidate = { ...record, transportEnabled: enabled, transportHoursRules: rules };
      const validation = validateStoreSchedule(candidate);
      const errors = Object.fromEntries(Object.entries(validation.errors).filter(([name]) => name.startsWith('transport')));
      setFieldErrors(transportDialog, errors);
      if (Object.keys(errors).length) return;
      record.transportEnabled = enabled;
      if (enabled) record.transportHoursRules = rules;
      transportDialog.querySelector('[name="transportHoursRules"]').value = JSON.stringify(enabled ? rules : record.transportHoursRules);
      document.querySelector('[data-transport-summary]').textContent = enabled
        ? `${rules.length} ${rules.length === 1 ? 'dia configurado' : 'dias configurados'}`
        : 'Desativado';
      transportDialog.close();
    });
    const offlineCaptureDialog = document.querySelector('#offline-capture-dialog');
    const offlineCaptureEnabledInput = document.querySelector('#settings-offline-capture-enabled');
    const syncOfflineCaptureDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !offlineCaptureDialog) return;
      offlineCaptureEnabledInput.checked = record.offlineCaptureEnabled;
    };
    const discardOfflineCaptureDraft = () => {
      syncOfflineCaptureDraft();
      offlineCaptureDialog.close();
    };
    document.querySelector('[data-offline-capture-open]')?.addEventListener('click', () => {
      syncOfflineCaptureDraft();
      offlineCaptureDialog?.showModal();
    });
    offlineCaptureDialog?.querySelectorAll('[data-offline-capture-close]').forEach((button) => {
      button.addEventListener('click', discardOfflineCaptureDraft);
    });
    offlineCaptureDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      discardOfflineCaptureDraft();
    });
    offlineCaptureDialog?.querySelector('[data-offline-capture-apply]')?.addEventListener('click', () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record) return;
      record.offlineCaptureEnabled = offlineCaptureEnabledInput.checked;
      document.querySelector('[data-offline-capture-summary]').textContent = record.offlineCaptureEnabled ? 'Ativado' : 'Desativado';
      offlineCaptureDialog.close();
    });
    scheduleSettingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state.settings.saving) return;
      const formData = new FormData(scheduleSettingsForm);
      const values = Object.fromEntries(formData);
      values.automaticPendingFollowUp = values.automaticPendingFollowUp === 'true';
      values.showAmetropiaFields = values.showAmetropiaFields === 'true';
      values.limitedDaysEnabled = values.limitedDaysEnabled === 'true';
      values.meiQuotaEnabled = values.meiQuotaEnabled === 'true';
      values.ophthalmologyRoutingEnabled = values.ophthalmologyRoutingEnabled === 'true';
      values.transportEnabled = values.transportEnabled === 'true';
      values.offlineCaptureEnabled = values.offlineCaptureEnabled === 'true';
      const current = state.settings.records.find((item) => item.id === values.storeId) || DEFAULT_STORE_SCHEDULE;
      values.appointmentDurationMinutes = current.appointmentDurationMinutes;
      values.storeHoursRules = JSON.parse(values.storeHoursRules || '[]');
      values.openingTime = values.storeHoursRules[0]?.openingTime || current.openingTime;
      values.closingTime = values.storeHoursRules[0]?.closingTime || current.closingTime;
      values.limitedDayRules = JSON.parse(values.limitedDayRules || '[]');
      values.limitedWeekdays = values.limitedDayRules.map((rule) => rule.weekday);
      values.limitedDayCapacity = values.limitedDayRules[0]?.capacity || current.limitedDayCapacity;
      values.meiQuotaRules = JSON.parse(values.meiQuotaRules || '[]');
      values.meiQuotaWeekdays = values.meiQuotaRules.map((rule) => rule.weekday);
      values.meiMorningQuota = values.meiQuotaRules[0]?.morningQuota ?? current.meiMorningQuota;
      values.meiAfternoonQuota = values.meiQuotaRules[0]?.afternoonQuota ?? current.meiAfternoonQuota;
      values.meiDailyQuota = values.meiMorningQuota + values.meiAfternoonQuota;
      values.ophthalmologyMinimumAge = Number(values.ophthalmologyMinimumAge);
      values.ophthalmologyWeekdays = JSON.parse(values.ophthalmologyWeekdays || '[]');
      values.ophthalmologyHoursRules = JSON.parse(values.ophthalmologyHoursRules || '[]');
      values.ophthalmologyWeekdays = values.ophthalmologyHoursRules.map((rule) => rule.weekday);
      values.ophthalmologyOpeningTime = values.ophthalmologyHoursRules[0]?.openingTime || current.ophthalmologyOpeningTime;
      values.ophthalmologyClosingTime = values.ophthalmologyHoursRules[0]?.closingTime || current.ophthalmologyClosingTime;
      values.ophthalmologyPathologyIds = JSON.parse(values.ophthalmologyPathologyIds || '["cataract"]');
      values.ophthalmologySurgeryIds = JSON.parse(values.ophthalmologySurgeryIds || '["cataract"]');
      values.transportHoursRules = JSON.parse(values.transportHoursRules || '[]');
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
            rescheduleAfterMinutes: Number(values.rescheduleAfterMinutes),
            automaticPendingFollowUp: values.automaticPendingFollowUp,
            showAmetropiaFields: values.showAmetropiaFields,
            storeHoursRules: values.storeHoursRules,
            limitedDaysEnabled: values.limitedDaysEnabled,
            limitedDayRules: values.limitedDayRules,
            limitedWeekdays: values.limitedWeekdays,
            limitedDayCapacity: values.limitedDayCapacity,
            meiDailyQuota: values.meiDailyQuota,
            meiQuotaEnabled: values.meiQuotaEnabled,
            meiQuotaRules: values.meiQuotaRules,
            meiQuotaWeekdays: values.meiQuotaWeekdays,
            meiMorningQuota: values.meiMorningQuota,
            meiAfternoonQuota: values.meiAfternoonQuota,
            ophthalmologyRoutingEnabled: values.ophthalmologyRoutingEnabled,
            ophthalmologyMinimumAge: values.ophthalmologyMinimumAge,
            ophthalmologyWeekdays: values.ophthalmologyWeekdays,
            ophthalmologyOpeningTime: values.ophthalmologyOpeningTime,
            ophthalmologyClosingTime: values.ophthalmologyClosingTime,
            ophthalmologyHoursRules: values.ophthalmologyHoursRules,
            ophthalmologyPathologyIds: values.ophthalmologyPathologyIds,
            ophthalmologySurgeryIds: values.ophthalmologySurgeryIds,
            transportEnabled: values.transportEnabled,
            transportHoursRules: values.transportHoursRules,
            offlineCaptureEnabled: values.offlineCaptureEnabled
          });
          if (values.storeId === state.profile.storeId) {
            state.newLeadSchedule.settings = { ...state.newLeadSchedule.settings, ...record };
            state.followUps.settings = { ...state.followUps.settings, ...record };
            state.offlineCapture = { loaded: true, enabled: record.offlineCaptureEnabled };
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
          if (values.storeId === state.profile.storeId) {
            state.offlineCapture = { loaded: true, enabled: result.data.offlineCaptureEnabled };
          }
        }
        state.settings.saving = false;
        render();
        showToast('Configuração da agenda salva.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode alterar estas configurações.'
          : 'Não foi possível salvar a configuração.';
        render();
      }
    });
  }

  const goalForm = document.querySelector('#goal-form');
  if (goalForm) {
    const goalEditorDialog = document.querySelector('#goal-editor-dialog');
    const reopenGoalEditor = (focusTitle = false) => requestAnimationFrame(() => {
      const dialog = document.querySelector('#goal-editor-dialog');
      dialog?.showModal();
      if (focusTitle) document.querySelector('#goal-title')?.focus();
    });
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
      reopenGoalEditor();
    });

    goalForm.querySelectorAll('[name="assigneeUids"]').forEach((input) => {
      input.addEventListener('change', () => {
        state.goals.draft = readDraft();
        const selectedCount = state.goals.draft.assigneeUids.length;
        const count = goalForm.querySelector('[data-goal-selected-count]');
        if (count) count.textContent = `${selectedCount} selecionado(s)`;
      });
    });

    goalEditorDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId;
      state.goals.editorOpen = false;
      state.goals.editingGroupId = '';
      state.goals.duplicatingGroupId = '';
      state.goals.draft = createDefaultGoalDraft(storeId);
      render();
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
        state.goals.editorOpen = false;
        state.goals.editingGroupId = '';
        state.goals.duplicatingGroupId = '';
        state.goals.loaded = false;
        await loadGoalsData();
        showToast(editingGroup ? 'Meta atualizada.' : `${createdCount} meta(s) criada(s).`);
      } catch (error) {
        state.goals.saving = false;
        state.goals.error = error?.code === 'permission-denied'
          ? 'Seu perfil não possui permissão para salvar esta meta.'
          : 'Não foi possível salvar a meta. Verifique a conexão e tente novamente.';
        render();
        reopenGoalEditor();
      }
    });
  }

  const followUpCaptorDialog = document.querySelector('#follow-up-captor-dialog');
  followUpCaptorDialog?.addEventListener('cancel', () => {
    state.followUps.selectedCaptorId = '';
  });
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
      state.dataError = 'Não foi possível carregar os cadastros. Verifique sua conexão ou permissão.';
      render();
    }
  );
}

function stopOfflineCaptureSubscription() {
  state.unsubscribeOfflineCapture?.();
  state.unsubscribeOfflineCapture = null;
}

function startOfflineCaptureSubscription() {
  stopOfflineCaptureSubscription();
  state.offlineCapture = { loaded: state.demoMode, enabled: false };
  if (!state.profile || state.demoMode) return;

  try {
    state.unsubscribeOfflineCapture = subscribeToStoreSchedule(
      state.profile,
      (settings) => {
        state.offlineCapture = { loaded: true, enabled: settings.offlineCaptureEnabled };
        render();
      },
      () => {
        state.offlineCapture = { loaded: true, enabled: false };
        render();
      }
    );
  } catch {
    state.offlineCapture = { loaded: true, enabled: false };
  }
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
    selectedCaptorId: '',
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
        state.followUps.error = 'Não foi possível carregar as configurações das lojas. Usando 30 minutos.';
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
        state.followUps.error = 'Não foi possível carregar a tolerância da loja. Usando 30 minutos.';
        render();
      }
    );
  } catch {
    state.followUps.loaded = true;
    state.followUps.error = 'Não foi possível carregar a tolerância da loja. Usando 30 minutos.';
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
            ? 'Seu perfil não pode consultar os retornos desta equipe.'
            : 'Não foi possível acompanhar os retornos da equipe.';
          render();
        }
      );
    } catch {
      state.followUps.error = 'Não foi possível acompanhar os retornos da equipe.';
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
    state.management.error = 'Informe um período válido.';
    render();
    return;
  }

  if (rangeInDays > 92) {
    state.management.error = 'Consulte no máximo 93 dias por vez para preservar a cota do sistema.';
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
      ? 'Seu perfil não possui permissão para esta consulta.'
      : 'Não foi possível carregar o painel. Verifique a conexão e tente novamente.';
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

function existingLeadForDetail() {
  const leadId = currentRouteParam();
  return state.route === 'management-lead'
    ? findManagementLead(leadId)
    : state.leads.find((item) => item.id === leadId);
}

function refreshLeadDetailAppointmentTime(lead) {
  const container = document.querySelector('#edit-appointment-time-field');
  if (container && lead) container.outerHTML = leadDetailAppointmentTimeField(lead);
}

function startLeadDetailDayAppointmentsSubscription(lead) {
  state.unsubscribeDayAppointments?.();
  state.unsubscribeDayAppointments = null;
  state.leadDetailSchedule.appointments = [];
  state.leadDetailSchedule.error = '';
  const appointmentDate = state.leadDetailSchedule.appointmentDate;
  if (!lead || !appointmentDate || state.leadDetailSchedule.settings.schedulingMode === 'free') {
    state.leadDetailSchedule.appointmentLoading = false;
    refreshLeadDetailAppointmentTime(lead);
    return;
  }

  if (state.demoMode) {
    state.leadDetailSchedule.appointments = state.leads.filter((item) => item.appointmentDate === appointmentDate);
    state.leadDetailSchedule.appointmentLoading = false;
    refreshLeadDetailAppointmentTime(lead);
    return;
  }

  state.leadDetailSchedule.appointmentLoading = true;
  refreshLeadDetailAppointmentTime(lead);
  try {
    state.unsubscribeDayAppointments = subscribeToDayAppointments(
      { ...state.profile, storeId: lead.storeId },
      appointmentDate,
      (appointments) => {
        if (state.leadDetailSchedule.appointmentDate !== appointmentDate) return;
        state.leadDetailSchedule.appointments = appointments;
        state.leadDetailSchedule.appointmentLoading = false;
        state.leadDetailSchedule.error = '';
        refreshLeadDetailAppointmentTime(existingLeadForDetail());
      },
      () => {
        if (state.leadDetailSchedule.appointmentDate !== appointmentDate) return;
        state.leadDetailSchedule.appointmentLoading = false;
        state.leadDetailSchedule.error = 'Não foi possível consultar os horários.';
        refreshLeadDetailAppointmentTime(existingLeadForDetail());
      },
      lead.storeId
    );
  } catch {
    state.leadDetailSchedule.appointmentLoading = false;
    state.leadDetailSchedule.error = 'Não foi possível consultar os horários.';
    refreshLeadDetailAppointmentTime(lead);
  }
}

async function ensureLeadDetailSchedule() {
  if (!['lead', 'management-lead'].includes(state.route) || !state.profile || state.leadDetailSchedule.loading) return;
  const leadId = currentRouteParam();
  const lead = state.route === 'management-lead'
    ? findManagementLead(leadId)
    : state.leads.find((item) => item.id === leadId);
  if (!lead?.storeId || (state.leadDetailSchedule.leadId === lead.id && state.leadDetailSchedule.storeId === lead.storeId)) return;

  state.leadDetailSchedule.loading = true;
  state.leadDetailSchedule.leadId = lead.id;
  state.leadDetailSchedule.appointmentDate = lead.appointmentDate || '';
  state.leadDetailSchedule.appointments = [];
  state.leadDetailSchedule.services = [];
  state.leadDetailSchedule.serviceId = lead.appointmentServiceId || '';
  state.leadDetailSchedule.error = '';
  try {
    const [settings, services] = state.demoMode
      ? [
          state.settings.records.find((item) => item.id === lead.storeId) || { ...DEFAULT_STORE_SCHEDULE, id: lead.storeId },
          state.settings.services.length
            ? state.settings.services
            : [defaultAppointmentService(lead.storeId, lead.appointmentDurationMinutes || DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes)]
        ]
      : await Promise.all([
          loadStoreSchedule(state.profile, lead.storeId),
          loadAppointmentServices(state.profile)
        ]);
    state.leadDetailSchedule.storeId = lead.storeId;
    state.leadDetailSchedule.settings = { ...DEFAULT_STORE_SCHEDULE, ...settings };
    state.leadDetailSchedule.services = services;
    if (!servicesForStore(state.leadDetailSchedule.services, lead.storeId).length) {
      state.leadDetailSchedule.services.push(defaultAppointmentService(lead.storeId, state.leadDetailSchedule.settings.appointmentDurationMinutes));
    }
    const availableServices = servicesForStore(state.leadDetailSchedule.services, lead.storeId);
    state.leadDetailSchedule.serviceId = availableServices.some((service) => service.id === lead.appointmentServiceId)
      ? lead.appointmentServiceId
      : availableServices[0]?.id || '';
  } catch {
    state.leadDetailSchedule.storeId = lead.storeId;
    state.leadDetailSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
    state.leadDetailSchedule.services = [defaultAppointmentService(lead.storeId, lead.appointmentDurationMinutes || DEFAULT_STORE_SCHEDULE.appointmentDurationMinutes)];
    state.leadDetailSchedule.serviceId = state.leadDetailSchedule.services[0].id;
    state.leadDetailSchedule.error = 'Não foi possível carregar a agenda desta loja.';
  } finally {
    state.leadDetailSchedule.loading = false;
    render();
    startLeadDetailDayAppointmentsSubscription(lead);
  }
}

function stopAppointmentsSubscription() {
  state.unsubscribeAppointments?.();
  state.unsubscribeAppointments = null;
}

function stopConfirmationsSubscription() {
  state.unsubscribeConfirmations?.();
  state.unsubscribeConfirmations = null;
}

function startConfirmationsSubscription() {
  if (!hasAccess('appointments.view') || state.demoMode || state.route !== 'confirmations') return;
  stopConfirmationsSubscription();
  const startDate = toLocalDateInput(new Date());
  const endDate = addDaysToDateInput(startDate, 6);
  state.confirmations.loading = true;
  state.confirmations.loaded = false;
  state.confirmations.error = '';
  render();
  state.unsubscribeConfirmations = subscribeToAppointmentConfirmations(
    state.profile,
    startDate,
    endDate,
    (result) => {
      state.confirmations.records = result.records;
      state.confirmations.truncated = result.truncated;
      state.confirmations.loaded = true;
      state.confirmations.loading = false;
      render();
    },
    (error) => {
      state.confirmations.error = error?.code === 'permission-denied'
        ? 'Seu perfil não possui permissão para consultar estas confirmações.'
        : 'Não foi possível carregar as confirmações. Verifique a conexão e tente novamente.';
      state.confirmations.loading = false;
      state.confirmations.loaded = false;
      stopConfirmationsSubscription();
      render();
    }
  );
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
        ? 'Seu perfil não possui permissão para consultar esta agenda.'
        : 'Não foi possível acompanhar a agenda. Verifique a conexão e tente novamente.';
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
    state.appointmentCreate.error = 'Não foi possível carregar os horários das lojas.';
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

function ensureConfirmationsData() {
  if (state.route === 'confirmations' && hasAccess('appointments.view') && !state.demoMode && !state.unsubscribeConfirmations) {
    startConfirmationsSubscription();
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
  const service = selectedNewLeadService();
  const triage = ophthalmologyTriage(state.newLeadSchedule.triage || {}, settings);
  const routeDateAllowed = triage.careRoute === 'ophthalmologist'
    ? isOphthalmologyDateAllowed(settings, appointmentDate)
    : isStoreDateAllowed(settings, appointmentDate);
  const needsTransport = state.newLeadSchedule.triage?.needsTransport === true || state.newLeadSchedule.triage?.needsTransport === 'true';
  const transportDateAllowed = !needsTransport || isTransportDateAllowed(settings, appointmentDate);
  const dateAllowed = routeDateAllowed && transportDateAllowed;
  const slots = appointmentDate && settings.schedulingMode === 'controlled'
    ? buildAppointmentSlots(
      {
        ...(triage.careRoute === 'ophthalmologist' ? ophthalmologyAppointmentSchedule(settings) : settings),
        appointmentDurationMinutes: service.durationMinutes
      },
      appointments,
      '',
      { appointmentDate, profile: newLeadCaptureProfile() }
    )
    : [];
  const availableSlots = slots.filter((slot) => slot.available && (!needsTransport || isTransportAppointmentAllowed(
    settings,
    appointmentDate,
    slot.time,
    service.durationMinutes
  )));
  const fullyBooked = Boolean(appointmentDate && dateAllowed && !loading && !error && slots.length && !availableSlots.length);
  dateField?.classList.toggle('is-fully-booked', fullyBooked);
  dateField?.classList.toggle('is-date-restricted', Boolean(appointmentDate && !dateAllowed));
  if (dateStatus) dateStatus.textContent = !transportDateAllowed
    ? 'Não há transporte disponível neste dia.'
    : !routeDateAllowed
      ? triage.careRoute === 'ophthalmologist' ? 'O oftalmologista não atende neste dia.' : 'A loja não funciona neste dia.'
    : fullyBooked ? 'Dia sem horários disponíveis.' : '';
}

function refreshNewLeadAmetropiaField() {
  const form = document.querySelector('#lead-form');
  const pathologiesField = document.querySelector('#new-lead-pathologies');
  const existingField = document.querySelector('#new-lead-ametropias');
  if (!form || !pathologiesField) return;

  if (!state.newLeadSchedule.settings.showAmetropiaFields) {
    existingField?.remove();
    return;
  }
  if (existingField) return;

  pathologiesField.insertAdjacentHTML('beforebegin', `<fieldset id="new-lead-ametropias" class="field ametropia-field">
    <legend>Ametropias</legend>
    <small>Marque todas que se aplicam.</small>
    <div class="ametropia-options">${ametropiaOptions()}</div>
  </fieldset>`);
  bindExclusiveOptions(form, 'ametropiaIds');
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
    state.newLeadSchedule.appointments = state.leads.filter((lead) => (
      lead.storeId === selectedNewLeadStoreId() && lead.appointmentDate === appointmentDate
    ));
    state.newLeadSchedule.loading = false;
    refreshAppointmentTimeControl();
    return;
  }

  state.newLeadSchedule.loading = true;
  refreshAppointmentTimeControl();
  try {
    state.unsubscribeDayAppointments = subscribeToDayAppointments(
      newLeadCaptureProfile(),
      appointmentDate,
      (appointments) => {
        state.newLeadSchedule.appointments = appointments;
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = '';
        refreshAppointmentTimeControl();
      },
      () => {
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = 'Não foi possível consultar os horários desta data.';
        refreshAppointmentTimeControl();
      },
      selectedNewLeadStoreId()
    );
  } catch {
    state.newLeadSchedule.loading = false;
    state.newLeadSchedule.error = 'Não foi possível consultar os horários desta data.';
    refreshAppointmentTimeControl();
  }
}

async function ensureNewLeadSchedule() {
  if (state.route !== 'new' || !state.profile || state.newLeadSchedule.loaded || state.newLeadSchedule.loading) return;
  const storeId = selectedNewLeadStoreId();
  state.newLeadSchedule.loading = true;
  if (state.demoMode) {
    const configured = state.settings.records.find((item) => item.id === storeId);
    state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE, ...(configured || {}) };
    state.newLeadSchedule.services = [...state.settings.services];
    if (storeId && !servicesForStore(state.newLeadSchedule.services, storeId).length) {
      state.newLeadSchedule.services.push(defaultAppointmentService(storeId, state.newLeadSchedule.settings.appointmentDurationMinutes));
    }
    const availableServices = servicesForStore(state.newLeadSchedule.services, storeId);
    state.newLeadSchedule.serviceId = availableServices.some((service) => service.id === state.newLeadSchedule.draft.appointmentServiceId)
      ? state.newLeadSchedule.draft.appointmentServiceId
      : availableServices[0]?.id || '';
    state.newLeadSchedule.loaded = true;
    state.newLeadSchedule.loading = false;
    render();
    return;
  }
  try {
    state.newLeadSchedule.services = await loadAppointmentServices(state.profile);
    if (storeId && !servicesForStore(state.newLeadSchedule.services, storeId).length) {
      state.newLeadSchedule.services.push(defaultAppointmentService(storeId, state.newLeadSchedule.settings.appointmentDurationMinutes));
    }
    const availableServices = servicesForStore(state.newLeadSchedule.services, storeId);
    state.newLeadSchedule.serviceId = availableServices.some((service) => service.id === state.newLeadSchedule.draft.appointmentServiceId)
      ? state.newLeadSchedule.draft.appointmentServiceId
      : availableServices[0]?.id || '';
  } catch {
    state.newLeadSchedule.services = storeId ? [defaultAppointmentService(storeId, state.newLeadSchedule.settings.appointmentDurationMinutes)] : [];
    state.newLeadSchedule.serviceId = state.newLeadSchedule.services[0]?.id || '';
  }
  if (state.route !== 'new' || storeId !== selectedNewLeadStoreId()) return;
  if (!storeId) {
    state.newLeadSchedule.loaded = true;
    state.newLeadSchedule.loading = false;
    render();
    return;
  }
  try {
    state.unsubscribeStoreSchedule = subscribeToStoreSchedule(
      newLeadCaptureProfile(),
      (settings) => {
        if (state.route !== 'new' || storeId !== selectedNewLeadStoreId()) return;
        const firstLoad = !state.newLeadSchedule.loaded;
        state.newLeadSchedule.settings = settings;
        state.newLeadSchedule.loaded = true;
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = '';
        if (firstLoad) {
          render();
          return;
        }
        refreshNewLeadAmetropiaField();
        refreshAppointmentTimeControl();
      },
      () => {
        if (state.route !== 'new' || storeId !== selectedNewLeadStoreId()) return;
        const firstLoad = !state.newLeadSchedule.loaded;
        state.newLeadSchedule.settings = { ...DEFAULT_STORE_SCHEDULE };
        state.newLeadSchedule.loaded = true;
        state.newLeadSchedule.loading = false;
        state.newLeadSchedule.error = 'Usando a configuração padrão da agenda.';
        if (firstLoad) {
          render();
          return;
        }
        refreshNewLeadAmetropiaField();
        refreshAppointmentTimeControl();
      },
      storeId
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
      ? 'Seu perfil não pode consultar estas configurações.'
      : 'Não foi possível carregar as configurações das lojas.';
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
      ? 'Seu perfil não pode consultar os perfis de acesso.'
      : 'Não foi possível carregar os perfis de acesso.';
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
      ? 'Seu perfil não pode consultar os serviços.'
      : 'Não foi possível carregar os serviços.';
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
      state.access.error = 'Os acessos foram carregados, mas os perfis personalizados estão temporariamente indisponíveis.';
    }
    state.access.loaded = true;
  } catch (error) {
    state.access.error = error?.code === 'permission-denied'
      ? 'Seu perfil não possui permissão para consultar acessos.'
      : 'Não foi possível carregar os acessos. Verifique a conexão e tente novamente.';
  } finally {
    state.access.loading = false;
    state.access.saving = false;
    render();
  }
}

function ensureAccessData() {
  if (state.route === 'access' && isAdmin() && !state.demoMode && !state.access.loaded) {
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
      ? 'Seu perfil não possui permissão para consultar estas metas.'
      : 'Não foi possível carregar as metas. Verifique a conexão e tente novamente.';
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
    startOfflineCaptureSubscription();
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
      state.authError = readableAuthError(error, 'Não foi possível entrar com o Google.');
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
          state.authMessage = 'Este acesso já estava preparado. Enviamos um link para você definir sua senha.';
        } catch (resetError) {
          state.authError = readableAuthError(resetError, 'Não foi possível enviar a definição de senha.');
        }
      } else {
        state.authError = readableAuthError(error, 'Não foi possível criar o primeiro acesso.');
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
      state.authMessage = 'Enviamos as instruções de recuperação para o e-mail informado.';
    } catch (error) {
      state.authError = readableAuthError(error, 'Não foi possível enviar a recuperação de senha.');
    }
    render();
  }

  if (action === 'logout') {
    state.unsubscribeProfile?.();
    state.unsubscribeProfile = null;
    state.unsubscribeLeads?.();
    state.unsubscribeLeads = null;
    stopAppointmentsSubscription();
    stopConfirmationsSubscription();
    stopNewLeadScheduleSubscriptions();
    stopOfflineCaptureSubscription();
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
      activeLead: null,
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
    state.confirmations = {
      loading: false,
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      filter: 'pending',
      updatingId: ''
    };
    state.appointmentCreate = {
      loading: false,
      saving: false,
      error: '',
      schedules: [],
      storeId: '',
      services: [],
      serviceId: '',
      draft: {}
    };
    state.newLeadSchedule = {
      loaded: false,
      loading: false,
      error: '',
      storeId: '',
      settings: { ...DEFAULT_STORE_SCHEDULE },
      appointmentDate: '',
      appointments: [],
      services: [],
      serviceId: '',
      triage: {},
      draft: {}
    };
    state.leadDetailSchedule = {
      loading: false,
      appointmentLoading: false,
      leadId: '',
      storeId: '',
      appointmentDate: '',
      appointments: [],
      services: [],
      serviceId: '',
      error: '',
      settings: { ...DEFAULT_STORE_SCHEDULE }
    };
    state.offlineCapture = { loaded: false, enabled: false };
    state.followUps = {
      loaded: false,
      error: '',
      records: [],
      truncated: false,
      filter: 'all',
      selectedCaptorId: '',
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
      pendingDeleteServiceId: '',
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
      editorOpen: false,
      editingGroupId: '',
      duplicatingGroupId: '',
      pendingDeleteGroupId: '',
      draft: createDefaultGoalDraft()
    };
    render();
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
      state.savwin.error = error.message || 'Não foi possível consultar o SavWin.';
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
    const confirmationFilterButton = event.target.closest('[data-confirmation-filter]');
    if (confirmationFilterButton) {
      state.confirmations.filter = confirmationFilterButton.dataset.confirmationFilter;
      render();
      return;
    }
    const confirmationDoneButton = event.target.closest('[data-confirmation-done]');
    if (confirmationDoneButton && !confirmationDoneButton.disabled) {
      const records = state.demoMode ? state.leads : state.confirmations.records;
      const lead = records.find((item) => item.id === confirmationDoneButton.dataset.confirmationDone);
      if (!lead) return;
      state.confirmations.updatingId = lead.id;
      render();
      try {
        if (state.demoMode) {
          if (!markDemoAppointmentReminderDone(lead.id, state.profile)) throw new Error('not-found');
        } else {
          await markAppointmentReminderDone(state.profile, lead);
          const reminderUpdate = {
            appointmentReminderSentAt: new Date().toISOString(),
            appointmentReminderSentByUid: state.profile.uid,
            appointmentReminderSentByName: state.profile.displayName,
            appointmentReminderAppointmentKey: followUpAppointmentKey(lead)
          };
          state.confirmations.records = state.confirmations.records.map((item) => item.id === lead.id
            ? { ...item, ...reminderUpdate }
            : item);
        }
        showToast('Lembrete marcado como feito.');
      } catch (error) {
        showToast(error?.code === 'permission-denied'
          ? 'Seu perfil não pode concluir este lembrete.'
          : 'Não foi possível marcar o lembrete como feito.', 'danger', 'circle-alert');
      } finally {
        state.confirmations.updatingId = '';
        render();
      }
      return;
    }
    const confirmationUndoButton = event.target.closest('[data-confirmation-undo]');
    if (confirmationUndoButton && !confirmationUndoButton.disabled) {
      const records = state.demoMode ? state.leads : state.confirmations.records;
      const lead = records.find((item) => item.id === confirmationUndoButton.dataset.confirmationUndo);
      if (!lead) return;
      state.confirmations.updatingId = lead.id;
      render();
      try {
        if (state.demoMode) {
          if (!undoDemoAppointmentReminderDone(lead.id, state.profile)) throw new Error('not-found');
        } else {
          await undoAppointmentReminderDone(state.profile, lead);
          state.confirmations.records = state.confirmations.records.map((item) => {
            if (item.id !== lead.id) return item;
            const {
              appointmentReminderSentAt,
              appointmentReminderSentByUid,
              appointmentReminderSentByName,
              appointmentReminderAppointmentKey,
              ...pendingLead
            } = item;
            return pendingLead;
          });
        }
        showToast('Conclusão do lembrete desfeita.');
      } catch (error) {
        showToast(error?.code === 'permission-denied'
          ? 'Seu perfil não pode reabrir este lembrete.'
          : 'Não foi possível desfazer a conclusão.', 'danger', 'circle-alert');
      } finally {
        state.confirmations.updatingId = '';
        render();
      }
      return;
    }
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
        showToast('Mantenha pelo menos um serviço ativo em cada unidade atendida.', 'warning', 'circle-alert');
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
        showToast(service.active ? 'Serviço desativado.' : 'Serviço ativado.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode alterar este serviço.'
          : error?.code === 'last-active-service'
            ? error.message
            : 'Não foi possível alterar o serviço.';
        render();
      }
      return;
    }
    const deleteServiceButton = event.target.closest('[data-service-delete]');
    if (deleteServiceButton && !deleteServiceButton.disabled) {
      state.settings.pendingDeleteServiceId = deleteServiceButton.dataset.serviceDelete;
      render();
      document.querySelector('#delete-service-dialog')?.showModal();
      return;
    }
    if (event.target.closest('[data-service-delete-cancel]')) {
      document.querySelector('#delete-service-dialog')?.close();
      state.settings.pendingDeleteServiceId = '';
      render();
      return;
    }
    const confirmServiceDeleteButton = event.target.closest('[data-service-delete-confirm]');
    if (confirmServiceDeleteButton && !confirmServiceDeleteButton.disabled) {
      const service = state.settings.services.find((item) => item.id === confirmServiceDeleteButton.dataset.serviceDeleteConfirm);
      if (!service) return;
      state.settings.saving = true;
      render();
      try {
        if (state.demoMode) {
          const uncoveredStoreIds = service.active ? service.storeIds.filter((storeId) => !servicesForStore(
            state.settings.services.filter((item) => item.id !== service.id), storeId
          ).length) : [];
          if (uncoveredStoreIds.length) {
            const error = new Error('Mantenha pelo menos um serviço ativo em cada unidade atendida.');
            error.code = 'last-active-service';
            throw error;
          }
          state.settings.services = state.settings.services.filter((item) => item.id !== service.id);
          state.settings.saving = false;
        } else {
          await deleteAppointmentService(state.profile, service);
        }
        state.settings.pendingDeleteServiceId = '';
        if (!state.demoMode) await loadServiceCatalogData();
        else render();
        showToast('Serviço excluído.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.pendingDeleteServiceId = '';
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode excluir este serviço.'
          : error?.code === 'last-active-service'
            ? error.message
            : 'Não foi possível excluir o serviço.';
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
            showToast(result.errors.permissions || 'Escolha permissões válidas.', 'danger', 'circle-alert');
            render();
            return;
          }
        }
        state.settings.detailsRoleId = '';
        state.settings.detailsRolePermissions = [];
        if (!state.demoMode) await loadRoleProfilesData();
        else render();
        showToast('Permissões do perfil atualizadas.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode alterar estas permissões.'
          : error?.message || 'Não foi possível salvar as permissões.';
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
        showToast('Permissões restauradas para o padrão.');
      } catch (error) {
        state.settings.saving = false;
        state.settings.error = error?.code === 'permission-denied'
          ? 'Seu perfil não pode restaurar estas permissões.'
          : error?.message || 'Não foi possível restaurar o perfil.';
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
          showToast('Cargo excluído.');
        } catch (error) {
          state.settings.saving = false;
          state.settings.pendingDeleteRoleId = '';
          state.settings.error = error?.code === 'role-in-use' ? error.message : 'Não foi possível excluir o perfil.';
          render();
        }
      }
    }
    const followUpCaptorButton = event.target.closest('[data-follow-up-captor]');
    if (followUpCaptorButton) {
      state.followUps.selectedCaptorId = followUpCaptorButton.dataset.followUpCaptor;
      render();
      requestAnimationFrame(() => document.querySelector('#follow-up-captor-dialog')?.showModal());
      return;
    }
    const closeFollowUpCaptorButton = event.target.closest('[data-follow-up-captor-close]');
    if (closeFollowUpCaptorButton) {
      closeFollowUpCaptorButton.closest('dialog')?.close();
      state.followUps.selectedCaptorId = '';
      return;
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
          if (state.followUps.selectedCaptorId) {
            requestAnimationFrame(() => document.querySelector('#follow-up-captor-dialog')?.showModal());
          }
        } catch {
          showToast('O WhatsApp foi aberto, mas o contato não foi registrado.', 'warning', 'circle-alert');
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
        state.followUps.selectedCaptorId = '';
        state.management.activeLead = lead;
        navigate('management-lead', lead.id);
      }
    }
    const managementLeadButton = event.target.closest('[data-management-lead-id]');
    if (managementLeadButton) {
      const lead = state.management.records.find((item) => item.id === managementLeadButton.dataset.managementLeadId);
      if (lead) state.management.activeLead = lead;
      navigate('management-lead', managementLeadButton.dataset.managementLeadId);
    }
    const appointmentLeadButton = event.target.closest('[data-appointment-lead-id]');
    if (appointmentLeadButton) {
      const appointmentRecords = state.demoMode ? state.leads : state.appointments.records;
      const lead = appointmentRecords.find((item) => item.id === appointmentLeadButton.dataset.appointmentLeadId);
      if (lead) {
        state.management.activeLead = lead;
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
          ? 'Seu perfil não pode alterar este agendamento.'
          : 'Não foi possível salvar o comparecimento.', 'danger', 'circle-alert');
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
      const lead = findManagementLead(deleteLeadButton.dataset.deleteLead)
        || state.leads.find((item) => item.id === deleteLeadButton.dataset.deleteLead);
      const dialog = document.querySelector('#delete-lead-dialog');
      if (lead && dialog) dialog.showModal();
    }
    const closeDeleteDialogButton = event.target.closest('[data-close-delete-dialog]');
    if (closeDeleteDialogButton) {
      closeDeleteDialogButton.closest('dialog')?.close();
    }
    const confirmDeleteButton = event.target.closest('[data-confirm-delete]');
    if (confirmDeleteButton && !confirmDeleteButton.disabled) {
      const lead = findManagementLead(confirmDeleteButton.dataset.confirmDelete)
        || state.leads.find((item) => item.id === confirmDeleteButton.dataset.confirmDelete);
      if (!lead) return;
      const returnRoute = state.route === 'management-lead' ? 'management' : 'leads';
      confirmDeleteButton.disabled = true;
      try {
        await deleteManagementLead(state.profile, lead);
        state.leads = state.leads.filter((item) => item.id !== lead.id);
        state.management.records = state.management.records.filter((item) => item.id !== lead.id);
        state.appointments.records = state.appointments.records.filter((item) => item.id !== lead.id);
        state.management.activeLead = null;
        navigate(returnRoute);
        showToast('Lead excluído definitivamente.');
      } catch (error) {
        confirmDeleteButton.disabled = false;
        showToast(error?.code === 'permission-denied' ? 'Seu perfil não pode excluir este lead.' : 'Não foi possível excluir o lead.', 'danger', 'circle-alert');
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
        state.access.error = error.message || 'Não foi possível alterar o acesso.';
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
        showToast('Acesso excluído. O histórico da pessoa foi preservado.');
      } catch (error) {
        state.access.saving = false;
        confirmDeleteAccessButton.disabled = false;
        showToast(error?.message || 'Não foi possível excluir o acesso.', 'danger', 'circle-alert');
      }
    }
    const newGoalButton = event.target.closest('[data-goal-new]');
    if (newGoalButton && !newGoalButton.disabled) {
      const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId || state.profile.storeId;
      state.goals.editorOpen = true;
      state.goals.editingGroupId = '';
      state.goals.duplicatingGroupId = '';
      state.goals.draft = createDefaultGoalDraft(storeId);
      render();
      requestAnimationFrame(() => {
        document.querySelector('#goal-editor-dialog')?.showModal();
        document.querySelector('#goal-title')?.focus();
      });
    }
    const editGoalButton = event.target.closest('[data-edit-goal]');
    if (editGoalButton && !editGoalButton.disabled) {
      const group = groupGoalRecords(state.goals.records).find((item) => item.id === editGoalButton.dataset.editGoal);
      if (!group) return;
      state.goals.editorOpen = true;
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
      requestAnimationFrame(() => {
        document.querySelector('#goal-editor-dialog')?.showModal();
        document.querySelector('#goal-title')?.focus();
      });
    }
    const duplicateGoalButton = event.target.closest('[data-duplicate-goal]');
    if (duplicateGoalButton && !duplicateGoalButton.disabled) {
      const group = groupGoalRecords(state.goals.records).find((item) => item.id === duplicateGoalButton.dataset.duplicateGoal);
      if (!group) return;
      state.goals.editorOpen = true;
      state.goals.editingGroupId = '';
      state.goals.duplicatingGroupId = group.id;
      state.goals.draft = duplicateGoalDraft(group);
      showToast('Meta duplicada no formulário. Revise e salve.');
      requestAnimationFrame(() => {
        document.querySelector('#goal-editor-dialog')?.showModal();
        const titleInput = document.querySelector('#goal-title');
        titleInput?.focus({ preventScroll: true });
        titleInput?.select();
      });
      return;
    }
    const cancelGoalEditButton = event.target.closest('[data-cancel-goal-edit]');
    if (cancelGoalEditButton) {
      const storeId = state.profile.role === 'manager' ? state.profile.storeId : state.goals.draft.storeId;
      document.querySelector('#goal-editor-dialog')?.close();
      state.goals.editorOpen = false;
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
          ? 'Seu perfil não pode excluir esta meta.'
          : 'Não foi possível excluir a meta.';
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
    if (previousRoute === 'management-lead' && state.route !== 'management-lead') {
      state.management.activeLead = null;
    }
    if (state.route !== 'appointments') stopAppointmentsSubscription();
    if (state.route !== 'confirmations') stopConfirmationsSubscription();
    if (state.route !== 'new') {
      stopNewLeadScheduleSubscriptions();
      state.newLeadSchedule.loaded = false;
      state.newLeadSchedule.storeId = '';
      state.newLeadSchedule.appointmentDate = '';
      state.newLeadSchedule.appointments = [];
      state.newLeadSchedule.triage = {};
      state.newLeadSchedule.draft = {};
    } else if (previousRoute !== 'new') {
      state.newLeadSchedule.loaded = false;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    render();
    ensureManagementData();
    ensureAppointmentsData();
    ensureConfirmationsData();
    ensureNewLeadSchedule();
    ensureLeadDetailSchedule();
    ensureAccessData();
    ensureGoalsData();
    ensureSettingsData();
  });

  window.addEventListener('online', handleConnectivityChange);
  window.addEventListener('offline', handleConnectivityChange);
  window.addEventListener('resize', syncAgendaSidebarHeight);
  window.setInterval(() => {
    if (['captor', 'manager', 'admin'].includes(state.profile?.role) && ['home', 'follow-ups'].includes(state.route)) render();
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.profile && !state.demoMode) {
      synchronizePendingRegistrations();
    }
  });

  if (sessionStorage.getItem(DEMO_SESSION_KEY) === 'true' && import.meta.env.DEV) {
    state.demoMode = true;
    state.profile = createDemoProfile();
    state.loading = false;
    subscribeProfileLeads();
    startOfflineCaptureSubscription();
    startFollowUpScheduleSubscription();
    render();
    return;
  }

  try {
    await completeRedirectSignIn();
  } catch (error) {
    state.authError = readableAuthError(error, 'Não foi possível concluir o acesso.');
  }

  observeAuth(async (firebaseUser) => {
    state.unsubscribeProfile?.();
    state.unsubscribeProfile = null;
    stopOfflineCaptureSubscription();
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
      if (navigator.onLine) synchronizePendingRegistrations();
      startOfflineCaptureSubscription();
      startFollowUpScheduleSubscription();
      state.unsubscribeProfile = observeAuthorizedProfile(firebaseUser, (profile) => {
        if (profileAccessSignature(profile) === profileAccessSignature(state.profile)) return;
        state.profile = profile;
        state.management.loaded = false;
        state.management.records = [];
        state.management.activeLead = null;
        state.access.loaded = false;
        state.goals.loaded = false;
        state.settings.loaded = false;
        if (!hasAccess('appointments.view')) {
          stopAppointmentsSubscription();
          stopConfirmationsSubscription();
        }
        subscribeProfileLeads();
        startOfflineCaptureSubscription();
        startFollowUpScheduleSubscription();
        render();
        ensureManagementData();
        ensureAppointmentsData();
        ensureConfirmationsData();
        ensureNewLeadSchedule();
        ensureLeadDetailSchedule();
        ensureAccessData();
        ensureGoalsData();
        ensureSettingsData();
      }, (error) => {
        state.dataError = error?.message || 'Não foi possível atualizar as permissões deste acesso.';
        render();
      });
    } catch (error) {
      state.profile = null;
      state.authError = error.message || 'Acesso não autorizado.';
    } finally {
      state.loading = false;
      render();
      ensureManagementData();
      ensureAppointmentsData();
      ensureConfirmationsData();
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
