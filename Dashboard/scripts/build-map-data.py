"""Prepare the supplied STAR FARM GIS/results for the static map page (stdlib only).

Usage: python scripts/build-map-data.py --model-root ".../STAR FARM"
The generated public/map-data files are committed; normal web builds need no Python
or access to the original model checkout. Plot numbers preserve shapefile order.
"""
import argparse
import collections
import csv
import hashlib
import json
import math
from pathlib import Path
import struct
import statistics


def write_json(path, value):
    path.write_text(json.dumps(value, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def prepare_currency(dashboard):
    """Use actual paired Dashboard amounts rather than its stale Currency Ratio column."""
    sources = list((dashboard / "src/data").glob("STAR_FARM*.csv"))
    master = next(path for path in sources if "Master" in path.name)
    combined = next(path for path in sources if "Master" not in path.name)
    tables = []
    for source in (master, combined):
        with source.open(encoding="utf-8-sig", newline="") as stream:
            rows = list(csv.DictReader(stream))
        table = {(row["id"], row["datetime"], row["Scenario Code"]): row for row in rows}
        assert len(table) == len(rows), "Currency source contains duplicate record keys"
        tables.append(table)
    usd, vnd = tables
    assert usd.keys() == vnd.keys(), "Currency sources have different observations"
    rates = []
    for key, row in usd.items():
        original, local = float(row["Production Cost"]), float(vnd[key]["Production Cost"])
        assert math.isfinite(original) and math.isfinite(local)
        if original > 0 and local > 0:
            rates.append(local / original)
    assert rates, "No paired costs to verify currency conversion"
    rate = round(statistics.median(rates), 6)
    assert rate > 0 and all(abs(value - rate) < .01 for value in rates), "Dashboard conversion is not uniform; prepare record-level rates instead"
    metadata = {"sourceCurrency": "USD", "displayCurrency": "VND", "vndPerUsd": rate,
                "basis": "paired-dashboard-production-costs", "matchedRecords": len(rates),
                "sourceHashes": {source.name: hashlib.sha256(source.read_bytes()).hexdigest() for source in (master, combined)},
                "currencyRatioColumn": sorted({row["Currency Ratio"] for table in tables for row in table.values()})}
    out = dashboard / "public/map-data"
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / "currency.json", metadata)
    print("Map currency: USD to VND", rate, "verified on", len(rates), "paired costs")


def simplify(points, tolerance=20):
    """Douglas-Peucker for display only; areas use the original rings."""
    if len(points) < 4:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        ax, ay = points[start]
        bx, by = points[end]
        dx, dy = bx - ax, by - ay
        length = dx * dx + dy * dy
        largest, chosen = tolerance * tolerance, None
        for i in range(start + 1, end):
            x, y = points[i]
            t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / length)) if length else 0
            distance = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2
            if distance > largest:
                largest, chosen = distance, i
        if chosen is not None:
            keep.add(chosen)
            stack.extend([(start, chosen), (chosen, end)])
    result = [points[i] for i in sorted(keep)]
    return result if len(result) >= 4 else points


