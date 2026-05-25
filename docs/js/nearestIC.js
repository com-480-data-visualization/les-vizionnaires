const map = window.map;

if (!map) {
  throw new Error(
    'Map is not initialized. Make sure map.js runs first and sets window.map = L.map("mapid", ...).'
  );
}

let accessibilityLayer = null;
let accessibilityFeatures = [];
let accessibilityBounds = null;
let accessibilityDimmed = false;
let currentHexRes = null;
let overlayVisible = false;
let selectedOriginLayer = null;
let reachableDestinationsLayer = null;
let reachableFromAll = null;
let legendControl = null;
let reachableInfoControl = null;
let selectedOriginFeature = null; // Track currently selected origin
let currentState = {
  dayType: "weekday",
  departureTime: "09:00",
  maxTravelTime: 240
};
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

// Map maxTravelTime values to directory names (e.g., 30 -> "030min")
const MAX_TIME_MAP = {
  30: "030min",
  60: "060min",
  90: "090min",
  120: "120min",
  150: "150min",
  180: "180min",
  210: "210min",
  240: "240min"
};

function formatMaxTimeForPath(minutes) {
  return MAX_TIME_MAP[minutes] || "240min";
}

function formatMaxTimeForDisplay(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

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

function normalizeDestinations(destinations, maxTravelTime = Infinity) {
  return destinations
    .map((dest) => ({
      name: dest.name || dest.stop_name || dest.destination_name || `Stop ${dest.id ?? ""}`,
      minutes: Number(dest.travel_time ?? dest.minutes ?? dest.duration ?? NaN)
    }))
    .filter((dest) => Number.isFinite(dest.minutes) && dest.name && dest.minutes <= maxTravelTime)
    .sort((a, b) => a.minutes - b.minutes);
}

function renderReachableInfo() {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  // Filter buckets to only show those <= maxTravelTime
  const allBuckets = ["all", "30", "60", "120", "180", "240", "999"];
  const buckets = allBuckets.filter((bucket) => {
    if (bucket === "all") return true;
    const bucketDef = getBucketByKey(bucket);
    return bucketDef && bucketDef.min < currentState.maxTravelTime;
  });

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
      ${filtered.length} destination${filtered.length === 1 ? "" : "s"}${reachableInfoState.activeBucket === "all" ? ` within ${formatMaxTimeForDisplay(currentState.maxTravelTime)}` : ""}
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
  
  selectedOriginFeature = null;
}

// --- Hexagonal binning -----------------------------------------------------

// Map a Leaflet zoom level to an H3 resolution. Coarse hexagons when zoomed
// out, finer ones when zoomed in (re-binned on zoom, like isochrone.ch).
// Capped at H3 res 7: on the dense 2000m grid the cells stay a single
// contiguous block up to res 7 (its ~180 interior holes are closed by
// fillHexGaps). Res 8 leaves the grid disconnected, which reintroduces gaps.
// Beyond zoom 10 the res-7 hexagons simply scale up.
function resForZoom(zoom) {
  if (zoom <= 6) return 4;
  if (zoom <= 7) return 5;
  if (zoom <= 9) return 6;
  return 7;
}

// Shared canvas renderer — keeps the gap-filled grid (thousands of polygons)
// fast to draw and pan.
const hexRenderer = L.canvas({ padding: 0.5 });

// Mean nearest-IC travel time across the municipalities in one hexagon.
function aggregateValue(features) {
  const values = features
    .map((f) => f.properties.min_travel_time_to_ic)
    .filter((v) => v != null)
    .map(Number)
    .filter((v) => Number.isFinite(v));

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function hexStyle(value, dimmed) {
  return {
    color: "#ffffff",
    weight: 1,
    fillColor: getTravelTimeColor(value),
    fillOpacity: dimmed ? 0.2 : 0.7,
    opacity: dimmed ? 0.35 : 0.65
  };
}

// Pick the municipality whose point is closest to where the hexagon was clicked.
function nearestFeature(features, latlng) {
  let best = null;
  let bestDist = Infinity;

  features.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const dist = map.distance(latlng, L.latLng(lat, lon));
    if (dist < bestDist) {
      bestDist = dist;
      best = feature;
    }
  });

  return best;
}

