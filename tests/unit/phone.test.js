import { describe, expect, it } from 'vitest';
import { formatBrazilianPhone, normalizeBrazilianPhone, onlyDigits } from '../../src/utils/phone.js';

describe('phone utilities', () => {
  it('keeps only digits', () => {
    expect(onlyDigits('(81) 99999-1234')).toBe('81999991234');
  });

  it('normalizes a Brazilian mobile number', () => {
    expect(normalizeBrazilianPhone('(81) 99999-1234')).toEqual({
      e164: '+5581999991234',
      search: '81999991234',
      formatted: '(81) 99999-1234'
    });
  });

  it('accepts an existing country code', () => {
    expect(normalizeBrazilianPhone('+55 81 99999-1234')?.search).toBe('81999991234');
  });

  it('rejects incomplete numbers', () => {
    expect(normalizeBrazilianPhone('819999')).toBeNull();
  });

  it('formats while the user types', () => {
    expect(formatBrazilianPhone('81999991234')).toBe('(81) 99999-1234');
  });
});
