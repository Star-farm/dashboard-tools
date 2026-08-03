declare const process: { env: Record<string, string | undefined> };

const BACKEND_URL = process.env.BACKEND_API_URL;
const API_KEY = process.env.BACKEND_API_KEY;
const REQUIRE_HTTPS_BACKEND = process.env.REQUIRE_HTTPS_BACKEND === 'true';
const MAX_PROXY_BODY_BYTES = 32 * 1024;
const BACKEND_TIMEOUT_MS = 15_000;

const ALLOWED_ROUTES: Readonly<Record<string, readonly string[]>> = {
    'kpi-change': ['POST'],
    compare: ['POST'],
    simulate: ['POST'],
};

const JSON_RESPONSE_HEADERS = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
} as const;

type BodyReadResult =
    | { ok: true; body: string }
    | { ok: false; status: 400 | 413; detail: string };

export function extractProxyPath(rawUrl: string | undefined): string | undefined {
    try {
        const pathname = new URL(rawUrl ?? '').pathname;
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

export function isJsonContentType(contentType: string | null): boolean {
    return contentType !== null
        && /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;.*)?$/i.test(contentType);
}

export function resolveBackendTarget(
    backendUrl: string,
    route: string,
    requireHttps = false,
): URL | null {
    try {
        const backendBase = new URL(backendUrl);
        if (!['http:', 'https:'].includes(backendBase.protocol)) {
            return null;
        }
        if (requireHttps && backendBase.protocol !== 'https:') {
            return null;
        }
        if (backendBase.username || backendBase.password || backendBase.search || backendBase.hash) {
            return null;
        }
        if (!backendBase.pathname.endsWith('/')) {
            backendBase.pathname = `${backendBase.pathname}/`;
        }

        const target = new URL(route, backendBase);
        return target.origin === backendBase.origin ? target : null;
    } catch {
        return null;
    }
}

export async function readLimitedJsonBody(
    request: Request,
    maxBytes = MAX_PROXY_BODY_BYTES,
): Promise<BodyReadResult> {
    const declaredLength = request.headers.get('content-length');
    if (declaredLength !== null) {
        if (!/^\d+$/.test(declaredLength)) {
            return { ok: false, status: 400, detail: 'Invalid Content-Length header.' };
        }
        const parsedLength = Number(declaredLength);
        if (!Number.isSafeInteger(parsedLength)) {
            return { ok: false, status: 400, detail: 'Invalid Content-Length header.' };
        }
        if (parsedLength > maxBytes) {
            return { ok: false, status: 413, detail: 'Proxy request body is too large.' };
        }
    }

    if (!request.body) {
        return { ok: true, body: '{}' };
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            totalBytes += value.byteLength;
            if (totalBytes > maxBytes) {
                await reader.cancel();
                return { ok: false, status: 413, detail: 'Proxy request body is too large.' };
            }
            chunks.push(value);
        }
    } catch {
        return { ok: false, status: 400, detail: 'Proxy request body could not be read.' };
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    let body: string;
    try {
        body = totalBytes === 0
            ? '{}'
            : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        JSON.parse(body);
    } catch {
        return { ok: false, status: 400, detail: 'Proxy request body must be valid JSON.' };
    }

    return { ok: true, body };
}

function jsonError(
    status: number,
    detail: string,
    extraHeaders?: Readonly<Record<string, string>>,
): Response {
    return new Response(JSON.stringify({ detail }), {
        status,
        headers: { ...JSON_RESPONSE_HEADERS, ...extraHeaders },
    });
}

export async function handler(request: Request): Promise<Response> {
    if (!BACKEND_URL || !API_KEY) {
        console.error('[proxy] Missing BACKEND_API_URL or BACKEND_API_KEY env vars.');
        return jsonError(500, 'Proxy misconfigured on the server.');
    }

    const proxyPath = extractProxyPath(request.url);
    const resolved = resolveProxyRoute(proxyPath, request.method);
    if (!resolved) {
        return jsonError(404, 'Proxy route not found.', { Allow: 'POST' });
    }

    if (!isJsonContentType(request.headers.get('content-type'))) {
        return jsonError(415, 'Proxy requests must use application/json.');
    }

    const bodyResult = await readLimitedJsonBody(request);
    if ('status' in bodyResult) {
        return jsonError(bodyResult.status, bodyResult.detail);
    }

    const targetUrl = resolveBackendTarget(BACKEND_URL, resolved.route, REQUIRE_HTTPS_BACKEND);
    if (!targetUrl) {
        console.error('[proxy] Invalid BACKEND_API_URL configuration.');
        return jsonError(500, 'Proxy misconfigured on the server.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    try {
        const backendRes = await fetch(targetUrl, {
            method: resolved.method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: bodyResult.body,
            signal: controller.signal,
            redirect: 'manual',
        });

        if (backendRes.status >= 300 && backendRes.status < 400) {
            return jsonError(502, 'Backend returned an invalid response.');
        }
        if (!isJsonContentType(backendRes.headers.get('content-type'))) {
            return jsonError(502, 'Backend returned an invalid response.');
        }

        const text = await backendRes.text();
        try {
            JSON.parse(text);
        } catch {
            return jsonError(502, 'Backend returned an invalid response.');
        }

        return new Response(text, {
            status: backendRes.status,
            headers: JSON_RESPONSE_HEADERS,
        });
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return jsonError(504, 'Backend request timed out.');
        }
        console.error('[proxy] Failed to reach backend service.');
        return jsonError(502, 'Failed to reach backend service.');
    } finally {
        clearTimeout(timeout);
    }
}

export default { fetch: handler };
