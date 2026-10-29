import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectivityMarkup, createToastController, toastMarkup } from '../../src/app/shared/ui.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('shared UI helpers', () => {
  it('creates escaped toast markup', () => {
    const markup = toastMarkup({
      message: '<strong>Falha</strong>',
      tone: 'danger',
      icon: 'circle-alert'
    });

    expect(markup).toContain('toast-danger');
    expect(markup).toContain('data-lucide="circle-alert"');
    expect(markup).toContain('&lt;strong&gt;Falha&lt;/strong&gt;');
    expect(markup).not.toContain('<strong>');
  });

  it('creates online and offline indicator markup', () => {
    expect(connectivityMarkup(true)).toContain('data-lucide="wifi"');
    expect(connectivityMarkup(true)).toContain('Online');
    expect(connectivityMarkup(false)).toContain('data-lucide="wifi-off"');
    expect(connectivityMarkup(false)).toContain('Offline');
  });

  it('shows one toast and clears it after the configured duration', () => {
    vi.useFakeTimers();
    const previousToast = { remove: vi.fn() };
    const currentToast = { remove: vi.fn() };
    const root = {
      querySelector: vi.fn(() => previousToast),
      insertAdjacentHTML: vi.fn()
    };
    const documentStub = {
      querySelector: vi.fn((selector) => selector === '#app' ? root : currentToast)
    };
    vi.stubGlobal('document', documentStub);
    const state = { toast: null };
    const renderIcons = vi.fn();
    const showToast = createToastController(state, { duration: 100, renderIcons });

    showToast('Salvo com sucesso.');

    expect(state.toast).toEqual({ message: 'Salvo com sucesso.', tone: 'success', icon: 'circle-check' });
    expect(previousToast.remove).toHaveBeenCalled();
    expect(root.insertAdjacentHTML).toHaveBeenCalledWith('beforeend', expect.stringContaining('Salvo com sucesso.'));
    expect(renderIcons).toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(state.toast).toBeNull();
    expect(currentToast.remove).toHaveBeenCalled();
  });
});
