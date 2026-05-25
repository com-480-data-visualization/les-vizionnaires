import { state } from "./state.js";
import { formatMaxTimeForPath } from "./utils.js";

export async function loadReachableData(dayType, departureHour, maxTravelTime) {
  const hour = departureHour.replace(":", "");
  const maxTimeStr = formatMaxTimeForPath(maxTravelTime);
  const path = `data/nearestIC/${dayType}/${hour}/${maxTimeStr}/reachable.json`;

  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.warn(`Failed to load reachable data from ${path}: HTTP ${res.status}`);
      state.reachableFromAll = {};
      return;
    }

    const { stops, origins } = await res.json();

    state.reachableFromAll = {};
    Object.entries(origins).forEach(([originId, pairs]) => {
      state.reachableFromAll[originId] = {
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
    state.reachableFromAll = {};
  }
}

export async function loadAccessibilityData(dayType, departureHour, maxTravelTime) {
  const hour = departureHour.replace(":", "");
  const maxTimeStr = formatMaxTimeForPath(maxTravelTime);
  const path = `data/nearestIC/${dayType}/${hour}/${maxTimeStr}/accessibility.geojson`;

  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load accessibility data from ${path}: HTTP ${res.status}`);
    }

    const geojson = await res.json();
    state.accessibilityFeatures = geojson.features || [];

    const latlngs = state.accessibilityFeatures.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      return [lat, lon];
    });

    state.accessibilityBounds = latlngs.length ? L.latLngBounds(latlngs) : null;
  } catch (error) {
    console.error(`Error loading accessibility data for ${dayType}/${hour}/${maxTimeStr}:`, error);
    state.accessibilityFeatures = [];
    state.accessibilityBounds = null;
  }
}