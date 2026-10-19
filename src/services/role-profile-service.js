import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { SYSTEM_ROLE_PROFILES, validateRoleProfile } from '../utils/role-profile.js';

function assertAdmin(profile) {
  if (!isFirebaseConfigured || profile?.role !== 'admin') {
    const error = new Error('Apenas administradores podem gerenciar perfis.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function loadRoleProfiles(profile) {
  assertAdmin(profile);
  const snapshot = await getDocs(collection(db, 'roleProfiles'));
  const custom = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data(), system: false }))
    .filter((item) => item.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return [...SYSTEM_ROLE_PROFILES.map((item) => ({ ...item, permissions: [...item.permissions] })), ...custom];
}

export async function saveRoleProfile(profile, values, existingId = '') {
  assertAdmin(profile);
  const validation = validateRoleProfile(values);
  if (!validation.isValid) return validation;
  const id = existingId || crypto.randomUUID();
  await setDoc(doc(db, 'roleProfiles', id), {
    ...validation.data,
    active: true,
    system: false,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    updatedByUid: profile.uid,
    ...(!existingId ? { createdAt: serverTimestamp(), createdByUid: profile.uid } : {})
  }, { merge: true });
  if (existingId) {
    const [accesses, users] = await Promise.all([
      getDocs(query(collection(db, 'allowedEmails'), where('roleProfileId', '==', id))),
      getDocs(query(collection(db, 'users'), where('roleProfileId', '==', id)))
    ]);
    const batch = writeBatch(db);
    accesses.docs.forEach((item) => batch.update(item.ref, {
      role: validation.data.baseRole,
      permissions: validation.data.permissions,
      ...(validation.data.baseRole === 'captor' ? { storeIds: [item.data().storeId] } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid
    }));
    users.docs.forEach((item) => batch.update(item.ref, {
      role: validation.data.baseRole,
      permissions: validation.data.permissions,
      ...(validation.data.baseRole === 'captor' ? { storeIds: [item.data().storeId] } : {})
    }));
    if (!accesses.empty || !users.empty) await batch.commit();
  }
  return { ...validation, id };
}

export async function deleteRoleProfile(profile, roleProfile) {
  assertAdmin(profile);
  if (!roleProfile || roleProfile.system) throw new Error('Perfis padrao nao podem ser excluidos.');
  const assigned = await getDocs(query(
    collection(db, 'allowedEmails'),
    where('roleProfileId', '==', roleProfile.id),
    limit(1)
  ));
  if (!assigned.empty) {
    const error = new Error('Este perfil esta atribuido a um ou mais acessos. Troque esses acessos antes de excluir.');
    error.code = 'role-in-use';
    throw error;
  }
  await deleteDoc(doc(db, 'roleProfiles', roleProfile.id));
}
