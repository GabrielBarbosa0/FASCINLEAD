const VALID_ROUTES = new Set(['home', 'new', 'leads', 'lead', 'sync', 'management', 'management-lead', 'access', 'goals']);

function routeParts() {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function currentRoute() {
  const route = routeParts()[0] || 'home';
  return VALID_ROUTES.has(route) ? route : 'home';
}

export function currentRouteParam() {
  const value = routeParts()[1];
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export function navigate(route, param = '') {
  const target = VALID_ROUTES.has(route) ? route : 'home';
  location.hash = `#/${target}${param ? `/${encodeURIComponent(param)}` : ''}`;
}
