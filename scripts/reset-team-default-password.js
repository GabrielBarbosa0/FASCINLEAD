import { execSync } from 'node:child_process';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fascinlead';
const DEFAULT_PASSWORD = process.env.TEAM_DEFAULT_PASSWORD || 'mudar123';
const PRIMARY_ADMIN_EMAIL = 'oticasfascinantes.financeiro@gmail.com';
const APPLY = process.argv.includes('--apply');
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function firebaseAccessToken() {
  const raw = execSync('npx firebase-tools login:list --json', {
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });
  const login = JSON.parse(raw).result?.find((item) => item.tokens?.access_token);
  if (!login) throw new Error('Execute firebase login antes de redefinir as senhas.');
  return login.tokens.access_token;
}

async function listAllowedAccesses(accessToken) {
  const records = [];
  let pageToken = '';
  do {
    const url = new URL(`${FIRESTORE_ROOT}/allowedEmails`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Firestore respondeu ${response.status} ao consultar os acessos.`);
    const data = await response.json();
    records.push(...(data.documents || []).map((document) => ({
      email: normalizeEmail(document.fields?.email?.stringValue || document.name.split('/').at(-1)),
      role: String(document.fields?.role?.stringValue || '')
    })));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return records;
}

async function main() {
  if (DEFAULT_PASSWORD.length < 6 || DEFAULT_PASSWORD.length > 72) {
    throw new Error('TEAM_DEFAULT_PASSWORD deve ter entre 6 e 72 caracteres.');
  }

  const accessToken = firebaseAccessToken();
  const accesses = await listAllowedAccesses(accessToken);
  const targets = accesses.filter(({ email, role }) => (
    email
    && email !== PRIMARY_ADMIN_EMAIL
    && role !== 'admin'
  ));

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    eligibleAccounts: targets.length,
    skippedAdministrators: accesses.length - targets.length,
    emails: targets.map(({ email }) => email)
  }, null, 2));

  if (!APPLY) {
    console.log('Nenhuma senha foi alterada. Use --apply para confirmar.');
    return;
  }

  const app = initializeApp({
    projectId: PROJECT_ID,
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
    }
  }, `team-password-reset-${Date.now()}`);
  const auth = getAuth(app);
  const results = [];

  try {
    for (const { email } of targets) {
      try {
        const user = await auth.getUserByEmail(email);
        await auth.updateUser(user.uid, { password: DEFAULT_PASSWORD });
        await auth.revokeRefreshTokens(user.uid);
        results.push({ email, status: 'updated' });
      } catch (error) {
        if (error?.code === 'auth/user-not-found') {
          results.push({ email, status: 'login-account-not-found' });
          continue;
        }
        throw error;
      }
    }
  } finally {
    await deleteApp(app);
  }

  console.log(JSON.stringify({ completed: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(`Falha ao redefinir as senhas: ${error.message}`);
  process.exitCode = 1;
});
