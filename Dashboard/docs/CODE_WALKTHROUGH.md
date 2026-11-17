# Code walkthrough

This guide traces real execution from the browser URL to feature rendering. The Dashboard uses URL hashes rather than a routing library.

## Entry to page

1. `src/main.tsx` imports global styles and renders `App` inside React `StrictMode` and `ErrorBoundary` at `#root`.
2. `src/app/App.tsx` calls `usePageNavigation()` and `useLanguage(page, branch)`, creates the page element map, and wraps the active lazy page in `Suspense` and `ChartSelectionProvider`.
3. `src/app/usePageNavigation.ts` converts `window.location.hash` to a `Page`, listens for `hashchange`, and resolves explore branches with `exploreRouteForHash`. Resource and environment page names come from their feature route modules.
4. `App` selects the page element and passes `language` plus route-specific inputs. The page transition key includes page, branch, and the hash query string, so map context changes remount the page subtree.

~~~mermaid
flowchart LR
  URL[Hash and query string] --> Nav[usePageNavigation]
  Nav --> App[App shell]
  App --> Feature[Lazy feature page]
  Feature --> Data[Imported JSON or public map data]
  Data --> Transform[Feature selector or display transform]
  Transform --> State[Page and shared selection state]
  State --> View[Chart map table and controls]
  View --> Event[Filter language or selection event]
  Event --> State
~~~

## Feature example: economic comparison

`scripts/build-scenario-data.mjs` reads the English/USD master CSV and Vietnamese/VND combined CSV and calls `aggregateEconomicComparison` in `src/features/economics/comparisonData.ts`, writing `src/data/economics-comparison.json`. The aggregator accepts those two CSV strings, restricts the rows to 2027–2050, groups BAU and 1Mha by climate/resource cohort, calculates means per available metric, and checks that the two source populations have matching counts. Its output has `startYear`, `endYear`, and typed `cohorts` with paired `USD` and `VND` values.

`src/features/economics/EconomicComparisonPage.tsx` imports that JSON as `EconomicComparisonData`. The page holds climate (`all`, `severe`, `mild`) and resource (`all`, `shortage`, `normal`) conditions with `useState`, then calls `selectComparisonCohort(comparison, climate, resource)`. That selector returns the matching precomputed cohort or `undefined`; changing either control selects another cohort, and reset returns both dimensions to `all`. When a cohort exists, `comparisonMetrics` maps each metric to a `ComparisonBarChart`.

`ComparisonBarChart` receives one metric, one cohort, language, and the data period. It chooses the VND branch for Vietnamese or USD for English, builds the two group points with `scenarioColor`, and uses `ChartLegend` plus `useChartSelection('model', 'all')` to let the reader show both groups or either one. For VND money metrics, the plotted values are divided by one million for the chart scale; the lower value list still formats the cohort's original values and units. Recharts renders the selected points, and `ChartInfo` receives the number formatter and unit separately for tooltip display. Thus chart-scale conversion is presentation logic; the imported cohort values are unchanged. `ChartSelectionProvider` in `App` owns the shared selection context for the active page subtree.

## Annual and seasonal analysis

Economics, Resources, and Environment pages compose `AnalysisView`. Annual data is passed as feature props or imported JSON. `AnalysisView` initializes seasonal scope from a map harvest context or `?view=seasonal`; the scope buttons can also toggle it. When seasonal scope is selected, it lazy-loads `SeasonalComparison` and the topic's packed JSON, then calls `unpackSeasonalData` from `src/features/economics/seasonalData.ts`. The `SeasonalConfig` selects topic, view kind, family, or scenario.

`SeasonalComparison` receives the unpacked `SeasonalData` and config. It holds chart mode, year, crop period, and selected condition. It filters rows by a configured scenario code or chosen condition/family, averages across years when the all-years view is selected, and maps each metric to a bar, doughnut, or line chart based on mode and metric. Selecting a chart point changes the highlighted point and updates the accompanying insight; chart cards support keyboard arrow/Home/End selection. Missing data and periods not cultivated remain distinct. Do not infer annual results by summing harvest rows.

## Scenario filters

For overview filters, `src/app/useDashboardFilters.ts` initializes `EconomicFilters` from `readMapContext()` when the URL has valid map context; otherwise it uses `emptyEconomicFilters`. Economics, Resources, and Environment overview pages call `mapContextRows(rows, scope)` to restrict to the non-historical scenario codes from that context, then `filterEconomicRows(rows, filters)` to apply the five typed filter dimensions. Calling the hook's `setFilters(next)` updates the filters and clears the map scope, so subsequent filters are no longer limited by the originating map selection. This is separate from the Economic Comparison page's climate/resource cohort controls.

The map has its own facet controls. In `MapPage`, changing a facet updates that key, resets later dependent facets to `all`, and stops playback. It filters available scenario rows, matches their codes to the manifest, and loads the relevant files. The map URL helpers in `src/app/mapNavigation.ts` serialize filters, year, harvest, and scenario codes into a dashboard link; `readMapContext` validates those values when a dashboard page is opened from the map.

### Display and change the map year

`MapPage` already displays the selected year in the time controls, immediately above the range slider. The label renders the localized `t.year` text and the current `year` state:

