# Repository Structure

This document describes where each type of code belongs. Runtime entrypoints remain at their original paths so existing Docker, Cloud Run, VPS, and Vercel deployments continue to work.

```text
Web App/
├── backend/                  Cloud Run backend
│   ├── app/
│   │   ├── api/              FastAPI server and request schemas
│   │   ├── agents/           Agent orchestration implementation
│   │   └── mcp/              Data, model, cache, and MCP implementation
│   ├── main.py               Compatibility deployment entrypoint
│   ├── agent_adk.py          Compatibility import alias
│   ├── mcp_server.py         Compatibility import alias
│   ├── data/                 Simulation datasets
│   └── tests/
│       ├── unit/             Isolated agent/helper tests
│       └── integration/      API, model, cache, and MCP tests
├── VPS/                      VPS deployment variant
│   ├── app/                   Packaged API, agents, and MCP implementation
│   ├── main.py               Compatibility deployment entrypoint
│   ├── agent_adk.py          Compatibility import alias
│   ├── mcp_server.py         Compatibility import alias
│   ├── data/                 Simulation datasets
│   ├── .github/workflows/    VPS CI/CD
│   └── tests/
│       ├── unit/             Isolated agent/helper tests
│       └── integration/      API, model, cache, and MCP tests
└── frontend/                 Vite/Vercel application
    ├── api/proxy/            Server-side Vercel API proxy
    ├── public/               Static public assets
    ├── src/
    │   ├── app/              Application shell and error boundary
    │   ├── config/           Browser-safe API configuration
    │   ├── features/         Feature-oriented UI modules
    │   ├── hooks/            Dashboard state and data orchestration
    │   ├── i18n/             Translations
    │   ├── styles/           Global and application styles
    │   └── types/            Domain contracts
    └── tests/
        ├── unit/             Hooks and utilities
        ├── components/       React UI and error-boundary behavior
        └── server/           Vercel proxy behavior
```

## Placement Rules

- Keep deployable entrypoints and deployment files at each service root.
- Put pure helper and isolated class tests in `tests/unit`.
- Put tests crossing API, data, model, filesystem, or middleware boundaries in `tests/integration`.
- Put browser component tests in `frontend/tests/components`.
- Put serverless function tests in `frontend/tests/server`.
- Do not commit generated folders such as `.venv`, `node_modules`, `dist`, `coverage`, `.pytest_cache`, or model cache.

## Verification Commands

Backend and VPS:

```powershell
python -m pytest
```

Frontend:

```powershell
npm run test:coverage
npm run build
```
