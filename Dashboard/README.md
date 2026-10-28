# STAR-FARM Dashboard

A bilingual Vietnamese–English dashboard for exploring rice farming scenarios in Dong Thap, including economic viability, resource use, and emissions for 2027–2050.

This directory contains a **static website that displays aggregated CSV data**. It runs independently of the simulation application in `../Web App/frontend`. Dashboard does not call a machine learning model and does not require FastAPI or an API key.

Documentation reviewed against the source code on **October 28, 2026**.

## Documentation

| Document | Contents |
| --- | --- |
| [User guide](docs/HUONG_DAN_SU_DUNG.md) | Pages, menus, filters, charts, and interpreting KPIs |
| [Data and calculations](docs/DU_LIEU_VA_CACH_TINH.md) | Source CSVs, generated JSON, units, averages, and comparison baselines |
| [Maintenance and development](docs/BAO_TRI_VA_PHAT_TRIEN.md) | Code structure, content editing, terminology, styling, and testing |
| [Build and deployment](docs/BUILD_VA_TRIEN_KHAI.md) | Local development, previewing builds, static hosting, and troubleshooting |
| [Partner logo sources](src/assets/partners/README.md) | Image assets used in the footer |

## Quick start

Use **Node.js 24** and npm. The data scripts import TypeScript files directly, so older Node versions without this capability are unsuitable.

From the repository root:

```powershell
cd Dashboard
npm ci
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173/`. Skip `cd Dashboard` if your terminal is already in that directory.

Both `npm run dev` and `npm run build` regenerate the JSON data from the two source CSVs before starting.

## Commands

Run these commands from `Dashboard`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Regenerate data and start the development server |
| `npm run data:future` | Generate `future-series.json` |
| `npm run data:scenarios` | Generate scenario details and economic, resource, and environmental data |
| `npm test -- --run` | Run the test suite once |
| `npm run lint` | Check the code with ESLint |
| `npm run build` | Generate data, check TypeScript, and build the static site into `dist/` |
| `npm run preview` | Serve the existing build without rebuilding it |
| `npm run test:coverage` | Run tests and generate a coverage report |

## Main features

- Home page and topic exploration pages.
- Glossary with Vietnamese/English search, including accent-insensitive search.
- About the future: annual income, labor, and emissions trends.
- Scenario details: grouped KPIs and analysis relative to current conditions.
- Economics, Resources, and Environment: information dashboards, comparison dashboards, BAU versus 1Mha comparisons, and individual farming systems.
- Responsive navigation, breadcrumbs, language switching, and a back-to-top button.

Navigation uses URL hashes, such as `/#economics-overview`. Pages support direct links and the browser's Back/Forward buttons.

## Current data

| Source | Purpose |
| --- | --- |
| `src/data/indicators.csv` | 31 bilingual glossary entries; this count can change when the CSV is updated |
| `src/data/STAR_FARM CSV - Master file.csv` | Scenario data with monetary values in USD; 19,404 records and 30 columns |
| `src/data/STAR_FARM CSV - Dữ liệu tổng.csv` | Corresponding source with monetary values in VND; 19,404 records and 29 columns |

The model sources contain current conditions for 2016–2022 and future scenarios for 2027–2050. Each source includes 420 baseline records and 18,984 future records. Do not combine both sources into a larger set of observations.

**Daily exchange rate updates are not implemented.** Dashboard currently selects monetary values from the VND or USD source based on the interface language. It does not fetch exchange rates online. Read the [currency rules](docs/DU_LIEU_VA_CACH_TINH.md#currency-and-exchange-rates) before changing this behavior.

## Technology and visual design

React 19, TypeScript, Vite, Recharts, Vitest, and Testing Library. Exact dependency versions are locked in `package-lock.json`.

The template uses Lora, a cream background (`#faf9f3`), forest green (`#163d30`), primary green (`#254f3d`), and gold (`#e6d49a`). If Google Fonts cannot load, the browser falls back to Georgia/serif.

## Build for release

```powershell
npm test -- --run
npm run lint
npm run build
npm run preview
```

Deploy the contents of `dist/`. The `base: './'` setting in `vite.config.ts` makes asset paths relative. See [Build and deployment](docs/BUILD_VA_TRIEN_KHAI.md) for environment-specific instructions.
