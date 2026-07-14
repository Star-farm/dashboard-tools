import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = process.env.BACKEND_API_URL;
const API_KEY = process.env.BACKEND_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!BACKEND_URL || !API_KEY) {
        console.error('[proxy] Missing BACKEND_API_URL or BACKEND_API_KEY env vars.');
        return res.status(500).json({ detail: 'Proxy misconfigured on the server.' });
    }

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