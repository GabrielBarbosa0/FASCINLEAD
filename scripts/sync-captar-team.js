import { execSync } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const TENANT_ID = process.env.CAPTAR_TENANT_ID || 'fb9196b0-738d-4b8c-8f4b-01bb36442654';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fascinlead';
const APPLY = process.argv.includes('--apply');
const SET_PASSWORD = process.argv.includes('--set-default-password');
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Defina ${name} antes de executar a sincronizacao.`);
  return value;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return [10, 11].includes(digits.length) ? digits : '';
}

function firebaseAccessToken() {
  const raw = execSync('npx firebase-tools login:list --json', {
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });
  const login = JSON.parse(raw).result?.find((item) => item.tokens?.access_token);
  if (!login) throw new Error('Execute firebase login antes da sincronizacao.');
  return login.tokens.access_token;
}

async function listDocuments(collectionName, accessToken) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`${FIRESTORE_ROOT}/${collectionName}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Firestore respondeu ${response.status} ao consultar ${collectionName}.`);
    const data = await response.json();
    documents.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function stringField(document, fieldName) {
  return String(document.fields?.[fieldName]?.stringValue || '');
}

async function updateDocument(documentName, values, accessToken) {
  const fields = {
    updatedAt: { timestampValue: new Date().toISOString() },
    ...Object.fromEntries(Object.entries(values)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, { stringValue: value }]))
  };
  const url = new URL(`https://firestore.googleapis.com/v1/${documentName}`);
  Object.keys(fields).forEach((fieldName) => url.searchParams.append('updateMask.fieldPaths', fieldName));
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!response.ok) throw new Error(`Firestore respondeu ${response.status} ao atualizar ${documentName.split('/').at(-1)}.`);
}

async function loadCaptarTeam(email, password) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let users = null;
  let salesManagement = null;

  page.on('response', async (response) => {
    const path = new URL(response.url()).pathname;
    try {
      if (path.endsWith('/rest/v1/users') && response.status() === 200 && !users) users = await response.json();
      if (path === '/api/sales-management' && response.status() === 200 && !salesManagement) salesManagement = await response.json();
    } catch {
      // As requisicoes sao repetidas durante a navegacao; a proxima resposta valida sera usada.
    }
  });

  try {
    const redirect = `/${TENANT_ID}/team`;
    await page.goto(`https://captar.rstecnologias.com.br/login?redirect_to=${encodeURIComponent(redirect)}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('input[type=email]').fill(email);
    await page.locator('input[type=password]').fill(password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL(new RegExp(`/${TENANT_ID}/`), { timeout: 30000 });
    if (!page.url().endsWith('/team')) {
      await page.goto(`https://captar.rstecnologias.com.br/${TENANT_ID}/team`, { waitUntil: 'networkidle', timeout: 60000 });
    }
    await page.waitForTimeout(1500);
  } finally {
    await browser.close();
  }

  if (!Array.isArray(users) || !Array.isArray(salesManagement?.sellerCodes)) {
    throw new Error('O Captar nao retornou os dados completos da equipe.');
  }
  return { users, sellerCodes: salesManagement.sellerCodes };
}

async function authUserForEmail(auth, email, displayName, password) {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, emailVerified: true, displayName });
    return 'updated';
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    await auth.createUser({ email, password, emailVerified: true, displayName });
    return 'created';
  }
}

async function main() {
  const captarEmail = requiredEnv('CAPTAR_EMAIL');
  const captarPassword = requiredEnv('CAPTAR_PASSWORD');
  const defaultPassword = SET_PASSWORD ? requiredEnv('TEAM_DEFAULT_PASSWORD') : '';
  if (defaultPassword && defaultPassword.length < 6) throw new Error('TEAM_DEFAULT_PASSWORD deve ter pelo menos 6 caracteres.');

  const source = await loadCaptarTeam(captarEmail, captarPassword);
  const sourceByEmail = new Map(source.users.map((user) => [normalizeEmail(user.email), user]));
  const codeByUserId = new Map(source.sellerCodes
    .filter((item) => item.active !== false)
    .map((item) => [item.salesperson_id, String(item.external_seller_code || '').trim()]));

  const accessToken = firebaseAccessToken();
  const app = initializeApp({
    projectId: PROJECT_ID,
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 })
    }
  }, `captar-team-${Date.now()}`);
  const auth = getAuth(app);

  try {
    const [allowedDocuments, userDocuments] = await Promise.all([
      listDocuments('allowedEmails', accessToken),
      listDocuments('users', accessToken)
    ]);
    const userDocumentsByEmail = new Map();
    userDocuments.forEach((document) => {
      const email = normalizeEmail(stringField(document, 'email'));
      if (!userDocumentsByEmail.has(email)) userDocumentsByEmail.set(email, []);
      userDocumentsByEmail.get(email).push(document);
    });

    const matches = allowedDocuments.flatMap((document) => {
      const email = normalizeEmail(stringField(document, 'email') || document.name.split('/').at(-1));
      const sourceUser = sourceByEmail.get(email);
      if (!sourceUser) return [];
      return [{
        documentName: document.name,
        email,
        displayName: stringField(document, 'displayName') || sourceUser.name,
        phone: normalizePhone(sourceUser.phone),
        savwinCode: codeByUserId.get(sourceUser.id) || '',
        userDocuments: userDocumentsByEmail.get(email) || []
      }];
    });

    console.log(JSON.stringify({
      mode: APPLY ? 'apply' : 'dry-run',
      matched: matches.length,
      records: matches.map(({ displayName, email, phone, savwinCode }) => ({
        displayName,
        email,
        phone: phone || 'nao informado',
        savwinCode: savwinCode || 'nao informado',
        password: SET_PASSWORD ? 'sera redefinida' : 'nao alterada'
      }))
    }, null, 2));

    if (!APPLY) {
      console.log('Nenhum dado foi gravado. Use --apply para confirmar.');
      return;
    }

    const results = [];
    for (const match of matches) {
      const profileData = {
        ...(match.phone ? { phone: match.phone } : {}),
        ...(match.savwinCode ? { savwinCode: match.savwinCode } : {})
      };
      await updateDocument(match.documentName, profileData, accessToken);
      await Promise.all(match.userDocuments.map((document) => updateDocument(document.name, profileData, accessToken)));

      let authResult = 'unchanged';
      if (SET_PASSWORD) authResult = await authUserForEmail(auth, match.email, match.displayName, defaultPassword);
      results.push({ displayName: match.displayName, firestore: 'updated', auth: authResult });
    }

    console.log(JSON.stringify({ completed: results.length, results }, null, 2));
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error(`Falha na sincronizacao da equipe: ${error.message}`);
  process.exitCode = 1;
});
