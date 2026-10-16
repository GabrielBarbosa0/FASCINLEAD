const PRODUCTS_BY_OS_PATH = '/api/APIRelatoriosCR/ProdutosPorOSGrid';
const LOCAL_ROUTE = '/api/savwin/products-by-os';
const SALES_BY_CPF_PATH = '/api/APIVendasEntregues/RetornaVendasCPF';
const SALES_BY_CPF_ROUTE = '/api/savwin/sales-by-cpf';
const ALLOWED_STORE_CODES = new Set(['2', '4', '5', '6']);
const MAX_BODY_BYTES = 32_768;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSavwinDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function normalizeStoreCodes(storeCodes) {
  if (!Array.isArray(storeCodes)) return [];
  return [...new Set(storeCodes.map(String).filter((code) => ALLOWED_STORE_CODES.has(code)))];
}

export function buildProductsByOsBody({ startDate, endDate, storeCodes }) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const stores = normalizeStoreCodes(storeCodes);
  if (!start || !end || start > end) throw new Error('Informe um periodo valido.');
  if ((end - start) / 86_400_000 > 92) throw new Error('Consulte no maximo 93 dias por vez.');
  if (!stores.length) throw new Error('Informe ao menos uma loja permitida.');
  return {
    DATAINICIAL: formatSavwinDate(startDate),
    DATAFINAL: formatSavwinDate(endDate),
    LOJAS: stores.join(',')
  };
}

export function normalizeSavwinRecords(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'registros', 'records', 'resultado', 'result']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

export function buildSalesByCpfBody(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) throw new Error('Informe um CPF valido.');
  return { CPF: digits };
}

export function filterSavwinRecordsByCpf(records, cpf) {
  const digits = buildSalesByCpfBody(cpf).CPF;
  return records.filter((record) => {
    const recordCpf = String(record?.CPFCNPJ || record?.CPF || record?.CPFCLIENTE || '').replace(/\D/g, '');
    return recordCpf === digits;
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) reject(new Error('Corpo da requisicao muito grande.'));
    });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Corpo JSON invalido.'));
      }
    });
    request.on('error', reject);
  });
}

export function createSavwinLocalProxy(env, fetchImpl = globalThis.fetch) {
  const config = {
    baseUrl: String(env.SAVWIN_API_BASE_URL || '').replace(/\/$/, ''),
    identificador: String(env.SAVWIN_IDENTIFICADOR || ''),
    authorization: String(env.SAVWIN_AUTHORIZATION || ''),
    timeoutMs: Math.max(1, Number(env.SAVWIN_TIMEOUT_SECONDS || 30)) * 1000
  };

  return {
    name: 'fascinlead-savwin-local-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
        if (![LOCAL_ROUTE, SALES_BY_CPF_ROUTE].includes(pathname)) return next();
        if (request.method !== 'POST') return sendJson(response, 405, { ok: false, error: 'Metodo nao permitido.' });
        if (!config.baseUrl || !config.identificador || !config.authorization) {
          return sendJson(response, 503, { ok: false, error: 'Credenciais locais do SavWin nao configuradas.' });
        }

        try {
          const requestBody = await readJson(request);
          const byCpf = pathname === SALES_BY_CPF_ROUTE;
          const body = byCpf ? buildSalesByCpfBody(requestBody.cpf) : buildProductsByOsBody(requestBody);
          let upstream = await fetchImpl(`${config.baseUrl}${byCpf ? SALES_BY_CPF_PATH : PRODUCTS_BY_OS_PATH}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              identificador: config.identificador,
              Authorization: config.authorization,
              'User-Agent': 'FascinLead-Local/0.1 leitura'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(config.timeoutMs)
          });
          if (byCpf && upstream.status === 404) {
            const periods = Array.isArray(requestBody.periods) && requestBody.periods.length
              ? requestBody.periods.slice(0, 5)
              : [requestBody];
            const fallbackResponses = await Promise.all(periods.map((period) => fetchImpl(`${config.baseUrl}${PRODUCTS_BY_OS_PATH}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  identificador: config.identificador,
                  Authorization: config.authorization,
                  'User-Agent': 'FascinLead-Local/0.1 leitura'
                },
                body: JSON.stringify(buildProductsByOsBody(period)),
                signal: AbortSignal.timeout(config.timeoutMs)
              })));
            const failedResponse = fallbackResponses.find((response) => !response.ok);
            if (failedResponse) {
              return sendJson(response, 502, { ok: false, error: `SavWin respondeu com HTTP ${failedResponse.status}.` });
            }
            const fallbackPayloads = await Promise.all(fallbackResponses.map((item) => item.json()));
            const records = filterSavwinRecordsByCpf(
              fallbackPayloads.flatMap((payload) => normalizeSavwinRecords(payload)),
              requestBody.cpf
            );
            const osCount = new Set(records.map((record) => `${record.LOJA || record.CODLOJA || ''}|${record.OS || record.N_OS || record.NUMEROOS || ''}`)).size;
            return sendJson(response, 200, {
              ok: true,
              count: records.length,
              osCount,
              records,
              source: 'products-by-os-fallback'
            });
          }
          if (!upstream.ok) {
            return sendJson(response, 502, { ok: false, error: `SavWin respondeu com HTTP ${upstream.status}.` });
          }
          const normalizedRecords = normalizeSavwinRecords(await upstream.json());
          const records = normalizedRecords;
          const osCount = new Set(records.map((record) => `${record.LOJA || record.CODLOJA || ''}|${record.OS || record.N_OS || record.NUMEROOS || ''}`)).size;
          return sendJson(response, 200, {
            ok: true,
            count: records.length,
            osCount,
            records,
            source: byCpf ? 'sales-by-cpf' : 'products-by-os'
          });
        } catch (error) {
          const validationError = error.message?.startsWith('Informe') || error.message?.startsWith('Consulte');
          return sendJson(response, validationError ? 400 : 502, {
            ok: false,
            error: validationError ? error.message : 'Nao foi possivel consultar o SavWin localmente.'
          });
        }
      });
    }
  };
}
