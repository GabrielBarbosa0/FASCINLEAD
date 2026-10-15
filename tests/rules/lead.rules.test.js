import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

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
        appointmentDate: '2026-10-15',
        appointmentTime: '09:30',
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

describe('appointment calendar queries', () => {
  it('lets a manager query appointments only from their own store', async () => {
    const db = authenticatedDb('manager-uid', 'manager@example.com');
    const appointments = query(
      collection(db, 'leads'),
      where('storeId', '==', 'loja-06'),
      where('appointmentDate', '>=', '2026-10-01'),
      where('appointmentDate', '<=', '2026-10-31')
    );
    await assertSucceeds(getDocs(appointments));
  });

  it('rejects an unscoped appointment query by a manager', async () => {
    const db = authenticatedDb('manager-uid', 'manager@example.com');
    const appointments = query(
      collection(db, 'leads'),
      where('appointmentDate', '>=', '2026-10-01'),
      where('appointmentDate', '<=', '2026-10-31')
    );
    await assertFails(getDocs(appointments));
  });

  it('lets an administrator query appointments from all stores', async () => {
    const db = authenticatedDb('admin-uid', 'admin@example.com');
    const appointments = query(
      collection(db, 'leads'),
      where('appointmentDate', '>=', '2026-10-01'),
      where('appointmentDate', '<=', '2026-10-31')
    );
    await assertSucceeds(getDocs(appointments));
  });

  it('lets a manager register attendance for an appointment in their store', async () => {
    const db = authenticatedDb('manager-uid', 'manager@example.com');
    await assertSucceeds(updateDoc(doc(db, 'leads', 'lead-test'), {
      appointmentAttendance: 'attended',
      appointmentAttendanceUpdatedAt: Timestamp.now(),
      appointmentAttendanceUpdatedByUid: 'manager-uid',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('does not let a manager edit customer data while registering attendance', async () => {
    const db = authenticatedDb('manager-uid', 'manager@example.com');
    await assertFails(updateDoc(doc(db, 'leads', 'lead-test'), {
      fullName: 'Alteracao indevida pelo gestor',
      appointmentAttendance: 'attended',
      appointmentAttendanceUpdatedAt: Timestamp.now(),
      appointmentAttendanceUpdatedByUid: 'manager-uid',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('does not let a captor change attendance directly', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(updateDoc(doc(db, 'leads', 'lead-test'), {
      appointmentAttendance: 'missed',
      appointmentAttendanceUpdatedAt: Timestamp.now(),
      appointmentAttendanceUpdatedByUid: 'captor-uid',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('lets the owning captor clear a missed status only while rescheduling', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'leads', 'lead-test'), {
        appointmentAttendance: 'missed'
      });
    });
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertSucceeds(updateDoc(doc(db, 'leads', 'lead-test'), {
      appointmentDate: '2026-10-20',
      appointmentTime: '10:00',
      appointmentAttendance: 'pending',
      updatedAtServer: Timestamp.now()
    }));
  });

  it('does not let the owning captor clear a missed status without rescheduling', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'leads', 'lead-test'), {
        appointmentAttendance: 'missed'
      });
    });
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(updateDoc(doc(db, 'leads', 'lead-test'), {
      appointmentAttendance: 'pending',
      updatedAtServer: Timestamp.now()
    }));
  });
});

describe('store schedule settings', () => {
  it('lets an administrator configure a store schedule', async () => {
    const db = authenticatedDb('admin-uid', 'admin@example.com');
    await assertSucceeds(setDoc(doc(db, 'stores', 'loja-06'), {
      schedulingMode: 'controlled',
      appointmentDurationMinutes: 20,
      noShowGraceMinutes: 30,
      openingTime: '08:00',
      closingTime: '18:00'
    }, { merge: true }));
  });

  it('lets a captor read the schedule of their own store', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'stores', 'loja-06'), {
        schedulingMode: 'controlled',
        appointmentDurationMinutes: 20,
        openingTime: '08:00',
        closingTime: '18:00'
      });
    });
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertSucceeds(getDoc(doc(db, 'stores', 'loja-06')));
  });

  it('rejects store schedule changes by a captor', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(setDoc(doc(db, 'stores', 'loja-06'), {
      appointmentDurationMinutes: 5
    }, { merge: true }));
  });
});

describe('appointment slot reservations', () => {
  const lead = {
    fullName: 'Cliente com horario',
    phone: '+5581999991234',
    phoneSearch: '81999991234',
    notes: '',
    appointmentDate: '2026-10-20',
    appointmentTime: '08:00',
    appointmentAttendance: 'pending',
    appointmentSchedulingMode: 'controlled',
    appointmentDurationMinutes: 20,
    source: 'street',
    schemaVersion: 1,
    capturedByUid: 'captor-uid',
    capturedByName: 'Captador Teste',
    storeId: 'loja-06',
    capturedAtClient: '2026-10-15T13:00:00.000Z',
    createdAtServer: Timestamp.now(),
    updatedAtServer: Timestamp.now()
  };
  const slot = {
    storeId: 'loja-06',
    appointmentDate: '2026-10-20',
    appointmentTime: '08:00',
    durationMinutes: 20,
    leadId: 'lead-slot',
    capturedByUid: 'captor-uid',
    createdAt: Timestamp.now()
  };

  it('lets a captor reserve and read slots without reading colleagues leads', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', 'lead-slot'), lead);
    batch.set(doc(db, 'appointmentSlots', 'slot-loja-06-2026-10-20-08:00'), slot);
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDocs(query(
      collection(db, 'appointmentSlots'),
      where('storeId', '==', 'loja-06'),
      where('appointmentDate', '==', '2026-10-20')
    )));
  });

  it('rejects replacing an occupied slot', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await Promise.all([
        setDoc(doc(context.firestore(), 'leads', 'lead-slot'), lead),
        setDoc(doc(context.firestore(), 'appointmentSlots', 'slot-loja-06-2026-10-20-08:00'), slot)
      ]);
    });
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(setDoc(doc(db, 'appointmentSlots', 'slot-loja-06-2026-10-20-08:00'), {
      ...slot,
      leadId: 'second-lead',
      createdAt: Timestamp.now()
    }));
  });

  it('rejects an orphan slot without a matching lead', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(setDoc(doc(db, 'appointmentSlots', 'slot-loja-06-2026-10-20-08:00'), slot));
  });

  it('lets an administrator backfill a slot for an existing lead', async () => {
    const db = authenticatedDb('admin-uid', 'admin@example.com');
    await assertSucceeds(setDoc(doc(db, 'appointmentSlots', 'slot-loja-06-2026-10-15-09:30'), {
      storeId: 'loja-06',
      appointmentDate: '2026-10-15',
      appointmentTime: '09:30',
      durationMinutes: 20,
      leadId: 'lead-test',
      capturedByUid: 'captor-uid',
      createdAt: Timestamp.now()
    }));
  });

  it('rejects reading slots from another store', async () => {
    const db = authenticatedDb('captor-uid', 'captor@example.com');
    await assertFails(getDocs(query(
      collection(db, 'appointmentSlots'),
      where('storeId', '==', 'loja-02'),
      where('appointmentDate', '==', '2026-10-20')
    )));
  });
});
