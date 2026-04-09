let accessibilityLayer = null;

function getTravelTimeColor(value) {
  if (value == null) return "#bdbdbd";
  if (value <= 30) return "#1a9850";
  if (value <= 60) return "#91cf60";
  if (value <= 120) return "#d9ef8b";
  if (value <= 180) return "#fee08b";
  if (value <= 240) return "#fc8d59";
  return "#d73027";
}

async function loadAccessibilityOverlay(map) {
  const res = await fetch("/data/accessibility_overlay.geojson");
  const geojson = await res.json();

  accessibilityLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => {
      const t = feature.properties.min_travel_time_to_ic;
      return L.circleMarker(latlng, {
        radius: 5,
        color: "#333",
        weight: 0.5,
        fillColor: getTravelTimeColor(t),
        fillOpacity: 0.8
      });
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <strong>Origin ${p.id}</strong><br/>
        Nearest IC: ${p.min_travel_time_to_ic ?? "N/A"} min<br/>
        Reachable destinations in 6h: ${p.n_destinations_reachable_6h ?? 0}<br/>
        IC hubs within 60 min: ${p.n_ic_reachable_60 ?? 0}
      `);

      layer.on("click", () => onOriginClick(feature, map));
    }
  });

  accessibilityLayer.addTo(map);
}