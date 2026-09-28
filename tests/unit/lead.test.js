import { describe, expect, it } from 'vitest';
import { createLeadDocument, validateLeadInput } from '../../src/utils/lead.js';

const validInput = {
  fullName: 'Cliente Exemplo',
  phone: '(81) 99999-1234',
  preferredName: '',
  neighborhood: '',
  city: '',
  state: 'PE',
  interestId: 'complete-glasses',
  notes: '',
  consentGiven: true
};

const profile = {
  uid: 'user-test',
  displayName: 'Usuario de Teste',
  storeId: 'store-test'
};

describe('lead validation', () => {
  it('requires name, phone and consent', () => {
    const result = validateLeadInput({ fullName: '', phone: '', consentGiven: false });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      fullName: expect.any(String),
      phone: expect.any(String),
      consentGiven: expect.any(String)
    });
  });

  it('rejects notes longer than 500 characters', () => {
    const result = validateLeadInput({ ...validInput, notes: 'a'.repeat(501) });
    expect(result.errors.notes).toBeDefined();
  });

  it('creates the expected versioned document', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    const result = createLeadDocument(validInput, profile, 'installation-test', now);

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      fullName: 'Cliente Exemplo',
      phone: '+5581999991234',
      phoneSearch: '81999991234',
      consentGiven: true,
      source: 'street',
      capturedAtClient: '2026-09-28T12:00:00.000Z',
      capturedByUid: 'user-test',
      storeId: 'store-test',
      installationId: 'installation-test',
      schemaVersion: 1
    });
  });
});
