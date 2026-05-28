// js/point-to-point.js

const pointToPointMap = window.map;

const POINT_TO_POINT_GRID = "data/ptA_IC/accessibility_0900_240min.geojson";
const POINT_TO_POINT_MANIFEST = "data/ptA_ptB/manifest.json";
const POINT_TO_POINT_TILE_SIZE_METERS = 3000;
const EARTH_RADIUS_METERS = 6371008.8;

const TRAVEL_BUCKETS = [
  { label: "<= 30 min", max: 30, color: "#1a9850" },
  { label: "<= 1 h", max: 60, color: "#91cf60" },
  { label: "<= 2 h", max: 120, color: "#d9ef8b" },
  { label: "<= 3 h", max: 180, color: "#fee08b" },
  { label: "<= 4 h", max: 240, color: "#fc8d59" }
];

const COLORS = {
  empty: "#cbd5e1",
  selectedA: "#ff8c00",
  selectedBReachable: "#16a34a",
  selectedBUnreachable: "#dc2626"
};

let state = {
  departureTime: "09:00",
  maxTravelTime: 240,
  visible: false,
  pointA: null,
  pointB: null,
  travelTimesFromA: null
};

let manifest = null;
let gridFeatures = [];
let selectableFeatures = [];
let featureById = {};
let chunkCache = {};
let polygonLayer = null;
let selectedLayer = null;
let infoControl = null;
let legendControl = null;
let gridBounds = null;
let cellsByFeatureId = {};
let currentHexResolution = null;
const tileRenderer = L.canvas({ padding: 0.5 });

function hourKey() {
  return state.departureTime.replace(":", "");
}

