import { createId } from './id.js';

const INSTALLATION_KEY = 'fascinlead:installation-id';

export function getInstallationId() {
  let id;
  try {
    id = localStorage.getItem(INSTALLATION_KEY);
  } catch {
    return createId();
  }
  if (!id) {
    id = createId();
    try {
      localStorage.setItem(INSTALLATION_KEY, id);
    } catch {
      return id;
    }
  }
  return id;
}
