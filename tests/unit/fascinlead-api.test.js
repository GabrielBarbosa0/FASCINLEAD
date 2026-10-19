import { describe, expect, it, vi } from 'vitest';
import { createFascinLeadApi } from '../../server/fascinlead-api.js';
import { decodeCursor, encodeCursor, parseLeadListQuery, publicLead } from '../../server/lead-api-contract.js';

function responseMock() {
  return {
    headers: {},
    statusCode: 0,
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = JSON.parse(value); }
  };
}

function middlewareFor(plugin) {
  let middleware;
  plugin.configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  return middleware;
}

describe('FascinLead integration API contract', () => {
  it('keeps sensitive fields out unless explicitly enabled', () => {
    const lead = {
      fullName: 'Cliente Exemplo',
      phone: '+5581999991234',
      customerCpf: '52998224725',
      ametropiaLabels: ['Miopia'],
      pathologyLabels: ['Glaucoma'],
      updatedAtServer: new Date('2026-10-19T12:00:00.000Z')
    };

    expect(publicLead('lead-1', lead)).not.toHaveProperty('customerCpf');
    expect(publicLead('lead-1', lead)).not.toHaveProperty('health');
    expect(publicLead('lead-1', lead, { includeSensitive: true })).toMatchObject({
      customerCpf: '52998224725',
      health: { ametropias: ['Miopia'], conditions: ['Glaucoma'] }
    });
  });

  it('validates filters and round-trips opaque cursors', () => {
    const query = parseLeadListQuery(new URLSearchParams('limit=25&store_id=loja-02&store_id=loja-06&include_sensitive=true'));
    expect(query).toMatchObject({ limit: 25, storeIds: ['loja-02', 'loja-06'], includeSensitive: false });

    const cursor = encodeCursor({ id: 'lead-1', updatedAt: { seconds: 123, nanoseconds: 456 } });
    expect(decodeCursor(cursor)).toEqual({ id: 'lead-1', seconds: 123, nanoseconds: 456 });
    expect(() => parseLeadListQuery(new URLSearchParams('limit=101'))).toThrow(/limite/);
  });

  it('requires a bearer token and returns a paginated lead list', async () => {
    const token = 'integration-token-with-more-than-32-characters';
    const repository = {
      list: vi.fn().mockResolvedValue({
        records: [{ id: 'lead-1', data: { fullName: 'Cliente Exemplo', phone: '+5581999991234', storeId: 'loja-02' } }],
        nextCursor: 'next-page'
      }),
      get: vi.fn()
    };
    const middleware = middlewareFor(createFascinLeadApi({
      FASCINLEAD_API_TOKEN: token,
      FASCINLEAD_API_ALLOWED_STORES: 'loja-02'
    }, { repository }));

    const unauthorized = responseMock();
    await middleware({ method: 'GET', url: '/api/v1/leads', headers: {} }, unauthorized, vi.fn());
    expect(unauthorized.statusCode).toBe(401);

    const response = responseMock();
    await middleware({
      method: 'GET',
      url: '/api/v1/leads?limit=20&store_id=loja-02',
      headers: { authorization: `Bearer ${token}` }
    }, response, vi.fn());

    expect(response.statusCode).toBe(200);
    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, storeIds: ['loja-02'] }));
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({ limit: 20, nextCursor: 'next-page', hasMore: true });

    const forbidden = responseMock();
    await middleware({
      method: 'GET',
      url: '/api/v1/leads?store_id=loja-06',
      headers: { authorization: `Bearer ${token}` }
    }, forbidden, vi.fn());
    expect(forbidden.statusCode).toBe(403);
  });
});
