import { registerSW } from 'virtual:pwa-register';

export function registerPwa({ onOfflineReady, onUpdateReady }) {
  const updateServiceWorker = registerSW({
    immediate: true,
    onOfflineReady,
    onNeedRefresh() {
      onUpdateReady(() => updateServiceWorker(true));
    }
  });
}
