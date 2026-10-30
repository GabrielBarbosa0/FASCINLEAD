const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const systemRoleConfig = require('./system-role-profiles.json');

initializeApp();

const PRIMARY_ADMIN_EMAIL = 'oticasfascinantes.financeiro@gmail.com';
const PERMISSION_SCHEMA_VERSION = systemRoleConfig.permissionSchemaVersion;
const SYSTEM_ROLE_PROFILES = new Map(systemRoleConfig.profiles.map((profile) => [profile.id, profile]));

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function systemProfileForAccess(access = {}) {
  const assigned = SYSTEM_ROLE_PROFILES.get(String(access.roleProfileId || ''));
  if (assigned) return assigned;
  return systemRoleConfig.profiles.find((profile) => profile.baseRole === access.role) || null;
}

function sameStringArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function currentPermissions(access, systemProfile) {
  if (access.role === 'admin') {
    return [...(SYSTEM_ROLE_PROFILES.get('system-admin')?.permissions || [])];
  }
  const storedVersion = Number(access.permissionSchemaVersion) || 0;
  if (systemProfile && storedVersion < PERMISSION_SCHEMA_VERSION) {
    return [...systemProfile.permissions];
  }
  if (Array.isArray(access.permissions)) return [...access.permissions];
  return [...(systemProfile?.permissions || [])];
}

function canonicalAccessProfile(email, access, authUser) {
  const systemProfile = systemProfileForAccess(access);
  const storeIds = Array.isArray(access.storeIds) && access.storeIds.length
    ? [...new Set(access.storeIds.map(String))]
    : [String(access.storeId || '')].filter(Boolean);
  return {
    email,
    displayName: access.displayName || authUser.displayName || 'Colaborador',
    photoUrl: authUser.photoURL || '',
    role: access.role,
    roleProfileId: access.roleProfileId || systemProfile?.id || '',
    permissions: currentPermissions(access, systemProfile),
    permissionSchemaVersion: PERMISSION_SCHEMA_VERSION,
    storeId: access.storeId || storeIds[0] || '',
    storeIds,
    phone: access.phone || '',
    savwinCode: access.savwinCode || '',
    active: true
  };
}

function accessProfileChanged(current = {}, canonical) {
  const scalarFields = [
    'email', 'displayName', 'role', 'roleProfileId', 'permissionSchemaVersion',
    'storeId', 'phone', 'savwinCode', 'active'
  ];
  return scalarFields.some((field) => current[field] !== canonical[field])
    || !sameStringArray(current.permissions, canonical.permissions)
    || !sameStringArray(current.storeIds, canonical.storeIds);
}

