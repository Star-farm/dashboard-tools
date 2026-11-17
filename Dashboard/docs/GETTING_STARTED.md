# Getting started

This guide takes a new contributor from checkout to a running STAR-FARM Dashboard. Work in `Dashboard/`; the adjacent `Web App/` and `Data Studio guide/` are separate projects.

## Prerequisites

- Node.js 24 and npm. The repository pins dependencies in `package-lock.json`; `package.json` does not declare an `engines` field.
- Git and a terminal. Microsoft Edge is needed for the configured Playwright end-to-end run.
- Python and external model/GIS inputs are only needed to regenerate GIS assets; they are not needed to install, run, test, or build the Dashboard.

The application is static and has no backend, environment file, API key, or live model service requirement.

## Install and run

From the repository root in PowerShell:

~~~powershell
Set-Location Dashboard
npm ci
npm run dev
~~~

Open the local URL Vite prints (normally `http://localhost:5173`). To use a predictable address, stop Vite and run:

~~~powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
~~~

Vite serves the current source and checked-in generated data. It does not regenerate data. The default language is chosen by `src/i18n/index.ts`; the user can switch languages in the header, and the choice is stored in browser local storage.

## First learning path

1. Read [the project overview](../README.md) and [architecture](ARCHITECTURE.md).
2. Follow [the code walkthrough](CODE_WALKTHROUGH.md) from hash navigation through a rendered chart and map interaction.
3. Use [feature guides](FEATURES.md) to choose an owning module.
4. Read [data and GIS](DATA_PIPELINE.md) before changing inputs, calculations, scenario populations, or map assets.
5. Follow [development](DEVELOPMENT.md) and [testing](TESTING.md) for a change-specific workflow.

## Useful commands

Run these inside `Dashboard/`:

~~~powershell
npm run dev
npm run build
npm run test:run
npm run lint
npm run typecheck
npm run e2e
npm run quality:check
~~~

`npm run build` runs `tsc -b` and then Vite. `npm run e2e` starts Vite on `127.0.0.1:4174`, runs Playwright using Microsoft Edge, and stops the server. `quality:check` runs formatting, lint, typecheck, unit tests, and build, but not E2E or data generation. See [testing](TESTING.md) for focused commands and coverage.

## Troubleshooting

- **Install fails or modules are inconsistent:** confirm Node 24, then run `npm ci` from `Dashboard/` using the lockfile.
- **Port is already in use:** stop the other server or choose an available port; `--strictPort` makes Vite fail instead of silently moving to another port.
- **E2E says Edge is missing:** install Microsoft Edge, which is the browser channel configured in `playwright.config.ts`.
- **Map or soil data is unavailable:** inspect the browser Network panel and `public/map-data/manifest.json`; normal builds rely on checked-in assets. Do not run GIS generators without their documented source inputs.
- **Generated files unexpectedly change:** stop and inspect the diff. Data commands intentionally rewrite outputs; routine development and checks do not need them.
- **Vietnamese appears incorrect:** confirm the file is UTF-8 and inspect the rendered page and source bytes before editing; terminal code-page rendering can misrepresent Vietnamese text.

More diagnosis is in [troubleshooting](TROUBLESHOOTING.md).
