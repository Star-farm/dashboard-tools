# Internationalization

The Dashboard supports Vietnamese (`vi`) and English (`en`). `src/i18n/index.ts` defines the `Language` type, core interface dictionary, initial-language detection, and glossary category labels. `src/i18n/useLanguage.ts` owns the selected language, persists it when browser storage is available, and updates the document language, page title, and description. The app passes the current language to feature pages so switching updates the mounted interface without reloading.

## Add or change interface text

1. Put shell-wide text in `src/i18n/index.ts`. Keep feature-only text in that feature's `*Text.ts` dictionary.
2. Add the same key to both locale dictionaries in one change. Feature dictionaries type English keys from Vietnamese with `Record<keyof typeof vi, string>`; keep that check. The core dictionary and special label maps are also covered by `tests/i18n-coverage.test.ts`.
3. Render text through the selected locale dictionary or an existing locale-aware helper. Keep accessible names, titles, placeholders, empty states, failures, loading messages, chart labels, and responsive labels localized too.
4. Use `Intl.NumberFormat(language, ...)` for language-sensitive number formatting. Keep underlying values and calculations unchanged. Translate unit words where needed, while retaining conventional symbols and units such as `%`, `mm`, and `ha`.
5. Add or update a behavior test for the affected text and language switch. Run `npm run test:run -- tests/i18n-coverage.test.ts tests/language.test.tsx` and the affected feature test. For browser-visible changes, verify both languages at the affected routes and viewport sizes with `npm run e2e`.

Do not add a silent cross-language fallback. Missing or empty translations should fail type checks or the local coverage test and be fixed at their definition.

## Dataset-derived labels

Keep identifiers and source values separate from display labels. Add a display mapping keyed by the stable internal value, or store a bilingual display name alongside the identifier when the data contract already supports it. Select the label with the current `Language` at render time. Do not rewrite CSVs, generated JSON, GIS category IDs, scenario codes, or map feature IDs to translate a label.

Examples include `categoryLabels` for glossary categories, `scenarioMetricLabels` for scenario metric IDs, `seasonalText` for crop-period codes, bilingual scenario names in `scenario-details.json`, and bilingual soil category labels in the soil GIS assets. Chart legends, axes, tooltips, filters, map controls, and popups must use these display mappings instead of printing internal keys. Check `tests/i18n-coverage.test.ts`, `tests/soil-data.test.ts`, and feature tests when adding a new data-derived label family.

## Language-specific conventions and exceptions

- Keep official names such as STAR-FARM and Dong Thap as proper nouns. Preserve scenario IDs, URL hashes, metric IDs, map IDs, and category codes as identifiers.
- Preserve established terms and abbreviations where they are part of the model vocabulary, including BAU, AWD, and 1Mha. Compact mobile chart tooltips intentionally use `BAU`; mobile chart layouts also hide units where space is limited.
- Keep scientific notation and conventional symbols intact, including chemical formulas, percentages, currency codes, coordinate references, and units. Translate surrounding explanatory words when they are user-facing.
- CSV column names and machine-readable codes are not interface copy unless surfaced to users. When shown in a chart, table, selector, legend, or popup, provide a localized display label.
- Glossary term names and definitions are bilingual source content. Do not substitute one locale's definition for the other.

## Regression checks

`tests/i18n-coverage.test.ts` checks locale key parity, nonempty entries, glossary categories, scenario metric labels, and seasonal code labels. `tests/language.test.tsx` checks language selection, immediate switching, and translated navigation and error states. `tests/display-language.test.ts` checks language-sensitive units and notation. GIS labels are checked as bilingual data and validated with the soil data tests. Playwright exercises all routed pages in both languages at 320, 375, 390, 430, 768, 1024, and 1440 pixels, including live language switching and responsive overflow.