function formatMinutes(minutes) {
  if (minutes == null) return "N/A";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function hexResolutionForZoom(zoom) {
  if (zoom <= 6) return 4;
  if (zoom <= 7) return 5;
  if (zoom <= 9) return 6;
  return 7;
}

function colorForTravelTime(minutes) {
  if (minutes == null || minutes > state.maxTravelTime) return COLORS.empty;
  const bucket = TRAVEL_BUCKETS.find((item) => minutes <= item.max);
  return bucket ? bucket.color : COLORS.empty;
}

function travelTimeTo(feature) {
  if (!state.travelTimesFromA) return null;
  if (state.pointA && String(feature.properties.id) === String(state.pointA.properties.id)) {
    return null;
  }

  const minutes = Number(state.travelTimesFromA[String(feature.properties.id)]);
  if (!Number.isFinite(minutes)) return null;
  return minutes;
}

function nearestFeature(features, latlng) {
  let bestFeature = null;
  let bestDistance = Infinity;

  features.forEach((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const distance = pointToPointMap.distance(latlng, L.latLng(lat, lon));
    if (distance < bestDistance) {
      bestFeature = feature;
      bestDistance = distance;
    }
  });

  return bestFeature;
}

function destinationPoint(lat, lon, bearingDegrees, distanceMeters) {
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function sourceTileBoundary(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  const cornerDistance = (POINT_TO_POINT_TILE_SIZE_METERS / 2) * Math.SQRT2;

  return [
    destinationPoint(lat, lon, 315, cornerDistance),
    destinationPoint(lat, lon, 45, cornerDistance),
    destinationPoint(lat, lon, 135, cornerDistance),
    destinationPoint(lat, lon, 225, cornerDistance)
  ];
}

function cellsForFeature(feature, resolution) {
  const id = String(feature.properties.id);
  const cacheKey = `${resolution}:${id}`;
  if (cellsByFeatureId[cacheKey]) return cellsByFeatureId[cacheKey];

  const [lon, lat] = feature.geometry.coordinates;
  const cells = h3.polygonToCells([sourceTileBoundary(feature)], resolution);

  cellsByFeatureId[cacheKey] = cells.length
    ? cells
    : [h3.latLngToCell(lat, lon, resolution)];

  return cellsByFeatureId[cacheKey];
}

function clearSelectionLayer() {
  if (selectedLayer) {
    pointToPointMap.removeLayer(selectedLayer);
    selectedLayer = null;
  }
}

function clearSelection() {
  clearSelectionLayer();
  state.pointA = null;
  state.pointB = null;
  state.travelTimesFromA = null;
}

function resetToInitialSurface() {
  clearSelection();
  drawPolygonSurface();
  renderInitialInfo();
  pointToPointMap.closePopup();
}

function renderInfo(html) {
  const box = document.getElementById("point-to-point-info-box");
  if (box) box.innerHTML = html;
}

function renderInitialInfo() {
  renderInfo(`
    <div class="reachable-info-title">Point A-B travel time</div>
    <div class="reachable-info-empty">Select point A</div>
    <div class="reachable-info-empty-muted">Then select point B on the reachable surface.</div>
  `);
}

function reachableCount() {
  if (!state.travelTimesFromA || !state.pointA) return 0;

  return Object.entries(state.travelTimesFromA).filter(
    ([id, minutes]) =>
      id !== String(state.pointA.properties.id) && Number(minutes) <= state.maxTravelTime
  ).length;
}

function renderPointAInfo() {
  const [lonA, latA] = state.pointA.geometry.coordinates;
  const coordsA = `${latA.toFixed(4)}, ${lonA.toFixed(4)}`;
  const { gdename, ktname } = muniForFeature(state.pointA);
  const originLabel = gdename ? `${gdename}, ${ktname ?? ""}` : coordsA;
  const labelA = gdename
  ? `${gdename}, ${ktname ?? ""}<br><span class="reachable-info-coords">${coordsA}</span>`
  : coordsA;

  renderInfo(`
    <div class="reachable-info-title">Point A-B travel time</div>
    <div class="reachable-info-origin">Point A: ${labelA}</div>
    <div class="reachable-info-empty">Select point B</div>
    <div class="reachable-info-empty-muted">
      ${reachableCount()} points reachable within ${formatMinutes(state.maxTravelTime)}.
    </div>
  `);
}

function renderResultInfo(minutes) {
  const reachable = minutes != null && minutes <= state.maxTravelTime;
  const [lonA, latA] = state.pointA.geometry.coordinates;
  const [lonB, latB] = state.pointB.geometry.coordinates;
  const { gdename: gdnA, ktname: ktnA } = muniForFeature(state.pointA);
  const { gdename: gdnB, ktname: ktnB } = muniForFeature(state.pointB);

  const coordsA = `${latA.toFixed(4)}, ${lonA.toFixed(4)}`;
  const coordsB = `${latB.toFixed(4)}, ${lonB.toFixed(4)}`;

  const labelA = gdnA
    ? `${gdnA}, ${ktnA ?? ""}<br><span class="reachable-info-coords">${coordsA}</span>`
    : coordsA;
  const labelB = gdnB
    ? `${gdnB}, ${ktnB ?? ""}<br><span class="reachable-info-coords">${coordsB}</span>`
    : coordsB;

  renderInfo(`
    <div class="reachable-info-title">Point A-B travel time</div>
    <div class="reachable-info-origin">
      A: ${labelA}<br><br>B: ${labelB}
    </div>
    <div class="reachable-info-empty" style="color:${reachable ? COLORS.selectedBReachable : COLORS.selectedBUnreachable}">
      ${reachable ? "Reachable" : "Not reachable"}
    </div>
    <div class="reachable-info-count">${minutes == null ? "No trip under 4 h" : formatMinutes(minutes)}</div>
  `);
}

function ensureInfoControl() {
  if (infoControl) return;

  infoControl = L.control({ position: "topleft" });
  infoControl.onAdd = function () {
    const div = L.DomUtil.create("div", "reachable-info");
    div.id = "point-to-point-info-box";
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };
  infoControl.addTo(pointToPointMap);
}

function ensureLegend() {
  if (legendControl) return;

  legendControl = L.control({ position: "topright" });
  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const rows = TRAVEL_BUCKETS.map(
      (bucket) => `
        <div class="legend-row">
          <span class="legend-color" style="background:${bucket.color}"></span>
          ${bucket.label}
        </div>
      `
    ).join("");

    div.innerHTML = `
      <strong>Reachable from A</strong>
      ${rows}
      <div class="legend-row">
        <span class="legend-color" style="background:${COLORS.empty}"></span>
        Not reachable / no data
      </div>
    `;
    return div;
  };
  legendControl.addTo(pointToPointMap);
}

async function loadManifest() {
  if (manifest) return manifest;

  const res = await fetch(POINT_TO_POINT_MANIFEST);
  if (!res.ok) throw new Error(`Failed to load ${POINT_TO_POINT_MANIFEST}`);

  manifest = await res.json();
  return manifest;
}

async function loadGrid() {
  if (gridFeatures.length) return;

  const res = await fetch(POINT_TO_POINT_GRID);
  if (!res.ok) throw new Error(`Failed to load ${POINT_TO_POINT_GRID}`);

  const geojson = await res.json();
  const originIds = new Set(Object.keys((await loadManifest()).origin_index[hourKey()] || {}));

  gridFeatures = geojson.features || [];
  selectableFeatures = gridFeatures.filter((feature) =>
    originIds.has(String(feature.properties.id))
  );

  featureById = {};
  selectableFeatures.forEach((feature) => {
    featureById[String(feature.properties.id)] = feature;
  });
  cellsByFeatureId = {};

  const latlngs = gridFeatures.map((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    return [lat, lon];
  });

  gridBounds = latlngs.length ? L.latLngBounds(latlngs) : null;
}

async function loadTravelTimes(originId) {
  const currentManifest = await loadManifest();
  const key = hourKey();
  const chunkKey = currentManifest.origin_index[key]?.[String(originId)];
  const chunk = chunkKey ? currentManifest.chunks[chunkKey] : null;

  if (!chunk) return {};

  if (!chunkCache[chunkKey]) {
    const res = await fetch(`data/${chunk.file}`);
    if (!res.ok) throw new Error(`Failed to load ${chunk.file}`);
    chunkCache[chunkKey] = await res.json();
  }

  const entry = chunkCache[chunkKey][String(originId)];
  if (!entry) return {};
  return entry.destinations ?? entry; // fallback for old flat structure
}

function muniForFeature(feature) {
  if (!feature) return { gdename: null, ktname: null };
  return {
    gdename: feature.properties?.GDENAME ?? null,
    ktname: feature.properties?.KTNAME ?? null
  };
}

function averageReachableTime(features) {
  const values = features
    .map(travelTimeTo)
    .filter((minutes) => minutes != null && minutes <= state.maxTravelTime);

  if (!values.length) return null;
  return values.reduce((sum, minutes) => sum + minutes, 0) / values.length;
}

function fillHexGaps(cells, resolution) {
  const filled = Array.from(cells.keys());
  if (filled.length < 3) return;

  h3.cellsToMultiPolygon(filled, false).forEach((polygon) => {
    const outer = polygon[0];
    if (!outer || outer.length < 3) return;

    h3.polygonToCells([outer], resolution).forEach((cell) => {
      if (!cells.has(cell)) {
        cells.set(cell, {
          features: [],
          selectableFeatures: [],
          value: null,
          interpolated: true
        });
      }
    });
  });

  let pending = [];
  cells.forEach((entry, cell) => {
    if (entry.interpolated && entry.value == null) pending.push(cell);
  });

  let guard = 0;
  while (pending.length && guard++ < 40) {
    const stillPending = [];
    pending.forEach((cell) => {
      const neighbourValues = h3
        .gridDisk(cell, 1)
        .filter((nb) => nb !== cell && cells.has(nb) && cells.get(nb).value != null)
        .map((nb) => cells.get(nb).value);

      if (neighbourValues.length) {
        cells.get(cell).value =
          neighbourValues.reduce((sum, value) => sum + value, 0) / neighbourValues.length;
      } else {
        stillPending.push(cell);
      }
    });

    if (stillPending.length === pending.length) break;
    pending = stillPending;
  }
}

function drawPolygonSurface() {
  if (!state.visible || !gridFeatures.length || typeof h3 === "undefined") return;

  if (polygonLayer) {
    pointToPointMap.removeLayer(polygonLayer);
    polygonLayer = null;
  }

  const resolution = hexResolutionForZoom(pointToPointMap.getZoom());
  currentHexResolution = resolution;

  const cells = new Map();
  gridFeatures.forEach((feature) => {
    const isSelectable = Boolean(featureById[String(feature.properties.id)]);

    cellsForFeature(feature, resolution).forEach((cell) => {
      if (!cells.has(cell)) {
        cells.set(cell, {
          features: [],
          selectableFeatures: [],
          value: null,
          interpolated: false
        });
      }

      const entry = cells.get(cell);
      entry.features.push(feature);
      if (isSelectable) entry.selectableFeatures.push(feature);
    });
  });

  cells.forEach((entry) => {
    entry.value = averageReachableTime(entry.features);
  });

  fillHexGaps(cells, resolution);

  const polygons = [];
  cells.forEach((entry, cell) => {
    const fillColor = colorForTravelTime(entry.value);
    const clickFeatures = entry.selectableFeatures.length
      ? entry.selectableFeatures
      : selectableFeatures;

    const polygon = L.polygon(h3.cellToBoundary(cell), {
      color: fillColor,
      weight: 0.8,
      fillColor,
      fillOpacity: state.pointA ? 0.72 : 0.28,
      opacity: state.pointA ? 0.72 : 0.28,
      renderer: tileRenderer
    });

    const municipalityNames = [...new Set(
      entry.features.map((feature) => feature.properties.GDENAME).filter(Boolean)
    )].sort();

    const namesHtml = municipalityNames.length
      ? `<ul style="margin:4px 0 4px 16px;padding:0;">${municipalityNames.map((n) => `<li>${n}</li>`).join("")}</ul>`
      : "";

    polygon.bindPopup(`
      <strong>${
        entry.interpolated
          ? "3 km hex area"
          : `${entry.features.length} source tile${entry.features.length === 1 ? "" : "s"}`
      }</strong><br/>
      ${namesHtml}
      ${
        state.pointA
          ? entry.value == null
            ? "Not reachable from A"
            : `${Math.round(entry.value)} min from A`
          : entry.selectableFeatures.length
            ? "Click to select point A"
            : "No Point A-B data in this hex"
      }
    `);

    polygon.on("click", (event) => {
      const nextFeature = nearestFeature(clickFeatures, event.latlng);
      if (nextFeature) handlePointClick(nextFeature);
    });

    polygons.push(polygon);
  });

  polygonLayer = L.featureGroup(polygons).addTo(pointToPointMap);
}

function drawSelectedPoints(minutes = null) {
  clearSelectionLayer();

  const layers = [];
  if (state.pointA) {
    const [lon, lat] = state.pointA.geometry.coordinates;
    layers.push(
      L.circleMarker([lat, lon], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: COLORS.selectedA,
        fillOpacity: 1
      }).bindPopup(`<strong>Point A ${state.pointA.properties.id}</strong>`)
    );
  }

  if (state.pointA && state.pointB) {
    const reachable = minutes != null && minutes <= state.maxTravelTime;
    const color = reachable ? COLORS.selectedBReachable : COLORS.selectedBUnreachable;
    const [aLon, aLat] = state.pointA.geometry.coordinates;
    const [bLon, bLat] = state.pointB.geometry.coordinates;

    layers.push(
      L.circleMarker([bLat, bLon], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: color,
        fillOpacity: 1
      }).bindPopup(`
        <strong>Point B ${state.pointB.properties.id}</strong><br/>
        ${minutes == null ? "Not reachable under 4 h" : formatMinutes(minutes)}
      `)
    );

    layers.push(
      L.polyline(
        [
          [aLat, aLon],
          [bLat, bLon]
        ],
        { color, weight: 3, opacity: 0.9, dashArray: "7 7" }
      )
    );
  }

  selectedLayer = L.layerGroup(layers).addTo(pointToPointMap);
}

