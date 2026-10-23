import {
  collection,
  doc,
  enableNetwork,
  limit,
  onSnapshot,
  orderBy,
  query,
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
import { appointmentBlockTimes, appointmentSlotId } from '../utils/schedule.js';
import { listLocalLeads, markLocalLeadError, preserveLocalLead, removeLocalLeads, subscribeToLocalLeads } from './local-lead-outbox.js';

const DEMO_STORAGE_KEY = 'fascinlead:demo-leads';
const activeWrites = new Set();

export function mergeLeadSources(remoteLeads, localLeads) {
  const merged = new Map((localLeads || []).map((lead) => [lead.id, {
    ...lead,
    syncState: lead.syncState || 'pending',
    fromCache: true
  }]));
  for (const lead of remoteLeads || []) {
    const local = merged.get(lead.id);
    merged.set(lead.id, lead.syncState === 'synced'
      ? lead
      : { ...local, ...lead, syncState: lead.syncState || local?.syncState || 'pending' });
  }
  return [...merged.values()].sort((left, right) => (
    String(right.capturedAtClient || '').localeCompare(String(left.capturedAtClient || ''))
  ));
}

function trackWrite(writePromise, id, onRemoteError) {
  let tracked;
  tracked = writePromise.catch(async (error) => {
    try {
      await markLocalLeadError(id, error?.message);
    } finally {
      onRemoteError?.(error);
    }
    throw error;
  }).finally(() => activeWrites.delete(tracked));
  activeWrites.add(tracked);
  tracked.catch(() => {});
  return tracked;
}

function retryLeadData(localLead) {
  const {
    id,
    syncState,
    syncError,
    fromCache,
    localUpdatedAt,
    createdAtServer,
    updatedAtServer,
    ...data
  } = localLead;
  return {
    id,
    data: {
      ...data,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp()
    }
  };
}

async function retryFailedLocalLeads(capturedByUid) {
  const failedLeads = (await listLocalLeads(capturedByUid)).filter((lead) => lead.syncState === 'error');
  return failedLeads.map((localLead) => preserveLocalLead({
    ...localLead,
    syncState: 'pending',
    syncError: ''
  }).then(() => {
    const retry = retryLeadData(localLead);
    let write;
    if (retry.data.appointmentSchedulingMode === 'controlled'
      && retry.data.appointmentDate
      && retry.data.appointmentTime) {
      const durationMinutes = Number(retry.data.appointmentDurationMinutes) || 20;
      const blocks = reservationBlocks(
        retry.data.storeId,
        retry.data.appointmentDate,
        retry.data.appointmentTime,
        durationMinutes
      );
      const batch = writeBatch(db);
      batch.set(doc(db, 'leads', retry.id), retry.data);
      blocks.forEach((block) => setReservationBlock(batch, block, {
        storeId: retry.data.storeId,
        appointmentDate: retry.data.appointmentDate,
        appointmentTime: retry.data.appointmentTime,
        durationMinutes,
        leadId: retry.id,
        capturedByUid: retry.data.capturedByUid
      }));
      write = batch.commit();
    } else {
      write = setDoc(doc(db, 'leads', retry.id), retry.data);
    }
    return trackWrite(write, retry.id);
  }));
}

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

  const leadsQuery = query(
    collection(db, 'leads'),
    where('capturedByUid', '==', profile.uid),
    orderBy('capturedAtClient', 'desc'),
    limit(100)
  );

  let remoteLeads = [];
  let localLeads = [];
  let disposed = false;
  const emit = () => onData(mergeLeadSources(remoteLeads, localLeads));
  const refreshLocal = async () => {
    try {
      localLeads = await listLocalLeads(profile.uid);
      if (!disposed) emit();
    } catch (error) {
      if (!disposed) onError(error);
    }
  };
  const unsubscribeLocal = subscribeToLocalLeads(refreshLocal);
  refreshLocal();

  const unsubscribeRemote = onSnapshot(
    leadsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      remoteLeads = snapshot.docs.map((leadDoc) => ({
          id: leadDoc.id,
          ...leadDoc.data(),
          syncState: leadDoc.metadata.hasPendingWrites ? 'pending' : 'synced',
          fromCache: snapshot.metadata.fromCache
        }));
      if (!snapshot.metadata.fromCache) {
        const confirmedIds = remoteLeads
          .filter((lead) => lead.syncState === 'synced')
          .map((lead) => lead.id);
        removeLocalLeads(confirmedIds).catch(onError);
      }
      emit();
    },
    onError
  );
  return () => {
    disposed = true;
    unsubscribeLocal();
    unsubscribeRemote();
  };
}

export function saveLead(input, profile, demoMode, onRemoteError) {
  const result = createLeadDocument(input, profile, getInstallationId());
  if (!result.isValid) return result;

  const id = crypto.randomUUID();

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

  const leadData = {
    ...result.data,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  };
  const localLead = { id, ...result.data, syncState: 'pending', fromCache: true };
  let remoteWrite;
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
    remoteWrite = () => batch.commit();
  } else {
    remoteWrite = () => setDoc(doc(db, 'leads', id), leadData);
  }

  const writePromise = trackWrite(
    preserveLocalLead(localLead).then(remoteWrite),
    id,
    onRemoteError
  );
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
      ...(appointmentChanged && leads[index].appointmentAttendance === 'missed' ? { appointmentAttendance: 'pending' } : {}),
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
    ...(appointmentChanged && existingLead.appointmentAttendance === 'missed' ? { appointmentAttendance: 'pending' } : {}),
    updatedAtServer: serverTimestamp()
  };
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
  const localLead = {
    ...(existingLead || {}),
    id,
    ...result.data,
    syncState: 'pending',
    fromCache: true
  };
  let remoteWrite;
  if (existingLead && reservationChanged && (oldBlocks.length || newBlocks.length)) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', id), leadUpdate, { merge: true });
    oldBlocks.filter((block) => !newIds.has(block.id)).forEach((block) => batch.delete(doc(db, 'appointmentSlots', block.id)));
    newBlocks.forEach((block) => setReservationBlock(batch, block, {
      storeId: existingLead.storeId,
      appointmentDate: result.data.appointmentDate,
      appointmentTime: result.data.appointmentTime,
      durationMinutes: result.data.appointmentDurationMinutes,
      leadId: id,
      capturedByUid: existingLead.capturedByUid
    }));
    remoteWrite = () => batch.commit();
  } else {
    remoteWrite = () => setDoc(doc(db, 'leads', id), leadUpdate, { merge: true });
  }

  const writePromise = trackWrite(
    preserveLocalLead(localLead).then(remoteWrite),
    id,
    onRemoteError
  );
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

export async function synchronizeNow(demoMode, capturedByUid = '') {
  if (demoMode || !isFirebaseConfigured) return { demo: true };
  await enableNetwork(db);
  const retryWrites = capturedByUid ? await retryFailedLocalLeads(capturedByUid) : [];
  const writes = [...new Set([...activeWrites, ...retryWrites])];
  const results = await Promise.allSettled([waitForPendingWrites(db), ...writes]);
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Um ou mais cadastros foram recusados pela nuvem e continuam salvos neste aparelho.');
  }
  return { demo: false };
}
