import { registerSW } from 'virtual:pwa-register';

export function registerPwa({ onOfflineReady, onUpdateReady }) {
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
