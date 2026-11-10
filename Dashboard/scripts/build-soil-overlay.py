"""Clip supplied soil GIS to the existing display map. Requires Shapely 2.x.

python scripts/build-soil-overlay.py --soil-root D:/Downloads/soil/soil
Sources are read-only. Normal website builds use the committed JSON, not Python.
"""
import argparse
import colorsys
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import struct
import zlib

from shapely import STRtree, build_area, make_valid, node, union_all
from shapely.geometry import MultiLineString, Polygon

ROOT = Path(__file__).resolve().parents[1]
PALETTE = ['#799a75', '#d6c182', '#9cadc3', '#c49972', '#9b8caa', '#81aaa4', '#b0b97c', '#c39899']
CONFIG = [
    ('soil_texture', 'soil_texture', 'Soil_Textu', 'Thành phần cơ giới đất', 'Soil texture'),
    ('flooding', 'flooding', 'DoNgap', 'Độ ngập', 'Flood depth'),
    ('active_acid_soil', 'active_acid_soil', 'Actual_ASS', 'Độ sâu phèn hoạt động', 'Active acid sulfate depth'),
    ('potential_acidsulphat_depth', 'potential_acidsulphat_depth', 'Potential_', 'Độ sâu phèn tiềm tàng', 'Potential acid sulfate depth'),
    ('landuse', 'lu_dongthap2020', 'code', 'Sử dụng đất', 'Land use'),
]

LABELS = {
    'soil_texture': {
        'Clay - Loam': ('Đất sét – thịt', 'Clay – loam soil'),
        'Loam': ('Đất thịt', 'Loam soil'),
        'Loam - Clay': ('Đất thịt – sét', 'Loam – clay soil'),
    },
    'flooding': {
        '< 0.3 m': ('Dưới 0,3 m', 'Below 0.3 m'),
        '0.3-0.6 m': ('0,3–0,6 m', '0.3–0.6 m'),
        '0.6-0.9 m': ('0,6–0,9 m', '0.6–0.9 m'),
        '> 0.9 m': ('Trên 0,9 m', 'Above 0.9 m'),
        'Khong ngap': ('Không ngập', 'No flooding'),
    },
    'active_acid_soil': {
        '< 50 cm': ('Dưới 50 cm', 'Below 50 cm'),
        '50-100 cm': ('50–100 cm', '50–100 cm'),
    },
    'potential_acidsulphat_depth': {
        '> 100 cm': ('Trên 100 cm', 'Above 100 cm'),
        '50-100 cm': ('50–100 cm', '50–100 cm'),
    },
}


def translated_label(layer_id, key):
    vi, en = LABELS[layer_id][key]
    return dict(vi=vi, en=en)


def read_attributes(path):
    raw = path.read_bytes()
    count, header, width = struct.unpack_from('<IHH', raw, 4)
    fields = []
    for offset in range(32, header - 1, 32):
        if raw[offset] == 13:
            break
        item = raw[offset:offset + 32]
        fields.append((item[:11].split(b'\0')[0].decode('ascii'), item[16]))
    rows = []
    for index in range(count):
        record = raw[header + index * width:header + (index + 1) * width]
        if record[:1] == b'*':
            rows.append(None)
            continue
        offset, row = 1, {}
        for name, size in fields:
            row[name] = record[offset:offset + size].decode('utf-8', errors='strict').strip()
            offset += size
        rows.append(row)
    return rows


def area_from_rings(rings):
    """Noded linework preserves multiple shells and nested holes (even/odd)."""
    rings = [ring for ring in rings if len(ring) >= 4]
    if not rings:
        return Polygon()
    return make_valid(build_area(node(MultiLineString(rings))))


def display_polygon(path):
    rings = []
    for coordinates in re.findall(r'M([^MZ]+)Z', path):
        rings.append([tuple(map(float, point.split(','))) for point in coordinates.split('L')])
    return area_from_rings(rings)


def read_polygons(path, transform):
    raw = path.read_bytes()
    offset = 100
    while offset < len(raw):
        _, words = struct.unpack_from('>2i', raw, offset)
        offset += 8
        record = raw[offset:offset + words * 2]
        offset += words * 2
        kind = struct.unpack_from('<i', record)[0]
        if kind == 0:
            yield Polygon()
            continue
        if kind not in (5, 15, 25):
            raise ValueError('Expected polygon shapefile')
        parts, count = struct.unpack_from('<2i', record, 36)
        starts = list(struct.unpack_from(f'<{parts}i', record, 44)) + [count]
        coordinates = [transform(x, y) for x,y in struct.iter_unpack('<2d', record[44 + parts*4:44 + parts*4 + count*16])]
        yield area_from_rings([coordinates[starts[i]:starts[i+1]] for i in range(parts)])


def polygon_parts(geometry):
    if geometry.geom_type == 'Polygon':
        if not geometry.is_empty:
            yield geometry
    elif hasattr(geometry, 'geoms'):
        for part in geometry.geoms:
            yield from polygon_parts(part)


