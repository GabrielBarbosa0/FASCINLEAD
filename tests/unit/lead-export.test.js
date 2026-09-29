import { describe, expect, it } from 'vitest';
import { createLeadsCsv } from '../../src/utils/lead-export.js';

describe('createLeadsCsv', () => {
  it('exports one lead with a UTF-8 BOM and semicolon separators', () => {
    const csv = createLeadsCsv([{
      id: 'lead-001',
      capturedAtClient: '2026-09-28T12:00:00.000Z',
      fullName: 'Cliente Exemplo',
      preferredName: 'Cliente',
      phone: '+5581999991234',
      phoneSearch: '81999991234',
      interestLabel: 'Armacao',
      neighborhood: 'Centro',
      city: 'Recife',
      state: 'PE',
      storeId: 'loja-06',
      capturedByName: 'Captador Teste',
      capturedByUid: 'captor-001',
      appointmentDate: '2026-10-02',
      appointmentTime: '14:30',
      source: 'street',
      notes: 'Contato pela manha'
    }]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"ID do lead";"Nome do cliente"');
    expect(csv).toContain('"lead-001";"Cliente Exemplo";"Cliente";"(81) 99999-1234"');
    expect(csv).toContain('"Loja 06"');
    expect(csv).toContain('"02/10/2026";"14:30"');
    expect(csv).toContain('"Captacao em campo"');
    expect(csv).not.toContain('Consentimento');
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
