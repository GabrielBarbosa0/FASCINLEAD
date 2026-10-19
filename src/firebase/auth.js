import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, authPersistenceReady, db, isFirebaseConfigured } from './client.js';
import { systemRoleProfileForRole } from '../utils/role-profile.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export async function completeRedirectSignIn() {
  if (!isFirebaseConfigured) return null;
  return getRedirectResult(auth);
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase ainda nao foi configurado.');
  }

  await authPersistenceReady;
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (isLocalhost && ['auth/popup-blocked', 'auth/cancelled-popup-request'].includes(error?.code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou o login do Google. Abra o FascinLead diretamente no Chrome ou Safari e tente novamente.');
    }

    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela do Google foi fechada antes de concluir o login. Tente novamente e mantenha a janela aberta.');
    }

    if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error('Ja existe uma tentativa de login aberta. Aguarde alguns segundos e tente novamente.');
    }

    throw error;
  }
}

export function observeAuth(callback) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function loadAuthorizedProfile(firebaseUser) {
  if (!firebaseUser?.email || !firebaseUser.emailVerified) {
    throw new Error('Use uma conta Google com e-mail verificado.');
  }

  const email = firebaseUser.email.toLowerCase();
  const permissionRef = doc(db, 'allowedEmails', email);
  const permissionSnapshot = await getDoc(permissionRef);

  if (!permissionSnapshot.exists() || permissionSnapshot.data().active !== true) {
    throw new Error('Esta conta ainda nao foi autorizada no FascinLead.');
  }

  const permission = permissionSnapshot.data();
  const initialRoleProfile = systemRoleProfileForRole(permission.role);
  const assignedPermissions = Array.isArray(permission.permissions) ? permission.permissions : initialRoleProfile.permissions;
  const profileRef = doc(db, 'users', firebaseUser.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (!profileSnapshot.exists()) {
    await setDoc(profileRef, {
      email,
      displayName: permission.displayName || firebaseUser.displayName || 'Colaborador',
      photoUrl: firebaseUser.photoURL || '',
      role: permission.role,
      roleProfileId: permission.roleProfileId || '',
      permissions: assignedPermissions,
      storeId: permission.storeId,
      storeIds: permission.storeIds || [permission.storeId],
      active: true,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  }

  const profile = profileSnapshot.exists()
    ? profileSnapshot.data()
    : {
        email,
        displayName: permission.displayName || firebaseUser.displayName || 'Colaborador',
        photoUrl: firebaseUser.photoURL || '',
        role: permission.role,
        roleProfileId: permission.roleProfileId || '',
        permissions: assignedPermissions,
        storeId: permission.storeId,
        storeIds: permission.storeIds || [permission.storeId],
        active: true
      };

  if (profile.active !== true) {
    throw new Error('Este acesso esta inativo. Procure o administrador.');
  }

  let roleProfile = systemRoleProfileForRole(profile.role);
  if (profile.roleProfileId && !profile.roleProfileId.startsWith('system-')) {
    const roleSnapshot = await getDoc(doc(db, 'roleProfiles', profile.roleProfileId));
    if (!roleSnapshot.exists() || roleSnapshot.data().active === false) {
      throw new Error('O perfil de acesso desta conta nao esta disponivel. Procure o administrador.');
    }
    roleProfile = { id: roleSnapshot.id, ...roleSnapshot.data() };
  }

  return { uid: firebaseUser.uid, ...profile, roleProfileName: roleProfile.name, permissions: roleProfile.permissions };
}

export async function signOutUser() {
  if (isFirebaseConfigured) await signOut(auth);
}
