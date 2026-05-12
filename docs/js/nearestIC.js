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


function getBucketLabel(bucket) {
  switch (bucket) {
    case "30": return "≤ 30 min";
    case "60": return "31–60 min";
    case "120": return "1h-2h";
    case "180": return "2h-3h";
    case "240": return "3h-4h";
    case "999": return "> 4h";
    default: return "All";
  }
}

function matchesBucket(minutes, bucket) {
  if (bucket === "all") return true;
  if (bucket === "30") return minutes <= 30;
  if (bucket === "60") return minutes > 30 && minutes <= 60;
  if (bucket === "120") return minutes > 60 && minutes <= 120;
  if (bucket === "180") return minutes > 120 && minutes <= 180;
  if (bucket === "240") return minutes > 180 && minutes <= 240;
  if (bucket === "999") return minutes > 240;
  return true;
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

function updateReachableInfo(data) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const normalized = normalizeDestinations(data.destinations || []);

  reachableInfoState = {
    allDestinations: normalized,
    filteredDestinations: normalized,
    activeBucket: "all",
    expanded: false,
    originId: data.origin_id,
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
      const emptyData = { origin_id: originId, destinations: [] };
      renderReachableDestinationsPanel(emptyData, feature);
      updateReachableInfo(emptyData, feature);
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
    updateReachableInfo(data, feature);
  } catch (error) {
    console.error("Failed to show reachable destinations:", error);
    document.getElementById("reachable-destinations-panel").innerHTML = `
      <p><strong>Origin:</strong> ${originId}</p>
      <p>Could not load saved destinations for this origin.</p>
    `;
    updateReachableInfo("Error", feature);
  }
}

function addLegend() {
  if (legendControl) return;

  legendControl = L.control({ position: "topright" });

  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Nearest IC travel time</strong>
      <div class="legend-row"><span class="legend-color" style="background:#1a9850"></span>≤ 30 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#91cf60"></span>31–60 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#d9ef8b"></span>61–120 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#fee08b"></span>121–180 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#fc8d59"></span>181–240 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#d73027"></span>&gt; 240 min</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
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