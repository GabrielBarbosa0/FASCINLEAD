import { describe, expect, it } from 'vitest';
import { formatAccessStoreSummary, normalizeAccessEmail, validateAccess } from '../../src/utils/access.js';

describe('access validation', () => {
  it('normalizes an authorized Google email', () => {
    expect(normalizeAccessEmail('  Pessoa@Exemplo.COM ')).toBe('pessoa@exemplo.com');
  });

  it('accepts a complete collaborator access', () => {
    const result = validateAccess({
      displayName: 'Pessoa de Teste',
      email: 'pessoa@exemplo.com',
      role: 'captor',
      storeId: 'Loja-06'
    });

    expect(result.isValid).toBe(true);
    expect(result.data.storeId).toBe('loja-06');
  });

  it('rejects invalid email, role and unavailable store', () => {
    const result = validateAccess({ displayName: 'A', email: 'invalido', role: 'owner', storeId: 'loja-03' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.objectContaining({
      displayName: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      storeId: expect.any(String)
    }));
  });

  it.each(['loja-02', 'loja-04', 'loja-05', 'loja-06'])('accepts the available store %s', (storeId) => {
    const result = validateAccess({
      displayName: 'Pessoa de Teste',
      email: 'pessoa@exemplo.com',
      role: 'captor',
      storeId
    });

    expect(result.isValid).toBe(true);
    expect(result.data.storeId).toBe(storeId);
  });

  it('accepts multiple permitted stores for a manager', () => {
    const result = validateAccess({
      displayName: 'Gestora Regional',
      email: 'gestora@example.com',
      role: 'manager',
      storeId: 'loja-06',
      storeIds: ['loja-02', 'loja-06']
    });

    expect(result.isValid).toBe(true);
    expect(result.data.storeIds).toEqual(['loja-06', 'loja-02']);
  });

  it('summarizes permitted stores without repeating the store name', () => {
    expect(formatAccessStoreSummary({ role: 'admin' }).short).toBe('TODAS');
    expect(formatAccessStoreSummary({ role: 'captor', storeIds: ['loja-02'] }).short).toBe('Loja 02');
    expect(formatAccessStoreSummary({ role: 'manager', storeIds: ['loja-02', 'loja-04', 'loja-06'] })).toEqual({
      short: '02, 04, 06',
      full: 'Loja 02, Loja 04, Loja 06'
    });
  });
});
