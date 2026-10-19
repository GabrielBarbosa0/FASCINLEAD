import { randomUUID, timingSafeEqual } from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { decodeCursor, encodeCursor, parseLeadListQuery, publicLead } from './lead-api-contract.js';

const API_PREFIX = '/api/v1';
const DEFAULT_ALLOWED_STORES = ['loja-02', 'loja-04', 'loja-05', 'loja-06'];

function sendJson(response, statusCode, payload, requestId) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Request-Id', requestId);
  response.end(JSON.stringify(payload));
}

function apiError(response, statusCode, code, message, requestId) {
  sendJson(response, statusCode, { error: { code, message }, requestId }, requestId);
}

function secureTokenMatches(received, expected) {
  const left = Buffer.from(String(received || ''), 'utf8');
  const right = Buffer.from(String(expected || ''), 'utf8');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function bearerToken(request) {
  const authorization = String(request.headers?.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function serviceAccountFromEnv(rawValue) {
  if (!rawValue) return null;
  const decoded = rawValue.trim().startsWith('{')
    ? rawValue
    : Buffer.from(rawValue, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

export function createFirestoreLeadRepository(env) {
  let firestore;
  function database() {
    if (firestore) return firestore;
    const projectId = String(env.FASCINLEAD_API_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '');
    const emulatorHost = String(env.FASCINLEAD_API_FIRESTORE_EMULATOR_HOST || '');
    const serviceAccount = serviceAccountFromEnv(String(env.FASCINLEAD_API_SERVICE_ACCOUNT_JSON || ''));
    if (!projectId) throw new Error('Projeto Firebase da API nao configurado.');
    if (emulatorHost) process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;

    const appName = `fascinlead-api-${projectId}`;
    const existing = getApps().find((app) => app.name === appName);
    const app = existing || initializeApp({
      projectId,
      ...(serviceAccount ? { credential: cert(serviceAccount) } : (!emulatorHost ? { credential: applicationDefault() } : {}))
    }, appName);
    firestore = getFirestore(app);
    return firestore;
  }

  return {
    async list(options) {
      let query = database().collection('leads');
      if (options.storeIds.length === 1) query = query.where('storeId', '==', options.storeIds[0]);
      if (options.storeIds.length > 1) query = query.where('storeId', 'in', options.storeIds);
      if (options.updatedSince) query = query.where('updatedAtServer', '>', Timestamp.fromDate(options.updatedSince));
      query = query.orderBy('updatedAtServer', 'asc').orderBy(FieldPath.documentId(), 'asc');
      const cursor = decodeCursor(options.cursor);
      if (cursor) query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.id);
      const snapshot = await query.limit(options.limit + 1).get();
      const pageDocs = snapshot.docs.slice(0, options.limit);
      const last = pageDocs.at(-1);
      return {
        records: pageDocs.map((item) => ({ id: item.id, data: item.data() })),
        nextCursor: snapshot.size > options.limit && last
          ? encodeCursor({ id: last.id, updatedAt: last.get('updatedAtServer') })
          : ''
      };
    },
    async get(id) {
      const snapshot = await database().collection('leads').doc(id).get();
      return snapshot.exists ? { id: snapshot.id, data: snapshot.data() } : null;
    }
  };
}

export function createFascinLeadApi(env, dependencies = {}) {
  const token = String(env.FASCINLEAD_API_TOKEN || '');
  const sensitiveFieldsEnabled = String(env.FASCINLEAD_API_SENSITIVE_FIELDS || '').toLowerCase() === 'true';
  const configuredStores = String(env.FASCINLEAD_API_ALLOWED_STORES || '').split(',').map((value) => value.trim()).filter(Boolean);
  const allowedStores = new Set(configuredStores.length ? configuredStores : DEFAULT_ALLOWED_STORES);
  const repository = dependencies.repository || createFirestoreLeadRepository(env);

  return {
    name: 'fascinlead-integration-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
        if (!requestUrl.pathname.startsWith(API_PREFIX)) return next();
        const requestId = randomUUID();

        if (requestUrl.pathname === `${API_PREFIX}/health`) {
          return sendJson(response, 200, { ok: true, service: 'fascinlead-api', version: 'v1' }, requestId);
        }
        if (token.length < 32) {
          return apiError(response, 503, 'api_not_configured', 'API de integracao nao configurada.', requestId);
        }
        if (!secureTokenMatches(bearerToken(request), token)) {
          return apiError(response, 401, 'unauthorized', 'Token de integracao invalido.', requestId);
        }
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET');
          return apiError(response, 405, 'method_not_allowed', 'Metodo nao permitido.', requestId);
        }

        try {
          if (requestUrl.pathname === `${API_PREFIX}/leads`) {
            const options = parseLeadListQuery(requestUrl.searchParams, { sensitiveFieldsEnabled });
            if (options.storeIds.some((storeId) => !allowedStores.has(storeId))) {
              return apiError(response, 403, 'store_forbidden', 'Integracao sem acesso a uma das lojas solicitadas.', requestId);
            }
            const scopedOptions = {
              ...options,
              storeIds: options.storeIds.length ? options.storeIds : [...allowedStores]
            };
            const result = await repository.list(scopedOptions);
            return sendJson(response, 200, {
              data: result.records.map((record) => publicLead(record.id, record.data, scopedOptions)),
              pagination: {
                limit: scopedOptions.limit,
                nextCursor: result.nextCursor || null,
                hasMore: Boolean(result.nextCursor)
              }
            }, requestId);
          }

          const match = requestUrl.pathname.match(/^\/api\/v1\/leads\/([A-Za-z0-9-]{1,128})$/);
          if (match) {
            const record = await repository.get(match[1]);
            if (!record || !allowedStores.has(record.data.storeId)) {
              return apiError(response, 404, 'lead_not_found', 'Lead nao encontrado.', requestId);
            }
            const includeSensitive = sensitiveFieldsEnabled && requestUrl.searchParams.get('include_sensitive') === 'true';
            return sendJson(response, 200, { data: publicLead(record.id, record.data, { includeSensitive }) }, requestId);
          }

          return apiError(response, 404, 'route_not_found', 'Endpoint nao encontrado.', requestId);
        } catch (error) {
          const validationError = /limite|updated_since|lojas|Cursor/.test(error.message || '');
          return apiError(
            response,
            validationError ? 400 : 500,
            validationError ? 'invalid_request' : 'internal_error',
            validationError ? error.message : 'Nao foi possivel consultar os leads.',
            requestId
          );
        }
      });
    }
  };
}