// Fill every empty cell enclosed by the data footprint so the rendered
// hexagon surface is gap-free at any zoom. Gap cells get a value interpolated
// from their neighbours; cells outside the footprint are left untouched.
function fillHexGaps(cells, res) {
  const filled = Array.from(cells.keys());
  if (filled.length < 3) return;

  // Outer boundary polygon(s) of the binned region.
  h3.cellsToMultiPolygon(filled, false).forEach((polygon) => {
    const outer = polygon[0]; // outer ring, [[lat, lng], ...]
    if (!outer || outer.length < 3) return;

    // Every cell whose centre falls inside the footprint hull — this fills
    // the interior holes without extending past the data.
    h3.polygonToCells([outer], res).forEach((cell) => {
      if (!cells.has(cell)) {
        cells.set(cell, { features: [], value: null, interpolated: true });
      }
    });
  });

  // Propagate values into the gap cells, ring by ring, so they blend in.
  let pending = [];
  cells.forEach((entry, cell) => {
    if (entry.interpolated && entry.value == null) pending.push(cell);
  });

  let guard = 0;
  while (pending.length && guard++ < 40) {
    const stillPending = [];
    pending.forEach((cell) => {
      const neighbourValues = h3.gridDisk(cell, 1)
        .filter((nb) => nb !== cell && cells.has(nb) && cells.get(nb).value != null)
        .map((nb) => cells.get(nb).value);

      if (neighbourValues.length) {
        cells.get(cell).value =
          neighbourValues.reduce((sum, v) => sum + v, 0) / neighbourValues.length;
      } else {
        stillPending.push(cell);
      }
    });
    if (stillPending.length === pending.length) break; // no progress
    pending = stillPending;
  }
}

// Bin municipalities into H3 cells, fill interior gaps, and render one polygon
// per cell so the surface is continuous at every zoom level.
function buildHexLayer() {
  if (typeof h3 === "undefined") {
    console.error("h3-js is not loaded — cannot build hexagonal bins.");
    return;
  }

  const res = resForZoom(map.getZoom());
  currentHexRes = res;

  if (accessibilityLayer) {
    map.removeLayer(accessibilityLayer);
    accessibilityLayer = null;
  }

  // 1. Bin each municipality point into an H3 cell.
  const cells = new Map(); // h3 index -> { features, value, interpolated }
  accessibilityFeatures.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const cell = h3.latLngToCell(lat, lon, res);
    if (!cells.has(cell)) {
      cells.set(cell, { features: [], value: null, interpolated: false });
    }
    cells.get(cell).features.push(feature);
  });
  cells.forEach((entry) => {
    entry.value = aggregateValue(entry.features);
  });

  // 2. Fill the interior holes so there are no gaps between hexagons.
  fillHexGaps(cells, res);

  // 3. Render one polygon per cell.
  const hexagons = [];
  cells.forEach((entry, cell) => {
    const boundary = h3.cellToBoundary(cell); // [[lat, lng], ...]
    const polygon = L.polygon(boundary, {
      ...hexStyle(entry.value, accessibilityDimmed),
      renderer: hexRenderer
    });

    polygon._hexValue = entry.value;
    polygon._hexFeatures = entry.features;

    const count = entry.features.length;
    const valueText = entry.value == null ? "N/A" : `${Math.round(entry.value)} min`;
    polygon.bindPopup(
      entry.interpolated
        ? `<strong>No municipality in this cell</strong><br/>
           Estimated nearest IC: ${valueText}<br/>
           <em>Click to select the nearest origin</em>`
        : `<strong>${count} municipalit${count === 1 ? "y" : "ies"} in this area</strong><br/>
           Avg nearest IC: ${valueText}<br/>
           <em>Click to select the nearest origin</em>`
    );

    polygon.on("click", (event) => {
      const pool = entry.features.length ? entry.features : accessibilityFeatures;
      const origin = nearestFeature(pool, event.latlng);
      if (origin) onOriginClick(origin);
    });

    hexagons.push(polygon);
  });

  accessibilityLayer = L.featureGroup(hexagons);

  if (overlayVisible) {
    accessibilityLayer.addTo(map);
  }
}

