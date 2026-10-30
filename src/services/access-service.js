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
import { PERMISSION_SCHEMA_VERSION, permissionsForProfile } from '../utils/role-profile.js';

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
      roleProfileId: permission.roleProfileId || user?.roleProfileId || '',
      storeId: permission.storeId || user?.storeId || '',
      storeIds: permission.storeIds || user?.storeIds || [permission.storeId || user?.storeId].filter(Boolean),
      phone: permission.phone || user?.phone || '',
      savwinCode: permission.savwinCode || user?.savwinCode || '',
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

export async function saveAccess(profile, values, roleProfiles = [], options = {}) {
  assertAdmin(profile);
  const validation = validateAccess(values, roleProfiles, options);
  if (!validation.isValid) return validation;

  const { email, displayName, phone, savwinCode, role, roleProfileId, storeId, storeIds } = validation.data;
  const selectedRoleProfile = roleProfiles.find((item) => item.id === roleProfileId) || { role };
  const permissions = permissionsForProfile({ role, permissions: selectedRoleProfile.permissions });
  if (email === normalizeAccessEmail(profile.email) && role !== 'admin') {
    return { ...validation, isValid: false, errors: { role: 'Você não pode remover seu próprio perfil de administrador.' } };
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
    phone,
    savwinCode,
    role,
    roleProfileId,
    permissions,
    permissionSchemaVersion: PERMISSION_SCHEMA_VERSION,
    storeId,
    storeIds,
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
    batch.update(item.ref, {
      displayName,
      phone,
      savwinCode,
      role,
      roleProfileId,
      permissions,
      permissionSchemaVersion: PERMISSION_SCHEMA_VERSION,
      storeId,
      storeIds,
      active: true
    });
  });
  await batch.commit();
  return validation;
}

export async function deleteAccess(profile, access) {
  assertAdmin(profile);
  const email = normalizeAccessEmail(access.email);
  if (email === normalizeAccessEmail(profile.email)) {
    throw new Error('Você não pode excluir seu próprio acesso.');
  }

  const usersSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  const batch = writeBatch(db);
  batch.delete(doc(db, 'allowedEmails', email));
  usersSnapshot.docs.forEach((item) => batch.update(item.ref, {
    active: false,
    accessRemovedAt: serverTimestamp(),
    accessRemovedBy: profile.uid
  }));
  await batch.commit();
}

export async function setAccessActive(profile, access, active) {
  assertAdmin(profile);
  const email = normalizeAccessEmail(access.email);
  if (email === normalizeAccessEmail(profile.email) && !active) {
    throw new Error('Você não pode bloquear seu próprio acesso.');
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
