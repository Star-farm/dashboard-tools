# Architecture

## Runtime

The Dashboard is a static single-page React application. Vite bundles TypeScript and styles and copies public files into dist/. The browser does not call a simulation backend or external map service. Data preparation is separate; see [DATA_PIPELINE.md](DATA_PIPELINE.md).

~~~mermaid
flowchart LR
  Hash[URL hash and query] --> Nav[src/app navigation]
  Nav --> App[App shell]
  App --> Feature[Feature page]
  Feature --> Data[src/data JSON and public map assets]
  Feature --> Shared[src/components and app hooks]
  Data --> UI[Charts tables filters and maps]
  Shared --> UI
~~~

## Shell and navigation

- `src/main.tsx` imports global styles and mounts React inside StrictMode and an error boundary.
- `src/app/App.tsx` composes the header, lazy feature pages, language controls, chart selection context, footer, and back-to-top control.
- `src/app/usePageNavigation.ts` maps URL hashes to a typed content page, listens for `hashchange`, and supports browser history. No routing library is installed.
- `src/app/exploreNavigation.ts` defines the topic menu's overview, comparison, and business-as-usual branches. They lead directly to content pages; they are not standalone pages.
- The Economics, Resources, Environment, and Map labels open their dropdowns; branch labels open nested menus, and users reach pages through the links inside those menus.
- On the home page, the header keeps its translucent hero treatment until the hero scrolls behind it, then switches to the solid forest background used on content pages.
- Legacy `*-explore` hashes resolve to their corresponding map or topic content page for existing links.
- `src/app/mapNavigation.ts` validates map-to-dashboard query context; `useDashboardFilters.ts` initializes filters from it.
- `src/i18n/` owns language state and translations.

Most data pages use React lazy imports. Home, glossary, and not-found are directly imported. Route and map query context participate in the page key so changed map context remounts page content.

## Module responsibilities

| Path | Responsibility |
| --- | --- |
| `src/app/` | Shell, navigation, site chrome, dashboard/map context state. |
| `src/components/` | Shared chart controls, filters, analysis and description UI. |
| `src/features/economics/` | Economic summaries, farming-system pages, comparisons, seasonal views and analysis. |
| `src/features/environment/` | Environment pages, routes, data transforms and copy. |
| `src/features/future/` | Future series and chart analysis. |
| `src/features/glossary/`, `src/features/home/` | Glossary and home views. |
| `src/features/map/` | Farming and soil maps, helpers, viewport behavior, loading and validation. |
| `src/features/resources/` | Resource pages, routes, transforms and copy. |
| `src/features/scenarios/` | Scenario details, types and aggregation. |
| `src/data/` | Source CSVs, generated JSON and metadata. |
| `src/styles/` | Global, navigation, chart and feature styles. |
| `src/utils/` | CSV parsing and responsive year tick generation. |

There is no `src/shared/` directory or generic service layer. Reuse current components, app hooks, and utilities where their responsibilities fit. Keep domain logic in its feature when it is not shared.

## State and boundaries

Aggregation scripts read source CSVs and produce checked-in JSON. Features import JSON or fetch files from `public/map-data/`. Feature components prepare values for presentation components such as charts, tables, filters, and maps.

The URL hash owns route state. `src/i18n/useLanguage.ts` owns language state. Filters are held by the consuming page or the app-level dashboard filter hook when map context is involved. `ChartSelectionProvider` shares chart-series selection through its page subtree. Map pages own year, harvest, metric, layer, selected plot, and viewport state.

`src/features/map/useMapFile.ts` shares in-flight requests, cancels abandoned requests, retries failures, and caches up to eight successful files. Active components retain loaded results after cache eviction. Soil JSON is checked against map geometry before rendering.

The app shell composes features; shared presentation components must not depend on feature pages. Keep shared UI in `src/components/`, application navigation/state in `src/app/`, and feature logic in its feature. Avoid circular imports and duplicated domain mappings.

## Rendering, charts, maps, and language

Recharts charts live in feature modules and receive already selected or aggregated values. Shared components in `src/components/` provide chart selection, legends, chart information, and unit labels. Chart CSS in `src/styles/` controls responsive presentation; mobile tooltip labels and units are display-only formatting and do not alter source values. Annual and seasonal selection is composed by `src/components/AnalysisView.tsx`.

Map pages combine SVG plot geometry and values in `src/features/map/PlotMap.tsx`; `useMapFile.ts` provides shared JSON request state and cache for map files. `PlotMap` projects administrative boundaries and province label spans once per geometry and boundary dataset; pan and zoom only recalculate viewport placement and label sizing. `MapBasemap.tsx` positions one bundled, projected Natural Earth JPEG in the local UTM 48N SVG coordinate space, beneath administrative boundaries and plot overlays. Runtime map rendering loads `public/map-data/static-basemap.jpg` and makes no tile or map API requests. The source and image-generation procedure are recorded in `public/map-data/static-basemap-LICENSE.txt` and `scripts/build-static-basemap.mjs`. Localized country and sea labels are drawn as SVG text, and panning stays within the administrative study region and can reach its northern edge. Plot click and keyboard selection are delegated from the SVG, with `plotIdFromTarget` resolving the nearest `data-plot` element so selection behavior is centralized instead of allocating handlers for every plot path. `SoilMapSection.tsx` loads the selected soil statistics layer, validates it with `validateSoilData.ts`, and passes its raster filename to the plot map. `MapPage.tsx` owns scenario, year, harvest, metric, and playback selection.

Core translations and locale selection live in `src/i18n/`; feature dictionaries are in their owning feature directories. `useLanguage` updates the page and document metadata when language changes. Responsive behavior is implemented by shared and feature styles in `src/styles/`, with browser viewport checks in `e2e/`; viewport emulation does not establish physical-device performance or touch reliability.

Preserve units, missing values, zeroes, negatives, populations, baselines, scenario definitions, map CRS/order, geometry fingerprints, and area shares. Keep GIS generation separate from development, tests, quality checks, and builds. Update these guides when module boundaries or data contracts change.