function handleHexZoom() {
  if (!overlayVisible) return;
  if (resForZoom(map.getZoom()) === currentHexRes) return;
  buildHexLayer();
}

function applyHexStyle() {
  if (!accessibilityLayer) return;

  accessibilityLayer.eachLayer((layer) => {
    if (layer.setStyle) {
      layer.setStyle(hexStyle(layer._hexValue, accessibilityDimmed));
    }
  });
}

function dimAccessibilityLayer() {
  accessibilityDimmed = true;
  applyHexStyle();
}

function resetAccessibilityLayerStyle() {
  accessibilityDimmed = false;
  applyHexStyle();
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

function updateReachableInfo(data, feature = null, maxTravelTime = 240) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const normalized = normalizeDestinations(data.destinations || [], maxTravelTime);
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
      <p>No reachable destinations within 4 hours.</p>
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
async function loadReachableData(dayType, departureHour, maxTravelTime) {
  // Convert 09:00 format to 0900 format
  const hour = departureHour.replace(":", "");
  const maxTimeStr = formatMaxTimeForPath(maxTravelTime);
  const path = `data/nearestIC/${dayType}/${hour}/${maxTimeStr}/reachable.json`;
  
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.warn(`Failed to load reachable data from ${path}: HTTP ${res.status}`);
      reachableFromAll = {};
      return;
    }

    const { stops, origins } = await res.json();

    // Expand the compact index { originId: [[stopId, minutes], ...] } into the
    // { originId: { origin_id, destinations:[{to_id,stop_name,travel_time,lat,lon}] } }
    // shape the rest of this module expects.
    reachableFromAll = {};
    Object.entries(origins).forEach(([originId, pairs]) => {
      reachableFromAll[originId] = {
        origin_id: originId,
        destinations: pairs.map(([toId, minutes]) => {
          const stop = stops[toId] || {};
          return {
            to_id: toId,
            stop_name: stop.name ?? toId,
            travel_time: minutes,
            lat: stop.lat,
            lon: stop.lon
          };
        })
      };
    });
  } catch (error) {
    console.error(`Error loading reachable data for ${dayType}/${hour}/${maxTimeStr}:`, error);
    reachableFromAll = {};
  }
}

async function onOriginClick(feature) {
  const originId = String(feature.properties.id);
  
  // If an origin is already selected, clear it and return to initial state
  if (selectedOriginFeature) {
    clearSelection();
    resetAccessibilityLayerStyle();
    resetReachableInfo();
    map.closePopup();
    return;
  }
  
  const [lon, lat] = feature.geometry.coordinates;

  clearSelection();
  selectedOriginFeature = feature; // Save the selected origin
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
      updateReachableInfo(emptyData, feature, currentState.maxTravelTime);
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
    updateReachableInfo(data, feature, currentState.maxTravelTime);
  } catch (error) {
    console.error("Failed to show reachable destinations:", error);
    document.getElementById("reachable-destinations-panel").innerHTML = `
      <p><strong>Origin:</strong> ${originId}</p>
      <p>Could not load saved destinations for this origin.</p>
    `;
    updateReachableInfoEmpty(originId);
  }
}

