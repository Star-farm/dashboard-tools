# Workspace instructions

## Every task

- Use `$pstack:poteto-mode` and `$pstack:in-your-own-words`. Restate the user's goal and wait for explicit confirmation before starting the requested work.
- Check `git status` first and preserve unrelated changes.

## Before source changes

- Read every applicable `AGENTS.md` for the target directory on each task. Re-read if the target or applicable instructions change.
- Use `$pstack:poteto-mode` and `$pstack:in-your-own-words`. Restate the user's goal and wait for explicit confirmation before starting the requested work.
- Do not edit source until you have read those instructions. If an applicable file is inaccessible, stop and report it.

## Bug fixes

- Investigate the root cause
- Once the root cause is known, explain it and the proposed fix with `$pstack:in-your-own-words`; wait for the user's explicit confirmation before changing code.
- After fixing the bug, use `$pstack:principle-prove-it-works' to show the result. Then encode the correction as a lint rule. Its error message must tell the developer what to do instead. Remove duplicate copies of the check or rule.

## Dashboard

- Work in `Dashboard/` with Node.js 24 and npm. The adjacent Web App is separate.
- Before editing Dashboard code, read the relevant rules in `Dashboard/eslint.config.js` and follow their shared patterns and error guidance.
- Keep feature logic within its feature; share it only when multiple consumers need it. Fix root causes instead of masking symptoms.
- Preserve source values, units, missing-versus-zero meaning, scenario definitions, area shares, and geographic alignment. Before changing calculations or map data, read `Dashboard/docs/DATA_PIPELINE.md`. Use checked-in generated data for routine work; when inputs or generators change, run the relevant `npm run data:*` command and inspect its diff. GIS intersections require the documented external inputs and Python dependencies.
- Localize user-facing text in Vietnamese and English through the existing i18n dictionaries. Keep identifiers and source data unchanged; see `Dashboard/docs/INTERNATIONALIZATION.md`.
- Preserve map selection, pan, zoom, keyboard access, legends, and per-plot statistics. Claim device behavior only with device evidence.
- Update the relevant guide when behavior, data contracts, architecture, or workflows change. See `Dashboard/docs/` for project conventions.
- Run `npm run lint` after Dashboard code changes; `npm run build` does not run ESLint. Run tests only when requested. For requested verification, use `npm run quality:check` for the full local suite or `npm run e2e` for browser checks.
- Do not add CI/CD configuration, push, merge, or deploy unless asked.

## Desktop interaction

- Prefer `compute-use` for GUI interaction when available and appropriate. Before first use in a session, run `skills get desktop` and `skills get platform` with it, and follow their guidance.
- Observe the UI, act, and verify the result. Use other tools when the environment requires them.

## Website development

- Consult relevant role instructions in `tools/agency-agents` when useful. Follow them and higher-priority instructions; delegate only when the current session authorizes it.

## Recharts source in `node_modules/recharts`

Apply these rules only when editing Recharts library source:

- Preserve consistency, usability, performance, and accessibility. Do not add library-level localization, hardcoded strings, or formatting choices; library users supply localized strings and formats.
- Read that package's `DEVELOPING.md` and `CONTRIBUTING.md` before editing. Follow their current guidance and avoid unrelated changes.
- For unit tests, prefer one file with `npm run test -- path/to/TestFile.spec.tsx`. Run the full suite only when verifying the whole package.
