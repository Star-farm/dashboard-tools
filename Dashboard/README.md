# STAR-FARM Dashboard

The Dashboard is a static, bilingual (Vietnamese and English) React application for exploring prepared STAR-FARM rice-farming scenario results in Dong Thap, Vietnam. It presents economics, resources, environment, seasonal, scenario, and map views. It does not run the simulation or call a live model API.

## Features

- Compare modeled income, cost, yield, labor, water use, and methane across farming systems and conditions.
- Explore annual and seasonal results with filters and interactive charts.
- View plot-level yield and income by year, harvest, and scenario.
- Inspect soil texture, flood depth, acid sulfate depth, and land-use layers with per-plot area shares.
- Browse in Vietnamese or English, search the glossary, and follow map context to dashboard views.

The Dashboard presents prepared outputs from STAR-FARM rice-farming simulations. BAU means Business As Usual. 1M_HA is the modeled one-million-hectare program scenario. Comparison pages also distinguish modeled climate and resource conditions, such as severe or mild weather and water shortage or normal supply. These labels describe model configurations. Attribute a difference to one practice only when the comparison controls for the other conditions. See [data and GIS](docs/DATA_PIPELINE.md) for periods, populations, and interpretation limits.

Economics, Environment, and Resources present related outcome families from the scenario data. Scenario Comparison puts selected outcomes side by side. Spatial Maps connect scenario filters and modeled years and harvests to plot-level yield and income. Soil and Land Use maps show static spatial classifications, not forecasts.

See [Internationalization](docs/INTERNATIONALIZATION.md) for locale dictionaries, dynamic display labels, and bilingual regression checks.

## Stack and structure

React 19 · TypeScript 6 · Vite 8 · Recharts 3 · Vitest 4 · Testing Library · Playwright · ESLint · Sharp.

~~~text
Dashboard/
├── docs/                 Architecture, data, development, testing, deployment
├── e2e/                  Playwright tests
├── public/map-data/      Runtime map assets and manifests
├── scripts/              Data preparation and local checks
├── src/
│   ├── app/              App shell, hash navigation, page-level state
│   ├── assets/           Local fonts, images, partner marks
│   ├── components/       Shared charts and UI
│   ├── data/              CSV sources and generated JSON
│   ├── features/          Economics, environment, future, glossary, home, map, resources, scenarios
│   ├── i18n/              Language state and translations
│   ├── styles/            Global and feature CSS
│   └── utils/             CSV parsing and year ticks
└── tests/                 Vitest tests
~~~

The repository root also contains a separate [Web App](../Web%20App/README.md) and [Data Studio guide](../Data%20Studio%20guide/README.md). They are not Dashboard dependencies.

## Setup

Use Node.js 24 and npm. No environment file, API key, or backend is needed. A single regional JPEG background is bundled in `public/map-data/static-basemap.jpg`; displaying the map does not request map tiles or a map API.

~~~powershell
cd Dashboard
npm ci
npm run dev
~~~

Vite normally prints port 5173. For a fixed address run npm run dev -- --host 127.0.0.1 --port 5173 --strictPort. Builds use checked-in data and do not run generators.

For a step-by-step first run, prerequisite details, a learning path, and troubleshooting, see [Getting started](docs/GETTING_STARTED.md).

## Commands

Run from Dashboard/.

| Command | Purpose |
| --- | --- |
| npm run dev | Start Vite. |
| npm run build | Type-check and build dist/. |
| npm run preview | Serve the existing build. |
| npm run lint | Run ESLint. |
| npm run typecheck | Run TypeScript project checks. |
| npm run format:check | Check whitespace and final newlines. |
| npm run test:run | Run Vitest once. |
| npm run test:coverage | Run Vitest coverage. |
| npm run e2e | Start local Vite on 4174, run Playwright in Microsoft Edge, then stop Vite. |
| npm run quality:check | Run format, lint, typecheck, tests, and build. |
| npm run data:future | Regenerate future-series JSON. |
| npm run data:scenarios | Regenerate scenario, economics, resources, environment, and seasonal JSON. |
| npm run data:map-aggregates | Rebuild hashed map aggregates and manifest references. |
| npm run data:soil | Split prepared soil overlay and generate Land Use raster. |
| npm run data:all | Run the four npm data commands in order. |
| npm run images:optimize | Generate hero image variants. |
| npm run fonts:sync | Refresh bundled Lora fonts and license; needs network access. |

Do not regenerate data for routine development or checks. See [DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

## Guides

- [Getting started](docs/GETTING_STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Code walkthrough](docs/CODE_WALKTHROUGH.md)
- [Feature guides](docs/FEATURES.md)
- [Data and GIS pipeline](docs/DATA_PIPELINE.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing and UI verification](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Internationalization](docs/INTERNATIONALIZATION.md)
- [Deployment and maintenance](docs/DEPLOYMENT.md)
- [Land Use device verification](docs/map-verification.md)

## Build and deploy

~~~powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
~~~

Deploy the complete dist/ directory. Vercel response headers are configured in vercel.json. The static Dashboard has no runtime environment variables. See [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Limits

- Browser viewport emulation does not establish physical-device behavior.
- The bundled map background is one 4000 × 4000 JPEG and needs no map service. Like any raster, it can pixelate if enlarged beyond its image resolution.
- Land Use uses a raster for display and separate JSON statistics; raster detail differs from the former high-resolution drawing.
- Plot indices are positional model-to-geometry associations, not cadastral IDs.
- No CI/CD workflow is defined; quality checks run locally.
