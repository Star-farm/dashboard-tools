import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import viteConfig, { createDevelopmentProxyHeaders } from '../../vite.config';

type HeaderEntry = { key: string; value: string };
type VercelConfiguration = { headers: Array<{ source: string; headers: HeaderEntry[] }> };

function loadVercelHeaders(): Map<string, string> {
    const configPath = resolve(process.cwd(), 'vercel.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as VercelConfiguration;
    expect(config.headers).toHaveLength(1);
    expect(config.headers[0].source).toBe('/(.*)');
    return new Map(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

describe('production browser security policy', () => {
    it('sets a complete CSP in the HTTP response headers', () => {
        const csp = loadVercelHeaders().get('content-security-policy');
        expect(csp).toBeTruthy();
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("connect-src 'self'");
        expect(csp).toContain("frame-ancestors 'none'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("script-src 'self'");
        expect(csp).toContain("script-src-attr 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
        expect(csp).not.toContain("'unsafe-eval'");
    });

    it('sets transport, framing, MIME, referrer, permission, and isolation headers', () => {
        const headers = loadVercelHeaders();
        expect(headers.get('strict-transport-security'))
            .toBe('max-age=63072000; includeSubDomains; preload');
        expect(headers.get('x-frame-options')).toBe('DENY');
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(headers.get('permissions-policy')).toBe('camera=(), geolocation=(), microphone=()');
        expect(headers.get('cross-origin-opener-policy')).toBe('same-origin');
        expect(headers.get('cross-origin-resource-policy')).toBe('same-origin');
    });
});

describe('development API key handling', () => {
    it('requires a server-only API key instead of using a repository default', () => {
        expect(() => createDevelopmentProxyHeaders(undefined)).toThrow(/BACKEND_API_KEY/);
        expect(() => createDevelopmentProxyHeaders('   ')).toThrow(/BACKEND_API_KEY/);
        expect(createDevelopmentProxyHeaders(' local-secret ')).toEqual({
            'X-API-Key': 'local-secret',
        });
    });

    it('requires authentication for the built local preview too', async () => {
        const previousKey = process.env.BACKEND_API_KEY;
        try {
            process.env.BACKEND_API_KEY = 'preview-test-secret';
            const factory = viteConfig as (env: { command: 'serve'; mode: string; isPreview: boolean }) => { server: { proxy: Record<string, { target: string; configure: (proxy: { on: (event: string, callback: (request: { setHeader: (name: string, value: string) => void }) => void) => void }) => void }> } };
            const config = factory({ command: 'serve', mode: 'production', isPreview: true });
            const proxy = config.server.proxy['/api/proxy'];
            expect(proxy.target).toBe('http://127.0.0.1:8080');
            let forwardedKey: string | undefined;
            proxy.configure({ on: (_event, callback) => callback({ setHeader: (_name, value) => { forwardedKey = value; } }) });
            expect(forwardedKey).toBe('preview-test-secret');
            delete process.env.BACKEND_API_KEY;
            expect(() => factory({ command: 'serve', mode: 'production', isPreview: true })).toThrow(/BACKEND_API_KEY/);
        } finally {
            if (previousKey === undefined) delete process.env.BACKEND_API_KEY;
            else process.env.BACKEND_API_KEY = previousKey;
        }
    });
});
