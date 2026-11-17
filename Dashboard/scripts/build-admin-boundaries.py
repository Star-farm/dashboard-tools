"""Prepare local EPSG:32648 GeoJSON from selected GitHub admin units."""
import json
import math
import sys
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.ops import transform

SOURCE_ROOT = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
PROVINCES = {
    "79": "79_ho_chi_minh", "80": "80_tay_ninh", "82": "82_dong_thap",
    "86": "86_vinh_long", "91": "91_an_giang", "92": "92_can_tho",
}
A, E2, K0, LON0 = 6378137.0, 0.00669437999014, 0.9996, math.radians(105.0)
EP2 = E2 / (1 - E2)
PROVINCE_LABELS = {
    "79": ("Thành phố Hồ Chí Minh", "Ho Chi Minh City"),
}


def project(lon, lat, z=None):
    """WGS84 longitude/latitude to UTM zone 48N (EPSG:32648)."""
    lon, lat = math.radians(lon), math.radians(lat)
    n = A / math.sqrt(1 - E2 * math.sin(lat) ** 2)
    t, c = math.tan(lat) ** 2, EP2 * math.cos(lat) ** 2
    aa = math.cos(lat) * (lon - LON0)
    m = A * ((1 - E2 / 4 - 3 * E2**2 / 64 - 5 * E2**3 / 256) * lat
        - (3 * E2 / 8 + 3 * E2**2 / 32 + 45 * E2**3 / 1024) * math.sin(2 * lat)
        + (15 * E2**2 / 256 + 45 * E2**3 / 1024) * math.sin(4 * lat)
        - (35 * E2**3 / 3072) * math.sin(6 * lat))
    x = K0 * n * (aa + (1 - t + c) * aa**3 / 6
        + (5 - 18 * t + t**2 + 72 * c - 58 * EP2) * aa**5 / 120) + 500000
    y = K0 * (m + n * math.tan(lat) * (aa**2 / 2
        + (5 - t + 9 * c + 4 * c**2) * aa**4 / 24
        + (61 - 58 * t + t**2 + 600 * c - 330 * EP2) * aa**6 / 720))
    return (x, y) if z is None else (x, y, z)


def source_feature(file):
    return json.loads(file.read_text(encoding="utf-8"))["features"][0]


features = []
dong_thap_folder = PROVINCES["82"]
dong_thap_source = source_feature(SOURCE_ROOT / "json" / "geojson" / dong_thap_folder / f"{dong_thap_folder}.geojson")
dong_thap_geometry = transform(project, shape(dong_thap_source["geometry"])).simplify(100, preserve_topology=True)
focus_bounds = list(dong_thap_geometry.bounds)
for code, folder in PROVINCES.items():
    province_file = SOURCE_ROOT / "json" / "geojson" / folder / f"{folder}.geojson"
    source = source_feature(province_file)
    props = source["properties"]
    province_name = props.get("name") or props.get("fullName") or folder
    province_name_en = props.get("nameEn", province_name)
    province_geometry = transform(project, shape(source["geometry"])).simplify(100, preserve_topology=True)
    if code == "82":
        province_geometry = dong_thap_geometry
    province_center = province_geometry.representative_point()
    label_name, label_name_en = PROVINCE_LABELS.get(code, (province_name, province_name_en))
    features.append({"type": "Feature", "properties": {
        "code": code, "name": label_name, "fullName": label_name,
        "nameEn": label_name_en, "provinceCode": code,
        "provinceName": label_name, "kind": "province", "center": list(province_center.coords[0]),
    }, "geometry": mapping(province_geometry)})

    if code != "82":
        continue
    ward_dir = SOURCE_ROOT / "json" / "geojson" / folder / "wards"
    for ward_file in sorted(ward_dir.glob("*.geojson")):
        ward = source_feature(ward_file)
        ward_props = ward["properties"]
        geometry = transform(project, shape(ward["geometry"])).simplify(70, preserve_topology=True)
        ward_center = geometry.representative_point()
        features.append({"type": "Feature", "properties": {
            "code": str(ward_props.get("code", ward.get("id", ward_file.stem.split("_")[0]))),
            "name": ward_props.get("name", ward_file.stem),
            "fullName": ward_props.get("fullName", ward_props.get("name", ward_file.stem)),
            "nameEn": ward_props.get("nameEn", ward_props.get("name", ward_file.stem)),
            "provinceCode": code, "provinceName": province_name, "kind": "ward",
            "center": list(ward_center.coords[0]),
        }, "geometry": mapping(geometry)})

all_bounds = [shape(feature["geometry"]).bounds for feature in features]
bounds = [min(b[0] for b in all_bounds), min(b[1] for b in all_bounds), max(b[2] for b in all_bounds), max(b[3] for b in all_bounds)]
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps({
    "type": "FeatureCollection", "name": "Dong Thap and neighboring provincial boundaries",
    "projection": "EPSG:32648", "bounds": bounds, "focusBounds": focus_bounds,
    "source": "https://github.com/thanglequoc/vietnamese-provinces-database/tree/master/json/geojson",
    "sourceTreeSha": "8b78ba5118715e1fa81769286724db79346abf52",
    "features": features,
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(features)} features to {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
