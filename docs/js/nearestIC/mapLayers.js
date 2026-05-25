import { TRAVEL_TIME_BUCKETS } from "./config.js";
import { state } from "./state.js";
import { getTravelTimeColor, resForZoom } from "./utils.js";

const map = window.map;

if (!map) {
  throw new Error(
    'Map is not initialized. Make sure map.js runs first and sets window.map = L.map("mapid", ...).'
  );
}

export const hexRenderer = L.canvas({ padding: 0.5 });

export function clearSelection() {
  if (state.selectedOriginLayer) {
    map.removeLayer(state.selectedOriginLayer);
    state.selectedOriginLayer = null;
  }

  if (state.reachableDestinationsLayer) {
    map.removeLayer(state.reachableDestinationsLayer);
    state.reachableDestinationsLayer = null;
  }

  state.selectedOriginFeature = null;
}

export function aggregateValue(features) {
  const values = features
    .map((f) => f.properties.min_travel_time_to_ic)
    .filter((v) => v != null)
    .map(Number)
    .filter((v) => Number.isFinite(v));

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function hexStyle(value, dimmed) {
  return {
    color: "#ffffff",
    weight: 1,
    fillColor: getTravelTimeColor(value),
    fillOpacity: dimmed ? 0.2 : 0.7,
    opacity: dimmed ? 0.35 : 0.65
  };
}

export function nearestFeature(features, latlng) {
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

export function fillHexGaps(cells, res) {
  const filled = Array.from(cells.keys());
  if (filled.length < 3) return;

  h3.cellsToMultiPolygon(filled, false).forEach((polygon) => {
    const outer = polygon[0];
    if (!outer || outer.length < 3) return;

    h3.polygonToCells([outer], res).forEach((cell) => {
      if (!cells.has(cell)) {
        cells.set(cell, { features: [], value: null, interpolated: true });
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
          neighbourValues.reduce((sum, v) => sum + v, 0) / neighbourValues.length;
      } else {
        stillPending.push(cell);
      }
    });

    if (stillPending.length === pending.length) break;
    pending = stillPending;
  }
}

export function buildHexLayer(onOriginClick) {
  if (typeof h3 === "undefined") {
    console.error("h3-js is not loaded — cannot build hexagonal bins.");
    return;
  }

  const res = resForZoom(map.getZoom());
  state.currentHexRes = res;

  if (state.accessibilityLayer) {
    map.removeLayer(state.accessibilityLayer);
    state.accessibilityLayer = null;
  }

  const cells = new Map();
  state.accessibilityFeatures.forEach((feature) => {
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

  fillHexGaps(cells, res);

  const hexagons = [];
  cells.forEach((entry, cell) => {
    const boundary = h3.cellToBoundary(cell);
    const polygon = L.polygon(boundary, {
      ...hexStyle(entry.value, state.accessibilityDimmed),
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
      const pool = entry.features.length ? entry.features : state.accessibilityFeatures;
      const origin = nearestFeature(pool, event.latlng);
      if (origin) onOriginClick(origin);
    });

    hexagons.push(polygon);
  });

  state.accessibilityLayer = L.featureGroup(hexagons);

  if (state.overlayVisible) {
    state.accessibilityLayer.addTo(map);
  }
}

export function handleHexZoom(onOriginClick) {
  if (!state.overlayVisible) return;
  if (resForZoom(map.getZoom()) === state.currentHexRes) return;
  buildHexLayer(onOriginClick);
}

export function applyHexStyle() {
  if (!state.accessibilityLayer) return;

  state.accessibilityLayer.eachLayer((layer) => {
    if (layer.setStyle) {
      layer.setStyle(hexStyle(layer._hexValue, state.accessibilityDimmed));
    }
  });
}

export function dimAccessibilityLayer() {
  state.accessibilityDimmed = true;
  applyHexStyle();
}

export function resetAccessibilityLayerStyle() {
  state.accessibilityDimmed = false;
  applyHexStyle();
}

export function addLegend() {
  if (state.legendControl) return;

  state.legendControl = L.control({ position: "topright" });

  state.legendControl.onAdd = function () {
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

  state.legendControl.addTo(map);
}

export function removeLegend() {
  if (state.legendControl) {
    map.removeControl(state.legendControl);
    state.legendControl = null;
  }
}

export function renderSelectedOrigin(feature) {
  const [lon, lat] = feature.geometry.coordinates;

  state.selectedOriginLayer = L.circleMarker([lat, lon], {
    radius: 10,
    color: "#ffffff",
    weight: 3,
    fillColor: "#ff8c00",
    fillOpacity: 1
  }).addTo(map);
}

export function renderReachableDestinations(destinations) {
  state.reachableDestinationsLayer = L.layerGroup(
    destinations.map((dest) =>
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
}

export function fitToAccessibilityBounds() {
  if (state.accessibilityBounds && state.accessibilityBounds.isValid()) {
    map.fitBounds(state.accessibilityBounds.pad(0.05));
  }
}

export function removeAccessibilityLayer() {
  if (state.accessibilityLayer && state.overlayVisible) {
    map.removeLayer(state.accessibilityLayer);
    state.accessibilityLayer = null;
    state.overlayVisible = false;
  }
}

export function closeMapPopup() {
  map.closePopup();
}

export function bindZoom(handler) {
  map.on("zoomend", handler);
}

export function unbindZoom(handler) {
  map.off("zoomend", handler);
}