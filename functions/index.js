const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const PRIMARY_ADMIN_EMAIL = 'oticasfascinantes.financeiro@gmail.com';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

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

  await getAuth().updateUser(user.uid, { password });
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
