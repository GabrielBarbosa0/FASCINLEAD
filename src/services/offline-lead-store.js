const DATABASE_NAME = 'fascinlead-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'pendingLeads';
const CHANGE_EVENT = 'fascinlead:offline-leads-changed';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('capturedByUid', 'capturedByUid', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

function notifyChanged() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function saveOfflineLead(lead) {
  await runTransaction('readwrite', (store) => store.put(lead));
  notifyChanged();
  return lead;
}

export async function removeOfflineLead(id) {
  await runTransaction('readwrite', (store) => store.delete(id));
  notifyChanged();
}

export async function updateOfflineLeadState(id, syncState) {
  const lead = await runTransaction('readonly', (store) => store.get(id));
  if (!lead) return;
  await runTransaction('readwrite', (store) => store.put({ ...lead, syncState }));
  notifyChanged();
}

export async function listOfflineLeads(capturedByUid) {
  const leads = await runTransaction('readonly', (store) => store.getAll());
  return leads
    .filter((lead) => lead.capturedByUid === capturedByUid)
    .sort((a, b) => String(b.capturedAtClient).localeCompare(String(a.capturedAtClient)));
}

export function subscribeToOfflineLeads(capturedByUid, onData, onError) {
  let active = true;
  const emit = () => {
    listOfflineLeads(capturedByUid)
      .then((leads) => { if (active) onData(leads); })
      .catch((error) => { if (active) onError(error); });
  };
  window.addEventListener(CHANGE_EVENT, emit);
  emit();
  return () => {
    active = false;
    window.removeEventListener(CHANGE_EVENT, emit);
  };
}