def read_shapes(path):
    raw = path.read_bytes()
    xmin, ymin, xmax, ymax = struct.unpack_from("<4d", raw, 36)
    scale = 1000 / (xmax - xmin)
    height = (ymax - ymin) * scale
    def xy(point):
        return [round((point[0] - xmin) * scale, 2), round((ymax - point[1]) * scale, 2)]
    plots, offset = [], 100
    while offset < len(raw):
        number, size = struct.unpack_from(">2i", raw, offset)
        offset += 8
        record = raw[offset:offset + size * 2]
        offset += size * 2
        if struct.unpack_from("<i", record)[0] not in (5, 15, 25):
            raise ValueError("Expected a polygon for every plot")
        bounds = struct.unpack_from("<4d", record, 4)
        parts, count = struct.unpack_from("<2i", record, 36)
        starts = list(struct.unpack_from("<" + str(parts) + "i", record, 44)) + [count]
        coords = list(struct.iter_unpack("<2d", record[44 + parts * 4:44 + parts * 4 + count * 16]))
        rings = [coords[starts[i]:starts[i + 1]] for i in range(parts)]
        area = abs(sum(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:])) for ring in rings)) / 20000
        paths = []
        for ring in rings:
            reduced = [xy(point) for point in simplify(ring)]
            paths.append("M" + "L".join(f"{x},{y}" for x, y in reduced) + "Z")
        plots.append({"id": len(plots), "record": number, "areaHa": round(area, 2), "path": "".join(paths),
                      "center": xy(((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2))})
    return {"width": 1000, "height": round(height, 3), "metersPerUnit": 1 / scale,
            "crs": "EPSG:32648", "bounds": [xmin, ymin, xmax, ymax], "plots": plots,
            "sourceSha256": hashlib.sha256(raw).hexdigest()}


def read_raster(path, geometry):
    raw = path.read_bytes()
    endian = "<" if raw[:2] == b"II" else ">"
    offset = struct.unpack_from(endian + "I", raw, 4)[0]
    tags = {}
    for i in range(struct.unpack_from(endian + "H", raw, offset)[0]):
        pos = offset + 2 + 12 * i
        tag, kind, count, pointer = struct.unpack_from(endian + "HHII", raw, pos)
        fmt, size = {3: ("H", 2), 4: ("I", 4), 12: ("d", 8)}.get(kind, (None, 0))
        if fmt:
            tags[tag] = struct.unpack_from(endian + str(count) + fmt, raw, pos + 8 if count * size <= 4 else pointer)
    width, height = tags[256][0], tags[257][0]
    assert tags[259] == (1,) and tags[258] == (32,) and tags[339] == (3,)
    values = struct.unpack_from(endian + str(width * height) + "f", raw, tags[273][0])
    assert all(math.isfinite(v) and 0 <= v <= 1 for v in values)
    matrix = tags[34264]
    xmin, _, _, ymax = geometry["bounds"]
    scale = 1 / geometry["metersPerUnit"]
    return {"columns": width, "rows": height, "values": [round(v, 5) for v in values],
            "x": round((matrix[3] - xmin) * scale, 4), "y": round((ymax - matrix[7]) * scale, 4),
            "cellWidth": matrix[0] * scale, "cellHeight": -matrix[5] * scale,
            "resolutionMeters": [matrix[0], -matrix[5]]}


def aggregate_results(path, plots):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.reader(stream)
        header = next(reader)
        assert header == ["type", "id_sim", "year", "month", "day", "seed"] + [str(i) for i in range(plots)]
        runs = collections.defaultdict(dict)
        seeds = {}
        row_count = 0
        for row in reader:
            assert len(row) == len(header)
            metric, sim, year, month, day, seed = row[:6]
            assert metric in ("yield", "income")
            key = (sim, int(year), int(month), int(day))
            assert metric not in runs[key], "Duplicate plot observation"
            values = [float(value) if value.strip() else None for value in row[6:]]
            assert all(v is None or math.isfinite(v) for v in values)
            runs[key][metric] = values
            if sim in seeds:
                assert seeds[sim] == seed
            seeds[sim] = seed  # Preserve the original string; do not round large seeds.
            row_count += 1
    assert all(set(values) == {"yield", "income"} for values in runs.values())
    seasons = collections.defaultdict(list)
    for (sim, year, month, day), values in runs.items():
        seasons[(sim, year)].append((month, day, values))
    buckets = collections.defaultdict(list)
    for (_, year), records in seasons.items():
        for slot, record in enumerate(sorted(records, key=lambda r: r[:2]), 1):
            buckets[(year, slot)].append(record)
    output = []
    for (year, slot), records in sorted(buckets.items()):
        entry = {"year": year, "season": slot, "runs": len(records),
                 "dates": sorted({f"{month:02d}-{day:02d}" for month, day, _ in records})}
        for metric in ("yield", "income"):
            arrays = [record[2][metric] for record in records]
            counts = [sum(a[i] is not None for a in arrays) for i in range(plots)]
            entry[metric] = [round(sum(a[i] for a in arrays if a[i] is not None) / counts[i], 3) if counts[i] else None for i in range(plots)]
            if any(count != len(records) for count in counts):
                entry[metric + "Counts"] = counts
        output.append(entry)
    assert set(entry["year"] for entry in output) == set(range(2027, 2051))
    assert len(seeds) == 20 and all(entry["runs"] == 20 for entry in output)
    return {"records": output, "runs": len(seeds), "seeds": seeds, "sourceRows": row_count}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-root", type=Path)
    parser.add_argument("--currency-only", action="store_true", help="Refresh map conversion from Dashboard sources only")
    args = parser.parse_args()
    if not args.model_root and not args.currency_only:
        parser.error("--model-root is required unless --currency-only is used")
    prepare_currency(Path(__file__).resolve().parents[1])
    if args.currency_only:
        return
    out = Path(__file__).resolve().parents[1] / "public" / "map-data"
    out.mkdir(parents=True, exist_ok=True)
    inputs = args.model_root / "includes" / "Dong Thap"
    geometry = read_shapes(inputs / "plot_shapefile.shp")
    assert len(geometry["plots"]) == 992
    geometry["raster"] = read_raster(inputs / "salinity_vulnerability_map.tif", geometry)
    write_json(out / "geometry.json", geometry)
    manifest = {"plotCount": 992, "yearStart": 2027, "yearEnd": 2050, "scenarios": []}
    for system, prefix, season_count in [("bau3", "BAU-3seasons", 3), ("bau2", "BAU-2seasons", 2), ("bauss", "BAU-awd", 3), ("oneMha", "OMRH", 2)]:
        for climate, weather in [("mild", "Optimistic"), ("severe", "Pessimistic")]:
            for resource, market in [("normal", "Standard"), ("shortage", "Resource-Crisis")]:
                source = args.model_root / "results" / "New Dong Thap" / "season" / f"plot_yield_data_{prefix}-{weather}-{market}.csv"
                payload = aggregate_results(source, 992)
                assert len(payload["records"]) == 24 * season_count
                scenario_id = f"{system}-{climate}-{resource}"
                # Derive the Dashboard code from the actual category metadata.
                overview = json.loads((Path(__file__).resolve().parents[1] / "src/data/economics-overview.json").read_text(encoding="utf-8"))
                match = [r for r in overview if not r["historical"] and r["group"] == ("oneMha" if system == "oneMha" else "bau") and (system == "oneMha" or r["season"] == {"bau3": "threeSeasons", "bau2": "twoSeasons", "bauss": "sustainable"}[system]) and r["climate"] == climate and r["resource"] == resource]
                assert len(match) == 1, (scenario_id, match)
                code = match[0]["code"]
                payload["id"] = scenario_id
                filename = scenario_id + ".json"
                write_json(out / filename, payload)
                manifest["scenarios"].append({"id": scenario_id, "system": system, "climate": climate, "resource": resource, "code": code, "seasons": season_count, "runs": payload["runs"], "file": filename, "source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest()})
                print(scenario_id, payload["sourceRows"], "rows", (out / filename).stat().st_size, "bytes")
    write_json(out / "manifest.json", manifest)
    print("Geometry:", len(geometry["plots"]), "plots;", (out / "geometry.json").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
