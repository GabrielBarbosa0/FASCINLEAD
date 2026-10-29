import { isFirebaseConfigured } from '../firebase/client.js';
import { markDemoAppointmentReminderDone, markDemoFollowUpContact, saveLead, subscribeToLeads, undoDemoAppointmentReminderDone, updateDemoAppointmentAttendance, updateLead } from '../services/lead-service.js';
import { markFollowUpContactStarted, subscribeToTeamFollowUps } from '../services/follow-up-service.js';
import { loadRoleProfiles } from '../services/role-profile-service.js';
import { deleteManagementLead, loadManagementLeads, MANAGEMENT_QUERY_LIMIT, updateManagementLead } from '../services/management-service.js';
import { createGoals, deleteGoalGroup, GOALS_LEAD_LIMIT, loadGoalsDashboard, updateGoalGroup } from '../services/goal-service.js';
import { APPOINTMENTS_QUERY_LIMIT, loadUpcomingAppointments, markAppointmentReminderDone, setAppointmentAttendance, subscribeToAppointmentConfirmations, subscribeToAppointments, undoAppointmentReminderDone } from '../services/appointment-service.js';
import { backfillAppointmentSlots, loadStoreSchedule, loadStoreSchedules, saveStoreSchedule, subscribeToDayAppointments, subscribeToStoreSchedule } from '../services/schedule-service.js';
import { ensureDefaultAppointmentServices, loadAppointmentServices } from '../services/service-catalog-service.js';
import { consultLocalSavwinSales, isLocalSavwinEnabled } from '../services/savwin-service.js';
import { downloadLeadsCsv } from '../utils/lead-export.js';
import { monthKeyFromDate, monthRange, shiftMonth } from '../utils/calendar.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { examPricing, ophthalmologyTriage } from '../utils/lead.js';
import { buildAppointmentSlots, DEFAULT_STORE_SCHEDULE, isTransportAppointmentAllowed, isTransportDateAllowed, validateStoreSchedule, WEEKDAY_OPTIONS } from '../utils/schedule.js';
import { followUpAppointmentKey } from '../utils/follow-up.js';
import { STORES } from '../utils/stores.js';
import { profileStoreIds } from '../utils/permissions.js';
import { formatAccessStoreSummary } from '../utils/access.js';
import { SYSTEM_ROLE_PROFILES, hasPermission as profileHasPermission } from '../utils/role-profile.js';
import { formatBrazilianCpf } from '../utils/savwin-matching.js';
import { duplicateGoalDraft } from '../utils/goal.js';
import { defaultAppointmentService, servicesForStore } from '../utils/service-catalog.js';
import { currentRoute, currentRouteParam, navigate } from './router.js';
import {
  addDaysToDateInput,
  escapeHtml,
  formatAppointmentDate,
  formatCapturedAt,
  formatDateTimeValue,
  formatGoalDate,
  offlineSyncDetail,
  profileInitials,
  roleLabel,
  storeDisplayLabel,
  storeLabel,
  syncLabel,
  toLocalDateInput
} from './shared/formatters.js';
import {
  bindBirthDateInput,
  bindCpfInput,
  bindExclusiveOptions,
  revealFirstFormError,
  setFieldErrors
} from './shared/form-helpers.js';
import { createToastController } from './shared/ui.js';
import { initializeCaptureForm } from './features/capture/capture-events.js';
import { captureNewLeadDraft, leadFormValues } from './features/capture/capture-form.js';
import { captureAppointmentTimeField, careRouteAppointmentSchedule, isCareRouteDateAllowed } from './features/capture/capture-schedule.js';
import { ametropiaOptions, bindEyeTriage, enrichLeadTriage } from './features/capture/capture-triage.js';
import { bindTransportFields } from './features/capture/capture-transport.js';
import { captureView } from './features/capture/capture-view.js';
import { initializeLeadDetailForm, leadDetailSubmissionValues } from './features/leads/lead-detail-events.js';
import { leadDetailAppointmentTimeField as renderLeadDetailAppointmentTimeField, selectedLeadDetailService as resolveLeadDetailService } from './features/leads/lead-appointment.js';
import { leadDetailView as renderLeadDetailView } from './features/leads/lead-detail-view.js';
import { leadsView as renderLeadsView } from './features/leads/leads-view.js';
import { handleFollowUpsClick } from './features/follow-ups/follow-ups-events.js';
import { initialFollowUpsState, startFollowUpsSubscriptions } from './features/follow-ups/follow-ups-subscriptions.js';
import { followUpsView as renderFollowUpsView, pendingFollowUps as selectPendingFollowUps } from './features/follow-ups/follow-ups-view.js';
import { appointmentCreateDialog as renderAppointmentCreateDialog, appointmentCreateSchedule as resolveAppointmentCreateSchedule, appointmentCreateService as resolveAppointmentCreateService, appointmentCreateTimeField as renderAppointmentCreateTimeField } from './features/appointments/appointment-dialog.js';
import { handleAppointmentClick, initializeAppointmentCreateEvents } from './features/appointments/appointment-events.js';
import { startAppointmentsLiveSubscription, startConfirmationsLiveSubscription } from './features/appointments/appointment-subscriptions.js';
import { appointmentsView as renderAppointmentsView } from './features/appointments/appointments-view.js';
import { handleConfirmationClick } from './features/appointments/confirmation-events.js';
import { confirmationsView as renderConfirmationsView } from './features/appointments/confirmations-view.js';
import { findManagementLead as selectManagementLead, loadManagementRecords, validateManagementPeriod } from './features/management/management-data.js';
import { createDefaultManagementFilters as buildDefaultManagementFilters, filterManagementRecords } from './features/management/management-filters.js';
import { handleManagementClick, initializeManagementFilters } from './features/management/management-events.js';
import { managementView as renderManagementView } from './features/management/management-view.js';
import { filterDashboardRecords, loadDashboardUpcomingRecords } from './features/dashboard/dashboard-data.js';
import { dashboardMetrics } from './features/dashboard/dashboard-metrics.js';
import { dashboardView as renderDashboardView } from './features/dashboard/dashboard-view.js';
import { bindScheduleStoreSelection, handleSettingsSectionClick, scheduleSettingsValues } from './features/settings/schedule-events.js';
import { scheduleSettingsView as renderScheduleSettingsView } from './features/settings/schedule-settings.js';
import { settingsView as renderSettingsView } from './features/settings/settings-view.js';
import { bindServiceEvents, handleServiceClick } from './features/services/service-events.js';
import { servicesView as renderServicesView } from './features/services/services-view.js';
import { bindAccessEvents, ensureAccessData, handleAccessClick } from './features/access/access-events.js';
import { accessView as renderAccessView } from './features/access/access-view.js';
import { bindRoleProfileEvents, createDefaultRoleDraft, handleRoleProfileClick } from './features/access/role-profiles-events.js';
import { roleProfilesView as renderRoleProfilesView } from './features/access/role-profiles-view.js';
import { bindAuthenticationForm, handleAuthenticationAction, startAuthenticationController } from './core/auth-controller.js';
import { createDemoProfile } from './core/session.js';
import { createAppState } from './core/state.js';
import { renderApplication, syncAgendaSidebarHeight } from './core/renderer.js';
import { handleConnectivityChange as handleLifecycleConnectivityChange, startLifecycle, synchronizePendingRegistrations as synchronizeLifecyclePendingRegistrations } from './core/lifecycle.js';

