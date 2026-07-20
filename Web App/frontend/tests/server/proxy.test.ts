import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractProxyPath, resolveProxyRoute } from '../../api/proxy/[...path]';

describe('frontend API proxy allowlist', () => {
    it('extracts a Vercel catch-all route from req.url when req.query.path is absent', () => {
        const route = extractProxyPath(undefined, '/api/proxy/scenarios?ignored=true');
        expect(resolveProxyRoute(route, 'GET')).toEqual({ route: 'scenarios', method: 'GET' });
    });

    it('prefers the Vercel query route when it is available', () => {
        expect(extractProxyPath(['simulate'], '/api/proxy/wrong')).toEqual(['simulate']);
    });

    it('rejects malformed and encoded traversal paths from req.url', () => {
        const traversal = extractProxyPath(undefined, '/api/proxy/%2e%2e%2fmcp');
        expect(resolveProxyRoute(traversal, 'POST')).toBeNull();
        expect(extractProxyPath(undefined, '/not-the-proxy/scenarios')).toBeUndefined();
    });

    it.each([
        ['scenarios', 'GET'],
        ['kpi-change', 'POST'],
        ['compare', 'POST'],
        ['simulate', 'POST'],
    ])('allows %s %s', (route, method) => {
        expect(resolveProxyRoute(route, method)).toEqual({ route, method });
    });

    it.each([
        [['simulate'], 'GET'],
        [['optimize'], 'POST'],
        [['../mcp'], 'POST'],
        [['simulate', '..', 'mcp'], 'POST'],
        [['data-status'], 'GET'],
        [undefined, 'GET'],
    ])('blocks a route or method outside the dashboard surface', (route, method) => {
        expect(resolveProxyRoute(route, method)).toBeNull();
    });
});

type MockResponse = VercelResponse & {
    statusCode?: number;
    jsonBody?: unknown;
    sentBody?: unknown;
    headers: Record<string, string>;
};

function responseMock(): MockResponse {
    const response: {
        headers: Record<string, string>;
        statusCode?: number;
        jsonBody?: unknown;
        sentBody?: unknown;
        status?: (code: number) => unknown;
        json?: (body: unknown) => unknown;
        send?: (body: unknown) => unknown;
        setHeader?: (name: string, value: string) => unknown;
    } = { headers: {} };
    response.status = (code) => { response.statusCode = code; return response; };
    response.json = (body) => { response.jsonBody = body; return response; };
    response.send = (body) => { response.sentBody = body; return response; };
    response.setHeader = (name, value) => { response.headers[name] = value; return response; };
    return response as unknown as MockResponse;
}

async function loadHandler(url = 'http://backend.local:8080') {
    vi.resetModules();
    vi.stubEnv('BACKEND_API_URL', url);
    vi.stubEnv('BACKEND_API_KEY', 'secret');
    return (await import('../../api/proxy/[...path]')).default;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('frontend API proxy handler', () => {
    it('returns 500 when server secrets are missing', async () => {
        vi.resetModules();
        vi.stubEnv('BACKEND_API_URL', '');
        vi.stubEnv('BACKEND_API_KEY', '');
        const handler = (await import('../../api/proxy/[...path]')).default;
        const res = responseMock();
        await handler({ query: {}, method: 'GET' } as VercelRequest, res);
        expect(res.statusCode).toBe(500);
    });

    it('returns 404 with Allow for routes outside the allowlist', async () => {
        const handler = await loadHandler();
        const res = responseMock();
        await handler({ query: { path: 'optimize' }, method: 'POST' } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(404);
        expect(res.headers.Allow).toBe('GET, POST');
    });

    it('rejects oversized request bodies', async () => {
        const handler = await loadHandler();
        const res = responseMock();
        await handler({ query: { path: 'simulate' }, method: 'POST', body: { value: 'x'.repeat(33 * 1024) } } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(413);
    });

    it('rejects invalid URLs and non-HTTPS production URLs', async () => {
        let handler = await loadHandler('not a url');
        let res = responseMock();
        await handler({ query: { path: 'scenarios' }, method: 'GET' } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(500);

        vi.stubEnv('NODE_ENV', 'production');
        handler = await loadHandler('http://backend.example');
        vi.stubEnv('NODE_ENV', 'production');
        res = responseMock();
        await handler({ query: { path: 'scenarios' }, method: 'GET' } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(500);
    });

    it.each([
        ['scenarios', 'GET', undefined],
        ['simulate', 'POST', { water_usage: 600 }],
    ])('forwards %s securely', async (path, method, body) => {
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            headers: { get: () => 'application/json' },
            text: async () => '{"ok":true}',
        });
        vi.stubGlobal('fetch', fetchMock);
        const handler = await loadHandler();
        const res = responseMock();
        await handler({ query: { path }, method, body } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(200);
        expect(res.sentBody).toBe('{"ok":true}');
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe('secret');
        expect(fetchMock.mock.calls[0][1].body).toBe(method === 'GET' ? undefined : JSON.stringify(body));
    });

    it.each([
        [Object.assign(new Error('timeout'), { name: 'AbortError' }), 504],
        [new Error('offline'), 502],
    ])('maps backend failures without leaking details', async (error, status) => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
        const handler = await loadHandler();
        const res = responseMock();
        await handler({ query: { path: 'scenarios' }, method: 'GET' } as unknown as VercelRequest, res);
        expect(res.statusCode).toBe(status);
        expect(JSON.stringify(res.jsonBody)).not.toContain(error.message);
    });
});
