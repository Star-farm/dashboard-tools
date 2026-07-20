# Frontend

React and TypeScript dashboard for KPI summaries, comparison charts, and simulation results. Production is designed for Vercel with a serverless proxy that protects the backend API key.

## Technology

- React 19 and TypeScript.
- Vite.
- Recharts.
- Vitest and Testing Library.
- Vercel Functions through `@vercel/node`.

## Local Development

```powershell
npm install
npm run dev
```

The Vite development proxy forwards `/api/proxy/*` to the local backend on port `8080`. Start the Backend or VPS Service first.

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
/api/proxy/scenarios
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
- Requires an HTTPS backend in production.

Do not call the backend directly from a component, and never place an API key in a `VITE_*` variable.

## Environment Variables

Create `.env.local` when needed locally, or configure these values in Vercel:

```dotenv
BACKEND_API_URL=https://api.example.com
BACKEND_API_KEY=replace-with-a-strong-secret
VITE_CSP_CONNECT='self' https://api.example.com
VITE_CSP_SCRIPT='self'
```

| Name | Scope | Purpose |
| --- | --- | --- |
| `BACKEND_API_URL` | Server only | HTTPS URL for Cloud Run or the VPS |
| `BACKEND_API_KEY` | Server only | Key shared by the proxy and backend |
| `VITE_CSP_CONNECT` | Build/client | Additional `connect-src` values if needed |
| `VITE_CSP_SCRIPT` | Build/client | `script-src` values |

The local backend may use HTTP. The production proxy rejects backend URLs that do not use HTTPS.

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
| Filter options | `GET /api/scenarios` |
| 2022–2050 KPIs | `POST /api/kpi-change` |
| Chart comparison | `POST /api/compare` |
| Simulation | `POST /api/simulate` |

A new route must be deliberately added to the proxy allowlist and covered by tests. Otherwise, the proxy returns `404`.

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
2. Configure `BACKEND_API_URL` and `BACKEND_API_KEY` for the appropriate Production and Preview environments.
3. Use `npm run build` with `dist` as the output directory.
4. Deploy, then verify `/api/proxy/scenarios` and the dashboard.

## Common Problems

| Status or symptom | What to check |
| --- | --- |
| `404` | The route/method is not allowed by the proxy, or the URL is incorrect |
| `401` | Vercel's `BACKEND_API_KEY` does not match the backend |
| `413` | The payload exceeds 32 KB |
| `502` | The backend returned an invalid response or its URL is incorrect |
| `504` | The backend did not respond before the timeout |
| KPI displays `N/A` | Check the API response, the 2022/2050 years, and metric names |
