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

For a focused documentation update, use the workspace `star-farm-documentation` skill in `SYNC` mode. Use its `VERIFY` mode for documentation-only validation; reserve `FULL` for an explicitly requested complete audit. Keep code maintenance and documentation sync in the same change when architecture, feature behavior, data contracts, routes, or developer procedures change.

## Mandatory internationalization

For any UI, user-facing copy, refactoring, bug fix, or UI/UX optimization that can affect visible text:

1. Identify affected visible strings, including accessible names, labels, chart and map text, dynamic data labels, loading, empty, and error states.
2. Check the existing Vietnamese and English dictionaries and add or update both locale definitions together. Use the existing i18n architecture; do not hardcode localized copy in components when a dictionary or helper owns it.
3. Translate dataset-derived labels at display time while preserving source values, IDs, scenario codes, category codes, GIS data, and calculations.
4. Check language switching on the affected mounted page, including dynamic legends, tooltips, map layers, filters, popups, and status states.
5. Run relevant local i18n key-coverage and display-label regression tests, affected feature tests, and browser checks for both languages. Do not use a silent cross-language fallback.
6. Include bilingual verification and any remaining gaps in the final report. Do not mark UI work complete until both languages have been verified.

Preserve established terminology and scientific meaning, official proper nouns, symbols, scenario identifiers, the compact mobile `BAU` tooltip label, and mobile unit-hiding behavior. See `Dashboard/docs/INTERNATIONALIZATION.md` for the current dictionary patterns and exceptions.

For Recharts tooltip rows, use the shared `ChartInfo` component and pass the numeric formatter and unit separately. It keeps units and full scenario labels on desktop, hides units on mobile, and displays `BAU` for the English and Vietnamese business-as-usual labels on mobile. Follow `Dashboard/docs/DEVELOPMENT.md` for the inline seasonal pie tooltip and chart-relative placement conventions.
