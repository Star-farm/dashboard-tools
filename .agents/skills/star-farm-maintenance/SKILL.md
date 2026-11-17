---
name: star-farm-maintenance
description: Maintain the STAR-FARM Dashboard's React application, generated scenario data, and maps while preserving scientific and geographic integrity.
---

# STAR-FARM maintenance

Work in `Dashboard/`, not the separate `Web App/` application. Read `Dashboard/AGENTS.md` and the relevant data, calculations, or map sections of `Dashboard/README.md` before changing those areas. Inspect the working tree and preserve unrelated changes.

Use Node 24 and the lockfile. Run the focused tests for the changed behavior, then `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` as appropriate. The CI workflow runs these checks for Dashboard changes. Report failures and device or browser checks that could not be performed.

Normal development and builds consume checked-in generated data. When inputs or generators change, explicitly run the relevant `npm run data:*` command and inspect the output diff. `npm run data:all` runs the npm data generators in dependency order. The soil overlay and map geometry require the external GIS inputs and documented Python workflow; the npm soil generator does not recompute intersections.

Preserve source values, units, missing data, scenario comparisons, area shares, geometry alignment, and accessibility. For map changes, test the active layer, layer transitions, plot selection, zoom, pan, keyboard controls, failures, and data integrity. Measure network, rendering, and memory on representative mobile devices where possible; distinguish calculated resource estimates from measured runtime use.
