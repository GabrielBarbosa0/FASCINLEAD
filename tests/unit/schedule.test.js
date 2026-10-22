import { describe, expect, it } from 'vitest';
import {
  appointmentBlockTimes,
  appointmentQuotaStatus,
  appointmentSlotId,
  buildAppointmentSlots,
  normalizeStoreSchedule,
  validateStoreSchedule
} from '../../src/utils/schedule.js';

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
      meiQuotaEnabled: false,
      meiQuotaWeekdays: [3, 6],
      meiMorningQuota: 1,
      meiAfternoonQuota: 1,
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
    expect(slots.map((slot) => slot.time)).toEqual(['08:00', '08:10', '08:20', '08:30', '08:40', '08:50']);
    expect(slots.at(-1).endTime).toBe('09:20');
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
      ['08:10', false],
      ['08:20', false],
      ['08:30', true],
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
      appointmentDurationMinutes: 10,
      openingTime: '08:00',
      closingTime: '09:00'
    }, [{ id: 'lead-1', appointmentTime: '08:15', appointmentDurationMinutes: 30 }]);
    expect(slots.map(({ time, available }) => [time, available])).toEqual([
      ['08:00', true],
      ['08:10', false],
      ['08:20', false],
      ['08:30', false],
      ['08:40', false],
      ['08:50', true]
    ]);
  });

  it('reserves every ten-minute block required by a service', () => {
    expect(appointmentBlockTimes('08:10', 30)).toEqual(['08:10', '08:20', '08:30']);
    expect(appointmentSlotId('loja-06', '2026-10-22', '08:20')).toBe('slot-loja-06-2026-10-22-08:20');
  });

  it('uses persisted blocks to prevent partial overlaps', () => {
    const slots = buildAppointmentSlots({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      openingTime: '08:00',
      closingTime: '09:00'
    }, [{ id: 'block-1', leadId: 'lead-1', appointmentTime: '08:00', blockTime: '08:10', durationMinutes: 20 }]);
    expect(slots.map(({ time, available }) => [time, available])).toEqual([
      ['08:00', false],
      ['08:10', false],
      ['08:20', true],
      ['08:30', true],
      ['08:40', true]
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
      meiQuotaEnabled: true,
      meiQuotaWeekdays: [3, 6],
      meiMorningQuota: 1,
      meiAfternoonQuota: 2
    };
    const profile = { uid: 'mei-1', roleProfileId: 'system-mei' };
    const appointments = [
      { id: 'slot-1', appointmentTime: '09:00', capturedByUid: 'mei-1' },
      { id: 'slot-2', appointmentTime: '14:00', capturedByUid: 'mei-1' },
      { id: 'slot-3', appointmentTime: '15:00', capturedByUid: 'other' }
    ];

    expect(appointmentQuotaStatus(settings, '2026-10-21', appointments, profile, '', '10:00')).toMatchObject({
      limited: false,
      isMei: true,
      meiLimited: true,
      meiMorningRemaining: 0,
      meiAfternoonRemaining: 1,
      blocked: true,
      reason: 'mei-quota'
    });
    expect(appointmentQuotaStatus(settings, '2026-10-21', appointments, profile, '', '14:00').blocked).toBe(false);
    expect(appointmentQuotaStatus(settings, '2026-10-22', appointments, profile, '', '10:00').meiLimited).toBe(false);
  });

  it('hides only the period whose MEI quota was reached', () => {
    const slots = buildAppointmentSlots({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 10,
      openingTime: '11:40',
      closingTime: '12:30',
      meiQuotaEnabled: true,
      meiQuotaWeekdays: [3],
      meiMorningQuota: 1,
      meiAfternoonQuota: 1
    }, [{ id: 'lead-1', appointmentTime: '09:00', capturedByUid: 'mei-1' }], '', {
      appointmentDate: '2026-10-21',
      profile: { uid: 'mei-1', roleProfileId: 'system-mei' }
    });
    expect(slots.map(({ time, available }) => [time, available])).toEqual([
      ['11:40', false],
      ['11:50', false],
      ['12:00', true],
      ['12:10', true],
      ['12:20', true]
    ]);
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

  it('counts appointment clients instead of their reserved blocks', () => {
    const appointments = [
      { id: 'block-1', leadId: 'lead-1', appointmentTime: '09:00', capturedByUid: 'mei-1' },
      { id: 'block-2', leadId: 'lead-1', appointmentTime: '09:00', capturedByUid: 'mei-1' },
      { id: 'block-3', leadId: 'lead-2', appointmentTime: '14:00', capturedByUid: 'other' }
    ];
    expect(appointmentQuotaStatus({
      limitedDaysEnabled: true,
      limitedWeekdays: [3],
      limitedDayCapacity: 3,
      meiQuotaEnabled: true,
      meiQuotaWeekdays: [3],
      meiMorningQuota: 2,
      meiAfternoonQuota: 1
    }, '2026-10-21', appointments, { uid: 'mei-1', roleProfileId: 'system-mei' })).toMatchObject({
      dailyUsed: 2,
      dailyRemaining: 1,
      meiUsed: 1,
      meiMorningRemaining: 1,
      meiAfternoonRemaining: 1
    });
  });

  it('validates limited-day capacity and MEI period quotas', () => {
    expect(validateStoreSchedule({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      openingTime: '08:00',
      closingTime: '18:00',
      limitedDaysEnabled: true,
      limitedWeekdays: [],
      limitedDayCapacity: 3,
      meiQuotaEnabled: true,
      meiQuotaWeekdays: [],
      meiMorningQuota: 0,
      meiAfternoonQuota: 0
    }).errors).toEqual(expect.objectContaining({
      limitedWeekdays: expect.any(String),
      meiQuotaWeekdays: expect.any(String),
      meiMorningQuota: expect.any(String)
    }));
  });
});