async function selectPointA(feature) {
  clearSelection();
  chunkCache = {};
  state.pointA = feature;
  state.travelTimesFromA = await loadTravelTimes(feature.properties.id);
  console.log("travelTimesFromA sample:", Object.entries(state.travelTimesFromA).slice(0, 3));
  drawPolygonSurface();
  drawSelectedPoints();
  renderPointAInfo();
}

function selectPointB(feature) {
  state.pointB = feature;
  const minutes = Number(state.travelTimesFromA?.[String(feature.properties.id)]);
  const cleanMinutes = Number.isFinite(minutes) ? minutes : null;

  drawSelectedPoints(cleanMinutes);
  renderResultInfo(cleanMinutes);
}

async function handlePointClick(feature) {
  try {
    if (state.pointA && state.pointB) {
      resetToInitialSurface();
    } else if (!state.pointA) {
      await selectPointA(feature);
    } else {
      selectPointB(feature);
    }
  } catch (error) {
    console.error("Failed to load point-to-point data:", error);
    renderInfo(`
      <div class="reachable-info-title">Point A-B travel time</div>
      <div class="reachable-info-empty">Could not load this pair.</div>
    `);
  }
}

async function showPointToPointOverlay(nextState = {}) {
  state = { ...state, ...nextState, visible: true };

  await loadManifest();
  await loadGrid();

  drawPolygonSurface();
  ensureInfoControl();
  ensureLegend();
  renderInitialInfo();

  if (gridBounds && gridBounds.isValid()) {
    pointToPointMap.fitBounds(gridBounds.pad(0.05));
  }
}

