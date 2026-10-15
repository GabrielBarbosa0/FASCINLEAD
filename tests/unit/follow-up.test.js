import { describe, expect, it } from 'vitest';
import { buildWhatsAppFollowUpUrl, followUpAvailableAt, missedFollowUps } from '../../src/utils/follow-up.js';

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
    expect(missedFollowUps([lead], profile, { noShowGraceMinutes: 30 }, new Date('2026-10-15T09:29:59'))).toEqual([]);
    expect(missedFollowUps([lead], profile, { noShowGraceMinutes: 30 }, new Date('2026-10-15T09:30:00'))).toEqual([lead]);
  });

  it('only returns missed leads owned by the signed-in captor', () => {
    const attended = { ...lead, id: 'lead-2', appointmentAttendance: 'attended' };
    const anotherCaptor = { ...lead, id: 'lead-3', capturedByUid: 'captor-2' };
    expect(missedFollowUps([attended, anotherCaptor], profile, {}, new Date('2026-10-16T10:00:00'))).toEqual([]);
  });

  it('builds a prepared WhatsApp message using the customer phone and preferred name', () => {
    const url = new URL(buildWhatsAppFollowUpUrl(lead));
    expect(url.pathname).toBe('/5581999991234');
    expect(url.searchParams.get('text')).toContain('Ola, Clara!');
    expect(url.searchParams.get('text')).toContain('reagendar');
  });
});
