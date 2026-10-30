import { describe, expect, it } from 'vitest';
import { searchDemoLeads, validateLeadSearch } from '../../src/app/features/search/lead-search-data.js';
import { leadSearchView } from '../../src/app/features/search/lead-search-view.js';

const leads = [
  {
    id: 'scheduled',
    fullName: 'Maria Silva',
    customerCpf: '52998224725',
    storeId: 'loja-06',
    capturedByUid: 'captor-1',
    capturedByName: 'Ana',
    appointmentDate: '2026-11-05',
    appointmentTime: '08:20',
    appointmentServiceName: 'Exame de vista'
  },
  {
    id: 'unscheduled',
    fullName: 'Mariana Souza',
    customerCpf: '12345678909',
    storeId: 'loja-06',
    capturedByUid: 'captor-2'
  }
];

describe('lead appointment search', () => {
  it('validates names and complete CPF numbers', () => {
    expect(validateLeadSearch('')).toBeTruthy();
    expect(validateLeadSearch('Ma')).toBeTruthy();
    expect(validateLeadSearch('Maria')).toBe('');
    expect(validateLeadSearch('529.982.247-25')).toBe('');
  });

  it('finds demo leads by name or exact CPF', () => {
    const profile = { uid: 'captor-1', role: 'captor' };
    expect(searchDemoLeads(leads, 'maria', profile)).toHaveLength(2);
    expect(searchDemoLeads(leads, '529.982.247-25', profile).map((lead) => lead.id)).toEqual(['scheduled']);
    expect(searchDemoLeads(leads, '52998224725', profile)[0].canOpen).toBe(true);
  });

  it('renders scheduled and unscheduled results', () => {
    const results = searchDemoLeads(leads, 'maria', { uid: 'captor-1', role: 'captor' });
    const markup = leadSearchView({
      search: { query: 'maria', loading: false, searched: true, error: '', results }
    });
    expect(markup).toContain('Agendado');
    expect(markup).toContain('Sem agendamento');
    expect(markup).toContain('05 de novembro às 08:20');
    expect(markup).toContain('CPF 529.982.247-25');
    expect(markup).toContain('data-search-open-lead="scheduled"');
  });
});
