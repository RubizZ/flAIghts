import json
import math
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.join(script_dir, "..", "public")

input_file = os.path.join(base_dir, "ne_110m_countries.geojson")
output_file = os.path.join(base_dir, "country_labels.json")

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

def get_coords(geom):
    if geom['type'] == 'Point':
        return [geom['coordinates']]
    elif geom['type'] == 'LineString' or geom['type'] == 'MultiPoint':
        return geom['coordinates']
    elif geom['type'] == 'Polygon' or geom['type'] == 'MultiLineString':
        coords = []
        for poly in geom['coordinates']:
            coords.extend(poly)
        return coords
    elif geom['type'] == 'MultiPolygon':
        coords = []
        for multi in geom['coordinates']:
            for poly in multi:
                coords.extend(poly)
        return coords
    return []

labels = []
for feature in data['features']:
    props = feature['properties']
    name = props.get('NAME_ES') or props.get('NAME')
    lat = props.get('LABEL_Y')
    lon = props.get('LABEL_X')
    iso = props.get('ISO_A2')
    
    geom = feature['geometry']
    coords = get_coords(geom)
    
    if not coords: continue
    
    lats = [c[1] for c in coords if len(c) >= 2]
    lons = [c[0] for c in coords if len(c) >= 2]
    
    if not lats or not lons: continue
    
    d_lat = max(lats) - min(lats)
    d_lon = max(lons) - min(lons)
    if d_lon > 180: d_lon = 360 - d_lon
    
    # size rank: larger means bigger country
    size = math.sqrt(d_lat**2 + d_lon**2)
    # Scale: Base 0.5 for small countries, up to 1.5 for huge ones
    scale = 0.5 + (min(1.0, size / 20.0)) 
    
    # Specific adjustments if name is very long but country is small
    if len(name) > 10 and size < 5:
        scale *= 0.7

    if name and lat is not None and lon is not None:
        labels.append({
            "iso": iso,
            "name": name, # Default name (fallback)
            "lat": lat,
            "lon": lon,
            "scale": round(scale, 2)
        })

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(labels, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(labels)} labels.")
