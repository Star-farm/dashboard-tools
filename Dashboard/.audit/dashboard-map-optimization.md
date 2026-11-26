# Dashboard map optimization run

## Goal

Reduce repeated work during map pan and zoom while preserving the rendered boundary paths, labels, plot selection, keyboard access, and viewport behavior.

## Done predicate

- The same checked-in geometry and boundary data produce the same SVG paths and labels before and after the change.
- Panning and zooming do not reproject unchanged boundary coordinates.
- Existing map interaction behavior still passes its test cases.
- Dashboard lint passes after the source change.

## Phases

1. Baseline: profile repeated viewport updates using the checked-in map geometry and admin boundaries; record results and output equivalence.
2. Treatment: memoize projected static boundary geometry and SVG paths independently of viewport-dependent labels.
3. Behavior check: add a public-interface test for boundary rendering and pan/zoom continuity; run the map tests requested by the task.
4. Final check: run Dashboard lint, inspect the diff, and report measured or inconclusive performance evidence.

## Rigor

Medium-high. This is a reversible rendering optimization on geographic data, so the benchmark uses the real checked-in assets and the existing map surface. No generated data or calculation definitions are changed.

## Results

- Administrative boundary projection, SVG path construction, and province cross-section spans are cached by geometry and boundary dataset identity. Pan and zoom retain viewport-dependent label placement while reusing the static boundary work.
- Across five alternating profiler runs, median React render-phase time moved from 21.38 ms to 1.07 ms. Numeric reads from source boundary coordinates per pan moved from 24,726 to zero. The rendered path, labels, and viewport checks matched.
- Updated stale Dashboard test assertions to follow current grouped tables, metric lists, localized headings, and focus-triggered abbreviation tooltips.
- `npm run quality:check` passed: format, lint, typecheck, all 328 tests in 42 files, and production build. The targeted map responsive viewport E2E check also passed.

## Limits

The profiler measurements are React render-phase timings in the Vitest/jsdom harness, not production browser latency. The build still reports the lazily loaded `all-seasonal` chunk at about 549 kB (164 kB gzip); `AnalysisView` loads it only when the all-topics seasonal view is selected.
