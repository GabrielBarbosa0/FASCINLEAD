import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  ClipboardX,
  Clock3,
  CloudCheck,
  Download,
  FlaskConical,
  HardDrive,
  House,
  Info,
  Lightbulb,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Wifi,
  WifiOff,
  Wrench,
  createIcons
} from 'lucide';
import { completeRedirectSignIn, loadAuthorizedProfile, observeAuth, signInWithGoogle, signOutUser } from '../firebase/auth.js';
import { isFirebaseConfigured } from '../firebase/client.js';
import { saveLead, subscribeToLeads, synchronizeNow } from '../services/lead-service.js';
import { formatBrazilianPhone } from '../utils/phone.js';
import { INTERESTS } from '../utils/lead.js';
import { currentRoute, navigate } from './router.js';

const DEMO_SESSION_KEY = 'fascinlead:demo-session';

const appIcons = {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  ClipboardX,
  Clock3,
  CloudCheck,
  Download,
  FlaskConical,
  HardDrive,
  House,
  Info,
  Lightbulb,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
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
  updateAction: null
};

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
      <div class="header-inner">
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
  const initials = state.profile.displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

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
    </section>
    <section class="info-band">
      <i data-lucide="lightbulb"></i>
      <div><strong>Cadastro enxuto</strong><p>Nome, telefone e autorizacao sao suficientes para registrar a abordagem.</p></div>
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
      <div class="field" data-field="notes">
        <label for="notes">Observacao rapida</label>
        <textarea id="notes" name="notes" maxlength="500" rows="3" placeholder="Ex.: prefere contato pela manha"></textarea>
        <small class="field-hint"><span id="notes-count">0</span>/500</small>
        <small class="field-error"></small>
      </div>
      <div class="field consent-field" data-field="consentGiven">
        <label class="checkbox-label"><input type="checkbox" name="consentGiven" /><span>O cliente autorizou o contato da Oticas Fascinante.</span></label>
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
        return `<article class="lead-item">
          <div class="lead-avatar">${escapeHtml(lead.fullName[0]?.toUpperCase() || '?')}</div>
          <div class="lead-content"><strong>${escapeHtml(lead.fullName)}</strong><span>${escapeHtml(formatBrazilianPhone(lead.phoneSearch))}</span><small>${escapeHtml(lead.interestLabel || 'Interesse nao informado')}</small></div>
          <span class="status-badge status-${tone}">${label}</span>
        </article>`;
      }).join('')
    : `<div class="empty-state"><i data-lucide="clipboard-x"></i><strong>Nenhum cadastro encontrado</strong><p>${state.search ? 'Tente outro nome ou telefone.' : 'Os contatos registrados aparecerao aqui.'}</p><button class="button button-primary" type="button" data-route="new"><i data-lucide="user-plus"></i>Novo cadastro</button></div>`;

  return `
    <section class="page-heading compact"><div><p class="eyebrow">CAPTACAO</p><h1>Meus cadastros</h1><p>${state.leads.length} registro(s) carregado(s)</p></div></section>
    <div class="search-box"><i data-lucide="search"></i><input id="lead-search" type="search" value="${escapeHtml(state.search)}" placeholder="Buscar por nome ou telefone" aria-label="Buscar cadastros" /></div>
    ${state.dataError ? `<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>${escapeHtml(state.dataError)}</span></div>` : ''}
    <section class="lead-list">${list}</section>`;
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
  return `<nav class="bottom-nav" aria-label="Navegacao principal">${items.map(([route, icon, label]) => `
    <button type="button" data-route="${route}" class="${state.route === route ? 'is-active' : ''}" ${state.route === route ? 'aria-current="page"' : ''}>
      <i data-lucide="${icon}"></i><span>${label}</span>
    </button>`).join('')}</nav>`;
}

function appView() {
  const pages = { home: homeView, new: newLeadView, leads: leadsView, sync: syncView };
  return `${headerView()}<main class="app-main">${pages[state.route]()}</main>${bottomNav()}`;
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
      values.consentGiven = form.elements.consentGiven.checked;
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

  const search = document.querySelector('#lead-search');
  if (search) {
    search.addEventListener('input', () => {
      state.search = search.value;
      render();
      document.querySelector('#lead-search')?.focus();
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
}

export async function startApp() {
  document.addEventListener('click', (event) => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) navigate(routeButton.dataset.route);
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) handleAction(actionButton.dataset.action);
  });

  window.addEventListener('hashchange', () => {
    state.route = currentRoute();
    render();
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
