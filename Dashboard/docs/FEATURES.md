# Feature guides

This reference maps user-facing areas to their primary implementation and safe extension points. Read [architecture](ARCHITECTURE.md) for shared boundaries and [data and GIS](DATA_PIPELINE.md) for source contracts.

| Area | Purpose and main implementation | State, data, and safe extension |
| --- | --- | --- |
| Economics | `src/features/economics/`: overview, farming systems, comparisons, seasonal analysis; entry points are wired in `src/app/App.tsx`. | `economicsData.ts`, `comparisonData.ts`, `comparisonAnalysis.ts`, and typed JSON define transforms and comparisons. Preserve separate USD/VND populations, baseline periods, missing values, and units. Use existing chart selection, filters, and `ChartInfo`. |
| Environment | `src/features/environment/EnvironmentPage.tsx`, routes, `EnvironmentOverview.tsx`, and lazy `EnvironmentCharts`. | `environmentTypes.ts` and `environmentText.ts` define data and bilingual copy. Add a route in `environmentRoutes.ts`, connect it through `usePageNavigation.ts`, and preserve emissions units and weather/resource cohort definitions. |
| Resources | `src/features/resources/ResourcesPage.tsx`, route table, overview, and lazy charts. | `resourceTypes.ts`, `resourceText.ts`, and generated resource data own contracts and display copy. Keep water and labor units and cohort definitions consistent in annual and seasonal views. |
| Scenario comparison | `src/features/scenarios/ScenarioDetailsPage.tsx` and economics comparison pages/components. | Scenario codes and conditions are identifiers. Add display copy through both locales; validate filters, no-data states, and comparison denominators without redefining BAU or 1M_HA. |
| Spatial maps | `src/features/map/MapPage.tsx`, `PlotMap.tsx`, `mapData.ts`, `mapTypes.ts`, `useMapFile.ts`. | Manifest, geometry, scenario files, currency, and aggregate references drive map state. Check file hashes/CRS/order, filters, year/harvest, plot selection, pan/zoom, and map-to-dashboard context. |
| Land Use and soil maps | `src/features/map/SoilMapPage.tsx`, `SoilMapSection.tsx`, `SoilMapShell.tsx`, `SoilAreaChart.tsx`, `soilManifest.ts`, and `validateSoilData.ts`. | Selected layer statistics JSON and raster are loaded separately from shared geometry/boundaries. Validate per-plot area statistics against display geometry, area totals, unknown area, layer metadata, and asset references. The raster is for visual classification; area shares come from JSON. Do not fetch the complete overlay in the normal browser path. |

## Common extension procedures

- **Add a page or chart:** define the route in the owning feature, wire the hash in `src/app/usePageNavigation.ts` and page element in `src/app/App.tsx`, then use shared chart components where their behavior fits. Add English and Vietnamese copy and accessible names.
- **Add a KPI:** identify the source dataset, metric definition, period, population, missing-value rule, unit, and format first. Put calculation in the domain transform/analysis module; render the result in the feature. Add tests for zero, missing, and boundary cases.
- **Add a scenario dimension:** update the owning typed scenario/filter model and selector, dependent-option/reset behavior, both locale labels, and relevant comparison or map views. Keep the source code/identifier unchanged.
- **Add a map layer:** update documented preparation and manifest generation, create assets using the correct geometry/CRS, validate hashes and per-area totals, then test loading, errors/retry, legend, selection, and small viewport behavior.
- **Add translations:** use core `src/i18n/index.ts` or the owning feature's `*Text.ts`; keep keys and meaning aligned in `vi` and `en`, and update locale coverage expectations where needed.

For each extension, read [development](DEVELOPMENT.md), run relevant checks from [testing](TESTING.md), and update docs affected by changed contracts or workflows. Do not edit generated data by hand.

Feature regression tests are in `tests/`: `economics.test.tsx`, `economic-comparison.test.tsx`, `environment.test.tsx`, `resources.test.tsx`, `scenarios.test.tsx`, `plot-map.test.tsx`, `soil-map.test.tsx`, and `soil-cache-transition.test.tsx` cover the corresponding page/data behaviors. `seasonal-comparison.test.tsx`, `map-page.test.tsx`, and `use-map-file.test.tsx` cover shared seasonal and map flows. Browser journeys and viewport checks live in `e2e/dashboard.spec.ts`; tooltip browser checks are in `e2e/chart-tooltips.spec.ts`. Select focused tests that match the changed behavior; these filenames indicate coverage locations, not exhaustive scientific validation.
