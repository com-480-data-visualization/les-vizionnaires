"""
Generate nearestIC datasets from the 2000m grid travel-time runs.

This script reads the parquet files and prepares the frontend data.

For each combination of:
- day type: weekday or weekend
- departure time: 09:00, 12:00, 17:00, 22:00
- maximum travel time: 30 to 240 minutes

it creates two files:
- `accessibility.geojson`, with one feature per grid cell and its accessibility data
- `reachable.json`, with the IC stations reachable from each origin cell

The generated files are written to:

`docs/data/nearestIC/{dayType}/{hour}/{maxTime}/`

This layout lets the frontend load only the dataset that matches the user's
current filters.

Run from the repository root with:
`python3 scripts/build_nearestic_2000m.py`
"""

import json
import math
from pathlib import Path

import pandas as pd
from shapely import wkb

ROOT = Path(__file__).resolve().parent.parent
OUTPUTS = ROOT / "outputs"
DATA = ROOT / "docs" / "data"

DEPARTURES = ["0900", "1200", "1700", "2200"]
MAX_TIMES = ["030min", "060min", "090min", "120min", "150min", "180min", "210min", "240min"]
DAY_TYPES = ["weekday", "weekend"]  #weekday for Friday and weekend for Saturday

IC_MAX_TIME = "240min"


def lonlat(geometry_wkb):
    """The parquet geometry is already stored as EPSG:4326 (lon/lat) WKB."""
    point = wkb.loads(bytes(geometry_wkb))
    return point.x, point.y


def clean(value):
    """JSON-safe scalar: NaN/NaT -> None."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def build_accessibility_geojson(day_type, departure, max_time):
    """Build accessibility geojson for a specific day type, departure time, and max travel time."""
    if day_type == "weekend":
        parquet_file = OUTPUTS / f"saturday_accessibility_summary_saturday_2000m_departure_{departure}_max_{max_time}.parquet"
    else:
        parquet_file = OUTPUTS / f"accessibility_summary_2000m_departure_{departure}_max_{max_time}.parquet"
    
    if not parquet_file.exists():
        return 0
    
    summary = pd.read_parquet(parquet_file)
    features = []
    
    for row in summary.itertuples(index=False):
        lon, lat = lonlat(row.geometry)
        mt = row.min_travel_time_to_ic
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(row.id),
                "GDENAME": clean(row.GDENAME),
                "KTNAME": clean(row.KTNAME),
                "KTKZ": clean(row.KTKZ),
                "min_travel_time_to_ic": None if pd.isna(mt) else round(float(mt)),
                "n_destinations_reachable": int(getattr(row, f"n_destinations_reachable_{max_time}", 0)),
            },
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
        })
    
    out_dir = DATA / "nearestIC" / day_type / departure / max_time
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "accessibility.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    
    return len(features)


def build_reachable_index(day_type, departure, max_time):
    """Build reachable destinations index for a specific day type, departure time, and max travel time."""
    if day_type == "weekend":
        od_parquet = OUTPUTS / f"saturday_od_pairs_saturday_2000m_departure_{departure}_max_{IC_MAX_TIME}.parquet"
        ic_parquet = OUTPUTS / "saturday_ic_stations.parquet"
    else:
        od_parquet = OUTPUTS / f"od_pairs_2000m_departure_{departure}_max_{IC_MAX_TIME}.parquet"
        ic_parquet = OUTPUTS / "ic_stations.parquet"
    
    if not od_parquet.exists() or not ic_parquet.exists():
        return 0
    
    ic = pd.read_parquet(ic_parquet)
    stops = {}
    for row in ic.itertuples(index=False):
        lon, lat = lonlat(row.geometry)
        entry = {"name": clean(row.stop_name), "lat": round(lat, 6), "lon": round(lon, 6)}
        stops[str(row.stop_id)] = entry
        stops[str(row.id)] = entry  

    od = pd.read_parquet(od_parquet)
    origins = {}
    
    # Convert max_time string to integer minutes for filtering
    max_minutes = int(max_time.split("min")[0])
    
    for row in od.itertuples(index=False):
        to_id = str(row.to_id)
        travel_time = float(row.travel_time)
        
        # Only include destinations within the max travel time for this specific file
        if travel_time > max_minutes:
            continue
            
        if to_id not in stops:
            continue
        origins.setdefault(str(row.from_id), []).append([to_id, round(travel_time)])

    for pairs in origins.values():
        pairs.sort(key=lambda pair: pair[1])

    # Keep only the stops actually referenced
    used = {to_id for pairs in origins.values() for to_id, _ in pairs}
    stops = {sid: stops[sid] for sid in used}

    out_dir = DATA / "nearestIC" / day_type / departure / max_time
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "reachable.json"
    out.write_text(json.dumps({"stops": stops, "origins": origins}))
    
    return len(origins)


if __name__ == "__main__":
    print("Building nearestIC datasets for all day/hour/maxTime combinations...\n")
    
    total_features = 0
    total_origins = 0
    
    for day_type in DAY_TYPES:
        print(f"\n{day_type.upper()}:")
        for departure in DEPARTURES:
            print(f"  {departure}:")
            for max_time in MAX_TIMES:
                # Build accessibility data for this max_time
                features = build_accessibility_geojson(day_type, departure, max_time)
                if features > 0:
                    print(f"    ✓ {max_time} accessibility: {features} grid cells")
                    total_features += features
                
                # Build reachable destinations index
                origins = build_reachable_index(day_type, departure, max_time)
                if origins > 0:
                    print(f"    ✓ {max_time} reachable: {origins} origins")
                    total_origins += origins
    
    print(f"\n✓ Complete! Generated {total_features} feature sets and {total_origins} origin sets")
    print(f"  Output organized in docs/data/nearestIC/{{weekday,weekend}}/{{hour}}/{{maxTime}}/")


