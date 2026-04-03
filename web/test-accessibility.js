const map = L.map("map").setView([46.8, 8.2], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let accessibilityLayer = null;
let overlayVisible = false;
let selectedOriginLayer = null;
let reachableDestinationsLayer = null;
let reachableFromAll = null;

function getTravelTimeColor(value) {
  if (value == null || Number.isNaN(value)) return "#bdbdbd";
  if (value <= 30) return "#1a9850";
  if (value <= 60) return "#91cf60";
  if (value <= 120) return "#d9ef8b";
  if (value <= 180) return "#fee08b";
  if (value <= 240) return "#fc8d59";
  return "#d73027";
}

function clearSelection() {
  if (selectedOriginLayer) {
    map.removeLayer(selectedOriginLayer);
    selectedOriginLayer = null;
  }

  if (reachableDestinationsLayer) {
    map.removeLayer(reachableDestinationsLayer);
    reachableDestinationsLayer = null;
  }
}

function renderReachableDestinationsPanel(data, feature) {
  const panel = document.getElementById("reachable-destinations-panel");
  const [lon, lat] = feature.geometry.coordinates;

  if (!data || !data.destinations || data.destinations.length === 0) {
    panel.innerHTML = `
      <p><strong>Origin:</strong> ${feature.properties.id}</p>
      <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
      <p>No reachable destinations within 6 hours.</p>
    `;
    return;
  }

  const items = data.destinations
    .slice(0, 50)
    .map(
      (dest) => `
        <li>
          <strong>${dest.stop_name ?? dest.to_id}</strong> — ${dest.travel_time} min
        </li>
      `
    )
    .join("");

  panel.innerHTML = `
    <p><strong>Origin:</strong> ${data.origin_id}</p>
    <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
    <p><strong>Total reachable destinations within 6h:</strong> ${data.destinations.length}</p>
    <ol>${items}</ol>
  `;
}

async function loadReachableData() {
  const res = await fetch("../public/data/reachable_from_all.json");
  if (!res.ok) {
    throw new Error(`Failed to load reachable_from_all.json: HTTP ${res.status}`);
  }
  reachableFromAll = await res.json();
  console.log("Loaded reachable data for", Object.keys(reachableFromAll).length, "origins");
}

async function onOriginClick(feature) {
  const originId = String(feature.properties.id);
  const [lon, lat] = feature.geometry.coordinates;

  clearSelection();

  selectedOriginLayer = L.circleMarker([lat, lon], {
    radius: 8,
    color: "#000",
    weight: 2,
    fillColor: "#ffeb3b",
    fillOpacity: 1
  }).addTo(map);

  try {
    if (!reachableFromAll) {
      throw new Error("Reachable data not loaded");
    }

    const data = reachableFromAll[originId];

    if (!data) {
      renderReachableDestinationsPanel(
        { origin_id: originId, destinations: [] },
        feature
      );
      return;
    }

    reachableDestinationsLayer = L.layerGroup(
      data.destinations.map(dest =>
        L.circleMarker([dest.lat, dest.lon], {
          radius: 4,
          color: "#8b0000",
          weight: 1,
          fillColor: "#d73027",
          fillOpacity: 0.85
        }).bindPopup(`
          <strong>${dest.stop_name ?? dest.to_id}</strong><br/>
          Travel time: ${dest.travel_time} min
        `)
      )
    ).addTo(map);

    renderReachableDestinationsPanel(data, feature);
  } catch (error) {
    console.error("Failed to show reachable destinations:", error);
    document.getElementById("reachable-destinations-panel").innerHTML = `
      <p><strong>Origin:</strong> ${originId}</p>
      <p>Could not load saved destinations for this origin.</p>
    `;
  }
}

function addLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Nearest IC travel time</strong>
      <div class="legend-row"><span class="legend-color" style="background:#1a9850"></span>≤ 30 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#91cf60"></span>31–60 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#d9ef8b"></span>61–120 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#fee08b"></span>121–180 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#fc8d59"></span>181–240 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#d73027"></span>> 240 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };

  legend.addTo(map);
}

async function loadAccessibilityOverlay() {
  const res = await fetch("../public/data/accessibility_overlay.geojson");
  if (!res.ok) {
    throw new Error(`Failed to load accessibility_overlay.geojson: HTTP ${res.status}`);
  }

  const geojson = await res.json();

  accessibilityLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => {
      const t = feature.properties.min_travel_time_to_ic;
      return L.circleMarker(latlng, {
        radius: 4,
        color: "#444",
        weight: 0.4,
        fillColor: getTravelTimeColor(t),
        fillOpacity: 0.75
      });
    },
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <strong>Origin ${feature.properties.id}</strong><br/>
        Nearest IC: ${feature.properties.min_travel_time_to_ic ?? "N/A"} min<br/>
        Reachable destinations in 6h: ${feature.properties.n_destinations_reachable_6h ?? 0}
      `);

      layer.on("click", () => onOriginClick(feature));
    }
  });

  const bounds = accessibilityLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.05));
  }
}

function toggleAccessibilityOverlay() {
  const btn = document.getElementById("toggle-overlay-btn");

  if (!accessibilityLayer) return;

  if (overlayVisible) {
    map.removeLayer(accessibilityLayer);
    overlayVisible = false;
    btn.textContent = "Show accessibility overlay";
  } else {
    accessibilityLayer.addTo(map);
    overlayVisible = true;
    btn.textContent = "Hide accessibility overlay";
  }
}

document.getElementById("toggle-overlay-btn").addEventListener("click", toggleAccessibilityOverlay);

addLegend();

Promise.all([
  loadAccessibilityOverlay(),
  loadReachableData()
]).then(() => {
  console.log("Overlay and reachable data loaded");
}).catch(err => {
  console.error("Initialization error:", err);
});