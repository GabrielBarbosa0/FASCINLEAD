const MAX_PAGE_SIZE = 100;
const ALLOWED_STORE_IDS = new Set(['loja-02', 'loja-04', 'loja-05', 'loja-06']);

export function timestampToIso(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function publicLead(id, lead, { includeSensitive = false } = {}) {
  const result = {
    id,
    fullName: String(lead.fullName || ''),
    preferredName: String(lead.preferredName || ''),
    phone: String(lead.phone || ''),
    storeId: String(lead.storeId || ''),
    street: String(lead.street || ''),
    streetNumber: String(lead.streetNumber || ''),
    neighborhood: String(lead.neighborhood || ''),
    city: String(lead.city || ''),
    state: String(lead.state || ''),
    interest: {
      id: String(lead.interestId || ''),
      label: String(lead.interestLabel || '')
    },
    capturedAt: timestampToIso(lead.capturedAtClient),
    capturedBy: {
      uid: String(lead.capturedByUid || ''),
      name: String(lead.capturedByName || '')
    },
    source: String(lead.source || ''),
    appointment: lead.appointmentDate ? {
      date: String(lead.appointmentDate),
      time: String(lead.appointmentTime || ''),
      attendance: String(lead.appointmentAttendance || 'pending'),
      durationMinutes: Number(lead.appointmentDurationMinutes || 0) || null
    } : null,
    followUp: {
      contactedAt: timestampToIso(lead.followUpContactedAt),
      contactedByName: String(lead.followUpContactedByName || '')
    },
    notes: String(lead.notes || ''),
    createdAt: timestampToIso(lead.createdAtServer || lead.capturedAtClient),
    updatedAt: timestampToIso(lead.updatedAtServer || lead.createdAtServer || lead.capturedAtClient),
    schemaVersion: Number(lead.schemaVersion || 1)
  };

  if (includeSensitive) {
    result.customerCpf = String(lead.customerCpf || '');
    result.birthDate = String(lead.birthDate || '');
    result.sex = String(lead.sex || '');
    result.health = {
      ametropias: Array.isArray(lead.ametropiaLabels) ? lead.ametropiaLabels.map(String) : [],
      conditions: Array.isArray(lead.pathologyLabels) ? lead.pathologyLabels.map(String) : []
    };
  }
  return result;
}

export function parseLeadListQuery(searchParams, { sensitiveFieldsEnabled = false } = {}) {
  const rawLimit = searchParams.get('limit') || '50';
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new Error(`O limite deve ser um inteiro entre 1 e ${MAX_PAGE_SIZE}.`);
  }

  const updatedSinceValue = searchParams.get('updated_since') || '';
  const updatedSince = updatedSinceValue ? new Date(updatedSinceValue) : null;
  if (updatedSinceValue && Number.isNaN(updatedSince.getTime())) {
    throw new Error('updated_since deve ser uma data ISO 8601 valida.');
  }

  const storeIds = [...new Set(searchParams.getAll('store_id')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean))];
  if (storeIds.some((storeId) => !ALLOWED_STORE_IDS.has(storeId))) {
    throw new Error('Uma das lojas informadas nao e permitida.');
  }

  const requestedSensitive = searchParams.get('include_sensitive') === 'true';
  return {
    limit,
    updatedSince,
    storeIds,
    cursor: searchParams.get('cursor') || '',
    includeSensitive: sensitiveFieldsEnabled && requestedSensitive
  };
}

export function encodeCursor({ id, updatedAt }) {
  const seconds = Number(updatedAt?.seconds ?? updatedAt?._seconds);
  const nanoseconds = Number(updatedAt?.nanoseconds ?? updatedAt?._nanoseconds ?? 0);
  if (!id || !Number.isInteger(seconds) || !Number.isInteger(nanoseconds)) return '';
  return Buffer.from(JSON.stringify({ id, seconds, nanoseconds }), 'utf8').toString('base64url');
}

export function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!parsed.id || !Number.isInteger(parsed.seconds) || !Number.isInteger(parsed.nanoseconds)) throw new Error();
    return parsed;
  } catch {
    throw new Error('Cursor de paginacao invalido.');
  }
}

export { MAX_PAGE_SIZE };
