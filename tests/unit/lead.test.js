import { describe, expect, it } from 'vitest';
import { createLeadDocument, createLeadUpdate, validateLeadInput } from '../../src/utils/lead.js';

const validInput = {
  fullName: 'Cliente Exemplo',
  phone: '(81) 99999-1234',
  preferredName: '',
  neighborhood: '',
  city: '',
  state: 'PE',
  interestId: 'complete-glasses',
  appointmentDate: '2026-10-02',
  appointmentTime: '14:30',
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
      appointmentDate: '2026-10-02',
      appointmentTime: '14:30',
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
      city: 'Recife',
      phone: '+5581999991234'
    });
    expect(result.data).not.toHaveProperty('capturedByUid');
    expect(result.data).not.toHaveProperty('storeId');
    expect(result.data).not.toHaveProperty('capturedAtClient');
  });
});
