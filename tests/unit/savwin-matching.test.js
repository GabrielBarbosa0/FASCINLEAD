import { describe, expect, it } from 'vitest';
import { classifySavwinSales, formatBrazilianCpf, groupSavwinSales, isValidCpf, maskCpf, normalizeCpf } from '../../src/utils/savwin-matching.js';

describe('SavWin sale matching', () => {
  it('validates and masks CPF values', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(formatBrazilianCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(maskCpf('52998224725')).toBe('***.***.***-25');
  });

  it('groups product rows from the same OS without summing the sale twice', () => {
    const sales = groupSavwinSales([
      { LOJA: '0006 - ÓTICAS FASCINANTE', OS: 123, CPF: '52998224725', DATAVENDA: '16/10/2026', VLRLIQUIDOVENDA: '1.200,00', PRODUTO: 'Armação' },
      { LOJA: '0006 - ÓTICAS FASCINANTE', OS: 123, CPF: '52998224725', DATAVENDA: '16/10/2026', VLRLIQUIDOVENDA: '1.200,00', PRODUTO: 'Lente' }
    ]);
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ storeCode: '6', osNumber: '123', saleValue: 1200, rowCount: 2 });
    expect(sales[0].products).toEqual(['Armação', 'Lente']);
  });

  it('separates recent candidates from sales before lead capture', () => {
    const grouped = groupSavwinSales([
      { LOJA: 6, OS: 20, CPF: '52998224725', DATAVENDA: '16/10/2026' },
      { LOJA: 6, OS: 10, CPF: '52998224725', DATAVENDA: '01/09/2026' }
    ]);
    const result = classifySavwinSales({ storeId: 'loja-06', capturedAtClient: '2026-10-01T10:00:00Z' }, '52998224725', grouped);
    expect(result.status).toBe('possible_sale');
    expect(result.candidates.map((sale) => sale.osNumber)).toEqual(['20']);
    expect(result.historical.map((sale) => sale.osNumber)).toEqual(['10']);
  });
});
