# Dashboard agent instructions

## Start here

- Use pstack `poteto-mode` for Dashboard tasks. Start with `/pstack:poteto-mode` when available. Otherwise read `C:/Users/phamn/.codex/plugins/cache/cursor-plugins/pstack/0.15.46/skills/poteto-mode/SKILL.md` and follow the matching playbook.
- Inspect `git status` and preserve unrelated changes.
- Before editing, read the relevant rules in `eslint.config.js`. Follow each custom rule's shared pattern and error guidance.

## Project rules

- Work in `Dashboard/`. Use Node.js 24 and npm. The adjacent Web App is separate.
- Keep feature logic in its feature. Share code only when multiple consumers need the same behavior.
- Fix errors at their root cause. Do not mask symptoms with workarounds.
- Preserve source values, units, missing-versus-zero meaning, scenario definitions, area shares, and geographic alignment. Read `docs/DATA_PIPELINE.md` before changing calculations or map data.
- Use checked-in generated data for routine work. When inputs or generators change, run the relevant `npm run data:*` command and inspect its diff. GIS intersections need the documented external inputs and Python dependencies.
- Localize all user-facing text in Vietnamese and English through the existing i18n dictionaries. Keep identifiers and source data unchanged. See `docs/INTERNATIONALIZATION.md`.
- Preserve map selection, pan, zoom, keyboard access, legends, and per-plot statistics. Do not claim device behavior without device evidence.
- Update the relevant guide when a change affects behavior, data contracts, architecture, or workflows. See `docs/` for project conventions.
- Do not add CI/CD configuration. Do not push, merge, or deploy unless asked.

## Checks

- Run `npm run lint` after code changes. `npm run build` does not run ESLint.
- Run tests only when requested. Use `npm run quality:check` for the full local suite and `npm run e2e` for browser checks when requested.
