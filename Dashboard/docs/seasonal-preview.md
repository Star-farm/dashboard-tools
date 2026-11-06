# Seasonal analysis

All Economics, Resources, and Environment information, comparison, and farming-system pages support **Annual averages** and **By crop season** views. The scenario details page also supports seasonal analysis. The future overview uses annual analysis only. Open a supported route with `?view=seasonal` before its hash to select the seasonal view directly.

## Crop seasons and data

The project owner confirmed that source timestamps correspond to crop timing:

| Internal key | Vietnamese | US English | Source timestamp months |
| --- | --- | --- | --- |
| `early` | Đông Xuân | Winter–Spring | January–April |
| `middle` | Hè Thu | Summer–Fall | May–September |
| `late` | Thu Đông | Fall–Winter | October–December |

These windows classify timestamps rather than defining exact sowing or harvest dates. BAU 2 seasons and 1Mha have no Fall–Winter crop. BAU 3 seasons and the sustainable system have three crops in the current simulation data. Uncultivated crops display **Not grown** with absent numeric values; genuinely missing measurements display **No data**.

The same Master and combined CSV sources produce 960 groups: 24 years × 4 weather/resource combinations × (3 BAU 3-season crops + 2 BAU 2-season crops + 3 sustainable crops + 2 1Mha crops). Groups retain their scenario codes, and scenario details restrict analysis to the selected code.

## Calculations and interface

Values average nonblank records within the same system, condition, year, and crop season. Zero and negative values are preserved. ROI uses mean net income divided by mean production cost, multiplied by 100, for positive costs. AWD adoption is the share of records with AWD, expressed as a percentage.

Percentage changes use positive baselines; nonpositive baselines use absolute differences. Changes in rates use percentage points: `điểm %` in Vietnamese and `pp` in English. Color follows each metric's preferred direction, including lower costs, labor, input use, and emissions.

Crop comparison mode shows one doughnut chart per model and defaults to **All years**. Each crop has a consistent slice color; labels show actual values and units rather than shares of an annual total. Clicking a slice or its crop label selects its values. Uncultivated crops have no slices. A model with negative values shows a neutral ring and preserves its signed values in the crop labels; zeros are retained without positive slices. It averages the available yearly means separately for each scenario and crop; each year has equal weight, missing measurements are excluded, and zero and negative values are retained. Selecting an individual year shows its original crop values. The same option applies to information tables and mobile cards, which display one averaged entry per crop rather than listing every year. Across-year mode still shows a selected crop's annual trend. Click, tap, or keyboard selection exposes values. Comparison pages show the specified BAU system versus 1Mha; single-system pages show only that system. Information dashboards use the same cascading scenario filters as the annual view.

The interface omits percentiles, record counts, crop-timing rows, and the former preview methodology panel. Crop-timing ranges remain internal for source-consistency checks.

## Build and loading

`npm run data:scenarios` rebuilds separate economics, resources, environment, and combined seasonal datasets. The generated files use compact indexed rows and numeric arrays; `unpackSeasonalData` restores the typed records without rounding or dropping zeroes. It runs before development and production builds. Seasonal code and the applicable dataset load only when that view is opened. The combined dataset is used by scenario details.

Annual views retain their existing calculations. Seasonal analysis does not sum simulation replicates into annual production, establish agricultural-year boundaries, or claim improved forecast accuracy without validation against observed seasonal outcomes.
