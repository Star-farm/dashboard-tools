# GAMA CSV Merge Tool User Guide

This desktop application merges multiple CSV files exported from GAMA into one consistent dataset for Google Sheets, BigQuery, or Looker Studio.

## Features

The application automatically:

- merges all rows from the selected CSV files;
- creates `datetime` from `year`, `month`, and `day`, then removes those three source columns;
- renames `id_sim` to `id`;
- converts numeric `AWD Adoption` values to `With AWD` or `Without AWD`;
- derives `Scenario Group`, `Season Type`, `Climate Type`, `Resource Scenario`, and `Scenario Name` from each filename;
- sets `Currency Ratio` to the fixed value `26300` for every row;
- creates missing template columns with blank values and warns the user;
- retains columns outside the standard template at the end of the output;
- exports CSV using UTF-8 with BOM for compatibility with Excel and Google Sheets.

## Requirements

- Python 3.9 or later.
- Tkinter. It is normally included with the Windows Python installer; ensure that the optional Tcl/Tk component is enabled.
- The `pandas` dependency listed in [`requirement.txt`](requirement.txt).

## Installation

Open PowerShell at the repository root and run:

```powershell
cd "Data Studio guide\App"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirement.txt
```

If PowerShell does not allow virtual-environment activation, call its Python executable directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirement.txt
.\.venv\Scripts\python.exe main.py
```

## Input Filename Convention

The application uses each filename to determine its scenario metadata. Use the following format:

```text
seasonal_data_<scenario>-<season>-<climate>-<resource>.csv
```

Examples:

```text
seasonal_data_BAU-2seasons-optimistic-standard.csv
seasonal_data_OMRH-awd-pessimistic-resource-crisis.csv
```

The currently supported mappings are:

| Component | Filename value | Output value |
|---|---|---|
| Scenario | `BAU` | `Business As Usual` |
| Scenario | `OMRH` | `One Million Hectare Rice` |
| Climate | `optimistic` | `Mild Climate` |
| Climate | `pessimistic` | `Severe Climate` |
| Resource | `standard` | `Normal Economy` |
| Resource | `resource-crisis` | `Resource Shortage` |
| Resource | `neutral` | `Neutral` |

The application can still merge files whose names do not follow this convention, but their generated scenario fields may not have the intended values.

## Running the Application

```powershell
python main.py
```

After the application window opens:

1. Select **Add CSV files**.
2. Select one or more CSV files to merge.
3. Select **Merge and enrich**.
4. Review the data preview and any missing-column warning. The preview displays at most 1,000 rows, but the exported file contains the complete dataset.
5. Select **Export CSV**.
6. Choose the output filename and location.

The **Clear** button removes the selected-file list and the current merged result.

## Output Template

The output file always contains the following 29 standard columns in this exact order:

```text
id
datetime
seed
Fertilizer Usage
Pesticide Usage
Water Usage
Salinity Exposure
Max Flood Continuous
Flood Stress
Drought Stress
Salinity Stress
Biodiversity
Resilient Varieties
Water Reliability
Emission Intensity
AWD Adoption
Methane Emissions
Labor Intensity
Profit Margin
Currency Ratio
Net Income
Production Cost
Straw Value
Avg Yield
Scenario Group
Season Type
Climate Type
Resource Scenario
Scenario Name
```

If a source file does not contain a template column:

- the application continues merging the files;
- the missing value is left blank for the affected rows;
- after merging, the application displays the source filename and its missing columns.

## Running the Tests

From the `Data Studio guide\App` directory, run:

```powershell
python -m unittest discover -s tests -v
```

The current tests cover:

- merging multiple files;
- date and `AWD Adoption` conversion;
- generating scenario metadata from filenames;
- the fixed `26300` currency ratio;
- the order of the 29 template columns;
- creating blank columns and reporting missing source columns;
- retaining additional columns outside the template.

## Directory Structure

```text
App/
├── main.py                 # Application entry point
├── gui.py                  # Tkinter user interface
├── processor.py            # CSV merge and enrichment logic
├── requirement.txt         # Python dependencies
├── main.spec               # PyInstaller configuration
└── tests/
    └── test_processor.py   # Unit tests for the CSV processor
```

## Troubleshooting

### The `python` command is not found

Install Python and enable **Add Python to PATH**, or use the full path to `python.exe`.

### The Tkinter interface does not open

Reinstall Python and ensure that the Tcl/Tk component is selected.

### Invalid date error

When a CSV contains `year`, `month`, and `day`, all three columns must contain valid date values. The application reports an error and does not produce a result if it cannot create `datetime`.

### Incorrect scenario metadata

Check that the source filename follows the convention described under **Input Filename Convention**.
