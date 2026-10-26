import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createLeadDocument, createLeadUpdate } from '../utils/lead.js';
import { followUpAppointmentKey } from '../utils/follow-up.js';
import { getInstallationId } from '../utils/installation.js';
import { createId } from '../utils/id.js';
import { canAccessStore } from '../utils/permissions.js';
import { appointmentBlockTimes, appointmentSlotId } from '../utils/schedule.js';
import {
  listOfflineLeads,
  removeOfflineLead,
  saveOfflineLead,
  subscribeToOfflineLeads,
  updateOfflineLeadState
} from './offline-lead-store.js';

const DEMO_STORAGE_KEY = 'fascinlead:demo-leads';
let synchronizationPromise = null;

function reservationBlocks(storeId, appointmentDate, appointmentTime, durationMinutes) {
  return appointmentBlockTimes(appointmentTime, durationMinutes).map((blockTime) => ({
    id: appointmentSlotId(storeId, appointmentDate, blockTime),
    blockTime
  }));
}

function setReservationBlock(batch, block, data) {
  batch.set(doc(db, 'appointmentSlots', block.id), {
    ...data,
    blockTime: block.blockTime,
    createdAt: serverTimestamp()
  });
}

function readDemoLeads() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeDemoLeads(leads) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event('fascinlead:demo-leads'));
}

export function subscribeToLeads(profile, demoMode, onData, onError) {
  if (demoMode || !isFirebaseConfigured) {
    const emit = () => onData(readDemoLeads());
    window.addEventListener('fascinlead:demo-leads', emit);
    emit();
    return () => window.removeEventListener('fascinlead:demo-leads', emit);
  }

  let remoteLeads = [];
  let offlineLeads = [];
  let confirmedRemoteIds = new Set();
  const removingOfflineIds = new Set();
  const emit = () => {
    const merged = new Map(remoteLeads.map((lead) => [lead.id, lead]));
    offlineLeads.forEach((lead) => merged.set(lead.id, { ...merged.get(lead.id), ...lead }));
    onData([...merged.values()].sort((a, b) => (
      String(b.capturedAtClient).localeCompare(String(a.capturedAtClient))
    )));
  };
  const removeConfirmedOfflineLeads = () => {
    const confirmedIds = offlineLeads
      .map((lead) => lead.id)
      .filter((id) => confirmedRemoteIds.has(id) && !removingOfflineIds.has(id));
    confirmedIds.forEach((id) => removingOfflineIds.add(id));
    confirmedIds.forEach((id) => {
      removeOfflineLead(id).catch((error) => {
        removingOfflineIds.delete(id);
        onError(error);
      });
    });
  };
  const unsubscribeOffline = subscribeToOfflineLeads(profile.uid, (leads) => {
    offlineLeads = leads;
    emit();
    removeConfirmedOfflineLeads();
  }, onError);
  const leadsQuery = query(
    collection(db, 'leads'),
    where('capturedByUid', '==', profile.uid),
    orderBy('capturedAtClient', 'desc'),
    limit(100)
  );

  const unsubscribeRemote = onSnapshot(
    leadsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      confirmedRemoteIds = new Set(snapshot.docs
        .filter((leadDoc) => !leadDoc.metadata.hasPendingWrites && !leadDoc.metadata.fromCache)
        .map((leadDoc) => leadDoc.id));
      remoteLeads = snapshot.docs.map((leadDoc) => ({
          id: leadDoc.id,
          ...leadDoc.data(),
          syncState: leadDoc.metadata.hasPendingWrites ? 'pending' : 'synced',
          fromCache: leadDoc.metadata.fromCache
        }));
      emit();
      removeConfirmedOfflineLeads();
    },
    onError
  );
  return () => {
    unsubscribeRemote();
    unsubscribeOffline();
  };
}

function appointmentConflictError() {
  const error = new Error('O horário escolhido não está mais disponível.');
  error.code = 'appointment-slot-unavailable';
  return error;
}

