import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  batch: {
    delete: vi.fn(),
    commit: vi.fn()
  },
  doc: vi.fn((database, collectionName, documentId) => ({ collectionName, documentId })),
  writeBatch: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: firestoreMocks.doc,
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: firestoreMocks.writeBatch
}));

vi.mock('../../src/firebase/client.js', () => ({
  db: { id: 'test-db' },
  isFirebaseConfigured: true
}));

import { deleteManagementLead } from '../../src/services/management-service.js';

describe('deleteManagementLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.writeBatch.mockReturnValue(firestoreMocks.batch);
    firestoreMocks.batch.commit.mockResolvedValue();
  });

  it('deletes the lead and its reserved appointment slot for an administrator', async () => {
    await deleteManagementLead({ role: 'admin' }, {
      id: 'lead-1',
      storeId: 'loja-06',
      appointmentDate: '2026-10-20',
      appointmentTime: '08:40',
      appointmentDurationMinutes: 20
    });

    expect(firestoreMocks.batch.delete).toHaveBeenCalledTimes(3);
    expect(firestoreMocks.batch.delete).toHaveBeenNthCalledWith(1, {
      collectionName: 'leads',
      documentId: 'lead-1'
    });
    expect(firestoreMocks.batch.delete).toHaveBeenNthCalledWith(2, {
      collectionName: 'appointmentSlots',
      documentId: 'slot-consultorio-surubim-2026-10-20-08:40'
    });
    expect(firestoreMocks.batch.delete).toHaveBeenNthCalledWith(3, {
      collectionName: 'appointmentSlots',
      documentId: 'slot-consultorio-surubim-2026-10-20-08:50'
    });
    expect(firestoreMocks.batch.commit).toHaveBeenCalledOnce();
  });

  it('rejects deletion by a profile without deletion permission before creating a batch', async () => {
    await expect(deleteManagementLead({ role: 'manager', permissions: [] }, { id: 'lead-1' }))
      .rejects.toMatchObject({ code: 'permission-denied' });

    expect(firestoreMocks.writeBatch).not.toHaveBeenCalled();
  });

  it('lets a manager with deletion permission remove a lead from an allowed store', async () => {
    await deleteManagementLead({
      uid: 'manager-1',
      role: 'manager',
      storeId: 'loja-06',
      permissions: ['leads.delete']
    }, {
      id: 'lead-1',
      capturedByUid: 'captor-1',
      storeId: 'loja-06'
    });

    expect(firestoreMocks.batch.delete).toHaveBeenCalledWith({
      collectionName: 'leads',
      documentId: 'lead-1'
    });
    expect(firestoreMocks.batch.commit).toHaveBeenCalledOnce();
  });
});
