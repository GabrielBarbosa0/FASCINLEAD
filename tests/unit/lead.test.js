import { describe, expect, it } from 'vitest';
import { calculateAge, createLeadDocument, createLeadUpdate, validateLeadInput } from '../../src/utils/lead.js';

const validInput = {
  fullName: 'Cliente Exemplo',
  phone: '(81) 99999-1234',
  customerCpf: '529.982.247-25',
  birthDate: '1985-04-12',
  sex: 'female',
  preferredName: '',
  street: 'Rua das Flores',
  streetNumber: 'SN',
  neighborhood: '',
  city: '',
  state: 'PE',
  interestId: 'complete-glasses',
  ametropiaIds: ['myopia', 'astigmatism'],
  pathologyIds: ['glaucoma', 'diabetes'],
  appointmentDate: '2026-10-02',
  appointmentTime: '14:30',
  appointmentServiceId: 'service-eye-exam',
  appointmentServiceName: 'Exame de vista',
  appointmentDurationMinutes: 30,
  schedulingMode: 'controlled',
  notes: ''
};

const profile = {
  uid: 'user-test',
  displayName: 'Usuario de Teste',
  storeId: 'store-test'
};

describe('lead validation', () => {
  it('requires name and phone', () => {
    const result = validateLeadInput({ fullName: '', phone: '' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      fullName: expect.any(String),
      phone: expect.any(String)
    });
  });

  it('rejects notes longer than 500 characters', () => {
    const result = validateLeadInput({ ...validInput, notes: 'a'.repeat(501) });
    expect(result.errors.notes).toBeDefined();
  });

  it('accepts an empty CPF and rejects an invalid one', () => {
    expect(validateLeadInput({ ...validInput, customerCpf: '' }).isValid).toBe(true);
    const result = validateLeadInput({ ...validInput, customerCpf: '111.111.111-11' });
    expect(result.errors.customerCpf).toBeDefined();
  });

  it('calculates age and rejects a future birth date', () => {
    expect(calculateAge('2000-11-10', new Date(2026, 9, 21))).toBe(25);
    expect(calculateAge('2000-10-10', new Date(2026, 9, 21))).toBe(26);
    expect(validateLeadInput({ ...validInput, birthDate: '2999-01-01' }).errors.birthDate).toBeDefined();
    expect(validateLeadInput({ ...validInput, birthDate: '' }).isValid).toBe(true);
  });

  it('accepts known sex options and rejects unknown values', () => {
    expect(validateLeadInput({ ...validInput, sex: 'male' }).isValid).toBe(true);
    expect(validateLeadInput({ ...validInput, sex: '' }).isValid).toBe(true);
    expect(validateLeadInput({ ...validInput, sex: 'invalid' }).errors.sex).toBeDefined();
  });

  it('requires date and time together for a pre-appointment', () => {
    const result = validateLeadInput({
      ...validInput,
      appointmentTime: ''
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.appointmentDate).toBeDefined();
    expect(result.errors.appointmentTime).toBeDefined();
  });

  it('creates the expected versioned document', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    const result = createLeadDocument(validInput, profile, 'installation-test', now);

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      fullName: 'Cliente Exemplo',
      phone: '+5581999991234',
      phoneSearch: '81999991234',
      customerCpf: '52998224725',
      birthDate: '1985-04-12',
      sex: 'female',
      street: 'Rua das Flores',
      streetNumber: 'S/N',
      appointmentDate: '2026-10-02',
      appointmentTime: '14:30',
      appointmentAttendance: 'pending',
      appointmentServiceId: 'service-eye-exam',
      appointmentServiceName: 'Exame de vista',
      appointmentDurationMinutes: 30,
      ametropiaIds: ['myopia', 'astigmatism'],
      ametropiaLabels: ['Miopia', 'Astigmatismo'],
      pathologyIds: ['glaucoma', 'diabetes'],
      pathologyLabels: ['Glaucoma', 'Diabetes'],
      source: 'street',
      capturedAtClient: '2026-09-28T12:00:00.000Z',
      capturedByUid: 'user-test',
      storeId: 'store-test',
      installationId: 'installation-test',
      schemaVersion: 1
    });
    expect(result.data).not.toHaveProperty('consentGiven');
    expect(result.data).not.toHaveProperty('consentAtClient');
  });

  it('creates an update with editable fields only', () => {
    const result = createLeadUpdate({
      ...validInput,
      fullName: 'Cliente Corrigido',
      city: 'Recife'
    });

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      fullName: 'Cliente Corrigido',
      birthDate: '1985-04-12',
      sex: 'female',
      street: 'Rua das Flores',
      streetNumber: 'S/N',
      city: 'Recife',
      phone: '+5581999991234'
    });
    expect(result.data).not.toHaveProperty('capturedByUid');
    expect(result.data).not.toHaveProperty('storeId');
    expect(result.data).not.toHaveProperty('capturedAtClient');
  });

  it('keeps exclusive ametropia answers consistent', () => {
    const result = createLeadUpdate({
      ...validInput,
      ametropiaIds: ['myopia', 'none']
    });

    expect(result.data.ametropiaIds).toEqual(['none']);
    expect(result.data.ametropiaLabels).toEqual(['Nao possui']);
  });

  it('keeps exclusive pathology answers consistent', () => {
    const result = createLeadUpdate({
      ...validInput,
      pathologyIds: ['glaucoma', 'none']
    });

    expect(result.data.pathologyIds).toEqual(['none']);
    expect(result.data.pathologyLabels).toEqual(['Nao possui']);
  });

  it('ignores pathology options removed from the registration form', () => {
    const result = createLeadUpdate({
      ...validInput,
      pathologyIds: ['dry-eye', 'macular-degeneration', 'retinal-detachment']
    });

    expect(result.data.pathologyIds).toEqual([]);
    expect(result.data.pathologyLabels).toEqual([]);
  });
});
