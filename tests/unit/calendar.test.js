import { describe, expect, it } from 'vitest';
import { appointmentsByDate, calendarDays, formatMonthLabel, monthRange, shiftMonth } from '../../src/utils/calendar.js';

describe('calendar helpers', () => {
  it('builds a stable six-week month grid starting on Sunday', () => {
    const days = calendarDays('2026-10', new Date(2026, 9, 15));
    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ date: '2026-09-27', inCurrentMonth: false });
    expect(days[4]).toMatchObject({ date: '2026-10-01', day: 1, inCurrentMonth: true });
    expect(days.find((day) => day.date === '2026-10-15')?.isToday).toBe(true);
    expect(days.at(-1).date).toBe('2026-11-07');
  });

  it('navigates across years and returns the complete range', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthRange('2028-02')).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
  });

  it('groups and orders appointments by date and time', () => {
    const groups = appointmentsByDate([
      { id: 'later', appointmentDate: '2026-10-03', appointmentTime: '14:00' },
      { id: 'earlier', appointmentDate: '2026-10-03', appointmentTime: '08:30' },
      { id: 'without-date', appointmentDate: '', appointmentTime: '' }
    ]);
    expect(groups['2026-10-03'].map((item) => item.id)).toEqual(['earlier', 'later']);
    expect(Object.keys(groups)).toEqual(['2026-10-03']);
    expect(formatMonthLabel('2026-10')).toBe('Outubro de 2026');
  });
});
