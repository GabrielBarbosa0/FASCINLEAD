import { describe, expect, it } from 'vitest';
import { duplicateSearchTerms, hasBlockingDuplicate, rankDuplicateCandidates } from '../../src/app/features/duplicates/duplicate-detector.js';

describe('duplicate feature modules', () => {
  const values = { fullName: 'Maria da Silva', customerCpf: '529.982.247-25', phone: '(81) 99999-1234', birthDate: '1985-04-12' };

  it('normalizes the searchable lead values', () => {
    expect(duplicateSearchTerms(values)).toEqual({
      customerCpf: '52998224725',
      phoneSearch: '81999991234',
      fullNameSearch: 'maria da silva',
      birthDate: '1985-04-12'
    });
  });

  it('ranks a matching CPF above other possible matches', () => {
    const candidates = rankDuplicateCandidates(values, [
      { id: 'phone', fullName: 'Outra Pessoa', phoneSearch: '81999991234', customerCpf: '' },
      { id: 'cpf', fullName: 'Maria da Silva', phoneSearch: '81988887777', customerCpf: '52998224725', birthDate: '1985-04-12' }
    ]);
    expect(candidates.map((candidate) => candidate.id)).toEqual(['cpf', 'phone']);
    expect(hasBlockingDuplicate(candidates)).toBe(true);
  });
});
