import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    extractProxyPath,
    isJsonContentType,
    readLimitedJsonBody,
    resolveBackendTarget,
    resolveProxyRoute,
} from '../../api/proxy/[...path]';

describe('frontend API proxy allowlist', () => {
    it('extracts only the Vercel catch-all route from an absolute request URL', () => {
        expect(extractProxyPath('https://dashboard.example/api/proxy/kpi-change?ignored=true'))
            .toBe('kpi-change');
        expect(extractProxyPath('https://dashboard.example/not-the-proxy/kpi-change')).toBeUndefined();
        expect(extractProxyPath(undefined)).toBeUndefined();
    });

    it('rejects malformed and encoded traversal paths', () => {
        const traversal = extractProxyPath('https://dashboard.example/api/proxy/%2e%2e%2fmcp');
        expect(resolveProxyRoute(traversal, 'POST')).toBeNull();
        expect(extractProxyPath('not a valid absolute URL')).toBeUndefined();
    });

    it.each([
        ['kpi-change', 'POST'],
        ['compare', 'POST'],
        ['simulate', 'POST'],
    ])('allows %s %s', (route, method) => {
        expect(resolveProxyRoute(route, method)).toEqual({ route, method });
    });

    it.each([
        [['simulate'], 'GET'],
        [['optimize'], 'POST'],
        [['..', 'mcp'], 'POST'],
        ['data-status', 'GET'],
        ['scenarios', 'GET'],
        [undefined, undefined],
    ])('blocks a route or method outside the dashboard surface', (route, method) => {
        expect(resolveProxyRoute(route, method)).toBeNull();
    });
});

describe('proxy content and target validation', () => {
    it.each([
        'application/json',
        'application/json; charset=utf-8',
        'application/problem+json',
    ])('accepts JSON media type %s', (contentType) => {
        expect(isJsonContentType(contentType)).toBe(true);
    });

    it.each([null, 'text/plain', 'text/html', 'application/json, text/plain'])(
        'rejects non-JSON or ambiguous media type %s',
        (contentType) => {
            expect(isJsonContentType(contentType)).toBe(false);
        },
    );

    it('resolves an allowlisted route beneath a configured backend path', () => {
        expect(resolveBackendTarget('https://backend.example/api', 'simulate')?.href)
            .toBe('https://backend.example/api/simulate');
        expect(resolveBackendTarget('http://127.0.0.1:8080', 'compare')?.href)
            .toBe('http://127.0.0.1:8080/compare');
        expect(resolveBackendTarget('http://127.0.0.1:8080', 'compare', true)).toBeNull();
    });

    it.each([
        'not a URL',
        'file:///tmp/backend',
        'https://user:password@backend.example/api',
        'https://backend.example/api?destination=other',
        'https://backend.example/api#fragment',
    ])('rejects an unsafe backend URL: %s', (backendUrl) => {
        expect(resolveBackendTarget(backendUrl, 'simulate')).toBeNull();
    });
});

describe('bounded request body reader', () => {
    it('accepts valid UTF-8 JSON and supplies an empty object for an absent body', async () => {
        const request = new Request('https://dashboard.example/api/proxy/simulate', {
            method: 'POST',
            body: '{"water_usage":600}',
        });
        await expect(readLimitedJsonBody(request)).resolves.toEqual({
            ok: true,
            body: '{"water_usage":600}',
        });

        const emptyRequest = new Request('https://dashboard.example/api/proxy/simulate', {
            method: 'POST',
        });
        await expect(readLimitedJsonBody(emptyRequest)).resolves.toEqual({ ok: true, body: '{}' });
    });

    it('rejects malformed JSON and invalid UTF-8', async () => {
        const malformed = new Request('https://dashboard.example/api/proxy/simulate', {
            method: 'POST',
            body: '{broken',
        });
        expect(await readLimitedJsonBody(malformed)).toMatchObject({ ok: false, status: 400 });

        const invalidUtf8 = new Request('https://dashboard.example/api/proxy/simulate', {
            method: 'POST',
            body: new Uint8Array([0xff]),
        });
        expect(await readLimitedJsonBody(invalidUtf8)).toMatchObject({ ok: false, status: 400 });
    });

    it('rejects oversized, malformed, and unsafe declared lengths', async () => {
        const actualOversize = new Request('https://dashboard.example/api/proxy/simulate', {
            method: 'POST',
            body: '12345',
        });
        expect(await readLimitedJsonBody(actualOversize, 4)).toMatchObject({ ok: false, status: 413 });

        for (const contentLength of ['5', 'not-a-number', '999999999999999999999999']) {
            const request = new Request('https://dashboard.example/api/proxy/simulate', {
                method: 'POST',
                headers: { 'Content-Length': contentLength },
                body: '{}',
            });
            const result = await readLimitedJsonBody(request, 4);
            expect(result).toMatchObject({
                ok: false,
                status: contentLength === '5' ? 413 : 400,
            });
        }
    });

    it('maps a body stream failure to a safe 400 response', async () => {
        const failingBody = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.error(new Error('stream internals must not leak'));
            },
        });
        const request = {
            headers: new Headers(),
            body: failingBody,
        } as Request;
        expect(await readLimitedJsonBody(request)).toEqual({
            ok: false,
            status: 400,
            detail: 'Proxy request body could not be read.',
        });
    });
});

