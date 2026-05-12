const map = window.map;

if (!map) {
  throw new Error(
    'Map is not initialized. Make sure map.js runs first and sets window.map = L.map("mapid", ...).'
  );
}

let accessibilityLayer = null;
let overlayVisible = false;
let selectedOriginLayer = null;
let reachableDestinationsLayer = null;
let reachableFromAll = null;
let legendControl = null;
let reachableInfoControl = null;
let reachableInfoState = {
  allDestinations: [],
  filteredDestinations: [],
  activeBucket: "all",
  expanded: false,
  originId: null,
  nearestIcMinutes: null
};

const TRAVEL_TIME_BUCKETS = [
  { key: "30", label: "≤ 30 min", color: "#1a9850", min: 0, max: 30 },
  { key: "60", label: "31–60 min", color: "#91cf60", min: 31, max: 60 },
  { key: "120", label: "1h-2h", color: "#d9ef8b", min: 61, max: 120 },
  { key: "180", label: "2h-3h", color: "#fee08b", min: 121, max: 180 },
  { key: "240", label: "3h-4h", color: "#fc8d59", min: 181, max: 240 },
  { key: "999", label: "> 4h", color: "#d73027", min: 241, max: Infinity },
  { key: "nodata", label: "No data", color: "#bdbdbd", min: null, max: null }
];

function getBucketByKey(key) {
  return TRAVEL_TIME_BUCKETS.find((bucket) => bucket.key === key) || null;
}

function getBucketLabel(bucket) {
  if (bucket === "all") return "All";
  return getBucketByKey(bucket)?.label ?? "All";
}

function matchesBucket(minutes, bucket) {
  if (bucket === "all") return true;
  if (minutes == null || Number.isNaN(minutes)) return false;

  const bucketDef = getBucketByKey(bucket);
  if (!bucketDef || bucketDef.key === "nodata") return false;

  return minutes >= bucketDef.min && minutes <= bucketDef.max;
}

function getTravelTimeColor(value) {
  if (value == null || Number.isNaN(value)) {
    return getBucketByKey("nodata").color;
  }

  const bucket = TRAVEL_TIME_BUCKETS.find(
    (b) => b.key !== "nodata" && value >= b.min && value <= b.max
  );

  return bucket ? bucket.color : getBucketByKey("nodata").color;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDestinations(destinations) {
  return destinations
    .map((dest) => ({
      name: dest.name || dest.stop_name || dest.destination_name || `Stop ${dest.id ?? ""}`,
      minutes: Number(dest.travel_time ?? dest.minutes ?? dest.duration ?? NaN)
    }))
    .filter((dest) => Number.isFinite(dest.minutes) && dest.name)
    .sort((a, b) => a.minutes - b.minutes);
}

function renderReachableInfo() {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const buckets = ["all", "30", "60", "120", "180", "240", "999"];
  const filtered = reachableInfoState.allDestinations.filter((dest) =>
    matchesBucket(dest.minutes, reachableInfoState.activeBucket)
  );

  reachableInfoState.filteredDestinations = filtered;

  const visibleItems = reachableInfoState.expanded
    ? filtered
    : filtered.slice(0, 10);

  const chipsHtml = buckets
    .map((bucket) => {
      const count = reachableInfoState.allDestinations.filter((dest) =>
        matchesBucket(dest.minutes, bucket)
      ).length;

      return `
        <button
          type="button"
          class="reachable-filter-chip ${reachableInfoState.activeBucket === bucket ? "active" : ""}"
          data-bucket="${bucket}"
        >
          ${getBucketLabel(bucket)} <span>${count}</span>
        </button>
      `;
    })
    .join("");

  const itemsHtml = visibleItems.length
    ? visibleItems
        .map(
          (dest) => `
            <li class="reachable-info-item">
              <span class="reachable-info-stop">${escapeHtml(dest.name)}</span>
              <span class="reachable-info-time">${dest.minutes} min</span>
            </li>
          `
        )
        .join("")
    : `<div class="reachable-info-empty-muted">No destinations in this time range.</div>`;

  const showToggle =
    filtered.length > 10
      ? `
        <button type="button" class="reachable-show-more" data-action="toggle-expand">
          ${reachableInfoState.expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      `
      : "";

  box.innerHTML = `
    <div class="reachable-info-origin">Origin ${escapeHtml(reachableInfoState.originId)}</div>
    <div class="reachable-info-count">
      ${filtered.length} destination${filtered.length === 1 ? "" : "s"}${reachableInfoState.activeBucket === "all" ? " within 4h" : ""}
    </div>

    <div class="reachable-info-filters">
      ${chipsHtml}
    </div>

    <ul class="reachable-info-list">
      ${itemsHtml}
    </ul>

    ${showToggle}
  `;

  box.querySelectorAll(".reachable-filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      reachableInfoState.activeBucket = button.dataset.bucket;
      reachableInfoState.expanded = false;
      renderReachableInfo();
    });
  });

  const toggleButton = box.querySelector('[data-action="toggle-expand"]');
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      reachableInfoState.expanded = !reachableInfoState.expanded;
      renderReachableInfo();
    });
  }
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

