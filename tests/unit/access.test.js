import { describe, expect, it } from 'vitest';
import { normalizeAccessEmail, validateAccess } from '../../src/utils/access.js';

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

  it('rejects invalid email, role and store code', () => {
    const result = validateAccess({ displayName: 'A', email: 'invalido', role: 'owner', storeId: 'Loja 06' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.objectContaining({
      displayName: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      storeId: expect.any(String)
    }));
  });
});

