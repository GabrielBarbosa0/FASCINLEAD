import { execSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fascinlead';
const DATABASE_ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/${DATABASE_ROOT}`;
const BLOCK_MINUTES = 10;

function firebaseAccessToken() {
  try {
    execSync('npx firebase-tools projects:list --json', {
      encoding: 'utf8', shell: true, stdio: ['ignore', 'ignore', 'ignore']
    });
  } catch {
    // The CLI can exit with an error on Windows after refreshing the token.
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

function blockTimes(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = (hours * 60) + minutes;
  return Array.from({ length: Math.ceil(durationMinutes / BLOCK_MINUTES) }, (_, index) => {
    const value = start + (index * BLOCK_MINUTES);
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  });
}

function appointmentResourceId(storeId) {
  return ['loja-02', 'loja-06'].includes(storeId) ? 'consultorio-surubim' : storeId;
}

function slotFields(lead, leadId, blockTime, durationMinutes, createdAt) {
  return {
    storeId: { stringValue: stringField(lead, 'storeId') },
    appointmentDate: { stringValue: stringField(lead, 'appointmentDate') },
    appointmentTime: { stringValue: stringField(lead, 'appointmentTime') },
    blockTime: { stringValue: blockTime },
    durationMinutes: { integerValue: String(durationMinutes) },
    leadId: { stringValue: leadId },
    capturedByUid: { stringValue: stringField(lead, 'capturedByUid') },
    createdAt: { timestampValue: createdAt }
  };
}

function buildMigration(leads, slots, stores) {
  const now = new Date().toISOString();
  const slotsById = new Map(slots.map((slot) => [documentId(slot), slot]));
  const storeDurations = new Map(stores.map((store) => [documentId(store), integerField(store, 'appointmentDurationMinutes') || 20]));
  const writes = [];
  const conflicts = [];
  let appointments = 0;

  leads.forEach((lead) => {
    const leadId = documentId(lead);
    const storeId = stringField(lead, 'storeId');
    const appointmentDate = stringField(lead, 'appointmentDate');
    const appointmentTime = stringField(lead, 'appointmentTime');
    if (!storeId || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime)
      || stringField(lead, 'appointmentSchedulingMode') === 'free') return;
    const durationMinutes = integerField(lead, 'appointmentDurationMinutes') || storeDurations.get(storeId) || 20;
    appointments += 1;
    blockTimes(appointmentTime, durationMinutes).forEach((blockTime) => {
      const slotId = `slot-${appointmentResourceId(storeId)}-${appointmentDate}-${blockTime}`;
      const existing = slotsById.get(slotId);
      if (existing && stringField(existing, 'leadId') !== leadId) {
        conflicts.push({ slotId, existingLeadId: stringField(existing, 'leadId'), ignoredLeadId: leadId });
        return;
      }
      if (existing && stringField(existing, 'blockTime') === blockTime
        && integerField(existing, 'durationMinutes') === durationMinutes) return;
      writes.push({
        update: {
          name: `${DATABASE_ROOT}/appointmentSlots/${slotId}`,
          fields: slotFields(
            lead,
            leadId,
            blockTime,
            durationMinutes,
            existing?.fields?.createdAt?.timestampValue || now
          )
        },
        currentDocument: existing ? { updateTime: existing.updateTime } : { exists: false }
      });
      slotsById.set(slotId, { name: `${DATABASE_ROOT}/appointmentSlots/${slotId}`, fields: { leadId: { stringValue: leadId } } });
    });
  });
  return { appointments, writes, conflicts };
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
  const [leads, slots, stores] = await Promise.all([
    listDocuments('leads', accessToken),
    listDocuments('appointmentSlots', accessToken),
    listDocuments('stores', accessToken)
  ]);
  const migration = buildMigration(leads, slots, stores);
  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    appointments: migration.appointments,
    blocksToWrite: migration.writes.length,
    historicalConflicts: migration.conflicts.length,
    conflicts: migration.conflicts.slice(0, 20)
  }, null, 2));
  if (!APPLY) {
    console.log('Nenhuma gravação realizada. Use --apply para confirmar.');
    return;
  }
  if (migration.writes.length) await commitWrites(migration.writes, accessToken);
  console.log('Migracao de blocos concluida.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
