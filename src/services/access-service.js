import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { normalizeAccessEmail, validateAccess } from '../utils/access.js';

function assertAdmin(profile) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') {
    const error = new Error('Apenas administradores podem gerenciar acessos.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function loadAccesses(profile) {
  assertAdmin(profile);
  const [permissionsSnapshot, usersSnapshot, storesSnapshot] = await Promise.all([
    getDocs(collection(db, 'allowedEmails')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'stores'))
  ]);

  const usersByEmail = new Map(usersSnapshot.docs.map((item) => {
    const data = item.data();
    return [normalizeAccessEmail(data.email), { uid: item.id, ...data }];
  }));

  const accesses = permissionsSnapshot.docs.map((item) => {
    const permission = item.data();
    const email = normalizeAccessEmail(permission.email || item.id);
    const user = usersByEmail.get(email);
    return {
      email,
      displayName: permission.displayName || user?.displayName || 'Colaborador',
      role: permission.role || user?.role || 'captor',
      storeId: permission.storeId || user?.storeId || '',
      active: permission.active === true && user?.active !== false,
      hasLoggedIn: Boolean(user)
    };
  }).sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

  const storeIds = new Set([
    profile.storeId,
    ...accesses.map((item) => item.storeId),
    ...storesSnapshot.docs.map((item) => item.id)
  ].filter(Boolean));

  return { accesses, storeIds: [...storeIds].sort() };
}

export async function saveAccess(profile, values) {
  assertAdmin(profile);
  const validation = validateAccess(values);
  if (!validation.isValid) return validation;

  const { email, displayName, role, storeId } = validation.data;
  if (email === normalizeAccessEmail(profile.email) && role !== 'admin') {
    return { ...validation, isValid: false, errors: { role: 'Voce nao pode remover seu proprio perfil de administrador.' } };
  }

  const permissionRef = doc(db, 'allowedEmails', email);
  const [permissionSnapshot, usersSnapshot] = await Promise.all([
    getDoc(permissionRef),
    getDocs(query(collection(db, 'users'), where('email', '==', email)))
  ]);
  const batch = writeBatch(db);
  const permissionData = {
    email,
    displayName,
    role,
    storeId,
    active: true,
    updatedAt: serverTimestamp(),
    updatedBy: profile.uid
  };

  if (!permissionSnapshot.exists()) {
    permissionData.createdAt = serverTimestamp();
    permissionData.createdBy = profile.uid;
  }

  batch.set(permissionRef, permissionData, { merge: true });
  usersSnapshot.docs.forEach((item) => {
    batch.update(item.ref, { displayName, role, storeId, active: true });
  });
  await batch.commit();
  return validation;
}

export async function setAccessActive(profile, access, active) {
  assertAdmin(profile);
  const email = normalizeAccessEmail(access.email);
  if (email === normalizeAccessEmail(profile.email) && !active) {
    throw new Error('Voce nao pode bloquear seu proprio acesso.');
  }

  const usersSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  const batch = writeBatch(db);
  batch.set(doc(db, 'allowedEmails', email), {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: profile.uid
  }, { merge: true });
  usersSnapshot.docs.forEach((item) => batch.update(item.ref, { active }));
  await batch.commit();
}

