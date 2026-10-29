import { describe, expect, it } from 'vitest';
import { birthdayBenefitLabel, birthdayMonthDay, DEFAULT_BIRTHDAY_CAMPAIGN, upcomingBirthdays } from '../../src/app/features/birthdays/birthday-data.js';
import { birthdayCongratulatedEvent } from '../../src/app/features/birthdays/birthday-events.js';

describe('birthday campaign foundation', () => {
  it('keeps the future campaign disabled by default', () => {
    expect(DEFAULT_BIRTHDAY_CAMPAIGN.enabled).toBe(false);
  });

  it('derives a reusable birthday key from a valid birth date', () => {
    expect(birthdayMonthDay('1985-04-12')).toBe('04-12');
    expect(birthdayMonthDay('1985-02-30')).toBe('');
  });

  it('lists today and upcoming birthdays, including legacy records', () => {
    const birthdays = upcomingBirthdays([
      { id: 'today', fullName: 'Ana', birthDate: '1980-10-29' },
      { id: 'tomorrow', fullName: 'Bruno', birthMonthDay: '10-30' },
      { id: 'later', fullName: 'Carla', birthMonthDay: '11-04' }
    ], { today: new Date(2026, 9, 29), lookAheadDays: 2 });

    expect(birthdays.map((item) => item.lead.id)).toEqual(['today', 'tomorrow']);
    expect(birthdays.map((item) => item.daysUntil)).toEqual([0, 1]);
  });

  it('builds a timeline event with the planned benefit', () => {
    const event = birthdayCongratulatedEvent({ id: 'lead-1', storeId: 'loja-06', funnelStage: 'scheduled' }, {
      uid: 'user-1', displayName: 'Maria', role: 'telemarketing'
    }, { benefitType: 'voucher', benefitValue: 50 }, new Date('2026-10-29T12:00:00.000Z'));

    expect(event).toMatchObject({
      eventType: 'birthday_congratulated',
      benefitType: 'voucher',
      benefitValue: 50,
      benefitLabel: 'Voucher de R$ 50,00'
    });
    expect(birthdayBenefitLabel('cashback', 20)).toBe('Cashback de R$ 20,00');
  });
});
