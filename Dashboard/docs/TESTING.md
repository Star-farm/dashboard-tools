# Testing and UI verification

## Unit and component tests

Run from `Dashboard/`. Vitest uses jsdom, Testing Library, and `tests/setup.ts`. `vite.config.ts` limits discovery to `tests/**/*.test.ts` and `tests/**/*.test.tsx`, leaving browser tests to Playwright.

~~~powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run quality:check
~~~

Run one test with `npm run test:run -- tests/plot-map.test.tsx`. Coverage is available through `npm run test:coverage`. Tests cover aggregation and data handling, navigation, pages, filters, charts, maps, soil validation, and interactions.

A successful command exits with status 0. A failing assertion or check exits nonzero; review the actual failure output rather than treating an earlier run as current evidence. The full `quality:check` stops at the first failing stage.

## Playwright

`npm run e2e` runs `scripts/run-e2e.mjs`: starts Vite on `127.0.0.1:4174`, invokes Playwright, and shuts Vite down. Microsoft Edge must be installed because `playwright.config.ts` selects `channel: 'msedge'`.

~~~powershell
npm run e2e
npm run e2e -- --grep "#map "
~~~

The suite tests every routed home, glossary, future, map, economics, resources, environment, and scenario page in both English and Vietnamese. Each page is checked at 320, 375, 390, 430, 768, 1024, and 1440 pixels for horizontal overflow, immediate language switching, page errors, and failed requests. English and Vietnamese screenshots at 375 pixels go to ignored `test-results/responsive/`.

The map test selects a plot by keyboard and checks the popup, including a two-line long ward name. The soil test switches to Land Use and checks the raster without fetching the complete soil overlay. Translation key and dataset-label coverage is checked by `tests/i18n-coverage.test.ts`; see [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) for the locale workflow. These viewport checks are not physical-device tests and do not measure mobile memory, thermal behavior, or touch reliability. See [map-verification.md](map-verification.md) for the Land Use phone procedure.

## Manual and data checks

For changed pages, check both languages, routes and history, filters/reset, loading/error/empty states, keyboard focus, chart axes/units/legends/tooltips, reduced motion, and responsive layout. For maps, also check plot selection, pan/zoom, layer changes, retry, legends, and map-to-dashboard links. Review browser console and Network requests.

For tooltip changes, exercise line, bar, seasonal pie, and map-trend charts at 320, 375, 390, 430, 768, and 1440 pixels. Check that `ChartInfo` hides units on mobile. Check that the seasonal pie tooltip keeps its unit visible at every width. Verify mobile `BAU` labels, full desktop labels, tooltip placement, value and color identity, language switching, and console and network errors. Capture a screenshot with each tooltip visible. A viewport screenshot without an active tooltip does not verify tooltip layout.

Preserve USD/VND paths, missing values, zero and negative values, scenario combinations, and baselines. For GIS changes, check hashes, IDs/order, geometry, manifest references, category totals, and unknown areas. Verify network requests when changing Land Use assets.

`quality:check` runs format, lint, typecheck, unit tests, and build; it does not run E2E or GIS generation. No GitHub Actions or other CI workflow is defined, so checks run locally.