function hidePointToPointOverlay() {
  state.visible = false;
  clearSelection();
  pointToPointMap.closePopup();

  if (polygonLayer) {
    pointToPointMap.removeLayer(polygonLayer);
    polygonLayer = null;
  }

  if (infoControl) {
    pointToPointMap.removeControl(infoControl);
    infoControl = null;
  }

  if (legendControl) {
    pointToPointMap.removeControl(legendControl);
    legendControl = null;
  }
}

async function updatePointToPointOverlay(nextState = {}) {
  state = { ...state, ...nextState };
  if (!state.visible) return;

  if (state.pointA) {
    state.travelTimesFromA = await loadTravelTimes(state.pointA.properties.id);
  }

  drawPolygonSurface();

  if (state.pointA && state.pointB) {
    selectPointB(state.pointB);
  } else if (state.pointA) {
    drawSelectedPoints();
    renderPointAInfo();
  }
}

pointToPointMap.on("zoomend", () => {
  if (!state.visible) return;
  if (hexResolutionForZoom(pointToPointMap.getZoom()) === currentHexResolution) return;
  drawPolygonSurface();
});

window.showPointToPointOverlay = showPointToPointOverlay;
window.hidePointToPointOverlay = hidePointToPointOverlay;
window.updatePointToPointOverlay = updatePointToPointOverlay;
