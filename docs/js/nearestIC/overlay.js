import { state } from "./state.js";
import { loadAccessibilityData, loadReachableData } from "./data.js";
import {
  addLegend,
  bindZoom,
  buildHexLayer,
  clearSelection,
  closeMapPopup,
  dimAccessibilityLayer,
  fitToAccessibilityBounds,
  handleHexZoom,
  removeAccessibilityLayer,
  removeLegend,
  renderReachableDestinations,
  renderSelectedOrigin,
  resetAccessibilityLayerStyle,
  unbindZoom
} from "./mapLayers.js";
import {
  ensureReachableInfoControl,
  resetReachableInfo,
  updateReachableInfo,
  updateReachableInfoEmpty
} from "./infoPanel.js";

const map = window.map;

if (!map) {
  throw new Error(
    'Map is not initialized. Make sure map.js runs first and sets window.map = L.map("mapid", ...).'
  );
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

async function onOriginClick(feature) {
  const originId = String(feature.properties.id);

  if (state.selectedOriginFeature) {
    clearSelection();
    resetAccessibilityLayerStyle();
    resetReachableInfo();
    closeMapPopup();
    return;
  }

  clearSelection();
  state.selectedOriginFeature = feature;
  dimAccessibilityLayer();
  renderSelectedOrigin(feature);

  try {
    if (!state.reachableFromAll) {
      throw new Error("Reachable data not loaded");
    }

    const data = state.reachableFromAll[originId];

    if (!data) {
      const emptyData = { origin_id: originId, destinations: [] };
      renderReachableDestinationsPanel(emptyData, feature);
      updateReachableInfo(emptyData, feature, state.currentState.maxTravelTime);
      return;
    }

    renderReachableDestinations(data.destinations);
    renderReachableDestinationsPanel(data, feature);
    updateReachableInfo(data, feature, state.currentState.maxTravelTime);
  } catch (error) {
    console.error("Failed to show reachable destinations:", error);
    document.getElementById("reachable-destinations-panel").innerHTML = `
      <p><strong>Origin:</strong> ${originId}</p>
      <p>Could not load saved destinations for this origin.</p>
    `;
    updateReachableInfoEmpty(originId);
  }
}

export function updateSelectedOriginDisplay() {
  if (!state.selectedOriginFeature) return;

  const originId = String(state.selectedOriginFeature.properties.id);

  try {
    if (!state.reachableFromAll) {
      throw new Error("Reachable data not loaded");
    }

    const data = state.reachableFromAll[originId];

    if (!data) {
      const emptyData = { origin_id: originId, destinations: [] };
      renderReachableDestinationsPanel(emptyData, state.selectedOriginFeature);
      updateReachableInfo(emptyData, state.selectedOriginFeature, state.currentState.maxTravelTime);
      return;
    }

    if (state.reachableDestinationsLayer) {
      map.removeLayer(state.reachableDestinationsLayer);
    }

    renderReachableDestinations(data.destinations);
    renderReachableDestinationsPanel(data, state.selectedOriginFeature);
    updateReachableInfo(data, state.selectedOriginFeature, state.currentState.maxTravelTime);
  } catch (error) {
    console.error("Failed to update reachable destinations:", error);
    updateReachableInfoEmpty(originId);
  }
}

const zoomHandler = () => handleHexZoom(onOriginClick);

export async function showAccessibilityOverlay(nextState = {}) {
  const dayType = nextState.dayType ?? state.currentState.dayType;
  const departureTime = nextState.departureTime ?? state.currentState.departureTime;
  const maxTravelTime = nextState.maxTravelTime ?? state.currentState.maxTravelTime;

  state.currentState = { dayType, departureTime, maxTravelTime };

  await loadAccessibilityData(dayType, departureTime, maxTravelTime);
  await loadReachableData(dayType, departureTime, maxTravelTime);

  clearSelection();
  closeMapPopup();
  state.accessibilityDimmed = false;

  if (!state.overlayVisible) {
    state.overlayVisible = true;

    buildHexLayer(onOriginClick);
    bindZoom(zoomHandler);
    fitToAccessibilityBounds();
    addLegend();
    ensureReachableInfoControl();
    resetReachableInfo();
  } else {
    buildHexLayer(onOriginClick);
    resetReachableInfo();
  }
}

export function hideAccessibilityOverlay() {
  unbindZoom(zoomHandler);
  state.accessibilityDimmed = false;

  removeAccessibilityLayer();
  clearSelection();
  closeMapPopup();
  removeLegend();

  if (state.reachableInfoControl) {
    map.removeControl(state.reachableInfoControl);
    state.reachableInfoControl = null;
  }

  const panel = document.getElementById("reachable-destinations-panel");
  if (panel) {
    panel.innerHTML = "";
  }
}

export async function updateNearestICOverlay(nextState) {
  if (!state.overlayVisible) return;

  const dayType = nextState.dayType ?? state.currentState.dayType;
  const departureTime = nextState.departureTime ?? state.currentState.departureTime;
  const maxTravelTime = nextState.maxTravelTime ?? state.currentState.maxTravelTime;

  if (
    dayType !== state.currentState.dayType ||
    departureTime !== state.currentState.departureTime ||
    maxTravelTime !== state.currentState.maxTravelTime
  ) {
    state.currentState = { dayType, departureTime, maxTravelTime };

    await loadAccessibilityData(dayType, departureTime, maxTravelTime);
    await loadReachableData(dayType, departureTime, maxTravelTime);

    buildHexLayer(onOriginClick);
    resetReachableInfo();
    updateSelectedOriginDisplay();
  }
}

window.showNearestICOverlay = showAccessibilityOverlay;
window.hideNearestICOverlay = hideAccessibilityOverlay;
window.updateNearestICOverlay = updateNearestICOverlay;
