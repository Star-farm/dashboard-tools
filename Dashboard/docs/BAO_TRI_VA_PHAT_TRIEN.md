# Maintenance and development

[Back to README](../README.md)

## 1. Code structure

```text
Dashboard/
  index.html                    HTML entry point and initial metadata
  package.json                  Development, build, and test commands
  vite.config.ts                Vite, relative asset base, and Vitest
  scripts/                      Node scripts that generate JSON from CSV
  src/
    main.tsx                    React initialization and ErrorBoundary
    app/                        Page shell, menus, hash routing, breadcrumbs
    components/                 Shared charts, legends, and components
    data/                       Source CSVs, catalog, and aggregated JSON
    features/
      home/                     Home page
      glossary/                 Glossary, search, and parsing
      future/                   Three aggregate time series
      scenarios/                Scenario details and KPIs
      economics/                Economics and topic exploration template
      resources/                Resource management
      environment/              Environmental indicators
    i18n/                       Shared translations, language, dynamic metadata
    styles/                     Theme, responsive layouts, and feature CSS
    utils/                      CSV parser and year tick generation
    assets/                     Source illustration, WebP variants, bundled fonts, and partner logos
  tests/                        Data, interaction, and navigation tests
  docs/                         This documentation
  dist/                         Generated build; do not edit manually
```

`App.tsx` combines the header, breadcrumbs, page content, footer, and back-to-top button. Data pages and chart libraries load separately when needed to reduce the initial home-page load.

## 2. Where to edit content

Paths below are relative to `Dashboard`.

| Change | File or directory |
| --- | --- |
| Glossary names and definitions | `src/data/indicators.csv` |
| Initial browser tab title before React loads | `index.html` |
| Tab titles and SEO descriptions after navigation/language changes | `src/i18n/index.ts`, `src/i18n/useLanguage.ts`, and topic text files |
| Home illustration overlay text, menu labels, and shared content | `src/i18n/index.ts` |
| Home page layout | `src/features/home/HomePage.tsx` |
| Home illustration | Edit `src/assets/mekong-landscape.jpg`, run `npm run images:optimize`, and commit regenerated `src/assets/hero/` files |
| Font and license | `src/assets/fonts/`; `npm run fonts:sync` refreshes the official Lora subsets |
| Header and mobile menu dialog | `src/app/SiteHeader.tsx` |
| Multilevel menu content | `src/app/HeaderNavigation.tsx`, `src/app/navigationTopics.ts` |
| Breadcrumbs | `src/app/PageBreadcrumbs.tsx` |
| Footer, links, and partner logos | `src/app/SiteFooter.tsx`, `src/assets/partners/` |
| About the future text | `src/features/future/futureText.ts` |
| Scenario detail KPIs, units, and analysis | `src/features/scenarios/scenarioText.ts`, `scenarioAnalysis.ts` |
| Economic content | `*Text.ts` and `*Analysis.ts` files in `src/features/economics/` |
| Resource/environmental content | `resourceText.ts`, `resourceAnalysis.ts`, `environmentText.ts`, and `environmentAnalysis.ts` in their feature directories |
| Units and data aggregation | The corresponding `aggregate*.ts`, `economicsData.ts`, and `comparisonData.ts` files |

The initial Vietnamese tab title, **STAR FARM | Tương lai của hạt gạo Đồng Tháp**, is in `index.html`. Translations and titles applied after React initializes are handled by i18n. Update all relevant locations to avoid displaying an outdated title during startup.

Analysis paragraphs are generated from data. Do not replace them with fixed text if they must continue to reflect the active filters and scenario.

Resources and Environment keep lightweight page shells and information tables separate from `ResourceCharts.tsx` and `EnvironmentCharts.tsx`. Chart modules are lazy-loaded inside Suspense only for chart routes. Avoid adding chart imports or full annual-series JSON to the page shells: table-only visits should load only the compact overview data. Tests should wait for visible chart content across its lazy-loading boundary before checking controls or SVG.

## 3. Routing and menus

