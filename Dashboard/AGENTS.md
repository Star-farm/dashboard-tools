# STAR-FARM dashboard

- Work in `Dashboard/`. The adjacent Web App is a separate application.
- Reuse shared components, hooks, utilities, types, constants, and services when behavior is genuinely shared. Keep feature-specific logic inside its feature and avoid circular imports.
- Preserve source values, units, missing values, scenario definitions, area shares, and geographic alignment. Check the relevant sections of `README.md` before changing calculations or map data.
- The working tree may contain user changes. Inspect it before editing and preserve unrelated changes.
- Node 24 is required. Run focused tests while developing. Before handing off Dashboard-wide changes, run `npm run quality:check` and `npm run e2e`.
- Read `docs/ARCHITECTURE.md`, `docs/DATA_PIPELINE.md`, `docs/DEVELOPMENT.md`, `docs/TESTING.md`, and `docs/DEPLOYMENT.md` as relevant. The Codex maintenance skill is discoverable at `../.agents/skills/star-farm-maintenance/SKILL.md`.
- Normal development and builds use the checked-in generated data. Regenerate deliberately with the appropriate `npm run data:*` command when inputs or generators change, then inspect the generated diff. GIS intersections require the documented external inputs and Python dependencies.
- Map work must retain selection, pan, zoom, keyboard access, legends and per-plot statistics. Measure transfer, render, and memory effects on representative devices when available. Do not claim mobile stability without device evidence.
- Verify browser behavior against the local Vite app at desktop and mobile viewport sizes. Check console errors, failed requests, chart interactions, map layer transitions, filters, selection, and responsive overflow. Document browser limitations when a check cannot run.
- Keep normal development, test, and build commands separate from GIS data generation. Update the relevant Dashboard guide and README links when code, scripts, data flow, or maintenance procedures change.
- Do not add or modify CI/CD configuration or `.github/` files.
- Do not push, merge, or deploy unless requested.