~~~tsx
<label htmlFor="map-year">{t.year} <strong>{year}</strong></label>
<input
  id="map-year"
  type="range"
  min={2027}
  max={2050}
  step={1}
  value={year}
  onChange={(event) => {
    setYear(Number(event.target.value))
    setPlaying(false)
  }}
/>
~~~

The state initializes from a validated map URL context when one exists; otherwise it starts at 2027. `readMapContext` accepts only integer years from 2027 through 2050 and falls back to 2027 for invalid context. The range input changes the value in one-year steps. To show the year somewhere else inside `MapPage`, render `{year}` there and use the localized `t.year` label when the text needs a caption; do not keep a second year state.

Changing the year recalculates `yieldValues` and `incomeValues` with `selectPlotValues(displayData.records, year, season, metric)`. That helper selects records matching the year and harvest, then computes each plot's weighted mean using its metric observation count (or the run count when no metric count is present). The selected metric chooses which values and color scale `PlotMap` displays. The summary uses those selected plot values, and the trend chart keeps the full year series while a `ReferenceLine` marks the currently selected year.

The play button advances `year` once per second through 2050 and stops at the end. Moving the slider stops playback. Starting playback at 2050 resets the state to 2027 first. The displayed period also combines the year with the chosen harvest, or the all-harvest label when `season` is zero.

### Read chart values in the browser

On the `#map` page, scroll below the map workspace to the Trend section. Choose Yield or Income, then hover over a line point with a mouse (or tap a point on a touch screen) to see a Recharts tooltip with that point's year, formatted value, and unit. The selected map year is also marked on the trend chart with a vertical reference line. The trend line represents the mean across plot values for each year and the selected harvest; it is not limited to the year currently selected on the map.

To read the annual values without hovering, expand **Show table** below the chart. The table lists each year in the trend series with its value and unit. To inspect a single plot instead, click or keyboard-activate its polygon on the map; the popup shows that plot's area, yield, and income for the selected map year and harvest.

In code, `MapPage` creates `trend` with `plotTrend(displayData, season, trendMetric, null)`. `plotTrend` calls `selectPlotValues` for each year and averages those per-plot results. The Recharts `Tooltip` formats each chart point, while the `<details className="map-trend-table">` element renders the same `trend` rows as a table. For Vietnamese income, the chart series is scaled to millions of VND per hectare for display; the table formats the unscaled `trend` values using the full currency unit.

## Map flow and Land Use

`src/features/map/MapPage.tsx` loads `manifest.json`, `geometry.json`, `admin-boundaries.geojson`, and `currency.json` with `useMapFile`; scenario result files or a matching precomputed aggregate are fetched through `useMapFiles`. The hook deduplicates in-flight fetches, aborts a request after its last consumer releases it, and caches up to eight successful JSON files. Filters choose manifest scenarios; year, harvest, metric, trend metric, and playback are page state. `displayMapCurrency` prepares values in the selected language's currency; `selectPlotValues(records, year, season, metric)` returns per-plot values for the selected year/harvest, while `plotTrend` creates yearly chart points. `PlotMap` colors plot paths using those values, breaks, and colors. Clicking or keyboard activating a plot selects its ID and opens its detail popup; an outside pointer press dismisses that popup. The map SVG also supports pan and zoom.

Land Use lives in the soil map feature. `SoilMapPage` supplies geometry to `SoilMapSection`; a `layerId` state selects metadata from `soilManifest`, and `useMapFile` loads that layer's JSON plus the shared administrative boundaries. `compatibleSoilData` checks the layer version, display-geometry basis, CRS, geometry hash, plot IDs, areas, and category shares against the geometry before the data is used. `PlotMap` draws the layer's raster over plot outlines. Selecting a plot updates `selectedPlot`, which feeds `SoilAreaChart` to show per-plot category areas. The raster is for visual classification; area shares come from JSON. The browser does not fetch the full source overlay. See [data and GIS pipeline](DATA_PIPELINE.md) before editing or regenerating assets.

~~~mermaid
flowchart TD
  Controls[Filters year harvest metric] --> Select[Scenario and period selection]
  Manifest[Map manifest] --> Select
  Select --> Fetch[useMapFiles: aggregate or scenario files]
  Geometry[Geometry and boundaries] --> Plot[PlotMap]
  Fetch --> Currency[Currency and metric display transform]
  Currency --> Plot
  Plot --> Pick[Selected plot interaction]
  Pick --> Details[Plot values and trend context]
~~~

## Language changes

`App` gets `language`, `changeLanguage`, and core `t` labels from `useLanguage(page, branch)`, then passes the language to `SiteHeader` and the active page. `SiteHeader` wires the VI and EN buttons to `changeLanguage`. In `src/i18n/useLanguage.ts`, that function updates React state immediately and attempts to store the choice under `LANGUAGE_STORAGE_KEY`; storage failure does not prevent switching. The hook also updates the document's `lang`, title, and description. Core labels live in `src/i18n/index.ts`; domain copy lives in feature `*Text.ts` dictionaries. Dynamic scenario and category names use display-time helpers while identifiers remain stable. Follow [internationalization](INTERNATIONALIZATION.md) for coverage and safe additions.
