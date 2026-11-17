# STAR-FARM dashboard

- Work in `Dashboard/`. The adjacent Web App is a separate application.
- Preserve source values, units, missing values, scenario definitions, area shares, and geographic alignment. Check the relevant sections of `README.md` before changing calculations or map data.
- The working tree may contain user changes. Inspect it before editing and preserve unrelated changes.
- Node 24 is required. Run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` for dashboard-wide changes. Run focused tests while developing.
- Normal development and builds use the checked-in generated data. Regenerate deliberately with the appropriate `npm run data:*` command when inputs or generators change, then inspect the generated diff. GIS intersections require the documented external inputs and Python dependencies.
- Map work must retain selection, pan, zoom, keyboard access, legends and per-plot statistics. Measure transfer, render, and memory effects on representative devices when available. Do not claim mobile stability without device evidence.
- Do not push, merge, or deploy unless requested.
