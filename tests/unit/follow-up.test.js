import { describe, expect, it } from 'vitest';
import { appointmentFollowUps, buildWhatsAppFollowUpUrl, followUpAppointmentKey, followUpAvailableAt, isFollowUpContacted } from '../../src/utils/follow-up.js';

const profile = { uid: 'captor-1', role: 'captor' };
const lead = {
  id: 'lead-1',
  fullName: 'Cliente Exemplo',
  preferredName: 'Clara',
  phone: '+5581999991234',
  phoneSearch: '81999991234',
  appointmentDate: '2026-10-15',
  appointmentTime: '09:00',
  appointmentAttendance: 'missed',
  capturedByUid: 'captor-1'
};

describe('missed appointment follow-ups', () => {
  it('releases a missed appointment after the configured grace period', () => {
    expect(followUpAvailableAt(lead, 30)).toEqual(new Date('2026-10-15T09:30:00'));
    expect(appointmentFollowUps([lead], profile, { noShowGraceMinutes: 30 }, new Date('2026-10-15T09:29:59'))).toEqual([]);
    expect(appointmentFollowUps([lead], profile, { noShowGraceMinutes: 30 }, new Date('2026-10-15T09:30:00'))).toEqual([lead]);
  });

  it('only returns missed leads owned by the signed-in captor', () => {
    const attended = { ...lead, id: 'lead-2', appointmentAttendance: 'attended' };
    const anotherCaptor = { ...lead, id: 'lead-3', capturedByUid: 'captor-2' };
    expect(appointmentFollowUps([attended, anotherCaptor], profile, {}, new Date('2026-10-16T10:00:00'))).toEqual([]);
  });

  it('includes overdue pending appointments only when automation is enabled', () => {
    const pending = { ...lead, appointmentAttendance: 'pending' };
    const now = new Date('2026-10-15T10:00:00');
    expect(appointmentFollowUps([pending], profile, {
      noShowGraceMinutes: 60,
      automaticPendingFollowUp: false
    }, now)).toEqual([]);
    expect(appointmentFollowUps([pending], profile, {
      noShowGraceMinutes: 60,
      automaticPendingFollowUp: true
    }, now)).toEqual([pending]);
  });

  it('lets a manager see overdue returns only from their store', () => {
    const manager = { uid: 'manager-1', role: 'manager', storeId: 'loja-06' };
    const ownStore = { ...lead, storeId: 'loja-06' };
    const anotherStore = { ...lead, id: 'lead-2', storeId: 'loja-02' };
    expect(appointmentFollowUps([ownStore, anotherStore], manager, {}, new Date('2026-10-16T10:00:00'))).toEqual([ownStore]);
  });

  it('lets an administrator see returns from every store using each store configuration', () => {
    const admin = { uid: 'admin-1', role: 'admin', storeId: 'loja-06' };
    const missedAnotherStore = { ...lead, id: 'lead-2', storeId: 'loja-02' };
    const pendingOwnStore = { ...lead, id: 'lead-3', storeId: 'loja-06', appointmentTime: '09:30', appointmentAttendance: 'pending' };
    const settings = {
      noShowGraceMinutes: 30,
      automaticPendingFollowUp: false,
      byStore: {
        'loja-02': { noShowGraceMinutes: 60, automaticPendingFollowUp: false },
        'loja-06': { noShowGraceMinutes: 30, automaticPendingFollowUp: true }
      }
    };
    expect(appointmentFollowUps(
      [missedAnotherStore, pendingOwnStore],
      admin,
      settings,
      new Date('2026-10-15T10:00:00')
    )).toEqual([pendingOwnStore, missedAnotherStore]);
  });

  it('counts a contact only for the current appointment', () => {
    const contacted = {
      ...lead,
      followUpContactedAt: '2026-10-15T10:00:00.000Z',
      followUpContactedAppointmentKey: followUpAppointmentKey(lead)
    };
    expect(isFollowUpContacted(contacted)).toBe(true);
    expect(isFollowUpContacted({ ...contacted, appointmentTime: '11:00' })).toBe(false);
  });

  it('builds a prepared WhatsApp message using the customer phone and preferred name', () => {
    const url = new URL(buildWhatsAppFollowUpUrl(lead));
    expect(url.pathname).toBe('/5581999991234');
    expect(url.searchParams.get('text')).toContain('Ola, Clara!');
    expect(url.searchParams.get('text')).toContain('reagendar');
  });
});
