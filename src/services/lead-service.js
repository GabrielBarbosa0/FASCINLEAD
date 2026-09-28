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
  where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { createLeadDocument, createLeadUpdate } from '../utils/lead.js';
import { getInstallationId } from '../utils/installation.js';

const DEMO_STORAGE_KEY = 'fascinlead:demo-leads';

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

  return onSnapshot(
    leadsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onData(
        snapshot.docs.map((leadDoc) => ({
          id: leadDoc.id,
          ...leadDoc.data(),
          syncState: leadDoc.metadata.hasPendingWrites ? 'pending' : 'synced',
          fromCache: leadDoc.metadata.fromCache
        }))
      );
    },
    onError
  );
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

  const writePromise = setDoc(doc(db, 'leads', id), {
    ...result.data,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp()
  });

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export function updateLead(id, input, demoMode, onRemoteError) {
  const result = createLeadUpdate(input);
  if (!result.isValid) return result;

  if (demoMode || !isFirebaseConfigured) {
    const leads = readDemoLeads();
    const index = leads.findIndex((lead) => lead.id === id);
    if (index === -1) return { isValid: false, errors: {}, notFound: true };
    leads[index] = { ...leads[index], ...result.data, syncState: 'demo', fromCache: true };
    writeDemoLeads(leads);
    return { ...result, id };
  }

  const writePromise = setDoc(doc(db, 'leads', id), {
    ...result.data,
    updatedAtServer: serverTimestamp()
  }, { merge: true });

  writePromise.catch(onRemoteError);
  return { ...result, id, writePromise };
}

export async function synchronizeNow(demoMode) {
  if (demoMode || !isFirebaseConfigured) return { demo: true };
  await enableNetwork(db);
  await waitForPendingWrites(db);
  return { demo: false };
}
