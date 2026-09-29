import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

const projectId = 'demo-fascinlead-leads';
let testEnvironment;

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8180,
      rules: readFileSync('firestore.rules', 'utf8')
    }
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'captor-uid'), {
        email: 'captor@example.com',
        displayName: 'Captador Teste',
        role: 'captor',
        storeId: 'loja-06',
        active: true
      }),
      setDoc(doc(db, 'users', 'outro-uid'), {
        email: 'outro@example.com',
        displayName: 'Outro Captador',
        role: 'captor',
        storeId: 'loja-06',
        active: true
      }),
      setDoc(doc(db, 'users', 'admin-uid'), {
        email: 'admin@example.com',
        displayName: 'Administrador Teste',
        role: 'admin',
        storeId: 'loja-02',
        active: true
      }),
      setDoc(doc(db, 'users', 'manager-uid'), {
        email: 'manager@example.com',
        displayName: 'Gestor Teste',
        role: 'manager',
        storeId: 'loja-06',
        active: true
      }),
      setDoc(doc(db, 'leads', 'lead-test'), {
        fullName: 'Cliente Exemplo',
        phone: '+5581999991234',
        phoneSearch: '81999991234',
        notes: '',
        consentGiven: true,
        source: 'street',
        schemaVersion: 1,
        capturedByUid: 'captor-uid',
        capturedByName: 'Captador Teste',
        storeId: 'loja-06',
        capturedAtClient: '2026-09-28T12:00:00.000Z',
        createdAtServer: Timestamp.fromDate(new Date('2026-09-28T12:00:00.000Z')),
        updatedAtServer: Timestamp.fromDate(new Date('2026-09-28T12:00:00.000Z'))
      })
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

function authenticatedDb(uid, email) {
  return testEnvironment.authenticatedContext(uid, {
    email,
    email_verified: true
  }).firestore();
}

describe('lead correction rules', () => {
  it('lets the captor create a lead without consent fields', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertSucceeds(setDoc(doc(db, 'leads', 'lead-without-consent'), {
      fullName: 'Novo Cliente',
      phone: '+5581999995678',
      phoneSearch: '81999995678',
      notes: '',
      source: 'street',
      schemaVersion: 1,
      capturedByUid: 'captor-uid',
      capturedByName: 'Captador Teste',
      storeId: 'loja-06',
      capturedAtClient: '2026-09-28T13:00:00.000Z',
      createdAtServer: Timestamp.now(),
      updatedAtServer: Timestamp.now()
    }));
  });

  it('lets the captor correct editable fields in their own lead', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertSucceeds(updateDoc(doc(db, 'leads', 'lead-test'), {
      fullName: 'Cliente Corrigido',
      notes: 'Prefere contato pela tarde',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('rejects correction by another captor', async () => {
    const db = authenticatedDb('outro-uid', 'outro@example.com');
    await assertFails(updateDoc(doc(db, 'leads', 'lead-test'), {
      fullName: 'Alteracao indevida',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('does not let the captor change the original store', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(updateDoc(doc(db, 'leads', 'lead-test'), {
      storeId: 'loja-02',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('lets an administrator correct a lead from another store', async () => {
    const db = authenticatedDb('admin-uid', 'admin@example.com');
    await assertSucceeds(updateDoc(doc(db, 'leads', 'lead-test'), {
      fullName: 'Cliente Corrigido pelo Admin',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('lets an administrator delete any lead', async () => {
    const db = authenticatedDb('admin-uid', 'admin@example.com');
    await assertSucceeds(deleteDoc(doc(db, 'leads', 'lead-test')));
  });

  it('rejects lead deletion by a manager', async () => {
    const db = authenticatedDb('manager-uid', 'manager@example.com');
    await assertFails(deleteDoc(doc(db, 'leads', 'lead-test')));
  });
});
