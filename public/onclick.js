let selectedOriginLayer = null;
let reachableDestinationsLayer = null;

function clearReachableDestinations(map) {
  if (selectedOriginLayer) {
    map.removeLayer(selectedOriginLayer);
    selectedOriginLayer = null;
  }
  if (reachableDestinationsLayer) {
    map.removeLayer(reachableDestinationsLayer);
    reachableDestinationsLayer = null;
  }
}

async function onOriginClick(feature, map) {
  const originId = String(feature.properties.id);

  clearReachableDestinations(map);

  // highlight selected origin
  selectedOriginLayer = L.circleMarker(
    [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
    {
      radius: 8,
      color: "#000",
      weight: 2,
      fillColor: "#ffff00",
      fillOpacity: 1
    }
  ).addTo(map);

  const res = await fetch(`/data/reachable_from/${originId}.json`);
  if (!res.ok) {
    console.error("No saved reachable destinations for origin", originId);
    return;
  }

  const data = await res.json();

  reachableDestinationsLayer = L.layerGroup(
    data.destinations.map(dest =>
      L.circleMarker([dest.lat, dest.lon], {
        radius: 4,
        color: "#8b0000",
        weight: 1,
        fillColor: "#d73027",
        fillOpacity: 0.85
      }).bindPopup(`
        <strong>${dest.stop_name}</strong><br/>
        Travel time: ${dest.travel_time} min
      `)
    )
  ).addTo(map);

  renderReachableDestinationsPanel(data);
}

function renderReachableDestinationsPanel(data) {
  const panel = document.getElementById("reachable-destinations-panel");

  const items = data.destinations
    .slice(0, 50)
    .map(dest => `
      <li>
        <strong>${dest.stop_name}</strong> — ${dest.travel_time} min
      </li>
    `)
    .join("");

  panel.innerHTML = `
    <h3>Reachable within 6h from origin ${data.origin_id}</h3>
    <p>Total destinations: ${data.destinations.length}</p>
    <ol>${items}</ol>
  `;
}