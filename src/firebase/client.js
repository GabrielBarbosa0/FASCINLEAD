import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];

export const isFirebaseConfigured = requiredConfig.every((key) => Boolean(firebaseConfig[key]));

let auth = null;
let db = null;
let functions = null;
let authPersistenceReady = Promise.resolve();

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  auth = getAuth(app);
  functions = getFunctions(app, 'southamerica-east1');
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });

  authPersistenceReady = setPersistence(auth, browserLocalPersistence);

  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && !globalThis.__FASCINLEAD_EMULATORS__) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8180));
    connectFunctionsEmulator(functions, '127.0.0.1', Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001));
    globalThis.__FASCINLEAD_EMULATORS__ = true;
  }
}

export { auth, authPersistenceReady, db, functions };
