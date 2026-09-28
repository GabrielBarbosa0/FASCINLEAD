const VALID_ROUTES = new Set(['home', 'new', 'leads', 'sync']);

export function currentRoute() {
  const route = location.hash.replace(/^#\/?/, '') || 'home';
  return VALID_ROUTES.has(route) ? route : 'home';
}

export function navigate(route) {
  location.hash = `#/${VALID_ROUTES.has(route) ? route : 'home'}`;
}