function dimAccessibilityLayer() {
  if (!accessibilityLayer) return;

  accessibilityLayer.eachLayer((layer) => {
    if (!layer.setStyle || !layer.feature) return;

    const t = layer.feature.properties.min_travel_time_to_ic;

    layer.setStyle({
      radius: 4,
      color: "rgba(120, 130, 150, 0.56)",
      weight: 0.3,
      fillColor: getTravelTimeColor(t),
      fillOpacity: 0.4
    });
  });
}

function resetAccessibilityLayerStyle() {
  if (!accessibilityLayer) return;

  accessibilityLayer.eachLayer((layer) => {
    if (!layer.setStyle || !layer.feature) return;

    const t = layer.feature.properties.min_travel_time_to_ic;

    layer.setStyle({
      radius: 4,
      color: "#444",
      weight: 0.4,
      fillColor: getTravelTimeColor(t),
      fillOpacity: 0.75
    });
  });
}

function ensureReachableInfoControl() {
  if (reachableInfoControl) return;

  reachableInfoControl = L.control({ position: "topleft" });

  reachableInfoControl.onAdd = function () {
    const div = L.DomUtil.create("div", "reachable-info");
    div.id = "reachable-info-box";

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.innerHTML = `
      <div class="reachable-info-title">Reachable destinations</div>
      <div class="reachable-info-empty">Click an origin</div>
    `;
    return div;
  };

  reachableInfoControl.addTo(map);
}

function updateReachableInfo(data, feature = null) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const normalized = normalizeDestinations(data.destinations || []);
  const fallbackOriginId = feature?.properties?.id ?? null;

  reachableInfoState = {
    allDestinations: normalized,
    filteredDestinations: normalized,
    activeBucket: "all",
    expanded: false,
    originId: data.origin_id ?? fallbackOriginId,
    nearestIcMinutes: data.nearest_ic_minutes ?? null
  };

  renderReachableInfo();
}
function updateReachableInfoEmpty(originId) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  reachableInfoState = {
    allDestinations: [],
    filteredDestinations: [],
    activeBucket: "all",
    expanded: false,
    originId,
    nearestIcMinutes: null
  };

  box.innerHTML = `
    <div class="reachable-info-origin">Origin ${escapeHtml(originId)}</div>
    <div class="reachable-info-empty">0 destinations</div>
    <div class="reachable-info-empty-muted">No reachable destinations within the selected limit.</div>
  `;
}

function resetReachableInfo() {
  ensureReachableInfoControl();
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  box.innerHTML = `
    <div class="reachable-info-title">Reachable destinations</div>
    <div class="reachable-info-empty">Click an origin</div>
  `;
}

