import sys
import tempfile
import unittest
from pathlib import Path
import pandas as pd

APP_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP_DIR))
from processor import DataProcessor


class DataProcessorTests(unittest.TestCase):
    def setUp(self):
        self.processor = DataProcessor()
        self.temp_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_csv(self, filename, rows):
        path = Path(self.temp_dir.name) / filename
        pd.DataFrame(rows).to_csv(path, index=False)
        return path

    def test_merge_adds_date_awd_and_scenario_metadata(self):
        first = self.write_csv("seasonal_data_BAU-2seasons-optimistic-standard.csv", {"id_sim": [1], "year": [2026], "month": [2], "day": [19], "AWD Adoption": [1]})
        second = self.write_csv("seasonal_data_OMRH-awd-pessimistic-resource-crisis.csv", {"id_sim": [2], "year": [2026], "month": [2], "day": [20], "AWD Adoption": [0]})
        result = self.processor.process_and_merge([first, second])
        self.assertEqual(result["id"].tolist(), [1, 2])
        self.assertEqual(result["AWD Adoption"].tolist(), ["With AWD", "Without AWD"])
        self.assertEqual(result["Scenario Group"].tolist(), ["Business As Usual", "One Million Hectare Rice"])
        self.assertEqual(result["Climate Type"].tolist(), ["Mild Climate", "Severe Climate"])
        self.assertEqual(result["Resource Scenario"].tolist(), ["Normal Economy", "Resource Shortage"])
        self.assertIn("datetime", result.columns)
        self.assertNotIn("year", result.columns)
        self.assertEqual(result["Currency Ratio"].tolist(), [26300, 26300])
        self.assertEqual(list(result.columns[:29]), self.processor.OUTPUT_COLUMN_ORDER)

    def test_merge_preserves_extra_columns(self):
        source = self.write_csv("BAU-optimistic-neutral.csv", {"id_sim": [1], "Custom Metric": [9.5]})
        result = self.processor.process_and_merge([source])
        self.assertEqual(result.loc[0, "Custom Metric"], 9.5)
        self.assertTrue(pd.isna(result.loc[0, "Fertilizer Usage"]))
        self.assertIn(str(source), self.processor.last_missing_columns)
        self.assertIn("Fertilizer Usage", self.processor.last_missing_columns[str(source)])

    def test_empty_input_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "at least one"):
            self.processor.process_and_merge([])


if __name__ == "__main__":
    unittest.main()