function updateSelectedOriginDisplay() {
  if (!selectedOriginFeature) return;
  
  const originId = String(selectedOriginFeature.properties.id);
  
  try {
    if (!reachableFromAll) {
      throw new Error("Reachable data not loaded");
    }

    const data = reachableFromAll[originId];

    if (!data) {
      const emptyData = { origin_id: originId, destinations: [] };
      renderReachableDestinationsPanel(emptyData, selectedOriginFeature);
      updateReachableInfo(emptyData, selectedOriginFeature, currentState.maxTravelTime);
      return;
    }

    // Update the destination markers on the map
    if (reachableDestinationsLayer) {
      map.removeLayer(reachableDestinationsLayer);
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

    renderReachableDestinationsPanel(data, selectedOriginFeature);
    updateReachableInfo(data, selectedOriginFeature, currentState.maxTravelTime);
  } catch (error) {
    console.error("Failed to update reachable destinations:", error);
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

async function loadAccessibilityData(dayType, departureHour, maxTravelTime) {
  // Convert 09:00 format to 0900 format
  const hour = departureHour.replace(":", "");
  const maxTimeStr = formatMaxTimeForPath(maxTravelTime);
  const path = `data/nearestIC/${dayType}/${hour}/${maxTimeStr}/accessibility.geojson`;
  
  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load accessibility data from ${path}: HTTP ${res.status}`);
    }

    const geojson = await res.json();
    accessibilityFeatures = geojson.features || [];

    const latlngs = accessibilityFeatures.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      return [lat, lon];
    });

    accessibilityBounds = latlngs.length ? L.latLngBounds(latlngs) : null;
  } catch (error) {
    console.error(`Error loading accessibility data for ${dayType}/${hour}/${maxTimeStr}:`, error);
    accessibilityFeatures = [];
    accessibilityBounds = null;
  }
}

async function showAccessibilityOverlay(state = {}) {
  // Use provided state or current state
  const dayType = state.dayType ?? currentState.dayType;
  const departureTime = state.departureTime ?? currentState.departureTime;
  const maxTravelTime = state.maxTravelTime ?? currentState.maxTravelTime;
  
  // Update current state
  currentState = { dayType, departureTime, maxTravelTime };
  
  await loadAccessibilityData(dayType, departureTime, maxTravelTime);
  await loadReachableData(dayType, departureTime, maxTravelTime);

  if (!overlayVisible) {
    overlayVisible = true;
    accessibilityDimmed = false;
    buildHexLayer();
    map.on("zoomend", handleHexZoom);

    if (accessibilityBounds && accessibilityBounds.isValid()) {
      map.fitBounds(accessibilityBounds.pad(0.05));
    }

    addLegend();
    ensureReachableInfoControl();
    resetReachableInfo();
  } else {
    // If already visible, just reload with new state
    buildHexLayer();
    resetReachableInfo();
  }
}

function hideAccessibilityOverlay() {
  map.off("zoomend", handleHexZoom);
  accessibilityDimmed = false;

  if (accessibilityLayer && overlayVisible) {
    map.removeLayer(accessibilityLayer);
    accessibilityLayer = null;
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

async function updateNearestICOverlay(state) {
  if (!overlayVisible) return;
  
  const dayType = state.dayType ?? currentState.dayType;
  const departureTime = state.departureTime ?? currentState.departureTime;
  const maxTravelTime = state.maxTravelTime ?? currentState.maxTravelTime;
  
  // If day, hour, or max travel time changed, reload data
  if (dayType !== currentState.dayType || departureTime !== currentState.departureTime || maxTravelTime !== currentState.maxTravelTime) {
    currentState = { dayType, departureTime, maxTravelTime };
    await loadAccessibilityData(dayType, departureTime, maxTravelTime);
    await loadReachableData(dayType, departureTime, maxTravelTime);
    buildHexLayer();
    resetReachableInfo();
    updateSelectedOriginDisplay(); // Update selected origin with new data
  }
}

window.updateNearestICOverlay = updateNearestICOverlay;