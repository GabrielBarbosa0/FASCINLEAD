import { describe, expect, it, vi } from 'vitest';
import { buildProductsByOsBody, buildSalesByCpfBody, createSavwinLocalProxy, filterSavwinRecordsByCpf, normalizeSavwinRecords } from '../../server/savwin-local-proxy.js';

function middlewareFor(plugin) {
  let middleware;
  plugin.configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  return middleware;
}

describe('SavWin local proxy', () => {
  it('documents POST as the only accepted method', async () => {
    const middleware = middlewareFor(createSavwinLocalProxy({}));
    const response = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      end(value) { this.body = JSON.parse(value); }
    };

    await middleware({ method: 'GET', url: '/api/savwin/products-by-os' }, response, vi.fn());

    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe('POST');
    expect(response.body).toEqual({ ok: false, error: 'Método não permitido.' });
  });

  it('builds the documented products by OS request body', () => {
    expect(buildProductsByOsBody({
      startDate: '2026-10-01',
      endDate: '2026-10-16',
      storeCodes: ['2', '6', '2']
    })).toEqual({
      DATAINICIAL: '01/10/2026',
      DATAFINAL: '16/10/2026',
      LOJAS: '2,6'
    });
  });

  it('rejects invalid stores and periods longer than 93 days', () => {
    expect(() => buildProductsByOsBody({
      startDate: '2026-10-01',
      endDate: '2026-10-16',
      storeCodes: ['1', '99']
    })).toThrow('Informe ao menos uma loja permitida.');

    expect(() => buildProductsByOsBody({
      startDate: '2026-01-01',
      endDate: '2026-10-16',
      storeCodes: ['2']
    })).toThrow('Consulte no máximo 93 dias por vez.');
  });

  it('normalizes common SavWin response envelopes', () => {
    const records = [{ OS: '123' }];
    expect(normalizeSavwinRecords(records)).toEqual(records);
    expect(normalizeSavwinRecords({ data: records })).toEqual(records);
    expect(normalizeSavwinRecords({ registros: records })).toEqual(records);
    expect(normalizeSavwinRecords({ unexpected: records })).toEqual([]);
  });

  it('normalizes a CPF request without sending punctuation', () => {
    expect(buildSalesByCpfBody('123.456.789-09')).toEqual({ CPF: '12345678909' });
    expect(() => buildSalesByCpfBody('123')).toThrow('Informe um CPF válido.');
  });

  it('filters fallback product rows by exact CPF', () => {
    const records = [
      { OS: 1, CPFCNPJ: '529.982.247-25' },
      { OS: 2, CPFCNPJ: '123.456.789-09' },
      { OS: 3, CLIENTE: 'Sem documento' }
    ];
    expect(filterSavwinRecordsByCpf(records, '52998224725')).toEqual([records[0]]);
  });
});