export function saveLead(input, profile, demoMode, onRemoteError, options = {}) {
  const result = createLeadDocument(input, profile, getInstallationId());
  if (!result.isValid) return result;

  const id = createId();

  if (demoMode || !isFirebaseConfigured) {
    const leads = readDemoLeads();
    writeDemoLeads([
      {
        id,
        ...result.data,
        syncState: 'demo',
        fromCache: true
      },
      ...leads
    ]);
    return { ...result, id };
  }

  const offline = options.offline === true || !navigator.onLine;
  if (offline) {
    const offlineLead = {
      id,
      ...result.data,
      appointmentDate: '',
      appointmentTime: '',
      syncState: 'pending',
      fromCache: true
    };
    const localSavePromise = saveOfflineLead(offlineLead).catch((error) => {
      onRemoteError(error);
      throw error;
    });
    return { ...result, data: offlineLead, id, localSavePromise };
  }

  const leadData = {
    ...result.data,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  };
  let writePromise;
  if (input.schedulingMode === 'controlled' && result.data.appointmentDate && result.data.appointmentTime) {
    const durationMinutes = Number(input.appointmentDurationMinutes) || 20;
    const blocks = reservationBlocks(profile.storeId, result.data.appointmentDate, result.data.appointmentTime, durationMinutes);
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', id), leadData);
    blocks.forEach((block) => setReservationBlock(batch, block, {
      storeId: profile.storeId,
      appointmentDate: result.data.appointmentDate,
      appointmentTime: result.data.appointmentTime,
      durationMinutes,
      leadId: id,
      capturedByUid: profile.uid
    }));
    writePromise = batch.commit();
  } else {
    writePromise = setDoc(doc(db, 'leads', id), leadData);
  }

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export function updateLead(id, input, demoMode, onRemoteError, existingLead = null) {
  const result = createLeadUpdate(input);
  if (!result.isValid) return result;

  if (demoMode || !isFirebaseConfigured) {
    const leads = readDemoLeads();
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return { isValid: false, errors: {}, notFound: true };
    const appointmentChanged = leads[index].appointmentDate !== result.data.appointmentDate
      || leads[index].appointmentTime !== result.data.appointmentTime;
    leads[index] = {
      ...leads[index],
      ...result.data,
      ...(appointmentChanged && result.data.appointmentDate ? { appointmentAttendance: 'pending' } : {}),
      syncState: 'demo',
      fromCache: true
    };
    writeDemoLeads(leads);
    return { ...result, id };
  }

  const appointmentChanged = existingLead && (
    existingLead.appointmentDate !== result.data.appointmentDate
    || existingLead.appointmentTime !== result.data.appointmentTime
  );
  const leadUpdate = {
    ...result.data,
    ...(appointmentChanged && result.data.appointmentDate ? { appointmentAttendance: 'pending' } : {}),
    updatedAtServer: serverTimestamp()
  };
  const localOnly = existingLead
    && ['pending', 'error'].includes(existingLead.syncState)
    && !existingLead.createdAtServer;
  const oldControlled = existingLead?.appointmentSchedulingMode === 'controlled'
    && existingLead.appointmentDate && existingLead.appointmentTime;
  const newControlled = result.data.appointmentSchedulingMode === 'controlled'
    && result.data.appointmentDate && result.data.appointmentTime;
  const oldBlocks = oldControlled
    ? reservationBlocks(existingLead.storeId, existingLead.appointmentDate, existingLead.appointmentTime, existingLead.appointmentDurationMinutes || 20)
    : [];
  const newBlocks = newControlled
    ? reservationBlocks(existingLead.storeId, result.data.appointmentDate, result.data.appointmentTime, result.data.appointmentDurationMinutes || 20)
    : [];
  const newIds = new Set(newBlocks.map((block) => block.id));
  const reservationChanged = oldBlocks.length !== newBlocks.length
    || oldBlocks.some((block) => !newIds.has(block.id));
  let writePromise;
  if (localOnly) {
    const { id: ignoredId, syncState, fromCache, createdAtServer, ...localData } = existingLead;
    const leadReference = doc(db, 'leads', id);
    writePromise = runTransaction(db, async (transaction) => {
      const remoteLead = await transaction.get(leadReference);
      const slotSnapshots = await Promise.all(newBlocks.map((block) => transaction.get(doc(db, 'appointmentSlots', block.id))));
      if (slotSnapshots.some((snapshot) => snapshot.exists() && snapshot.data().leadId !== id)) {
        throw appointmentConflictError();
      }
      const completeLead = {
        ...localData,
        ...result.data,
        ...(result.data.appointmentDate ? { appointmentAttendance: 'pending' } : {}),
        ...(!remoteLead.exists() ? { createdAtServer: serverTimestamp() } : {}),
        updatedAtServer: serverTimestamp()
      };
      transaction.set(leadReference, completeLead, { merge: true });
      newBlocks.forEach((block) => setReservationBlock(transaction, block, {
        storeId: existingLead.storeId,
        appointmentDate: result.data.appointmentDate,
        appointmentTime: result.data.appointmentTime,
        durationMinutes: result.data.appointmentDurationMinutes,
        leadId: id,
        capturedByUid: existingLead.capturedByUid
      }));
    });
  } else if (existingLead && reservationChanged && (oldBlocks.length || newBlocks.length)) {
    const leadReference = doc(db, 'leads', id);
    const slotReferences = [...new Map([...oldBlocks, ...newBlocks]
      .map((block) => [block.id, doc(db, 'appointmentSlots', block.id)])).values()];
    writePromise = runTransaction(db, async (transaction) => {
      const slotSnapshots = await Promise.all(slotReferences.map((reference) => transaction.get(reference)));
      const slotsById = new Map(slotSnapshots.map((snapshot) => [snapshot.id, snapshot]));
      const occupiedByAnotherLead = newBlocks.some((block) => {
        const snapshot = slotsById.get(block.id);
        return snapshot?.exists() && snapshot.data().leadId !== id;
      });
      if (occupiedByAnotherLead) throw appointmentConflictError();

      transaction.set(leadReference, leadUpdate, { merge: true });
      oldBlocks.filter((block) => !newIds.has(block.id)).forEach((block) => transaction.delete(doc(db, 'appointmentSlots', block.id)));
      newBlocks.forEach((block) => setReservationBlock(transaction, block, {
        storeId: existingLead.storeId,
        appointmentDate: result.data.appointmentDate,
        appointmentTime: result.data.appointmentTime,
        durationMinutes: result.data.appointmentDurationMinutes,
        leadId: id,
        capturedByUid: existingLead.capturedByUid
      }));
    });
  } else {
    writePromise = setDoc(doc(db, 'leads', id), leadUpdate, { merge: true });
  }

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export function updateDemoAppointmentAttendance(id, attendance, profile) {
  const allowed = new Set(['pending', 'attended', 'missed']);
  if (!allowed.has(attendance)) return false;
  const leads = readDemoLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  leads[index] = {
    ...leads[index],
    appointmentAttendance: attendance,
    appointmentAttendanceUpdatedAt: new Date().toISOString(),
    appointmentAttendanceUpdatedByUid: profile.uid
  };
  writeDemoLeads(leads);
  return true;
}

export function markDemoFollowUpContact(id, profile) {
  const leads = readDemoLeads();
  const index = leads.findIndex((lead) => lead.id === id && (
    lead.capturedByUid === profile.uid || ['manager', 'admin'].includes(profile?.role)
  ));
  if (index === -1) return false;
  leads[index] = {
    ...leads[index],
    followUpContactedAt: new Date().toISOString(),
    followUpContactedByUid: profile.uid,
    followUpContactedByName: profile.displayName,
    followUpContactedAppointmentKey: followUpAppointmentKey(leads[index])
  };
  writeDemoLeads(leads);
  return true;
}

async function synchronizeOfflineLeads(profile) {
  if (!profile?.uid) return { synchronized: 0, failed: 0 };
  const leads = await listOfflineLeads(profile.uid);
  let synchronized = 0;
  let failed = 0;
  for (const lead of leads) {
    const { id, syncState, fromCache, ...data } = lead;
    try {
      const leadReference = doc(db, 'leads', id);
      await runTransaction(db, async (transaction) => {
        const remoteLead = await transaction.get(leadReference);
        if (remoteLead.exists()) return;
        transaction.set(leadReference, {
          ...data,
          appointmentDate: '',
          appointmentTime: '',
          createdAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp()
        });
      });
      synchronized += 1;
    } catch {
      await updateOfflineLeadState(id, 'error');
      failed += 1;
    }
  }
  return { synchronized, failed };
}

export function markDemoAppointmentReminderDone(id, profile) {
  const leads = readDemoLeads();
  const index = leads.findIndex((lead) => lead.id === id && (
    profile.role === 'admin' || (profile.role === 'manager' && canAccessStore(profile, lead.storeId))
  ));
  if (index === -1 || !leads[index].appointmentDate || !leads[index].appointmentTime) return false;
  leads[index] = {
    ...leads[index],
    appointmentReminderSentAt: new Date().toISOString(),
    appointmentReminderSentByUid: profile.uid,
    appointmentReminderSentByName: profile.displayName,
    appointmentReminderAppointmentKey: followUpAppointmentKey(leads[index])
  };
  writeDemoLeads(leads);
  return true;
}

export function undoDemoAppointmentReminderDone(id, profile) {
  const leads = readDemoLeads();
  const index = leads.findIndex((lead) => lead.id === id && (
    profile.role === 'admin' || (profile.role === 'manager' && canAccessStore(profile, lead.storeId))
  ));
  if (index === -1) return false;
  const {
    appointmentReminderSentAt,
    appointmentReminderSentByUid,
    appointmentReminderSentByName,
    appointmentReminderAppointmentKey,
    ...pendingLead
  } = leads[index];
  leads[index] = pendingLead;
  writeDemoLeads(leads);
  return true;
}

export async function synchronizeNow(demoMode, profile = null) {
  if (demoMode || !isFirebaseConfigured) return { demo: true };
  if (synchronizationPromise) return synchronizationPromise;

  synchronizationPromise = (async () => {
    const offline = await synchronizeOfflineLeads(profile);
    await waitForPendingWrites(db);
    return { demo: false, ...offline };
  })().finally(() => {
    synchronizationPromise = null;
  });
  return synchronizationPromise;
}