- `src/app/usePageNavigation.ts`: maps hashes to pages, handles Back/Forward navigation, and scrolls to content.
- `src/app/exploreNavigation.ts`: distinguishes topic exploration pages from their Overview, Comparison, and Business-as-usual branches.
- `src/features/resources/resourceRoutes.ts` and `src/features/environment/environmentRoutes.ts`: page definitions for those topics.
- `src/app/App.tsx`: page component registration, lazy loading, and loading states.
- `src/app/PageBreadcrumbs.tsx`: links to ancestor pages.
- `src/i18n/useLanguage.ts`: metadata by page and language.

When adding a page, update the relevant route registrations, menus, breadcrumbs, metadata, and tests. Adding a hash link alone is insufficient: an unrecognized hash opens the 404 page.

Topic names and submenu arrows have separate click targets. Preserve that distinction: names open exploration pages, while arrows expand choices. Mobile submenu arrows use a v shape.

## 4. Theme and responsive layouts

The main variables are defined at the top of `src/styles/index.css`:

| Variable | Current value | Purpose |
| --- | --- | --- |
| `--font-family` | Lora, Georgia, serif | Shared font |
| `--forest` | `#163d30` | Header/footer and dark green surfaces |
| `--green` | `#254f3d` | Primary content color |
| `--gold` | `#e6d49a` | Navigation and branding text |
| `--gold-bright` | `#fff6cc` | Highlighted text |
| `--line` | `#dce3d9` | Dividers |

The header switches between desktop and mobile at **767px**. Tables and grids also have feature-specific breakpoints; 767px is not the only breakpoint in the interface.

| Area | CSS |
| --- | --- |
| Desktop header, gradient, and navigation spacing | `src/styles/desktop-navigation.css` |
| Mobile menu | `src/styles/mobile-navigation.css` |
| Shared multilevel menus | `src/styles/topic-navigation.css` |
| Breadcrumbs | `src/styles/page-breadcrumbs.css` |
| Page transitions and entrance effects | `src/styles/motion.css` |
| Scenario detail KPIs | `src/styles/scenarios.css` |
| Combined BAU/1Mha line charts | `src/styles/scenario-comparison-chart.css` |

Keep typography consistent, values and units readable, numeric columns right-aligned, and descriptive columns left-aligned. Check both languages because text lengths differ. Do not remove keyboard focus indicators from every button to suppress a chart's click outline; handle chart focus styling separately.

Respect `prefers-reduced-motion`. Scroll behavior is defined in `src/app/scrollBehavior.ts`, header visibility in `src/app/useHeaderScroll.ts`, and the back-to-top button in `src/app/BackToTop.tsx`.

## 5. Charts and analysis

`src/components/ScenarioComparisonChart.tsx` is shared by two-model comparisons. `src/components/ChartLegend.tsx` provides selectable legends. `src/utils/yearTicks.ts` adapts year ticks to chart width without discarding annual observations.

Preserve these conventions:

- Straight line segments and a point for each year; no curve smoothing.
- Matching conditions retain matching colors across BAU and 1Mha.
- Combined comparison charts use faint dashed BAU lines and bold solid 1Mha lines.
- Missing values remain missing; do not convert them to zero or connect across gaps.
- Selecting a year by click/tap updates the corresponding value readout.
- Analysis reflects the visible scope and conditions and distinguishes relative percentages from percentage points.

Do not apply the dashed BAU convention indiscriminately to every chart. About the future and bar charts have their own conventions in their respective components.

## 6. Testing changes

```powershell
npm test -- --run
npm run lint
npm run build
```

Choose tests appropriate to the change: `glossary.test.tsx` for glossary CSV behavior, `scenarios.test.tsx` for KPIs, `*-data.test.ts` files for aggregation, and navigation, breadcrumb, and exploration-branch tests for routing. Chart tests cover data, legends, year selection, and tick generation.

Check layouts manually on wide and narrow screens in Vietnamese and English. Exercise multilevel menus, filters, click/tap year selection, Back/Forward navigation, breadcrumbs, and back-to-top behavior. DOM tests do not replace visual checks in a browser.

When changing statistical logic, test both USD and VND sources, current conditions, missing observations, zeros, and negative values. When changing emission-intensity units, check Environment and Scenario details separately because they use different denominator units.