function proxyRequest(
    path = 'kpi-change',
    init: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Request {
    const method = init.method ?? 'POST';
    return new Request(`https://dashboard.example/api/proxy/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...init.headers,
        },
        body: method === 'GET' || method === 'HEAD' ? undefined : (init.body ?? '{}'),
    });
}

async function loadHandler(url = 'http://backend.local:8080/api/', requireHttps = 'false') {
    vi.resetModules();
    vi.stubEnv('BACKEND_API_URL', url);
    vi.stubEnv('BACKEND_API_KEY', 'unit-test-secret');
    vi.stubEnv('REQUIRE_HTTPS_BACKEND', requireHttps);
    return (await import('../../api/proxy/[...path]')).handler;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('frontend API proxy handler', () => {
    it('returns a non-cacheable 500 when server secrets are missing', async () => {
        vi.resetModules();
        vi.stubEnv('BACKEND_API_URL', '');
        vi.stubEnv('BACKEND_API_KEY', '');
        const { handler } = await import('../../api/proxy/[...path]');
        const response = await handler(proxyRequest());
        expect(response.status).toBe(500);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('returns 404 with the actual Allow header outside the allowlist', async () => {
        const handler = await loadHandler();
        const response = await handler(proxyRequest('optimize'));
        expect(response.status).toBe(404);
        expect(response.headers.get('allow')).toBe('POST');
    });

    it('requires JSON and rejects invalid or oversized bodies before fetch', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const handler = await loadHandler();

        const wrongType = await handler(proxyRequest('simulate', {
            headers: { 'Content-Type': 'text/plain' },
        }));
        expect(wrongType.status).toBe(415);

        const malformed = await handler(proxyRequest('simulate', { body: '{broken' }));
        expect(malformed.status).toBe(400);

        const oversized = await handler(proxyRequest('simulate', {
            body: JSON.stringify({ value: 'x'.repeat(33 * 1024) }),
        }));
        expect(oversized.status).toBe(413);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        'not a url',
        'file:///tmp/backend',
        'https://user:password@backend.example',
    ])('fails closed for unsafe backend configuration %s', async (backendUrl) => {
        const handler = await loadHandler(backendUrl);
        const response = await handler(proxyRequest());
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ detail: 'Proxy misconfigured on the server.' });
    });

    it('can require HTTPS without breaking the current explicit HTTP default', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const handler = await loadHandler('http://backend.example', 'true');
        const response = await handler(proxyRequest());
        expect(response.status).toBe(500);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        ['kpi-change', undefined],
        ['simulate', { water_usage: 600 }],
    ])('forwards %s without exposing the server key to the browser', async (path, body) => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        vi.stubGlobal('fetch', fetchMock);
        const handler = await loadHandler();
        const response = await handler(proxyRequest(path, {
            body: JSON.stringify(body ?? {}),
        }));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(fetchMock).toHaveBeenCalledWith(
            new URL(`http://backend.local:8080/api/${path}`),
            expect.objectContaining({ redirect: 'manual' }),
        );
        const fetchInit = fetchMock.mock.calls[0][1] as RequestInit;
        expect((fetchInit.headers as Record<string, string>)['X-API-Key']).toBe('unit-test-secret');
        expect(fetchInit.body).toBe(JSON.stringify(body ?? {}));
    });

    it('preserves a JSON backend status but normalizes its content type', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"denied"}', {
            status: 401,
            headers: { 'Content-Type': 'application/problem+json' },
        })));
        const handler = await loadHandler();
        const response = await handler(proxyRequest());
        expect(response.status).toBe(401);
        expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    });

    it.each([
        [new Response('{"redirect":true}', { status: 302, headers: { 'Content-Type': 'application/json' } })],
        [new Response('<script>attack()</script>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
        [new Response('{broken', { status: 200, headers: { 'Content-Type': 'application/json' } })],
    ])('does not relay redirects, active content, or malformed JSON', async (backendResponse) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backendResponse));
        const handler = await loadHandler();
        const response = await handler(proxyRequest());
        expect(response.status).toBe(502);
        expect(await response.text()).not.toContain('attack');
    });

    it.each([
        [Object.assign(new Error('timeout'), { name: 'AbortError' }), 504],
        [new Error('offline details must not leak'), 502],
    ])('maps backend failures without leaking details', async (error, status) => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
        const handler = await loadHandler();
        const response = await handler(proxyRequest());
        expect(response.status).toBe(status);
        expect(await response.text()).not.toContain(error.message);
    });
});