const state = createAppState({
  route: currentRoute(),
  createDefaultManagementFilters,
  createDefaultGoalDraft,
  createDefaultRoleDraft
});

const showToast = createToastController(state);

function createDefaultManagementFilters() {
  return buildDefaultManagementFilters();
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
  return selectPendingFollowUps({
    demoMode: state.demoMode,
    canViewTeam: hasAccess('followups.team'),
    records: state.followUps.records,
    leads: state.leads,
    profile: state.profile,
    settings: state.followUps.settings,
    settingsByStore: state.followUps.settingsByStore
  });
}

function filteredManagementRecords() {
  return filterManagementRecords(state.management.records, state.management.filters);
}

function filteredReportRecords() {
  const source = state.demoMode ? state.leads : state.management.records;
  return filterDashboardRecords(source, state.management.filters);
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
      <div class="header-inner layout-wide">
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
  return captureAppointmentTimeField({
    scheduleState: state.newLeadSchedule,
    service: selectedNewLeadService(),
    profile: state.profile
  });
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

function newLeadView() {
  const selectedStoreId = selectedNewLeadStoreId();
  return captureView({
    scheduleState: state.newLeadSchedule,
    offlineCaptureEnabled: state.offlineCapture.enabled,
    selectedStoreId,
    allowedStoreIds: captureStoreIds(),
    storeChoice: requiresCaptureStoreChoice(),
    selectedService: selectedNewLeadService(),
    appointmentTimeMarkup: appointmentTimeField()
  });
}

function leadsView() {
  return renderLeadsView({
    leads: state.leads,
    search: state.search,
    dataError: state.dataError,
    canCreate: hasAccess('leads.create')
  });
}

function followUpsView() {
  const managerView = hasAccess('followups.team');
  return renderFollowUpsView({
    allowed: hasAccess('followups.own') || managerView,
    managerView,
    adminView: isAdmin(),
    allRecords: pendingFollowUps(),
    activeFilter: state.followUps.filter,
    selectedCaptorId: state.followUps.selectedCaptorId,
    settings: state.followUps.settings,
    settingsByStore: state.followUps.settingsByStore,
    profileName: state.profile?.displayName,
    error: state.followUps.error,
    truncated: state.followUps.truncated
  });
}

function findManagementLead(leadId) {
  return selectManagementLead(leadId, {
    records: state.management.records,
    appointments: state.appointments.records,
    activeLead: state.management.activeLead
  });
}

function selectedLeadDetailService(lead) {
  return resolveLeadDetailService(lead, state.leadDetailSchedule);
}

function leadDetailAppointmentTimeField(lead) {
  return renderLeadDetailAppointmentTimeField({
    lead,
    scheduleState: state.leadDetailSchedule,
    profile: state.profile
  });
}

function leadDetailView() {
  const managementMode = state.route === 'management-lead';
  const leadId = currentRouteParam();
  const lead = managementMode
    ? findManagementLead(leadId)
    : state.leads.find((item) => item.id === leadId);
  return renderLeadDetailView({
    lead,
    managementMode,
    canManage: canManage(),
    profileRole: state.profile?.role,
    scheduleState: state.leadDetailSchedule,
    appointmentTimeMarkup: lead ? leadDetailAppointmentTimeField(lead) : '',
    canDelete: hasAccess('leads.delete')
  });
}

function managementView() {
  const allowedStores = isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
  return renderManagementView({
    allowed: canManage(),
    management: state.management,
    allowedStores,
    adminView: isAdmin(),
    permissions: {
      appointments: hasAccess('appointments.view'),
      followUps: hasAccess('followups.team'),
      dashboard: hasAccess('dashboard.view'),
      export: hasAccess('leads.export')
    },
    queryLimit: MANAGEMENT_QUERY_LIMIT
  });
}
function dashboardView() {
  const records = filteredReportRecords();
  const upcomingRecords = state.demoMode ? state.leads : state.dashboardUpcoming.records;
  return renderDashboardView({
    allowed: hasAccess('dashboard.view'),
    records,
    metrics: dashboardMetrics(records, upcomingRecords, storeLabel),
    management: state.management,
    upcoming: state.dashboardUpcoming,
    savwin: state.savwin,
    savwinEnabled: isLocalSavwinEnabled,
    managementLimit: MANAGEMENT_QUERY_LIMIT,
    appointmentsLimit: APPOINTMENTS_QUERY_LIMIT
  });
}
function appointmentRecords() {
  return state.demoMode
    ? state.leads.filter((lead) => String(lead.appointmentDate || '').startsWith(`${state.appointments.month}-`))
    : state.appointments.records;
}

function allowedAppointmentStores() {
  return isAdmin() ? STORES : STORES.filter((store) => profileStoreIds(state.profile).includes(store.id));
}

function appointmentsView() {
  const canCreate = hasAccess('leads.create');
  return renderAppointmentsView({
    allowed: hasAccess('appointments.view'),
    appointments: state.appointments,
    records: appointmentRecords(),
    allowedStores: allowedAppointmentStores(),
    backRoute: canManage() ? 'management' : 'home',
    canCreate,
    canMarkAttendance: hasAccess('appointments.attendance'),
    adminView: isAdmin(),
    createDialog: canCreate ? appointmentCreateDialog(allowedAppointmentStores()) : '',
    queryLimit: APPOINTMENTS_QUERY_LIMIT
  });
}

function confirmationsView() {
  return renderConfirmationsView({
    allowed: hasAccess('appointments.view'),
    source: state.demoMode ? state.leads : state.confirmations.records,
    confirmations: state.confirmations,
    profileName: state.profile?.displayName || '',
    queryLimit: APPOINTMENTS_QUERY_LIMIT
  });
}
function appointmentCreateSchedule() {
  return resolveAppointmentCreateSchedule(state.appointmentCreate);
}

function appointmentCreateService() {
  return resolveAppointmentCreateService(state.appointmentCreate);
}

function appointmentCreateTimeField() {
  return renderAppointmentCreateTimeField({
    appointmentCreate: state.appointmentCreate,
    selectedDate: state.appointments.selectedDate,
    records: appointmentRecords(),
    profile: state.profile
  });
}

function appointmentCreateDialog(allowedStores) {
  return renderAppointmentCreateDialog({
    allowedStores,
    appointmentCreate: state.appointmentCreate,
    selectedDate: state.appointments.selectedDate,
    records: appointmentRecords(),
    profile: state.profile
  });
}
function settingsView() {
  if (!isAdmin()) {
    return renderSettingsView({ allowed: false, settings: state.settings, content: '' });
  }
  const section = state.settings.section;
  const content = section === 'roles'
    ? roleProfilesSettingsView()
    : section === 'services'
      ? renderServicesView(state.settings)
      : renderScheduleSettingsView(state.settings);
  return renderSettingsView({
    allowed: true,
    settings: state.settings,
    content
  });
}
function roleProfilesSettingsView() {
  return renderRoleProfilesView(state.settings);
}

function accessView() {
  return renderAccessView({
    access: state.access,
    profile: state.profile,
    roleProfiles: state.settings.roleProfiles,
    allowed: isAdmin()
  });
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
    <button type="button" data-route="${route}" class="${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'appointments', 'confirmations', 'settings', 'follow-ups'].includes(state.route)) ? 'is-active' : ''}" ${state.route === route || (route === 'leads' && state.route === 'lead') || (route === 'management' && ['management-lead', 'dashboard', 'appointments', 'confirmations', 'settings', 'follow-ups'].includes(state.route)) ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>${route === 'follow-ups' && followUpCount ? `<strong class="nav-notification-count">${followUpCount > 99 ? '99+' : followUpCount}</strong>` : ''}
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, lead: leadDetailView, 'follow-ups': followUpsView, management: managementView, 'management-lead': leadDetailView, dashboard: dashboardView, appointments: appointmentsView, confirmations: confirmationsView, access: accessView, goals: goalsView, settings: settingsView };
  const page = pages[state.route] || homeView;
  const wideLayout = ['management', 'dashboard', 'appointments', 'confirmations', 'access', 'goals', 'settings'].includes(state.route);
  return `${headerView()}<main class="app-main ${wideLayout ? 'layout-wide' : ''}">${page()}</main>${bottomNav()}`;
}

function render() {
  renderApplication({
    state,
    appView,
    loginView,
    canAccessRoute,
    bindPageEvents
  });
}

function synchronizePendingRegistrations(announce = false) {
  return synchronizeLifecyclePendingRegistrations(state, { announce, showToast });
}

function handleConnectivityChange() {
  handleLifecycleConnectivityChange({
    state,
    render,
    synchronize: synchronizePendingRegistrations,
    selectedNewLeadStoreId,
    refreshAppointmentTimeControl
  });
}


function bindPageEvents() {
  const form = document.querySelector('#lead-form');
  if (form) {
    initializeCaptureForm(form, {
      draft: state.newLeadSchedule.draft,
      settings: state.newLeadSchedule.settings,
      controlsEnabled: Boolean(selectedNewLeadStoreId() && state.newLeadSchedule.loaded),
      onStoreChange: (storeId) => {
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
      },
      onServiceChange: (serviceId) => {
        state.newLeadSchedule.serviceId = serviceId;
        const service = selectedNewLeadService();
        form.elements.appointmentServiceName.value = service.name;
        form.elements.appointmentDurationMinutes.value = service.durationMinutes;
        refreshAppointmentTimeControl();
      },
      onAppointmentDateChange: (appointmentDate) => {
        state.newLeadSchedule.appointmentDate = appointmentDate;
        startDayAppointmentsSubscription();
      },
      onTriageChange: (values) => {
        state.newLeadSchedule.triage = values;
        refreshAppointmentTimeControl();
      },
      onTransportChange: (values) => {
        state.newLeadSchedule.triage = values;
        refreshAppointmentTimeControl();
      }
    });
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
          ...careRouteAppointmentSchedule(state.newLeadSchedule.settings, values.careRoute),
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
    initializeLeadDetailForm(editLeadForm, {
      settings: state.leadDetailSchedule.settings,
      onServiceChange: (serviceId) => {
        state.leadDetailSchedule.serviceId = serviceId;
        const service = selectedLeadDetailService(existingLeadForDetail());
        editLeadForm.elements.appointmentServiceName.value = service.name;
        editLeadForm.elements.appointmentDurationMinutes.value = service.durationMinutes;
        refreshLeadDetailAppointmentTime(existingLeadForDetail());
      },
      onAppointmentDateChange: (appointmentDate) => {
        state.leadDetailSchedule.appointmentDate = appointmentDate;
        startLeadDetailDayAppointmentsSubscription(existingLeadForDetail());
      }
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
      const values = leadDetailSubmissionValues(editLeadForm, existingLead, state.leadDetailSchedule.settings, {
        managerReschedule: managementEdit && state.profile?.role === 'manager'
      });
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
      }, existingLead, {
        appointmentOnly: !hasAccess('leads.edit_own')
      });
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

  bindAuthenticationForm({ state, render });

  const managementForm = document.querySelector('#management-filters');
  if (managementForm) {
    initializeManagementFilters(managementForm, {
      submit: (filters) => {
        state.management.filters = filters;
        state.management.page = 1;
        loadManagementData();
      },
      search: (value, selectionStart, selectionEnd) => {
        state.management.filters.search = value;
        state.management.page = 1;
        render();
        const nextSearch = document.querySelector('#management-search');
        nextSearch?.focus();
        nextSearch?.setSelectionRange(selectionStart, selectionEnd);
      },
      change: (name, value) => {
        state.management.filters[name] = value;
        state.management.page = 1;
        render();
      }
    });
  }

  const dashboardPeriodForm = document.querySelector('#dashboard-period');
  dashboardPeriodForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(dashboardPeriodForm));
    state.management.filters.startDate = values.startDate;
    state.management.filters.endDate = values.endDate;
    state.management.loaded = false;
    state.dashboardUpcoming.loaded = false;
    state.management.page = 1;
    state.savwin.error = '';
    state.savwin.result = null;
    loadManagementData();
    loadDashboardUpcomingData();
  });

  const appointmentsStore = document.querySelector('#appointments-store');
  appointmentsStore?.addEventListener('change', () => {
    state.appointments.storeId = appointmentsStore.value;
    state.appointments.loaded = false;
    startAppointmentsSubscription();
  });

  const appointmentCreateForm = document.querySelector('#appointment-create-form');
  if (appointmentCreateForm) {
    bindCpfInput(appointmentCreateForm);
    bindBirthDateInput(appointmentCreateForm);
    bindExclusiveOptions(appointmentCreateForm, 'ametropiaIds');
    bindExclusiveOptions(appointmentCreateForm, 'pathologyIds');
    const refreshCreateTimeField = (values) => {
      state.appointmentCreate.draft = values;
      const timeField = document.querySelector('#appointment-create-time-field');
      if (timeField) timeField.outerHTML = appointmentCreateTimeField();
    };
    bindEyeTriage(appointmentCreateForm, appointmentCreateSchedule(), refreshCreateTimeField);
    bindTransportFields(appointmentCreateForm, appointmentCreateSchedule(), refreshCreateTimeField);
    initializeAppointmentCreateEvents(appointmentCreateForm, {
      formatPhone: (input) => { input.value = formatBrazilianPhone(input.value); },
      updateNotesCount: (length) => {
        const counter = document.querySelector('#agenda-notes-count');
        if (counter) counter.textContent = length;
      },
      changeStore: (storeId, form) => {
        state.appointmentCreate.draft = leadFormValues(form);
        state.appointmentCreate.storeId = storeId;
        const schedule = appointmentCreateSchedule();
        if (!servicesForStore(state.appointmentCreate.services, storeId).length) {
          state.appointmentCreate.services.push(defaultAppointmentService(storeId, schedule.appointmentDurationMinutes));
        }
        state.appointmentCreate.serviceId = servicesForStore(state.appointmentCreate.services, storeId)[0]?.id || '';
        render();
        document.querySelector('#appointment-create-dialog')?.showModal();
      },
      changeService: (serviceId, form) => {
        state.appointmentCreate.serviceId = serviceId;
        const service = appointmentCreateService();
        form.elements.appointmentServiceName.value = service.name;
        form.elements.appointmentDurationMinutes.value = service.durationMinutes;
        const timeField = document.querySelector('#appointment-create-time-field');
        if (timeField) timeField.outerHTML = appointmentCreateTimeField();
      },
      submit: async (form) => {
        const values = enrichLeadTriage(leadFormValues(form), appointmentCreateSchedule());
        const storeId = form.elements.storeId.value;
        if (!profileStoreIds(state.profile).includes(storeId)) {
          setFieldErrors(form, { storeId: 'Selecione uma loja permitida.' });
          return;
        }
        state.appointmentCreate.saving = true;
        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const result = saveLead(values, { ...state.profile, storeId }, state.demoMode, () => {
          state.appointmentCreate.error = 'O cadastro não foi aceito pela nuvem.';
          render();
        });
        setFieldErrors(form, result.errors || {});
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
          setFieldErrors(form, { appointmentTime: 'Este horário acabou de ser ocupado. Escolha outro.' });
          submitButton.disabled = false;
        }
      }
    });
  }
  bindAccessEvents({ state, render, showToast });
  bindRoleProfileEvents({ state, render, showToast });

  bindServiceEvents({
    state,
    render,
    showToast,
    refreshServices: loadServiceCatalogData
  });
  const scheduleSettingsForm = document.querySelector('#schedule-settings-form');
  if (scheduleSettingsForm) {
    bindScheduleStoreSelection(scheduleSettingsForm, { settings: state.settings, render });
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
      limitedDaysDialog.querySelector('[data-limited-days-divider]')?.classList.toggle('is-hidden', !record.limitedDaysEnabled);
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
      limitedDaysDialog.querySelector('[data-limited-days-divider]')?.classList.toggle('is-hidden', !limitedDaysEnabledInput.checked);
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
      meiQuotaDialog.querySelector('[data-mei-quota-divider]')?.classList.toggle('is-hidden', !record.meiQuotaEnabled);
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
      meiQuotaDialog.querySelector('[data-mei-quota-divider]')?.classList.toggle('is-hidden', !meiQuotaEnabledInput.checked);
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
    const optometristEnabledInput = document.querySelector('#settings-optometrist-enabled');
    const optometristFieldsGroup = ophthalmologyDialog?.querySelector('[data-optometrist-fields]');
    const ophthalmologyEnabledInput = document.querySelector('#settings-ophthalmology-enabled');
    const ophthalmologyFields = ophthalmologyDialog?.querySelector('[data-ophthalmology-fields]');
    const setOptometristFieldsState = () => {
      const enabled = optometristEnabledInput.checked;
      optometristFieldsGroup.disabled = !enabled;
      optometristFieldsGroup.classList.toggle('is-disabled', !enabled);
      ophthalmologyDialog.scrollTop = 0;
      ophthalmologyDialog.querySelectorAll('[data-optometrist-hours-row]').forEach((row) => {
        const checked = row.querySelector('[name="optometristWeekday"]').checked;
        row.querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = !enabled || !checked; });
      });
    };
    const setOphthalmologyFieldsState = () => {
      const enabled = ophthalmologyEnabledInput.checked;
      ophthalmologyFields.classList.toggle('is-disabled', !enabled);
      ophthalmologyDialog.scrollTop = 0;
    };
    const syncOphthalmologyDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !ophthalmologyDialog) return;
      optometristEnabledInput.checked = record.optometristEnabled;
      ophthalmologyEnabledInput.checked = record.ophthalmologyRoutingEnabled;
      scheduleSettingsForm.elements.optometristExamPrice.value = record.optometristExamPrice;
      scheduleSettingsForm.elements.ophthalmologistExamPrice.value = record.ophthalmologistExamPrice;
      scheduleSettingsForm.elements.optometristOpeningTime.value = record.optometristOpeningTime;
      scheduleSettingsForm.elements.optometristClosingTime.value = record.optometristClosingTime;
      ophthalmologyDialog.querySelector('[name="optometristHoursRules"]').value = JSON.stringify(record.optometristHoursRules);
      ophthalmologyDialog.querySelectorAll('[data-optometrist-hours-row]').forEach((row) => {
        const weekday = Number(row.dataset.optometristHoursRow);
        const rule = record.optometristHoursRules.find((item) => item.weekday === weekday);
        const checkbox = row.querySelector('[name="optometristWeekday"]');
        const openingInput = row.querySelector(`[name="optometristOpeningTime-${weekday}"]`);
        const closingInput = row.querySelector(`[name="optometristClosingTime-${weekday}"]`);
        checkbox.checked = Boolean(rule);
        openingInput.value = rule?.openingTime || record.optometristOpeningTime;
        closingInput.value = rule?.closingTime || record.optometristClosingTime;
        row.classList.toggle('is-active', Boolean(rule));
      });
      ophthalmologyDialog.querySelector('[name="optometristWeekdays"]').value = JSON.stringify(record.optometristWeekdays);
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
      setOptometristFieldsState();
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
    optometristEnabledInput?.addEventListener('change', setOptometristFieldsState);
    ophthalmologyEnabledInput?.addEventListener('change', setOphthalmologyFieldsState);
    ophthalmologyDialog?.querySelectorAll('[data-optometrist-hours-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="optometristWeekday"]');
      const timeInputs = [...row.querySelectorAll('input[type="time"]')];
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        timeInputs.forEach((input) => { input.disabled = !optometristEnabledInput.checked || !checkbox.checked; });
      });
    });
    ophthalmologyDialog?.querySelectorAll('[data-ophthalmology-hours-row]').forEach((row) => {
      const checkbox = row.querySelector('[name="ophthalmologyWeekday"]');
      const timeInputs = [...row.querySelectorAll('input[type="time"]')];
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-active', checkbox.checked);
        timeInputs.forEach((input) => { input.disabled = !checkbox.checked; });
      });
    });
    ophthalmologyDialog?.querySelector('[data-ophthalmology-apply]')?.addEventListener('click', () => {
      const optometristEnabled = optometristEnabledInput.checked;
      const enabled = ophthalmologyEnabledInput.checked;
      const optometristHoursRules = [...ophthalmologyDialog.querySelectorAll('[name="optometristWeekday"]:checked')].map((checkbox) => {
        const weekday = Number(checkbox.value);
        return {
          weekday,
          openingTime: ophthalmologyDialog.querySelector(`[name="optometristOpeningTime-${weekday}"]`).value,
          closingTime: ophthalmologyDialog.querySelector(`[name="optometristClosingTime-${weekday}"]`).value
        };
      });
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
      const primaryOptometristHours = optometristHoursRules[0] || {
        openingTime: scheduleSettingsForm.elements.optometristOpeningTime.value,
        closingTime: scheduleSettingsForm.elements.optometristClosingTime.value
      };
      const candidate = {
        optometristEnabled,
        optometristWeekdays: optometristHoursRules.map((rule) => rule.weekday),
        optometristOpeningTime: primaryOptometristHours.openingTime,
        optometristClosingTime: primaryOptometristHours.closingTime,
        optometristHoursRules,
        ophthalmologyRoutingEnabled: enabled,
        optometristExamPrice: Number(scheduleSettingsForm.elements.optometristExamPrice.value),
        ophthalmologistExamPrice: Number(scheduleSettingsForm.elements.ophthalmologistExamPrice.value),
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
      const errors = Object.fromEntries(Object.entries(validation.errors).filter(([name]) => (
        name.startsWith('ophthalmology') || ['optometristExamPrice', 'ophthalmologistExamPrice'].includes(name)
      )));
      setFieldErrors(ophthalmologyDialog, errors);
      if (Object.keys(errors).length) return;
      Object.assign(record, candidate);
      ophthalmologyDialog.querySelector('[name="optometristWeekdays"]').value = JSON.stringify(candidate.optometristWeekdays);
      ophthalmologyDialog.querySelector('[name="optometristHoursRules"]').value = JSON.stringify(optometristHoursRules);
      scheduleSettingsForm.elements.optometristOpeningTime.value = primaryOptometristHours.openingTime;
      scheduleSettingsForm.elements.optometristClosingTime.value = primaryOptometristHours.closingTime;
      ophthalmologyDialog.querySelector('[name="ophthalmologyWeekdays"]').value = JSON.stringify(candidate.ophthalmologyWeekdays);
      ophthalmologyDialog.querySelector('[name="ophthalmologyHoursRules"]').value = JSON.stringify(ophthalmologyHoursRules);
      scheduleSettingsForm.elements.ophthalmologyOpeningTime.value = primaryHours.openingTime;
      scheduleSettingsForm.elements.ophthalmologyClosingTime.value = primaryHours.closingTime;
      document.querySelector('[data-ophthalmology-summary]').textContent = `Optometrista ${candidate.optometristExamPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Oftalmologista ${candidate.ophthalmologistExamPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
      ophthalmologyDialog.close();
    });
    const transportDialog = document.querySelector('#transport-dialog');
    const transportEnabledInput = document.querySelector('#settings-transport-enabled');
    const transportFieldsGroup = transportDialog?.querySelector('[data-transport-fields]');
    const setTransportFieldsState = () => {
      const enabled = transportEnabledInput.checked;
      transportFieldsGroup.disabled = !enabled;
      transportFieldsGroup.classList.toggle('is-disabled', !enabled);
      transportDialog.querySelector('[data-transport-divider]')?.classList.toggle('is-hidden', !enabled);
      transportDialog.querySelectorAll('[data-transport-hours-row]').forEach((row) => {
        const checked = row.querySelector('[name="transportWeekday"]').checked;
        row.querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = !enabled || !checked; });
      });
    };
    const syncTransportDraft = () => {
      const record = state.settings.records.find((item) => item.id === state.settings.selectedStoreId);
      if (!record || !transportDialog) return;
      transportEnabledInput.checked = record.transportEnabled;
      scheduleSettingsForm.elements.maxCompanions.value = record.maxCompanions;
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
      const candidate = {
        ...record,
        transportEnabled: enabled,
        transportHoursRules: rules,
        maxCompanions: Number(scheduleSettingsForm.elements.maxCompanions.value)
      };
      const validation = validateStoreSchedule(candidate);
      const errors = Object.fromEntries(Object.entries(validation.errors).filter(([name]) => name.startsWith('transport')));
      setFieldErrors(transportDialog, errors);
      if (Object.keys(errors).length) return;
      record.transportEnabled = enabled;
      record.maxCompanions = candidate.maxCompanions;
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
      const currentStoreId = scheduleSettingsForm.elements.storeId.value;
      const current = state.settings.records.find((item) => item.id === currentStoreId) || DEFAULT_STORE_SCHEDULE;
      const values = scheduleSettingsValues(scheduleSettingsForm, current);
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
            optometristEnabled: values.optometristEnabled,
            optometristWeekdays: values.optometristWeekdays,
            optometristOpeningTime: values.optometristOpeningTime,
            optometristClosingTime: values.optometristClosingTime,
            optometristHoursRules: values.optometristHoursRules,
            ophthalmologyRoutingEnabled: values.ophthalmologyRoutingEnabled,
            ophthalmologyMinimumAge: values.ophthalmologyMinimumAge,
            ophthalmologyWeekdays: values.ophthalmologyWeekdays,
            ophthalmologyOpeningTime: values.ophthalmologyOpeningTime,
            ophthalmologyClosingTime: values.ophthalmologyClosingTime,
            ophthalmologyHoursRules: values.ophthalmologyHoursRules,
            ophthalmologyPathologyIds: values.ophthalmologyPathologyIds,
            ophthalmologySurgeryIds: values.ophthalmologySurgeryIds,
            optometristExamPrice: values.optometristExamPrice,
            ophthalmologistExamPrice: values.ophthalmologistExamPrice,
            transportEnabled: values.transportEnabled,
            maxCompanions: values.maxCompanions,
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
            state.newLeadSchedule.settings = { ...state.newLeadSchedule.settings, ...result.data };
            state.followUps.settings = { ...state.followUps.settings, ...result.data };
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
  state.unsubscribeFollowUpLeads = null;
}

function startFollowUpScheduleSubscription() {
  stopFollowUpScheduleSubscription();
  state.followUps = initialFollowUpsState(state.followUps, {
    demoMode: state.demoMode,
    role: state.profile?.role,
    defaultSettings: DEFAULT_STORE_SCHEDULE
  });
  state.unsubscribeFollowUpSchedule = startFollowUpsSubscriptions({
    profile: state.profile,
    demoMode: state.demoMode,
    canViewTeam: hasAccess('followups.team'),
    storeIds: profileStoreIds(state.profile),
    loadSchedules: loadStoreSchedules,
    subscribeSchedule: subscribeToStoreSchedule,
    subscribeTeam: subscribeToTeamFollowUps,
    patchState: (patch) => {
      state.followUps = { ...state.followUps, ...patch };
    },
    render
  });
}

async function loadManagementData() {
  if (!canManage() || state.management.loading) return;
  const periodError = validateManagementPeriod(state.management.filters);
  if (periodError) {
    state.management.error = periodError;
    render();
    return;
  }
  state.management.loading = true;
  state.management.error = '';
  render();
  const result = await loadManagementRecords({
    profile: state.profile,
    filters: state.management.filters,
    demoMode: state.demoMode,
    demoRecords: state.leads,
    loadRecords: loadManagementLeads
  });
  if (result.error) {
    state.management.error = result.error;
  } else {
    state.management.records = result.records;
    state.management.truncated = result.truncated;
    state.management.loaded = true;
    state.management.page = 1;
  }
  state.management.loading = false;
  render();
  ensureLeadDetailSchedule();
}

async function loadDashboardUpcomingData() {
  if (state.route !== 'dashboard' || !hasAccess('dashboard.view')
    || state.dashboardUpcoming.loading || state.dashboardUpcoming.loaded) return;
  state.dashboardUpcoming.loading = true;
  state.dashboardUpcoming.error = '';
  render();
  const result = await loadDashboardUpcomingRecords({
    profile: state.profile,
    filters: state.management.filters,
    demoMode: state.demoMode,
    demoRecords: state.leads,
    loadAppointments: loadUpcomingAppointments
  });
  if (result.error) {
    state.dashboardUpcoming.error = result.error;
  } else {
    state.dashboardUpcoming.records = result.records;
    state.dashboardUpcoming.truncated = result.truncated;
    state.dashboardUpcoming.loaded = true;
  }
  state.dashboardUpcoming.loading = false;
  render();
}

function ensureManagementData() {
  if (['management', 'management-lead', 'dashboard'].includes(state.route) && canManage() && !state.management.loaded) {
    loadManagementData();
  }
  loadDashboardUpcomingData();
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
  state.unsubscribeConfirmations = startConfirmationsLiveSubscription({
    subscribe: subscribeToAppointmentConfirmations,
    profile: state.profile,
    startDate,
    endDate,
    onData: (result) => {
      state.confirmations.records = result.records;
      state.confirmations.truncated = result.truncated;
      state.confirmations.loaded = true;
      state.confirmations.loading = false;
      render();
    },
    onError: (error) => {
      state.confirmations.error = error?.code === 'permission-denied'
        ? 'Seu perfil não possui permissão para consultar estas confirmações.'
        : 'Não foi possível carregar as confirmações. Verifique a conexão e tente novamente.';
      state.confirmations.loading = false;
      state.confirmations.loaded = false;
      stopConfirmationsSubscription();
      render();
    }
  });
}

function startAppointmentsSubscription() {
  if (!hasAccess('appointments.view') || state.demoMode || state.route !== 'appointments') return;
  stopAppointmentsSubscription();
  state.appointments.loading = true;
  state.appointments.loaded = false;
  state.appointments.error = '';
  render();
  state.unsubscribeAppointments = startAppointmentsLiveSubscription({
    subscribe: subscribeToAppointments,
    profile: state.profile,
    month: state.appointments.month,
    storeId: state.appointments.storeId,
    onData: (result) => {
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
    onError: (error) => {
      state.appointments.error = error?.code === 'permission-denied'
        ? 'Seu perfil não possui permissão para consultar esta agenda.'
        : 'Não foi possível acompanhar a agenda. Verifique a conexão e tente novamente.';
      state.appointments.loading = false;
      state.appointments.loaded = false;
      stopAppointmentsSubscription();
      render();
    }
  });
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
  const routeDateAllowed = isCareRouteDateAllowed(settings, triage.careRoute, appointmentDate);
  const needsTransport = state.newLeadSchedule.triage?.needsTransport === true || state.newLeadSchedule.triage?.needsTransport === 'true';
  const transportDateAllowed = !needsTransport || isTransportDateAllowed(settings, appointmentDate);
  const dateAllowed = routeDateAllowed && transportDateAllowed;
  const slots = appointmentDate && settings.schedulingMode === 'controlled'
    ? buildAppointmentSlots(
      {
        ...careRouteAppointmentSchedule(settings, triage.careRoute),
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
      ? triage.careRoute === 'ophthalmologist' ? 'O oftalmologista não atende neste dia.' : 'O optometrista não atende neste dia.'
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

function refreshAuthorizedData() {
  ensureManagementData();
  ensureAppointmentsData();
  ensureConfirmationsData();
  ensureNewLeadSchedule();
  ensureLeadDetailSchedule();
  ensureAccessData(state, { render });
  ensureGoalsData();
  ensureSettingsData();
}

function authControllerDependencies() {
  return {
    state,
    render,
    navigate,
    devMode: import.meta.env.DEV,
    createDemoProfile,
    subscribeProfileLeads,
    startOfflineCaptureSubscription,
    stopOfflineCaptureSubscription,
    startFollowUpScheduleSubscription,
    stopFollowUpScheduleSubscription,
    stopAppointmentsSubscription,
    stopConfirmationsSubscription,
    stopNewLeadScheduleSubscriptions,
    synchronizePendingRegistrations,
    refreshAuthorizedData,
    hasAccess,
    createDefaultManagementFilters,
    createDefaultGoalDraft,
    createDefaultRoleDraft
  };
}

async function handleAction(action) {
  if (action === 'update-app' && state.updateAction) {
    const updateAction = state.updateAction;
    state.updateAction = null;
    render();
    await updateAction();
    return;
  }

  if (await handleAuthenticationAction(action, authControllerDependencies())) return;

  if (action === 'export-management') {
    const records = filteredManagementRecords();
    if (!records.length) return;
    downloadLeadsCsv(records, state.management.filters.startDate, state.management.filters.endDate);
    showToast(`${records.length} registro(s) exportado(s).`);
  }

  if (action === 'reload-reports') {
    state.management.loaded = false;
    state.dashboardUpcoming.loaded = false;
    await loadManagementData();
    await loadDashboardUpcomingData();
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
    const handledConfirmationClick = await handleConfirmationClick(event, {
      selectFilter: (filter) => {
        state.confirmations.filter = filter;
        render();
      },
      markDone: async (leadId) => {
        const records = state.demoMode ? state.leads : state.confirmations.records;
        const lead = records.find((item) => item.id === leadId);
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
            state.confirmations.records = state.confirmations.records.map((item) => item.id === lead.id ? { ...item, ...reminderUpdate } : item);
          }
          showToast('Lembrete marcado como feito.');
        } catch (error) {
          showToast(error?.code === 'permission-denied' ? 'Seu perfil não pode concluir este lembrete.' : 'Não foi possível marcar o lembrete como feito.', 'danger', 'circle-alert');
        } finally {
          state.confirmations.updatingId = '';
          render();
        }
      },
      undo: async (leadId) => {
        const records = state.demoMode ? state.leads : state.confirmations.records;
        const lead = records.find((item) => item.id === leadId);
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
              const { appointmentReminderSentAt, appointmentReminderSentByUid, appointmentReminderSentByName, appointmentReminderAppointmentKey, ...pendingLead } = item;
              return pendingLead;
            });
          }
          showToast('Conclusão do lembrete desfeita.');
        } catch (error) {
          showToast(error?.code === 'permission-denied' ? 'Seu perfil não pode reabrir este lembrete.' : 'Não foi possível desfazer a conclusão.', 'danger', 'circle-alert');
        } finally {
          state.confirmations.updatingId = '';
          render();
        }
      }
    });
    if (handledConfirmationClick) return;
    if (handleSettingsSectionClick(event, { settings: state.settings, render })) return;
    if (await handleServiceClick(event, {
      state,
      render,
      showToast,
      refreshServices: loadServiceCatalogData
    })) return;
    if (await handleRoleProfileClick(event, { state, render, showToast })) return;

    const handledFollowUpClick = await handleFollowUpsClick(event, {
      selectCaptor: (captorId) => {
        state.followUps.selectedCaptorId = captorId;
        render();
        requestAnimationFrame(() => document.querySelector('#follow-up-captor-dialog')?.showModal());
      },
      closeCaptor: () => {
        state.followUps.selectedCaptorId = '';
      },
      selectFilter: (filter) => {
        state.followUps.filter = filter;
        render();
      },
      openWhatsApp: async (leadId) => {
        const lead = [...state.leads, ...state.followUps.records].find((item) => item.id === leadId);
        if (!lead) return;
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
      },
      reschedule: (leadId) => {
        const lead = [...state.followUps.records, ...state.leads].find((item) => item.id === leadId);
        if (!lead) return;
        state.followUps.selectedCaptorId = '';
        state.management.activeLead = lead;
        navigate('management-lead', lead.id);
      }
    });
    if (handledFollowUpClick) return;
    const leadButton = event.target.closest('[data-open-lead-id]');
    if (leadButton) navigate('lead', leadButton.dataset.openLeadId);
    const handledManagementClick = handleManagementClick(event, {
      openLead: (leadId) => {
        const lead = state.management.records.find((item) => item.id === leadId);
        if (lead) state.management.activeLead = lead;
        navigate('management-lead', leadId);
      },
      changePage: (page) => {
        state.management.page = page;
        render();
        document.querySelector('.management-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    if (handledManagementClick) return;
    const handledAppointmentClick = await handleAppointmentClick(event, {
      openLead: (leadId) => {
        const lead = appointmentRecords().find((item) => item.id === leadId);
        if (lead) {
          state.management.activeLead = lead;
          navigate('management-lead', lead.id);
        }
      },
      markAttendance: async (leadId, attendance) => {
        const lead = appointmentRecords().find((item) => item.id === leadId);
        if (!lead) return;
        state.appointments.updatingId = lead.id;
        render();
        try {
          if (state.demoMode) updateDemoAppointmentAttendance(lead.id, attendance, state.profile);
          else {
            await setAppointmentAttendance(state.profile, lead, attendance);
            state.appointments.records = state.appointments.records.map((item) => item.id === lead.id ? { ...item, appointmentAttendance: attendance } : item);
          }
          showToast(attendance === 'attended' ? 'Comparecimento registrado.' : 'Falta registrada.');
        } catch (error) {
          showToast(error?.code === 'permission-denied' ? 'Seu perfil não pode alterar este agendamento.' : 'Não foi possível salvar o comparecimento.', 'danger', 'circle-alert');
        } finally {
          state.appointments.updatingId = '';
          render();
        }
      },
      selectDate: (date) => {
        state.appointments.selectedDate = date;
        render();
      },
      create: openAppointmentCreateDialog,
      shiftMonth: (offset) => {
        if (state.appointments.loading) return;
        state.appointments.month = shiftMonth(state.appointments.month, offset);
        state.appointments.selectedDate = monthRange(state.appointments.month).startDate;
        state.appointments.loaded = false;
        startAppointmentsSubscription();
      }
    });
    if (handledAppointmentClick) return;
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
    if (await handleAccessClick(event, { state, render, showToast })) return;

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

  await startLifecycle({
    state,
    render,
    currentRoute,
    refreshAuthorizedData,
    stopAppointmentsSubscription,
    stopConfirmationsSubscription,
    stopNewLeadScheduleSubscriptions,
    handleConnectivity: handleConnectivityChange,
    syncAgendaHeight: syncAgendaSidebarHeight,
    synchronize: synchronizePendingRegistrations,
    startAuthentication: () => startAuthenticationController(authControllerDependencies())
  });


}

export function showOfflineReady() {
  showToast('Aplicativo pronto para abrir offline.', 'success', 'cloud-check');
}

export function showUpdateReady(updateAction) {
  state.updateAction = updateAction;
  render();
}
