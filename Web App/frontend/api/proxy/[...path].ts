import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side only env vars — NOT prefixed with VITE_, so Vercel never bundles
// them into client-side JS. Set these in Vercel Project Settings, not in
// any VITE_* variable.
const BACKEND_URL = process.env.BACKEND_API_URL;   // e.g. https://star-farm-api-828025724138.asia-southeast1.run.app/api
const API_KEY = process.env.BACKEND_API_KEY;        // the Cloud Run API_KEYS value

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!BACKEND_URL || !API_KEY) {
        console.error('[proxy] Missing BACKEND_API_URL or BACKEND_API_KEY env vars.');
        return res.status(500).json({ detail: 'Proxy misconfigured on the server.' });
    }

    // req.query.path comes from the [...path].ts catch-all segment,
    // e.g. /api/proxy/scenarios -> path = ['scenarios']
    // req.query.path from the [...path] catch-all segment has been coming back
    // empty on this deployment, so parse the path directly from the raw
    // request URL instead — this doesn't depend on Vercel's query population
    // and works regardless.
    const rawUrl = req.url ?? '';
    const afterProxyPrefix = rawUrl.split('/api/proxy/')[1] ?? '';
    const path = afterProxyPrefix.split('?')[0];
    const targetUrl = `${BACKEND_URL}/${path}`;
    console.log(`[proxy] ${req.method} ${req.url} -> ${targetUrl}`);

    const method = req.method ?? 'GET';
    const isBodyless = method === 'GET' || method === 'HEAD';

    try {
        const backendRes = await fetch(targetUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: isBodyless ? undefined : JSON.stringify(req.body ?? {}),
        });

        const contentType = backendRes.headers.get('content-type') ?? 'application/json';
        const text = await backendRes.text();
        console.log(`[proxy] backend responded ${backendRes.status} for ${targetUrl}`);

        res.status(backendRes.status);
        res.setHeader('Content-Type', contentType);
        res.send(text);
    } catch (err) {
        console.error('[proxy] Failed to reach backend:', err);
        res.status(502).json({ detail: 'Failed to reach backend service.' });
    }
}