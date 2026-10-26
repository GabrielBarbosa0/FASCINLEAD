import { execSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fascinlead';
const STORE_IDS = ['loja-02', 'loja-04', 'loja-05', 'loja-06'];
const DEFAULT_SERVICE_ID = 'default-eye-exam';
const DATABASE_ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/${DATABASE_ROOT}`;

function firebaseAccessToken() {
  try {
    execSync('npx firebase-tools projects:list --json', {
      encoding: 'utf8', shell: true, stdio: ['ignore', 'ignore', 'ignore']
    });
  } catch {
    // A CLI pode encerrar com erro no Windows depois de já renovar o token.
  }
  const raw = execSync('npx firebase-tools login:list --json', {
    encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore']
  });
  const login = JSON.parse(raw).result?.find((item) => item.tokens?.access_token);
  if (!login) throw new Error('Execute firebase login antes da migracao.');
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

function documentId(document) {
  return document.name.split('/').at(-1);
}

function stringField(document, fieldName) {
  return String(document.fields?.[fieldName]?.stringValue || '');
}

function integerField(document, fieldName) {
  return Number(document.fields?.[fieldName]?.integerValue || 0);
}

function booleanField(document, fieldName, fallback = false) {
  return document.fields?.[fieldName]?.booleanValue ?? fallback;
}

function stringArrayField(document, fieldName) {
  return (document.fields?.[fieldName]?.arrayValue?.values || [])
    .map((item) => String(item.stringValue || ''))
    .filter(Boolean);
}

function timestampField(document, fieldName, fallback) {
  return document.fields?.[fieldName]?.timestampValue || fallback;
}

function arrayValue(values) {
  return { arrayValue: { values: values.map((value) => ({ stringValue: value })) } };
}

function sameValues(left, right) {
  return [...left].sort().join('|') === [...right].sort().join('|');
}

function parsedService(document) {
  const configuredStoreIds = stringArrayField(document, 'storeIds');
  const legacyStoreId = stringField(document, 'storeId');
  return {
    document,
    id: documentId(document),
    storeIds: configuredStoreIds.length ? configuredStoreIds : [legacyStoreId].filter(Boolean),
    durationMinutes: integerField(document, 'durationMinutes') || 20,
    active: booleanField(document, 'active', true),
    schemaVersion: integerField(document, 'schemaVersion')
  };
}

function buildWrites(services, leads) {
  const parsed = services.map(parsedService);
  const canonical = parsed.find((service) => service.id === DEFAULT_SERVICE_ID);
  const legacyDefaults = parsed.filter((service) => /^default-loja-/.test(service.id));
  const defaultSources = [...(canonical ? [canonical] : []), ...legacyDefaults];
  const durations = new Set(defaultSources.map((service) => service.durationMinutes));
  if (durations.size > 1) {
    throw new Error('Os serviços padrão possuem durações diferentes. Ajuste as durações antes de consolidar.');
  }

  const now = new Date().toISOString();
  const collectedStoreIds = [...new Set(defaultSources.flatMap((service) => service.storeIds))];
  const desiredDefaultStoreIds = collectedStoreIds.length ? collectedStoreIds : STORE_IDS;
  const defaultDuration = defaultSources[0]?.durationMinutes || 20;
  const defaultNeedsWrite = !canonical
    || canonical.schemaVersion !== 2
    || !sameValues(canonical.storeIds, desiredDefaultStoreIds);
  const writes = [];

  if (defaultNeedsWrite) {
    const source = canonical?.document || legacyDefaults[0]?.document || {};
    writes.push({
      update: {
        name: `${DATABASE_ROOT}/appointmentServices/${DEFAULT_SERVICE_ID}`,
        fields: {
          name: { stringValue: 'Exame de vista' },
          storeIds: arrayValue(desiredDefaultStoreIds),
          durationMinutes: { integerValue: String(defaultDuration) },
          active: { booleanValue: defaultSources.some((service) => service.active) || !defaultSources.length },
          schemaVersion: { integerValue: '2' },
          createdAt: { timestampValue: timestampField(source, 'createdAt', now) },
          createdByUid: { stringValue: stringField(source, 'createdByUid') || 'migration' },
          updatedAt: { timestampValue: now },
          updatedByUid: { stringValue: 'migration' }
        }
      }
    });
  }

  const servicesToConvert = parsed.filter((service) => service.id !== DEFAULT_SERVICE_ID
    && !legacyDefaults.some((legacy) => legacy.id === service.id)
    && (service.schemaVersion !== 2 || !stringArrayField(service.document, 'storeIds').length));
  servicesToConvert.forEach((service) => writes.push({
    update: {
      name: service.document.name,
      fields: {
        storeIds: arrayValue(service.storeIds),
        schemaVersion: { integerValue: '2' },
        updatedAt: { timestampValue: now },
        updatedByUid: { stringValue: 'migration' }
      }
    },
    updateMask: { fieldPaths: ['storeIds', 'schemaVersion', 'updatedAt', 'updatedByUid', 'storeId'] }
  }));

  const legacyDefaultIds = new Set(legacyDefaults.map((service) => service.id));
  const leadsToRelink = leads.filter((lead) => legacyDefaultIds.has(stringField(lead, 'appointmentServiceId')));
  leadsToRelink.forEach((lead) => writes.push({
    update: {
      name: lead.name,
      fields: {
        appointmentServiceId: { stringValue: DEFAULT_SERVICE_ID },
        updatedAtServer: { timestampValue: now }
      }
    },
    updateMask: { fieldPaths: ['appointmentServiceId', 'updatedAtServer'] }
  }));

  legacyDefaults.forEach((service) => writes.push({ delete: service.document.name }));
  return { defaultNeedsWrite, servicesToConvert, leadsToRelink, legacyDefaults, writes };
}

async function commitWrites(writes, accessToken) {
  for (let index = 0; index < writes.length; index += 400) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: writes.slice(index, index + 400) })
    });
    if (!response.ok) throw new Error(`Firestore respondeu ${response.status} ao gravar a migracao: ${await response.text()}`);
  }
}

async function main() {
  const accessToken = firebaseAccessToken();
  const [services, leads] = await Promise.all([
    listDocuments('appointmentServices', accessToken),
    listDocuments('leads', accessToken)
  ]);
  const result = buildWrites(services, leads);
  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    defaultServiceWrites: result.defaultNeedsWrite ? 1 : 0,
    servicesToConvert: result.servicesToConvert.length,
    appointmentsToRelink: result.leadsToRelink.length,
    duplicateServicesToRemove: result.legacyDefaults.length
  }, null, 2));
  if (!APPLY) {
    console.log('Nenhuma gravação realizada. Use --apply para confirmar.');
    return;
  }
  if (result.writes.length) await commitWrites(result.writes, accessToken);
  console.log('Migracao concluida.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