exports.syncCurrentAccess = onCall({ region: 'southamerica-east1' }, async (request) => {
  const email = normalizeEmail(request.auth?.token?.email);
  if (!request.auth || request.auth.token.email_verified !== true || !email) {
    throw new HttpsError('unauthenticated', 'Entre novamente para sincronizar o acesso.');
  }

  const firestore = getFirestore();
  const accessRef = firestore.doc(`allowedEmails/${email}`);
  const userRef = firestore.doc(`users/${request.auth.uid}`);
  const [accessSnapshot, userSnapshot] = await Promise.all([accessRef.get(), userRef.get()]);
  const access = accessSnapshot.data();
  if (!accessSnapshot.exists || access?.active !== true) {
    throw new HttpsError('permission-denied', 'Esta conta nao esta autorizada no LeadFlow.');
  }

  const authUser = await getAuth().getUser(request.auth.uid);
  const canonical = canonicalAccessProfile(email, access, authUser);
  const currentUser = userSnapshot.data() || {};
  const accessNeedsUpdate = access.permissionSchemaVersion !== PERMISSION_SCHEMA_VERSION
    || access.roleProfileId !== canonical.roleProfileId
    || !sameStringArray(access.permissions, canonical.permissions);
  const userNeedsUpdate = !userSnapshot.exists || accessProfileChanged(currentUser, canonical);

  if (accessNeedsUpdate || userNeedsUpdate) {
    const batch = firestore.batch();
    if (accessNeedsUpdate) {
      batch.set(accessRef, {
        roleProfileId: canonical.roleProfileId,
        permissions: canonical.permissions,
        permissionSchemaVersion: PERMISSION_SCHEMA_VERSION,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid
      }, { merge: true });
    }
    if (userNeedsUpdate) {
      batch.set(userRef, {
        ...canonical,
        ...(!userSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
        accessSyncedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();
  }

  return { profile: canonical, synchronized: accessNeedsUpdate || userNeedsUpdate };
});

async function assertAdministrator(request) {
  const callerEmail = normalizeEmail(request.auth?.token?.email);
  if (!request.auth || !request.auth.token.email_verified || !callerEmail) {
    throw new HttpsError('unauthenticated', 'Entre novamente para alterar a senha.');
  }

  if (callerEmail === PRIMARY_ADMIN_EMAIL) return callerEmail;

  const access = await getFirestore().doc(`allowedEmails/${callerEmail}`).get();
  const data = access.data();
  if (!access.exists || data?.active !== true || data?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Somente administradores podem alterar senhas.');
  }
  return callerEmail;
}

exports.updateTeamMemberPassword = onCall({ region: 'southamerica-east1' }, async (request) => {
  const callerEmail = await assertAdministrator(request);
  const targetEmail = normalizeEmail(request.data?.email);
  const password = String(request.data?.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    throw new HttpsError('invalid-argument', 'Informe um e-mail válido.');
  }
  if (password.length < 6 || password.length > 72) {
    throw new HttpsError('invalid-argument', 'A senha deve ter entre 6 e 72 caracteres.');
  }

  const targetAccess = await getFirestore().doc(`allowedEmails/${targetEmail}`).get();
  if (!targetAccess.exists) {
    throw new HttpsError('not-found', 'O acesso informado não existe.');
  }

  let user;
  try {
    user = await getAuth().getUserByEmail(targetEmail);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'A conta de login não foi encontrada.');
    }
    throw error;
  }

  await getAuth().updateUser(user.uid, { password, emailVerified: true });
  await getAuth().revokeRefreshTokens(user.uid);
  await getFirestore().collection('accessAuditEvents').add({
    action: 'password_reset_by_admin',
    actorEmail: callerEmail,
    actorUid: request.auth.uid,
    targetEmail,
    targetUid: user.uid,
    createdAt: FieldValue.serverTimestamp()
  });

  return { updated: true };
});

exports.provisionTeamMemberAccount = onCall({ region: 'southamerica-east1' }, async (request) => {
  const callerEmail = await assertAdministrator(request);
  const email = normalizeEmail(request.data?.email);
  const password = String(request.data?.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Informe um e-mail valido.');
  }
  if (password.length < 6 || password.length > 72) {
    throw new HttpsError('invalid-argument', 'A senha deve ter entre 6 e 72 caracteres.');
  }

  const access = await getFirestore().doc(`allowedEmails/${email}`).get();
  if (!access.exists || access.data()?.active !== true) {
    throw new HttpsError('failed-precondition', 'Autorize o e-mail antes de criar a conta.');
  }

  let user;
  let created = false;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    user = await getAuth().createUser({
      email,
      password,
      emailVerified: true,
      displayName: access.data()?.displayName || 'Colaborador'
    });
    created = true;
  }

  if (!created && user.emailVerified !== true) {
    await getAuth().updateUser(user.uid, { emailVerified: true });
  }

  await getFirestore().collection('accessAuditEvents').add({
    action: created ? 'team_account_provisioned' : 'team_account_already_exists',
    actorEmail: callerEmail,
    actorUid: request.auth.uid,
    targetEmail: email,
    targetUid: user.uid,
    createdAt: FieldValue.serverTimestamp()
  });

  return { uid: user.uid, created };
});