function renderReachableDestinationsPanel(data, feature) {
  const panel = document.getElementById("reachable-destinations-panel");
  if (!panel) return;

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
  const res = await fetch("data/reachable_from_all.json");
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
  dimAccessibilityLayer();

  selectedOriginLayer = L.circleMarker([lat, lon], {
    radius: 10,
    color: "#ffffff",
    weight: 3,
    fillColor: "#ff8c00",
    fillOpacity: 1
  }).addTo(map);

  try {
    if (!reachableFromAll) {
      throw new Error("Reachable data not loaded");
    }

    const data = reachableFromAll[originId];

    if (!data) {
      const emptyData = { origin_id: originId, destinations: [] };
      renderReachableDestinationsPanel(emptyData, feature);
      updateReachableInfo(emptyData, feature);
      return;
    }

    reachableDestinationsLayer = L.layerGroup(
      data.destinations.map(dest =>
        L.circleMarker([dest.lat, dest.lon], {
          radius: 5,
          color: "#8b0000",
          weight: 1.5,
          fillColor: "#d73027",
          fillOpacity: 0.95
        }).bindPopup(`
          <strong>${dest.stop_name ?? dest.to_id}</strong><br/>
          Travel time: ${dest.travel_time} min
        `)
      )
    ).addTo(map);

    renderReachableDestinationsPanel(data, feature);
    updateReachableInfo(data, feature);
  } catch (error) {
    console.error("Failed to show reachable destinations:", error);
    document.getElementById("reachable-destinations-panel").innerHTML = `
      <p><strong>Origin:</strong> ${originId}</p>
      <p>Could not load saved destinations for this origin.</p>
    `;
    updateReachableInfoEmpty(originId);
  }
}

function addLegend() {
  if (legendControl) return;

  legendControl = L.control({ position: "topright" });

  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");

    const rows = TRAVEL_TIME_BUCKETS.map(
      (bucket) => `
        <div class="legend-row">
          <span class="legend-color" style="background:${bucket.color}"></span>
          ${bucket.label}
        </div>
      `
    ).join("");

    div.innerHTML = `
      <strong>Nearest IC travel time</strong>
      ${rows}
    `;
    return div;
  };

  legendControl.addTo(map);
}

async function loadAccessibilityOverlay() {
  if (accessibilityLayer) return;

  const res = await fetch("data/accessibility_overlay.geojson");
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
        Reachable destinations in 4h: ${feature.properties.n_destinations_reachable_6h ?? 0}
      `);

      layer.on("click", () => onOriginClick(feature));
    }
  });

  const bounds = accessibilityLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.05));
  }
}

async function showAccessibilityOverlay() {
  if (!accessibilityLayer) {
    await loadAccessibilityOverlay();
  }

  if (!overlayVisible) {
    accessibilityLayer.addTo(map);
    overlayVisible = true;
    addLegend();
    ensureReachableInfoControl();
    resetReachableInfo();
  }
}

function hideAccessibilityOverlay() {
  resetAccessibilityLayerStyle();

  if (accessibilityLayer && overlayVisible) {
    map.removeLayer(accessibilityLayer);
    overlayVisible = false;
  }

  clearSelection();
  map.closePopup();

  if (legendControl) {
    map.removeControl(legendControl);
    legendControl = null;
  }

  if (reachableInfoControl) {
    map.removeControl(reachableInfoControl);
    reachableInfoControl = null;
  }

  const panel = document.getElementById("reachable-destinations-panel");
  if (panel) {
    panel.innerHTML = "";
  }
}

window.showNearestICOverlay = showAccessibilityOverlay;
window.hideNearestICOverlay = hideAccessibilityOverlay;

loadReachableData()
  .then(() => {
    console.log("Reachable data loaded");
  })
  .catch(err => {
    console.error("Initialization error:", err);
  });