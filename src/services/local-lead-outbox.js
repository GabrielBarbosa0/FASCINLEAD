const DATABASE_NAME = 'fascinlead-local';
const DATABASE_VERSION = 1;
const STORE_NAME = 'lead-outbox';
const CHANGE_EVENT = 'fascinlead:lead-outbox-change';

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
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

async function useStore(mode, operation) {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(result?.result ?? result ?? null);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('A gravacao local foi interrompida.'));
    };
  });
}

function notifyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function preserveLocalLead(lead) {
  await useStore('readwrite', (store) => store.put({
    ...lead,
    syncState: lead.syncState || 'pending',
    localUpdatedAt: new Date().toISOString()
  }));
  notifyChange();
}

export async function markLocalLeadError(id, message = '') {
  const database = await openDatabase();
  if (!database) return;
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      store.put({
        ...request.result,
        syncState: 'error',
        syncError: String(message || 'A nuvem recusou este cadastro.'),
        localUpdatedAt: new Date().toISOString()
      });
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('A atualizacao local foi interrompida.'));
  });
  database.close();
  notifyChange();
}

export async function removeLocalLeads(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return;
  await useStore('readwrite', (store) => {
    uniqueIds.forEach((id) => store.delete(id));
  });
  notifyChange();
}

export async function listLocalLeads(capturedByUid) {
  const database = await openDatabase();
  if (!database) return [];
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = capturedByUid
      ? store.index('capturedByUid').getAll(capturedByUid)
      : store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export function subscribeToLocalLeads(callback) {
  if (typeof window === 'undefined') return () => {};
  const listener = () => callback();
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
