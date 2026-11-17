---
name: star-farm-maintenance
description: Maintain the STAR-FARM Dashboard's React application, generated scenario data, and maps while preserving scientific and geographic integrity.
---

# STAR-FARM maintenance

Work in `Dashboard/`, not the separate `Web App/` application. Read `Dashboard/AGENTS.md`, the relevant guide under `Dashboard/docs/`, and the current source before changing those areas. The README links to architecture, data, development, testing, and deployment guides. Inspect the working tree and preserve unrelated changes.

Use Node 24 and the lockfile. Run the focused tests for changed behavior, then `npm run quality:check` and `npm run e2e` for dashboard-wide changes. Report failures and browser checks that could not be performed.

Normal development and builds consume checked-in generated data. When inputs or generators change, explicitly run the relevant `npm run data:*` command and inspect the output diff. `npm run data:all` runs the npm data generators in dependency order. The soil overlay and map geometry require the external GIS inputs and documented Python workflow; the npm soil generator does not recompute intersections.

Preserve source values, units, missing data, scenario comparisons, area shares, geometry alignment, and accessibility. For map changes, test the active layer, layer transitions, plot selection, zoom, pan, keyboard controls, failures, and data integrity. Measure network, rendering, and memory on representative mobile devices where possible; distinguish calculated resource estimates from measured runtime use.

The current shared presentation components live in `src/components/`, application-level state and navigation in `src/app/`, and generic helpers in `src/utils/`; there is no `src/shared/` directory. Reuse these modules when their responsibilities fit, and create a new shared module only for stable behavior used by multiple features. Keep feature-specific logic inside its feature. Trace imports and consumers before removing code or dependencies. Prefer clear names over source comments, and preserve required licenses and tooling directives.

Verify UI changes in the local Vite app at the requested viewport widths. Check console errors, failed requests, route navigation, filters, chart controls, map interactions, keyboard access, and responsive overflow. Do not claim real-device behavior based on browser emulation. Keep GIS generation explicit and separate from normal builds and quality checks.

Update `Dashboard/README.md` and relevant `Dashboard/docs/` guides when source structure, scripts, data flow, user behavior, or maintenance procedures change. Verify documented commands, paths, and links. Do not add CI/CD configuration or modify `.github/`. Do not push, merge, or deploy unless requested.
