import { describe, expect, it } from 'vitest';
import { createLeadsCsv } from '../../src/utils/lead-export.js';

describe('createLeadsCsv', () => {
  it('exports one lead with a UTF-8 BOM and semicolon separators', () => {
    const csv = createLeadsCsv([{
      capturedAtClient: '2026-09-28T12:00:00.000Z',
      fullName: 'Cliente Exemplo',
      phone: '+5581999991234',
      interestLabel: 'Armacao',
      neighborhood: 'Centro',
      city: 'Recife',
      state: 'PE',
      storeId: 'loja-06',
      capturedByName: 'Captador Teste',
      notes: 'Contato pela manha'
    }]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Cliente Exemplo";"\'+5581999991234"');
  });

  it('escapes quotes and protects spreadsheet formulas', () => {
    const csv = createLeadsCsv([{
      fullName: '=IMPORTXML("url")',
      notes: 'Cliente disse "sim"'
    }]);

    expect(csv).toContain('"\'=IMPORTXML(""url"")"');
    expect(csv).toContain('"Cliente disse ""sim"""');
  });
});
