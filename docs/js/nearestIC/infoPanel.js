import { state } from "./state.js";
import {
  escapeHtml,
  formatMaxTimeForDisplay,
  getBucketByKey,
  getBucketLabel,
  matchesBucket,
  normalizeDestinations
} from "./utils.js";

const map = window.map;

export function ensureReachableInfoControl() {
  if (state.reachableInfoControl) return;

  state.reachableInfoControl = L.control({ position: "topleft" });

  state.reachableInfoControl.onAdd = function () {
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

  state.reachableInfoControl.addTo(map);
}

export function renderReachableInfo() {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const allBuckets = ["all", "30", "60", "120", "180", "240", "999"];
  const buckets = allBuckets.filter((bucket) => {
    if (bucket === "all") return true;
    const bucketDef = getBucketByKey(bucket);
    return bucketDef && bucketDef.min < state.currentState.maxTravelTime;
  });

  const filtered = state.reachableInfoState.allDestinations.filter((dest) =>
    matchesBucket(dest.minutes, state.reachableInfoState.activeBucket)
  );

  state.reachableInfoState.filteredDestinations = filtered;

  const visibleItems = state.reachableInfoState.expanded
    ? filtered
    : filtered.slice(0, 10);

  const chipsHtml = buckets
    .map((bucket) => {
      const count = state.reachableInfoState.allDestinations.filter((dest) =>
        matchesBucket(dest.minutes, bucket)
      ).length;

      return `
        <button
          type="button"
          class="reachable-filter-chip ${state.reachableInfoState.activeBucket === bucket ? "active" : ""}"
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
          ${state.reachableInfoState.expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      `
      : "";

  box.innerHTML = `
    <div class="reachable-info-origin">Origin ${escapeHtml(state.reachableInfoState.originId)}</div>
    <div class="reachable-info-count">
      ${filtered.length} destination${filtered.length === 1 ? "" : "s"}${state.reachableInfoState.activeBucket === "all" ? ` within ${formatMaxTimeForDisplay(state.currentState.maxTravelTime)}` : ""}
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
      state.reachableInfoState.activeBucket = button.dataset.bucket;
      state.reachableInfoState.expanded = false;
      renderReachableInfo();
    });
  });

  const toggleButton = box.querySelector('[data-action="toggle-expand"]');
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      state.reachableInfoState.expanded = !state.reachableInfoState.expanded;
      renderReachableInfo();
    });
  }
}

export function updateReachableInfo(data, feature = null, maxTravelTime = 240) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  const normalized = normalizeDestinations(data.destinations || [], maxTravelTime);
  const fallbackOriginId = feature?.properties?.id ?? null;

  state.reachableInfoState = {
    allDestinations: normalized,
    filteredDestinations: normalized,
    activeBucket: "all",
    expanded: false,
    originId: data.origin_id ?? fallbackOriginId,
    nearestIcMinutes: data.nearest_ic_minutes ?? null
  };

  renderReachableInfo();
}

export function updateReachableInfoEmpty(originId) {
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  state.reachableInfoState = {
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

export function resetReachableInfo() {
  ensureReachableInfoControl();
  const box = document.getElementById("reachable-info-box");
  if (!box) return;

  box.innerHTML = `
    <div class="reachable-info-title">Reachable destinations</div>
    <div class="reachable-info-empty">Click an origin</div>
  `;
}