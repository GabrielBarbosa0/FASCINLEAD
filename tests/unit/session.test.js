import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SESSION_KEY, clearDemoSession, createDemoProfile, hasDemoSession, resetSessionState, startDemoSession } from '../../src/app/core/session.js';

function createSessionStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function dirtyState() {
  return {
    profile: { uid: 'old-user' },
    demoMode: true,
    leads: [{ id: 'lead-1' }],
    management: { loaded: true },
    savwin: { result: { id: 'sale-1' } },
    appointments: { loaded: true },
    confirmations: { loaded: true },
    appointmentCreate: { saving: true },
    newLeadSchedule: { loaded: true },
    leadDetailSchedule: { loading: true },
    offlineCapture: { loaded: true, enabled: true },
    followUps: { loaded: true },
    settings: { loaded: true },
    access: { loaded: true },
    goals: { loaded: true }
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('core session', () => {
  it('creates demo profiles with the intended role and permission scope', () => {
    const administrator = createDemoProfile('admin');
    const mei = createDemoProfile('mei');
    const receptionist = createDemoProfile('receptionist');

    expect(administrator.role).toBe('admin');
    expect(administrator.storeIds).toHaveLength(4);
    expect(mei.roleProfileId).toBe('system-mei');
    expect(mei.storeIds).toHaveLength(4);
    expect(receptionist.roleProfileId).toBe('system-receptionist');
    expect(receptionist.storeIds).toEqual(['loja-06']);
  });

  it('persists and clears the development session independently from profile creation', () => {
    const sessionStorage = createSessionStorage();
    vi.stubGlobal('sessionStorage', sessionStorage);
    const state = { demoMode: false, profile: null, authError: 'erro', authMessage: 'mensagem' };

    startDemoSession(state);
    expect(hasDemoSession(true)).toBe(true);
    expect(state.demoMode).toBe(true);
    expect(state.profile.uid).toBe('demo-user');
    expect(state.authError).toBe('');

    clearDemoSession();
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
  });

  it('resets the user-scoped data when the session ends', () => {
    const state = dirtyState();
    resetSessionState(state, {
      createDefaultManagementFilters: () => ({ startDate: '2026-10-01' }),
      createDefaultGoalDraft: () => ({ title: 'Meta de captações' }),
      createDefaultRoleDraft: () => ({ name: '', scope: 'own', permissions: ['leads.create'] })
    });

    expect(state.profile).toBeNull();
    expect(state.demoMode).toBe(false);
    expect(state.leads).toEqual([]);
    expect(state.management).toMatchObject({ loaded: false, records: [] });
    expect(state.appointments).toMatchObject({ loaded: false, records: [] });
    expect(state.settings).toMatchObject({ loaded: false, services: [] });
    expect(state.settings.roleDraft).toEqual({ name: '', scope: 'own', permissions: ['leads.create'] });
    expect(state.goals).toMatchObject({ loaded: false, records: [], draft: { title: 'Meta de captações' } });
  });
});
