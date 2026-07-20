import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = process.env.BACKEND_API_URL;
const API_KEY = process.env.BACKEND_API_KEY;
const MAX_PROXY_BODY_BYTES = 32 * 1024;
const BACKEND_TIMEOUT_MS = 15_000;

const ALLOWED_ROUTES: Readonly<Record<string, readonly string[]>> = {
    scenarios: ['GET'],
    'kpi-change': ['POST'],
    compare: ['POST'],
    simulate: ['POST'],
};

export function extractProxyPath(
    queryPath: string | string[] | undefined,
    rawUrl: string | undefined,
): string | string[] | undefined {
    if (queryPath !== undefined) {
        return queryPath;
    }

    try {
        const pathname = new URL(rawUrl ?? '', 'http://proxy.local').pathname;
        const prefix = '/api/proxy/';
        if (!pathname.startsWith(prefix)) {
            return undefined;
        }
        return decodeURIComponent(pathname.slice(prefix.length));
    } catch {
        return undefined;
    }
}

export function resolveProxyRoute(
    rawPath: string | string[] | undefined,
    method: string | undefined,
): { route: string; method: string } | null {
    const route = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '');
    const normalizedMethod = (method ?? 'GET').toUpperCase();
    const allowedMethods = ALLOWED_ROUTES[route];

    if (!allowedMethods?.includes(normalizedMethod)) {
        return null;
    }

    return { route, method: normalizedMethod };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!BACKEND_URL || !API_KEY) {
        console.error('[proxy] Missing BACKEND_API_URL or BACKEND_API_KEY env vars.');
        return res.status(500).json({ detail: 'Proxy misconfigured on the server.' });
    }

    const proxyPath = extractProxyPath(req.query.path, req.url);
    const resolved = resolveProxyRoute(proxyPath, req.method);
    if (!resolved) {
        res.setHeader('Allow', 'GET, POST');
        return res.status(404).json({ detail: 'Proxy route not found.' });
    }

    const { route, method } = resolved;
    const isBodyless = method === 'GET' || method === 'HEAD';
    const requestBody = isBodyless ? undefined : JSON.stringify(req.body ?? {});
    if (requestBody && Buffer.byteLength(requestBody, 'utf8') > MAX_PROXY_BODY_BYTES) {
        return res.status(413).json({ detail: 'Proxy request body is too large.' });
    }

    let targetUrl: URL;
    try {
        const backendBase = new URL(BACKEND_URL.endsWith('/') ? BACKEND_URL : `${BACKEND_URL}/`);
        if (backendBase.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            throw new Error('Production backend URL must use HTTPS.');
        }
        targetUrl = new URL(route, backendBase);
    } catch {
        console.error('[proxy] Invalid BACKEND_API_URL configuration.');
        return res.status(500).json({ detail: 'Proxy misconfigured on the server.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    try {
        const backendRes = await fetch(targetUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: requestBody,
            signal: controller.signal,
        });

        const contentType = backendRes.headers.get('content-type') ?? 'application/json';
        const text = await backendRes.text();
        res.status(backendRes.status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.send(text);
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return res.status(504).json({ detail: 'Backend request timed out.' });
        }
        console.error('[proxy] Failed to reach backend service.');
        res.status(502).json({ detail: 'Failed to reach backend service.' });
    } finally {
        clearTimeout(timeout);
    }
}
