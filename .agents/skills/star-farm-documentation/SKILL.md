---
name: star-farm-documentation
description: Audit, write, synchronize, or verify STAR-FARM Dashboard developer documentation against the current code, scripts, tests, data contracts, and project instructions. Use for onboarding, architecture, code walkthrough, data pipeline, full audit, or documentation sync requests.
---

# STAR-FARM documentation

Use this workflow for the Dashboard rooted at `Dashboard/`. The adjacent `Web App/` and `Data Studio guide/` are separate projects. Read `Dashboard/AGENTS.md`, inspect the working tree, and preserve unrelated changes. Use the project sources as truth; never infer behavior from old prose when code or generated-data contracts disagree.

## Modes

- **FULL** - audit existing guides, source, scripts, tests, dependencies, assets, and instructions; update existing docs first and add only missing guides needed for a coherent set.
- **SYNC** - update only guides affected by a meaningful code, route, data, architecture, or workflow change. Avoid full rewrites for minor changes.
- **ONBOARDING** - explain prerequisites, setup, verified commands, system boundaries, a learning path, and practical troubleshooting for a new developer.
- **ARCHITECTURE** - document actual module responsibilities, runtime boundaries, state, data loading, and Mermaid diagrams.
- **CODE-WALKTHROUGH** - trace actual entry points, functions, inputs, transformations, state, rendering, and interactions.
- **DATA** - document source CSV/model/GIS inputs, generators, generated outputs, validation, scientific meaning, and safe regeneration.
- **VERIFY** - check docs against code, commands, paths, local Markdown links, and Mermaid syntax; make no unnecessary edits.

If the user does not name a mode, infer the narrowest mode that fulfills the request. A complete audit request uses FULL.

## Workflow

1. **Discover** - identify the repository and Dashboard roots; read project instructions and current status. Inventory existing docs and relevant skill conventions. Keep adjacent applications out of Dashboard scope.
2. **Inspect** - inspect current implementation, scripts, package scripts and versions, tests, data manifests, generated assets, and any external-input assumptions for the requested domains.
3. **Compare** - reconcile each relevant statement with current code. Mark obsolete, duplicated, missing, ambiguous, or unsupported claims. Preserve valid scientific and operational context.
4. **Update** - prefer correcting existing files and links. Add a guide only when the coverage is missing and useful. Keep docs purpose-specific, avoid duplicated instructions, and change only documentation, project instructions, or documentation skills unless the user also authorizes code edits.
5. **Explain** - use exact paths, exported functions/types, command names, source-to-output relationships, and clear diagrams. Explain limitations and distinguish source data from display labels. Preserve identifiers, units, scenario definitions, populations, missing values, and GIS integrity.
6. **Validate** - verify paths, scripts, package commands, local links, front matter when editing a skill, and Mermaid structure. Use non-destructive checks; never regenerate data merely to validate prose. Do not claim tests, browser checks, or commands ran unless they did.
7. **Report** - summarize changed docs and skill integration, validation evidence, remaining gaps, and any scope limitation. Cite files with workspace paths.

## Project documentation rules

- Keep the Dashboard guides under `Dashboard/docs/`; link them from `Dashboard/README.md` when appropriate. `Dashboard/AGENTS.md` is the local policy source.
- Update existing documentation first. The established guides include architecture, data pipeline, development, testing, deployment, internationalization, and map verification.
- Do not invent routes, functions, types, paths, metrics, scientific definitions, dependencies, browser evidence, test coverage, or GIS input availability. Confirm them in source/configuration before writing.
- Normal development uses checked-in generated data. Data regeneration is an explicit, potentially broad write; document its inputs and integrity checks, and do not run it during documentation verification.
- VI/EN support is mandatory for user-facing functionality. Document display-time localization without changing source IDs, scenario codes, or scientific meaning. Include compact mobile tooltip conventions only where relevant.
- Preserve the working tree. Do not modify `.github/`, CI/CD, application code, scientific/GIS data, or deployment state for a documentation-only task. Do not push or merge.
- Keep links relative within Markdown documents where possible. Mermaid diagrams must represent verified relationships and use valid Mermaid syntax.

## References

For Dashboard-specific code and data maintenance, read `../star-farm-maintenance/SKILL.md` relative to this skill directory. The source of truth remains `Dashboard/AGENTS.md` and current project files.
