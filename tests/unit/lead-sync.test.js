import { describe, expect, it } from 'vitest';
import { mergeLeadSources } from '../../src/services/lead-service.js';

describe('lead synchronization sources', () => {
  it('keeps a local lead visible when it is absent from the remote snapshot', () => {
    const localLead = {
      id: 'offline-1',
      fullName: 'Cliente offline',
      capturedAtClient: '2026-10-22T10:00:00.000Z',
      syncState: 'error'
    };

    expect(mergeLeadSources([], [localLead])).toEqual([
      expect.objectContaining({ id: 'offline-1', fullName: 'Cliente offline', syncState: 'error' })
    ]);
  });

  it('replaces the local shadow after the server confirms the lead', () => {
    const localLead = { id: 'lead-1', fullName: 'Nome local', syncState: 'pending' };
    const remoteLead = { id: 'lead-1', fullName: 'Nome confirmado', syncState: 'synced', fromCache: false };

    expect(mergeLeadSources([remoteLead], [localLead])).toEqual([remoteLead]);
  });

  it('preserves local fields while the Firestore write is still pending', () => {
    const localLead = { id: 'lead-1', fullName: 'Cliente', phoneSearch: '81999999999', syncState: 'pending' };
    const pendingLead = { id: 'lead-1', fullName: 'Cliente', syncState: 'pending', fromCache: true };

    expect(mergeLeadSources([pendingLead], [localLead])[0]).toMatchObject({
      id: 'lead-1',
      phoneSearch: '81999999999',
      syncState: 'pending'
    });
  });
});
