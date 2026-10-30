import { registerSW } from 'virtual:pwa-register';

async function removeDevelopmentServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }

  if (navigator.serviceWorker.controller && !sessionStorage.getItem('leadflow:dev-sw-cleaned')) {
    sessionStorage.setItem('leadflow:dev-sw-cleaned', 'true');
    window.location.reload();
  }
}

export function registerPwa({ onOfflineReady, onUpdateReady }) {
  if (import.meta.env.DEV) {
    removeDevelopmentServiceWorker();
    return;
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onOfflineReady,
    onNeedReload() {
      onUpdateReady(() => window.location.reload());
    },
    onNeedRefresh() {
      onUpdateReady(() => updateServiceWorker(true));
    }
  });
}
