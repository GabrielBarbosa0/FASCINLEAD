import { normalizeBrazilianPhone } from '../../../utils/phone.js';
import { normalizeCpf } from '../../../utils/savwin-matching.js';

export const DUPLICATE_MATCH = Object.freeze({
  cpf: { id: 'cpf', label: 'CPF igual', score: 100 },
  phone: { id: 'phone', label: 'Telefone igual', score: 80 },
  nameBirthDate: { id: 'name-birth-date', label: 'Nome e nascimento iguais', score: 70 },
  name: { id: 'name', label: 'Nome semelhante', score: 45 }
});

export function normalizeLeadName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function duplicateSearchTerms(values = {}) {
  const phone = normalizeBrazilianPhone(values.phone)?.search || '';
  return {
    customerCpf: normalizeCpf(values.customerCpf),
    phoneSearch: phone,
    fullNameSearch: normalizeLeadName(values.fullName),
    birthDate: String(values.birthDate || '').trim()
  };
}

export function detectDuplicateMatch(values, candidate) {
  const search = duplicateSearchTerms(values);
  const candidateName = normalizeLeadName(candidate.fullName);
  const matches = [];
  if (search.customerCpf && search.customerCpf === normalizeCpf(candidate.customerCpf)) matches.push(DUPLICATE_MATCH.cpf);
  if (search.phoneSearch && search.phoneSearch === String(candidate.phoneSearch || '')) matches.push(DUPLICATE_MATCH.phone);
  if (search.fullNameSearch && search.fullNameSearch === candidateName) {
    matches.push(search.birthDate && search.birthDate === candidate.birthDate
      ? DUPLICATE_MATCH.nameBirthDate
      : DUPLICATE_MATCH.name);
  }
  const score = matches.reduce((highest, match) => Math.max(highest, match.score), 0);
  return { ...candidate, score, matches: matches.map((match) => match.id) };
}

export function rankDuplicateCandidates(values, candidates = []) {
  const unique = new Map();
  candidates.forEach((candidate) => {
    if (!candidate?.id) return;
    const result = detectDuplicateMatch(values, candidate);
    if (!result.score) return;
    const current = unique.get(candidate.id);
    if (!current || result.score > current.score) unique.set(candidate.id, result);
  });
  return [...unique.values()].sort((first, second) => second.score - first.score
    || String(second.capturedAtClient || '').localeCompare(String(first.capturedAtClient || '')));
}

export function hasBlockingDuplicate(candidates = []) {
  return candidates.some((candidate) => candidate.matches?.includes('cpf'));
}
