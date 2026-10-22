import { describe, expect, it } from 'vitest';
import { appointmentQuotaStatus, buildAppointmentSlots, normalizeStoreSchedule, validateStoreSchedule } from '../../src/utils/schedule.js';

describe('store schedule helpers', () => {
  it('uses controlled twenty-minute appointments by default', () => {
    expect(normalizeStoreSchedule({})).toEqual({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      noShowGraceMinutes: 30,
      automaticPendingFollowUp: false,
      showAmetropiaFields: false,
      limitedDaysEnabled: false,
      limitedWeekdays: [3, 6],
      limitedDayCapacity: 10,
      meiDailyQuota: 2,
      openingTime: '08:00',
      closingTime: '18:00'
    });
  });

  it('creates only slots that fit completely inside the working day', () => {
    const slots = buildAppointmentSlots({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 30,
      openingTime: '08:00',
      closingTime: '09:20'
    });
    expect(slots.map((slot) => slot.time)).toEqual(['08:00', '08:30']);
    expect(slots.at(-1).endTime).toBe('09:00');
  });

  it('marks overlapping appointments as unavailable', () => {
    const slots = buildAppointmentSlots({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      openingTime: '08:00',
      closingTime: '09:00'
    }, [{ id: 'lead-1', appointmentTime: '08:10' }]);
    expect(slots.map(({ time, available }) => [time, available])).toEqual([
      ['08:00', false],
      ['08:20', false],
      ['08:40', true]
    ]);
  });

  it('reports every slot as unavailable when the day is full', () => {
    const settings = {
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 30,
      openingTime: '08:00',
      closingTime: '09:00'
    };
    const slots = buildAppointmentSlots(settings, [
      { id: 'lead-1', appointmentTime: '08:00', durationMinutes: 30 },
      { id: 'lead-2', appointmentTime: '08:30', durationMinutes: 30 }
    ]);
    expect(slots.every((slot) => !slot.available)).toBe(true);
  });

  it('uses each saved appointment duration when services have different lengths', () => {
    const slots = buildAppointmentSlots({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 15,
      openingTime: '08:00',
      closingTime: '09:00'
    }, [{ id: 'lead-1', appointmentTime: '08:15', appointmentDurationMinutes: 30 }]);
    expect(slots.map(({ time, available }) => [time, available])).toEqual([
      ['08:00', true],
      ['08:15', false],
      ['08:30', false],
      ['08:45', true]
    ]);
  });

  it('validates duration and working hours', () => {
    expect(validateStoreSchedule({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 30,
      openingTime: '18:00',
      closingTime: '08:00'
    })).toMatchObject({ isValid: false, errors: { closingTime: expect.any(String) } });
  });

  it('validates the no-show follow-up grace period', () => {
    expect(validateStoreSchedule({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      noShowGraceMinutes: 241,
      openingTime: '08:00',
      closingTime: '18:00'
    })).toMatchObject({ isValid: false, errors: { noShowGraceMinutes: expect.any(String) } });
  });

  it('normalizes the automatic follow-up switch from form values', () => {
    expect(normalizeStoreSchedule({ automaticPendingFollowUp: 'true' }).automaticPendingFollowUp).toBe(true);
    expect(normalizeStoreSchedule({ automaticPendingFollowUp: 'false' }).automaticPendingFollowUp).toBe(false);
  });

  it('keeps ametropia fields hidden by default and accepts explicit activation', () => {
    expect(normalizeStoreSchedule({}).showAmetropiaFields).toBe(false);
    expect(normalizeStoreSchedule({ showAmetropiaFields: 'true' }).showAmetropiaFields).toBe(true);
    expect(normalizeStoreSchedule({ showAmetropiaFields: 'false' }).showAmetropiaFields).toBe(false);
  });

  it('limits each MEI on configured weekdays', () => {
    const settings = {
      limitedDaysEnabled: true,
      limitedWeekdays: [3, 6],
      limitedDayCapacity: 10,
      meiDailyQuota: 2
    };
    const profile = { uid: 'mei-1', roleProfileId: 'system-mei' };
    const appointments = [
      { id: 'slot-1', capturedByUid: 'mei-1' },
      { id: 'slot-2', capturedByUid: 'mei-1' },
      { id: 'slot-3', capturedByUid: 'other' }
    ];

    expect(appointmentQuotaStatus(settings, '2026-10-21', appointments, profile)).toMatchObject({
      limited: true,
      isMei: true,
      dailyRemaining: 7,
      meiRemaining: 0,
      blocked: true,
      reason: 'mei-quota'
    });
    expect(appointmentQuotaStatus(settings, '2026-10-22', appointments, profile).limited).toBe(false);
  });

  it('blocks all remaining times after the daily capacity is reached', () => {
    const settings = {
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      openingTime: '08:00',
      closingTime: '09:00',
      limitedDaysEnabled: true,
      limitedWeekdays: [3],
      limitedDayCapacity: 2,
      meiDailyQuota: 1
    };
    const appointments = [
      { id: 'slot-1', appointmentTime: '08:00', capturedByUid: 'one' },
      { id: 'slot-2', appointmentTime: '08:20', capturedByUid: 'two' }
    ];
    const slots = buildAppointmentSlots(settings, appointments, '', { appointmentDate: '2026-10-21', profile: { uid: 'admin', roleProfileId: 'system-admin' } });
    expect(slots.every((slot) => !slot.available)).toBe(true);
  });

  it('validates limited-day capacity and MEI quota', () => {
    expect(validateStoreSchedule({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      openingTime: '08:00',
      closingTime: '18:00',
      limitedDaysEnabled: true,
      limitedWeekdays: [],
      limitedDayCapacity: 3,
      meiDailyQuota: 4
    }).errors).toEqual(expect.objectContaining({
      limitedWeekdays: expect.any(String),
      meiDailyQuota: expect.any(String)
    }));
  });
});
