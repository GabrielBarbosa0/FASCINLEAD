import { describe, expect, it, vi } from 'vitest';
import { ensureAppointmentData, stopAppointmentsSubscription, stopConfirmationsSubscription } from '../../src/app/features/scheduling/appointment-subscriptions.js';
import { stopNewLeadScheduleSubscriptions } from '../../src/app/features/scheduling/new-lead-schedule-controller.js';

describe('scheduling controllers', () => {
  it('starts only the live subscription for the active scheduling route', () => {
    const startAppointments = vi.fn();
    const startConfirmations = vi.fn();
    ensureAppointmentData({ state: { route: 'appointments', demoMode: false, unsubscribeAppointments: null, unsubscribeConfirmations: null }, hasAccess: () => true, startAppointments, startConfirmations });
    expect(startAppointments).toHaveBeenCalledOnce();
    expect(startConfirmations).not.toHaveBeenCalled();

    ensureAppointmentData({ state: { route: 'confirmations', demoMode: false, unsubscribeAppointments: null, unsubscribeConfirmations: null }, hasAccess: () => true, startAppointments, startConfirmations });
    expect(startConfirmations).toHaveBeenCalledOnce();
  });

  it('cleans up appointment, confirmation and new-lead subscriptions', () => {
    const appointments = vi.fn();
    const confirmations = vi.fn();
    const store = vi.fn();
    const day = vi.fn();
    const state = { unsubscribeAppointments: appointments, unsubscribeConfirmations: confirmations, unsubscribeStoreSchedule: store, unsubscribeDayAppointments: day };
    stopAppointmentsSubscription(state);
    stopConfirmationsSubscription(state);
    stopNewLeadScheduleSubscriptions(state);
    expect(appointments).toHaveBeenCalledOnce();
    expect(confirmations).toHaveBeenCalledOnce();
    expect(store).toHaveBeenCalledOnce();
    expect(day).toHaveBeenCalledOnce();
    expect(state).toMatchObject({ unsubscribeAppointments: null, unsubscribeConfirmations: null, unsubscribeStoreSchedule: null, unsubscribeDayAppointments: null });
  });
});
