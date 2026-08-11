# Frontend

React and TypeScript dashboard for KPI summaries, comparison charts, and simulation results. Production is designed for Vercel with a serverless proxy that protects the backend API key.

## Technology

- React 19 and TypeScript.
- Vite.
- Recharts.
- Vitest and Testing Library.
- Vercel Functions using Web-standard `Request` and `Response` APIs.

## Local Development

```powershell
npm install
npm run dev
```

The Vite development proxy forwards `/api/proxy/*` to the local VPS service on port `8080`. Start the VPS service first, and set `BACKEND_API_KEY` in the ignored `.env.local` file. The development server fails closed instead of using a repository-wide default key.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm test -- --run` | Run tests once |
| `npm run lint` | Run ESLint |

## Production API Proxy

The browser only calls same-origin paths:

```text
/api/proxy/kpi-change
/api/proxy/compare
/api/proxy/simulate
```

The Vercel function at `api/proxy/[...path].ts`:

- Allows only explicitly configured routes and HTTP methods.
- Attaches `BACKEND_API_KEY` on the server.
- Limits request bodies to 32 KB.
- Applies a timeout to backend requests.
- Disables caching for API responses.
- Can fail closed on a non-HTTPS backend when `REQUIRE_HTTPS_BACKEND=true`.

Do not call the backend directly from a component, and never place an API key in a `VITE_*` variable.

## Environment Variables

Create `.env.local` when needed locally, or configure these values in Vercel:

```dotenv
BACKEND_API_URL=https://api.example.com/api/
BACKEND_API_KEY=replace-with-a-strong-secret
REQUIRE_HTTPS_BACKEND=true
VITE_CSP_CONNECT='self'
VITE_CSP_SCRIPT='self'
```

| Name | Scope | Purpose |
| --- | --- | --- |
| `BACKEND_API_URL` | Server only | Backend API base URL ending in `/api/` |
| `BACKEND_API_KEY` | Server only | Key shared by the proxy and backend |
| `REQUIRE_HTTPS_BACKEND` | Server only | Set to `true` after the backend has TLS to reject plaintext key transport |
| `VITE_CSP_CONNECT` | Build/client | Browser `connect-src`; remains same-origin for the server-side proxy |
| `VITE_CSP_SCRIPT` | Build/client | `script-src` values |

HTTP is supported only for local development. Production traffic between Vercel and the VPS, including the API key, must use HTTPS with `REQUIRE_HTTPS_BACKEND=true`.

## Edge Rate Limiting

The backend's in-memory, IP-based limiter is not a complete control when calls
arrive through serverless proxy egress addresses. Configure a Vercel Firewall
rate-limit rule for request paths beginning with `/api/proxy/`, keyed by the
original client IP. Start the rule in log mode, compare it with expected
dashboard traffic, and then publish the `429` action. The current backend
policy is `60` requests per `60` seconds; change that value only after a
capacity and usage review.

Verify the live rule after publishing rather than relying on repository
configuration:

```powershell
npx vercel firewall rules ls
```

Vercel's dashboard procedure is documented at
<https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting>.

## Key Files

```text
api/proxy/[...path].ts     Vercel serverless proxy
src/app/                   Application shell and error boundary
src/features/dashboard/    Dashboard interface
src/hooks/                 API data loading and state
src/config/                Browser-safe configuration
src/i18n/                  Translation resources
src/types/                 Shared domain types
tests/components/          React component and application-shell tests
tests/server/              Vercel proxy tests
tests/unit/                Hook and utility unit tests
```

## API Contract Used by the Frontend

| Request | Backend route |
| --- | --- |
| 2022–2050 KPIs | `POST /api/kpi-change` |
| Chart comparison | `POST /api/compare` |
| Simulation | `POST /api/simulate` |

A new route must be deliberately added to the proxy allowlist and covered by tests. Otherwise, the proxy returns `404`.

The meaning and calculation of the simulated values is documented in [Model Documentation](../MODEL.md).

## Testing and Building

```powershell
npm test -- --run
npm run build
```

Audit production dependencies:

```powershell
npm audit --omit=dev
```

A full `npm audit` may report advisories in build or test tooling. Evaluate those separately from the production runtime instead of automatically applying breaking dependency changes.

## Vercel Deployment

1. Import the `frontend` directory as the Vercel project's Root Directory.
2. Configure `BACKEND_API_URL`, `BACKEND_API_KEY`, and `REQUIRE_HTTPS_BACKEND` for the appropriate Production and Preview environments.
3. Use `npm run build` with `dist` as the output directory.
4. Deploy, then verify `/api/proxy/kpi-change` and the dashboard.

## Common Problems

| Status or symptom | What to check |
| --- | --- |
| `404` | The route/method is not allowed by the proxy, or the URL is incorrect |
| `401` | Vercel's `BACKEND_API_KEY` does not match the backend |
| `413` | The payload exceeds 32 KB |
| `502` | The backend returned an invalid response or its URL is incorrect |
| `504` | The backend did not respond before the timeout |
| KPI displays `N/A` | Check the API response, the 2022/2050 years, and metric names |
