export const ROLE_SCOPES = [
  { id: 'own', label: 'Dados proprios', baseRole: 'captor' },
  { id: 'stores', label: 'Unidades permitidas', baseRole: 'manager' }
];

export const PERMISSION_GROUPS = [
  {
    label: 'Captacao',
    permissions: [
      { id: 'leads.create', label: 'Cadastrar leads', scopes: ['own', 'stores'] },
      { id: 'leads.view_own', label: 'Visualizar os proprios cadastros', scopes: ['own', 'stores'] },
      { id: 'leads.edit_own', label: 'Editar os proprios cadastros', scopes: ['own', 'stores'] },
      { id: 'followups.own', label: 'Realizar os proprios retornos', scopes: ['own', 'stores'] },
      { id: 'goals.view_own', label: 'Visualizar as proprias metas', scopes: ['own', 'stores'] }
    ]
  },
  {
    label: 'Equipe e unidades',
    permissions: [
      { id: 'management.view', label: 'Acessar a gestao de leads', scopes: ['stores'] },
      { id: 'appointments.view', label: 'Visualizar a agenda de exames', scopes: ['stores'] },
      { id: 'appointments.attendance', label: 'Registrar comparecimento e falta', scopes: ['stores'] },
      { id: 'followups.team', label: 'Acompanhar retornos da equipe', scopes: ['stores'] },
      { id: 'goals.manage', label: 'Criar e editar metas da equipe', scopes: ['stores'] },
      { id: 'reports.view', label: 'Visualizar relatorios', scopes: ['stores'] },
      { id: 'dashboard.view', label: 'Visualizar dashboard', scopes: ['stores'] },
      { id: 'leads.export', label: 'Exportar leads em CSV', scopes: ['stores'] }
    ]
  },
  {
    label: 'Administracao',
    permissions: [
      { id: 'leads.edit_all', label: 'Editar qualquer lead permitido', scopes: ['admin'] },
      { id: 'leads.delete', label: 'Excluir leads', scopes: ['admin'] },
      { id: 'schedule.manage', label: 'Configurar agendas', scopes: ['admin'] },
      { id: 'access.manage', label: 'Gerenciar acessos', scopes: ['admin'] },
      { id: 'roles.manage', label: 'Gerenciar perfis e permissoes', scopes: ['admin'] }
    ]
  }
];

export const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id));

const CAPTOR_PERMISSIONS = [
  'leads.create',
  'leads.view_own',
  'leads.edit_own',
  'followups.own',
  'goals.view_own'
];

const MANAGER_PERMISSIONS = [
  ...CAPTOR_PERMISSIONS,
  'management.view',
  'appointments.view',
  'appointments.attendance',
  'followups.team',
  'goals.manage',
  'reports.view',
  'dashboard.view',
  'leads.export'
];

export const SYSTEM_ROLE_PROFILES = [
  { id: 'system-captor', name: 'Colaborador', scope: 'own', baseRole: 'captor', permissions: CAPTOR_PERMISSIONS, system: true, active: true },
  { id: 'system-manager', name: 'Gestor de unidades', scope: 'stores', baseRole: 'manager', permissions: MANAGER_PERMISSIONS, system: true, active: true },
  { id: 'system-admin', name: 'Administrador', scope: 'admin', baseRole: 'admin', permissions: ALL_PERMISSION_IDS, system: true, active: true }
];

export function systemRoleProfileForRole(role) {
  return SYSTEM_ROLE_PROFILES.find((profile) => profile.baseRole === role) || SYSTEM_ROLE_PROFILES[0];
}

export function permissionsForProfile(profile) {
  if (profile?.role === 'admin') return [...ALL_PERMISSION_IDS];
  if (Array.isArray(profile?.permissions)) return profile.permissions;
  return [...systemRoleProfileForRole(profile?.role).permissions];
}

export function hasPermission(profile, permission) {
  return permissionsForProfile(profile).includes(permission);
}

export function permissionsForScope(scope) {
  if (scope === 'admin') return [...ALL_PERMISSION_IDS];
  return PERMISSION_GROUPS.flatMap((group) => group.permissions)
    .filter((permission) => permission.scopes.includes(scope))
    .map((permission) => permission.id);
}

export function validateRoleProfile(values) {
  const name = String(values.name || '').trim();
  const scope = String(values.scope || 'own');
  const allowed = new Set(permissionsForScope(scope));
  const requested = Array.isArray(values.permissions) ? values.permissions.map(String) : [];
  const permissions = [...new Set(requested.filter((permission) => allowed.has(permission)))];
  const managementDependents = ['followups.team', 'goals.manage', 'reports.view', 'dashboard.view', 'leads.export'];
  if (permissions.some((permission) => managementDependents.includes(permission)) && allowed.has('management.view') && !permissions.includes('management.view')) {
    permissions.push('management.view');
  }
  const errors = {};

  if (name.length < 3 || name.length > 60) errors.name = 'Informe um nome entre 3 e 60 caracteres.';
  if (!['own', 'stores'].includes(scope)) errors.scope = 'Escolha um alcance valido.';
  if (!permissions.length) errors.permissions = 'Ative pelo menos uma permissao.';

  const baseRole = ROLE_SCOPES.find((item) => item.id === scope)?.baseRole || 'captor';
  return { isValid: Object.keys(errors).length === 0, errors, data: { name, scope, baseRole, permissions } };
}
