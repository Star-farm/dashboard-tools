# Development guide

## Setup

Use Node.js 24 and npm from `Dashboard/`:

~~~powershell
npm ci
npm run dev
~~~

No environment file, key, backend, or remote service is required. Vite normally serves port 5173. A fixed local address can be set with `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

## Add or change a page

1. Locate its route in `src/app/usePageNavigation.ts` and content route maps in `src/features/resources/resourceRoutes.ts` or `src/features/environment/environmentRoutes.ts`. `src/app/exploreNavigation.ts` only defines topic menu branches, which link directly to content pages.
2. Keep page, domain calculations, types, and copy in the owning feature directory.
3. Register lazy pages and loading text in `src/app/App.tsx`; preserve language and hash-context behavior. Old `*-explore` hashes should continue resolving to their matching content page when applicable.
4. Reuse `src/components/` for shared chart controls, filters, legends, descriptions, and selection. Reuse `src/app/` for shell-level navigation/state and `src/utils/` for generic helpers.
5. Add/update Vietnamese and English copy, accessible labels, keyboard behavior, responsive styles, and behavior tests.
6. Update documentation when routes, data contracts, architecture, or workflows change.

There is no `src/shared/` directory today. Add shared modules only for stable behavior with multiple consumers and a clear owner. Do not move feature-only logic to generic helpers for brevity.

## Charts and analysis

Keep aggregation and scientific calculation in data or feature analysis modules rather than visual chart components. Follow the chart patterns in the owning feature. Shared controls include `ChartSelection`, `ChartLegend`, `ConditionFilters`, `ChartInfo`, and `ChartUnitLabel`.

Keep bilingual labels, units, axes, missing values, zero and negative values, and explanatory summaries aligned. Distinguish missing observations, zero values, and crop periods not grown. Comparison populations and baseline periods are part of a chart's data contract. Check annual and seasonal views independently when denominators differ.

Use `ChartInfo` for Recharts tooltips with formatted series values. Pass the number formatter and unit separately. `ChartInfo` hides units on mobile and keeps them on desktop. It shows the full scenario label on desktop and the compact `BAU` label on mobile. The inline seasonal pie tooltip keeps its unit visible at every viewport width. It uses the compact `BAU` label on mobile. Keep Recharts tooltips within the chart area. Use an inline tooltip when a floating overlay would cover the data.

On narrow screens, keep chart legends below the plot and X-axis label. Seasonal crop bars rotate their category ticks when the chart is too narrow for the full labels to fit horizontally. `ChartInfo` shows supplied units on desktop and hides them on mobile; the seasonal pie tooltip keeps its unit visible at every width.

Optimize measured repeated work; avoid speculative memoization. Preserve focus indicators, reduced motion, and narrow layouts.

## Internationalization

Every changed user-facing string needs Vietnamese and English translations. Use the core dictionary in `src/i18n/index.ts` for shell text and feature-owned `*Text.ts` dictionaries for feature copy. Localize dataset-derived display labels without changing source values or identifiers, and verify immediate language switching. Follow [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) for dictionary patterns, label mappings, formatting conventions, exceptions, and regression checks.

## Maps

Map state and rendering live in `src/features/map/`. Read [DATA_PIPELINE.md](DATA_PIPELINE.md) before changing assets. Keep manifest references, hashes, CRS, shape order, category shares, and geometry fingerprints in sync.

Soil validation expects plot area = known area + unknown area, and category shares to sum to known area within tolerance. Land Use uses compact per-plot statistics and a raster; do not restore a full vector fallback or fetch the complete overlay during normal display. The regional Natural Earth image covers 94–116°E and 4–23°N; country and sea names are translated SVG labels. Plot-map panning stays within the administrative study extent and can reach its northern edge. Plot map zoom is bounded at 120×. Test layer changes, retry, constrained pan/zoom, keyboard selection, labels in both languages, legends, popups, long names, and map-to-dashboard context.

## Local workflow

~~~powershell
npm run test:run -- tests/plot-map.test.tsx
npm run lint
npm run typecheck
npm run format:check
npm run quality:check
npm run e2e
~~~

Use focused checks during development; run quality and E2E checks for Dashboard-wide changes. See [TESTING.md](TESTING.md). Data generation is separate from normal checks; see [DATA_PIPELINE.md](DATA_PIPELINE.md).

The `star-farm-maintenance` Codex skill is at `../../.agents/skills/star-farm-maintenance/SKILL.md` and appears in the workspace skill catalog. Read `AGENTS.md` and this guide before maintenance work. Use pstack when available and report actual evidence and limits. Do not add CI/CD or modify `.github/`.
