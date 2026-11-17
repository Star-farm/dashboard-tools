# Troubleshooting

Use this guide for local development and data issues. Confirm the working directory is `Dashboard/` before running npm commands.

## Install and development server

- Check `node --version` reports Node 24 and use `npm ci` to reproduce the lockfile install.
- If Vite reports an occupied port, stop the other process or choose a free port. With `--strictPort`, Vite will exit instead of choosing another port.
- If a page appears stale, check the URL hash, browser console, and Network panel; then hard reload. Routing is hash-based in `src/app/usePageNavigation.ts`.

## Checks and browser tests

- `quality:check` stops at the first failing stage. Run the failing command by itself for the full diagnostic.
- Vitest uses `vite.config.ts` and jsdom; run a focused test with `npm run test:run -- tests/<name>.test.tsx`.
- E2E uses Microsoft Edge and port 4174. Install Edge if the configured channel cannot launch. Inspect Playwright's failure output and `test-results/` artifacts before retrying.
- A passing viewport check is browser emulation, not proof of physical-device touch, memory, or performance behavior.

## Data and maps

- Normal development reads checked-in generated JSON and `public/map-data/`. Missing files should be checked against `src/data/` imports and `public/map-data/manifest.json` references.
- If generated outputs changed unexpectedly, inspect Git diff and the generator's input paths before continuing. Do not run `npm run data:all` as a troubleshooting shortcut.
- GIS Python scripts require the external input directories described in [DATA_PIPELINE.md](DATA_PIPELINE.md). Missing or incompatible GIS inputs should be resolved before invoking a generator.
- Map loading errors: inspect failed Network requests, manifest filenames, and asset hashes. Use the UI retry button to retry fetched files. `useMapFile.ts` deduplicates active requests and caches successful JSON files; a page reload can distinguish stale state from an asset issue.
- Land Use validation errors can indicate a geometry mismatch or area totals outside the documented tolerance. Compare layer JSON, manifest metadata, raster, geometry fingerprint, known area, and unknown area before regeneration.

## Languages and display

- If language switching fails, verify the affected key exists in both locale dictionaries and inspect React/browser errors. Check `tests/i18n-coverage.test.ts` and [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).
- If Vietnamese looks corrupted only in terminal output, verify UTF-8 source bytes and rendered browser text before changing translations; terminal code pages can display valid UTF-8 incorrectly.
- If chart values or labels differ, trace the generated JSON and feature transform before adjusting formatting. Preserve source precision, units, identifiers, and missing-value semantics.

For system setup see [getting started](GETTING_STARTED.md); for reproducible checks see [testing](TESTING.md).
