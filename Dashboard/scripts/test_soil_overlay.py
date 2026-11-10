"""Geometry regression checks: python -m unittest discover -s scripts -p test_soil_overlay.py"""
import unittest
import importlib.util
from pathlib import Path

from shapely.geometry import box
spec = importlib.util.spec_from_file_location('soil_builder', Path(__file__).with_name('build-soil-overlay.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
area_from_rings, display_polygon, partition, svg_path = (getattr(builder, name) for name in ('area_from_rings', 'display_polygon', 'partition', 'svg_path'))


class SoilOverlayTests(unittest.TestCase):
    def test_nested_hole_and_disjoint_shells_are_not_filled(self):
        rings = [list(box(0,0,10,10).exterior.coords), list(box(2,2,4,4).exterior.coords), list(box(20,0,22,2).exterior.coords)]
        self.assertAlmostEqual(area_from_rings(rings).area, 100)

    def test_partial_coverage_preserves_unknown_and_does_not_snap(self):
        plot = box(0,0,10,10)
        known, conflict = partition(plot, [box(-5,0,5,10), box(11,0,15,10)], ['clay','loam'])
        self.assertEqual(set(known), {'clay'})
        self.assertAlmostEqual(known['clay'].area, 50)
        self.assertAlmostEqual(plot.difference(known['clay']).area, 50)
        self.assertEqual(conflict, 0)

    def test_different_overlapping_classes_are_unknown(self):
        plot = box(0,0,10,10)
        known, conflict = partition(plot, [box(0,0,7,10),box(5,0,10,10)], ['a','b'])
        self.assertAlmostEqual(conflict, 20)
        self.assertAlmostEqual(sum(p.area for p in known.values()), 80)
        self.assertTrue(known['a'].disjoint(known['b']) or known['a'].intersection(known['b']).area == 0)

    def test_duplicate_same_class_does_not_double_count(self):
        known, conflict = partition(box(0,0,10,10), [box(0,0,7,10),box(5,0,10,10)], ['a','a'])
        self.assertAlmostEqual(known['a'].area, 100)
        self.assertEqual(conflict, 0)

    def test_svg_round_trip_preserves_holes(self):
        polygon = box(0,0,10,10).difference(box(2,2,4,4))
        rebuilt = display_polygon(svg_path(polygon))
        self.assertAlmostEqual(rebuilt.area, 96)
        self.assertAlmostEqual(rebuilt.symmetric_difference(polygon).area, 0)


if __name__ == '__main__':
    unittest.main()