def svg_path(geometry):
    def number(value):
        text = f'{value:.4f}'.rstrip('0').rstrip('.')
        return '0' if text == '-0' else text
    paths = []
    for polygon in polygon_parts(geometry):
        for ring in [polygon.exterior, *polygon.interiors]:
            coordinates = [f'{number(x)},{number(y)}' for x,y in ring.coords]
            paths.append('M' + 'L'.join(coordinates) + 'Z')
    return ''.join(paths)


def partition(plot, geometries, categories):
    """Conflicting categories become unknown, never arbitrary first-match data."""
    groups = defaultdict(list)
    for geometry, category in zip(geometries, categories):
        intersection = plot.intersection(geometry)
        if intersection.area > 0:
            groups[category].append(intersection)
    merged = {key: union_all(parts) for key,parts in groups.items()}
    seen, conflict = Polygon(), Polygon()
    for part in merged.values():
        conflict = conflict.union(seen.intersection(part))
        seen = seen.union(part)
    known = {key: part.difference(conflict) for key,part in merged.items()}
    return {key:part for key,part in known.items() if part.area > 1e-10}, conflict.area


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--soil-root', type=Path, required=True)
    args = parser.parse_args()
    geometry_file = ROOT/'public/map-data/geometry.json'
    raw = geometry_file.read_bytes()
    geometry = json.loads(raw)
    assert geometry['crs'] == 'EPSG:32648'
    xmin, _, _, ymax = geometry['bounds']
    scale = geometry['metersPerUnit']
    transform = lambda x,y: ((x-xmin)/scale, (ymax-y)/scale)
    plots = [display_polygon(p['path']) for p in geometry['plots']]
    output = dict(version=1, crs=geometry['crs'], geometrySha256=hashlib.sha256(raw).hexdigest(),
                  sourceGeometrySha256=geometry['sourceSha256'], geometryBasis='dashboard-display', layers=[])
    for layer_id, stem, field, vi, en in CONFIG:
        source = args.soil_root/stem
        wkt = source.with_suffix('.prj').read_text()
        assert 'UTM_Zone_48N' in wkt and 'WGS_1984' in wkt, 'Unexpected source CRS'
        rows = read_attributes(source.with_suffix('.dbf'))
        shapes = list(read_polygons(source.with_suffix('.shp'), transform))
        assert len(rows) == len(shapes)
        labels, usable, keys = {}, [], []
        for row, shape in zip(rows, shapes):
            if row is None:
                continue
            key = row[field]
            if not key or key == '-' or set(key) == {'*'} or shape.is_empty:
                continue
            if layer_id == 'landuse':
                if not row['landuse_vi'] or not row['landuse_en']:
                    continue
                label = dict(vi=row['landuse_vi'], en=row['landuse_en'])
            else:
                label = translated_label(layer_id, key)
            labels[key] = label
            usable.append(shape)
            keys.append(key)
        category_keys = sorted(labels)
        def category_color(index):
            if len(category_keys) <= len(PALETTE):
                return PALETTE[index]
            rgb = colorsys.hls_to_rgb((.25 + index*.61803398875) % 1, .49 + (index%3)*.10, .30)
            return '#' + ''.join(f'{round(value*255):02x}' for value in rgb)
        categories = [dict(id=key, label=labels[key], color=category_color(i)) for i,key in enumerate(category_keys)]
        tree = STRtree(usable)
        layer = dict(id=layer_id, title=dict(vi=vi,en=en), categories=categories, features=[], plots=[],
                     sources={suffix:hashlib.sha256(source.with_suffix(suffix).read_bytes()).hexdigest() for suffix in ('.shp','.dbf','.prj')}, conflictingAreaHa=0)
        for original, plot in zip(geometry['plots'], plots):
            indices = tree.query(plot, predicate='intersects')
            fragments, conflict = partition(plot, [usable[i] for i in indices], [keys[i] for i in indices])
            factor = scale*scale/10000
            area = plot.area*factor
            known = sum(part.area for part in fragments.values())*factor
            assert known <= area + 1e-6
            shares = []
            for key,part in sorted(fragments.items()):
                layer['features'].append(dict(plotId=original['id'],categoryId=key,path=svg_path(part)))
                shares.append(dict(categoryId=key,areaHa=round(part.area*factor,8)))
            layer['plots'].append(dict(id=original['id'],areaHa=round(area,8),knownAreaHa=round(known,8),unknownAreaHa=round(max(0,area-known),8),shares=shares))
            layer['conflictingAreaHa'] += conflict*factor
        output['layers'].append(layer)
        print(layer_id, 'fragments',len(layer['features']),'regions with data',sum(p['knownAreaHa']>0 for p in layer['plots']),flush=True)
    target = ROOT/'public/map-data/soil-overlay.json'
    encoded = json.dumps(output,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf-8')
    target.write_bytes(encoded)
    print('Wrote',len(encoded),'bytes;',len(zlib.compress(encoded)),'compressed',flush=True)


if __name__ == '__main__':
    main()
