# Dashboard user guide

[Back to README](../README.md)

## 1. Language and navigation

Choose **VI** or **EN** in the header. On the first visit, the application uses the browser's preferred language: Vietnamese if that preference is Vietnamese, otherwise English. The selection is stored in `localStorage` under `star-farm-glossary.language`.

On desktop, the header contains the STAR-FARM wordmark, navigation links, and language controls. Scrolling down hides the header; scrolling up reveals it. Topic menus open on hover or through their arrow buttons. Click the **topic name** to open that topic's exploration page.

On mobile, the menu button on the right opens the navigation panel. Tap a **v** arrow to expand a submenu, or tap an item name to open its page. Use the close button or Escape to dismiss the menu.

Breadcrumbs appear above the content, for example:

```text
Home > Economics > Overview > Information dashboard
```

Click an earlier breadcrumb to return to that level. Economics and Overview are separate pages: Economics lists topic groups, while Overview lists only the dashboards in that group.

A circular button in the lower-right corner appears after scrolling. It returns to the top of the current page without navigating elsewhere. Scrolling transitions respect the device's reduced-motion preference.

## 2. Home and general pages

| Page | URL hash | Purpose |
| --- | --- | --- |
| Home | `#home` | Read the introduction and choose Explore to scroll to the sections below |
| Glossary | `#glossary` | Search and filter bilingual definitions |
| About the future | `#future` | Select a year range and inspect three aggregate indicators |
| Scenario details | `#scenario-details` | Select a scenario to view its KPIs and analysis |

A complete link consists of the website URL followed by its hash, such as `https://your-domain.example/#glossary`. Unrecognized hashes display the 404 page.

### Glossary

Enter a Vietnamese or English keyword. Search ignores capitalization and Vietnamese accents and searches both names and definitions in both languages.

Choose a category to narrow the results; the keyword and category filters apply together. You can reverse the name sort order, clear the keyword, or reset the filters. Switching languages preserves the keyword and selected category.

### About the future

This page displays average net income, average labor intensity, and average methane emissions. The first two charts compare business as usual with 1Mha; the methane chart compares scenarios with and without AWD.

Select the first and last years within 2027–2050. Charts use straight line segments with a point for each year. Hover or tap, as supported by the chart, to inspect values. Interactive legend entries let you select a group; choose All to restore the full view.

Each chart includes its unit and analysis. The labor axis may start above zero to make differences easier to see, so read the axis labels when comparing values.

### Scenario details

Use **Choose a scenario** to select a scenario. Cards are grouped into Economics, Resources, and Environment, and the overall analysis updates with the selection.

KPI values are **averages for 2027–2050**, compared with **averages for 2016–2022**. Although the page title refers to 2050, the KPIs are not all individual values for that year.

Green and red indicate favorable and unfavorable changes according to each indicator's preferred direction. For example, higher income is favorable, while lower production cost is favorable. See [Data and calculations](DU_LIEU_VA_CACH_TINH.md).

## 3. The three topics

Economics, Resources, and Environment share the same navigation structure.

| Group | Child pages |
| --- | --- |
| Overview | Information dashboard; Comparison dashboard |
| Comparison | BAU3S vs 1Mha; BAU2S vs 1Mha; BAUSS vs 1Mha |
| Business as usual | 3 seasons; 2 seasons; Sustainable |
| One million hectares of rice | Indicators for 1Mha alone |

BAU means business as usual, 3S means three seasons, 2S means two seasons, and BAUSS identifies sustainable business as usual. These abbreviations are used in route and model names.

### Information dashboard

Use five filters: scenario group, season type, weather, resource scenario, and AWD adoption. Filters combine with AND: a row must match every active selection.

Current conditions appear at the top when they match the selected filters. Descriptive columns are left-aligned and numeric columns are right-aligned. On mobile, cards keep each label close to its value.

### Comparison dashboard

Compare aggregate business-as-usual and 1Mha values over 2027–2050. Select weather and resource conditions to change the scope. Use All or reset the filters to restore a broader view.

Economics includes income, straw value, cost, yield, and labor. Resources includes water, fertilizer, and pesticide use. Environment includes emission intensity and methane emissions.

### Annual BAU versus 1Mha comparisons

Each indicator uses one combined chart for both models:

- 1Mha uses a bold, solid line.
- BAU uses a faint, dashed line.
- Matching colors represent the same weather–resource conditions across both models.

Use the model buttons to display BAU only, 1Mha only, or both. Select a condition to isolate it, or choose All conditions to restore every condition.

Click or tap the chart to select a year. The readout below the chart displays values for that year. When the chart has keyboard focus, use the left/right arrows to change years and Home/End to select the first/last year. These comparison pages do not use sliders.

Some lines may overlap because their values are identical. A line that is not separately visible does not necessarily indicate missing data.

### Individual farming systems

The three-season, two-season, sustainable, and 1Mha pages show aggregate KPIs, overall analysis, and charts for the selected system alone. Their end-to-start KPI changes compare **2050 with 2027**, unlike the baseline used in Scenario details.

## 4. Route reference

Replace `{topic}` with `economics`, `resources`, or `environment`.

| Content | Hash |
| --- | --- |
| Topic exploration | `#{topic}-explore` |
| Overview group | `#{topic}-explore-overview` |
| Comparison group | `#{topic}-explore-comparison` |
| Business-as-usual group | `#{topic}-explore-bau` |
| Information dashboard | `#{topic}-overview` |
| Comparison dashboard | `#{topic}-comparison` |
| BAU3S versus 1Mha | `#{topic}-bau3-vs-1mha` |
| BAU2S versus 1Mha | `#{topic}-bau2-vs-1mha` |
| BAUSS versus 1Mha | `#{topic}-bauss-vs-1mha` |
| Three-season business as usual | `#{topic}-bau3` |
| Two-season business as usual | `#{topic}-bau2` |
| Sustainable business as usual | `#{topic}-bauss` |
| One million hectares of rice | `#{topic}-1mha` |

For example, `#resources-bau2-vs-1mha` opens the resource comparison between two-season business as usual and 1Mha.

## 5. Interpreting results in context

These are scenario results from model data, not guarantees of a household's actual yield or income. Compare values using the same units, time range, and filter conditions. Pages use different baselines; read the comparison label beside each KPI before interpreting it.

Differences between BAU and 1Mha reflect the modeled package of practices and conditions. Do not attribute the entire difference to AWD alone. Lower labor hours or input quantities should also be evaluated alongside yield and income.
