"""CSV merging and enrichment logic for the desktop application."""

from pathlib import Path
import pandas as pd


class DataProcessor:
    FIXED_CURRENCY_RATIO = 26300
    SCENARIO_GROUP_MAP = {"BAU": "Business As Usual", "OMRH": "One Million Hectare Rice"}
    WEATHER_MAP = {"PESSIMISTIC": "Severe Climate", "OPTIMISTIC": "Mild Climate"}
    MARKET_MAP = {"RESOURCE-CRISIS": "Resource Shortage", "STANDARD": "Normal Economy", "NEUTRAL": "Neutral"}
    RENAME_MAP = {"id_sim": "id", "date": "datetime"}
    OUTPUT_COLUMN_ORDER = [
        "id", "datetime", "seed", "Fertilizer Usage", "Pesticide Usage", "Water Usage",
        "Salinity Exposure", "Max Flood Continuous", "Flood Stress", "Drought Stress",
        "Salinity Stress", "Biodiversity", "Resilient Varieties", "Water Reliability",
        "Emission Intensity", "AWD Adoption", "Methane Emissions", "Labor Intensity",
        "Profit Margin", "Currency Ratio", "Net Income", "Production Cost", "Straw Value",
        "Avg Yield", "Scenario Group", "Season Type", "Climate Type", "Resource Scenario",
        "Scenario Name",
    ]

    def __init__(self):
        self.last_missing_columns = {}

    @staticmethod
    def _translate(value, mapping):
        return mapping.get(str(value).upper(), value) if value else value

    def parse_filename_logic(self, filename):
        """Extract scenario metadata from a simulation CSV filename."""
        parts = Path(filename).stem.removeprefix("seasonal_data_").split("-")
        scenario_raw = parts[0]
        if len(parts) > 1 and any(token in parts[1].lower() for token in ("season", "awd")):
            season_raw = parts[1]
            season_type = "2 Seasons" if "awd" in season_raw.lower() else season_raw.lower().replace("seasons", " Seasons").replace("season", " Season").strip()
            climate_raw = parts[2] if len(parts) > 2 else ""
            resource_raw = "-".join(parts[3:]) if len(parts) > 3 else ""
        else:
            season_type = "2 Seasons"
            climate_raw = parts[1] if len(parts) > 1 else ""
            resource_raw = "-".join(parts[2:]) if len(parts) > 2 else ""

        values = {
            "Scenario Group": self._translate(scenario_raw, self.SCENARIO_GROUP_MAP),
            "Season Type": season_type,
            "Climate Type": self._translate(climate_raw, self.WEATHER_MAP),
            "Resource Scenario": self._translate(resource_raw, self.MARKET_MAP),
        }
        values["Scenario Name"] = " ".join(value for value in values.values() if value)
        return values

    @staticmethod
    def map_awd_column(df, column_name="AWD Adoption"):
        if column_name not in df.columns:
            return df

        def label(value):
            if pd.isna(value):
                return value
            try:
                return "With AWD" if float(value) > 0 else "Without AWD"
            except (TypeError, ValueError):
                return value

        result = df.copy()
        result[column_name] = result[column_name].map(label)
        return result

    def _reorder_columns(self, df):
        result = df.rename(columns=self.RENAME_MAP)
        normalized = {str(column).strip().lower(): column for column in result.columns}
        ordered = [normalized[name.lower()] for name in self.OUTPUT_COLUMN_ORDER if name.lower() in normalized]
        remaining = [column for column in result.columns if column not in ordered]
        return result[ordered + remaining]

    def process_file(self, file_path):
        """Read and enrich one CSV file."""
        df = pd.read_csv(file_path)
        date_parts = ["year", "month", "day"]
        if all(column in df.columns for column in date_parts):
            df["date"] = pd.to_datetime(df[date_parts], errors="raise")
            df = df.drop(columns=date_parts)
        df = self.map_awd_column(df)
        for column, value in self.parse_filename_logic(file_path).items():
            df[column] = value
        # The dashboard currently uses one fixed USD/VND conversion rate.
        df["Currency Ratio"] = self.FIXED_CURRENCY_RATIO
        return df.rename(columns=self.RENAME_MAP)

    def process_and_merge(self, file_paths):
        """Merge selected files and fail clearly if an input is invalid."""
        if not file_paths:
            raise ValueError("Please select at least one CSV file.")
        self.last_missing_columns = {}
        frames = []
        for path in file_paths:
            frame = self.process_file(path)
            missing = [column for column in self.OUTPUT_COLUMN_ORDER if column not in frame.columns]
            if missing:
                self.last_missing_columns[str(path)] = missing
            frames.append(frame)

        result = pd.concat(frames, ignore_index=True, sort=False)
        for column in self.OUTPUT_COLUMN_ORDER:
            if column not in result.columns:
                result[column] = pd.NA
        return self._reorder_columns(result)
