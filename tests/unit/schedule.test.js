import { describe, expect, it } from 'vitest';
import { buildAppointmentSlots, normalizeStoreSchedule, validateStoreSchedule } from '../../src/utils/schedule.js';

describe('store schedule helpers', () => {
  it('uses controlled twenty-minute appointments by default', () => {
    expect(normalizeStoreSchedule({})).toEqual({
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      noShowGraceMinutes: 30,
      automaticPendingFollowUp: false,
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
});
