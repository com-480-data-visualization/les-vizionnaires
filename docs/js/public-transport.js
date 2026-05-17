// js/public-transport.js

let publicTransportLayer = null;
let publicTransportLegend = null;

function getPublicTransportColor(share) {
  if (share == null || Number.isNaN(share)) return "#bdbdbd"; // Gray for missing municipalities
  if (share > 50) return "#005a32"; // Deep Emerald Green
  if (share > 35) return "#238b45";
  if (share > 20) return "#74c476";
  if (share > 10) return "#a1d99b";
  return "#e5f5e0";                 // Soft Pale Green
}

function addPublicTransportLegend() {
  if (publicTransportLegend) return;

  publicTransportLegend = L.control({ position: "topright" });
  publicTransportLegend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Public Transport Share</strong>
      <div class="legend-row"><span class="legend-color" style="background:#005a32"></span>> 50% of commuters</div>
      <div class="legend-row"><span class="legend-color" style="background:#238b45"></span>36% – 50%</div>
      <div class="legend-row"><span class="legend-color" style="background:#74c476"></span>21% – 35%</div>
      <div class="legend-row"><span class="legend-color" style="background:#a1d99b"></span>11% – 20%</div>
      <div class="legend-row"><span class="legend-color" style="background:#e5f5e0"></span>≤ 10%</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };
  publicTransportLegend.addTo(window.map);
}

function removePublicTransportLegend() {
  if (publicTransportLegend) {
    window.map.removeControl(publicTransportLegend);
    publicTransportLegend = null;
  }
}

async function showPublicTransportOverlay() {
  if (!publicTransportLayer) {
    try {
      const res = await fetch("data/public_transport_share.geojson");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      publicTransportLayer = L.geoJSON(geojson, {
        style: function (feature) {
          return {
            fillColor: getPublicTransportColor(feature.properties.PT_Share),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.name || "Unknown";
          
          const share = feature.properties.PT_Share 
            ? feature.properties.PT_Share.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + "%" 
            : "No data available";
            
          const commuters = feature.properties.Total_Commuters
            ? Math.round(feature.properties.Total_Commuters).toLocaleString('en-US') + " commuters"
            : "Unknown";
            
          layer.bindPopup(`<strong>${name}</strong><br/>Commuters using PT: ${share}<br/>Total sample: ${commuters}`);
        }
      });
    } catch (err) {
      console.error("Error loading public transport share data:", err);
      return;
    }
  }
  
  publicTransportLayer.addTo(window.map);
  addPublicTransportLegend();
}

function hidePublicTransportOverlay() {
  if (publicTransportLayer && window.map.hasLayer(publicTransportLayer)) {
    window.map.removeLayer(publicTransportLayer);
  }
  removePublicTransportLegend();
  window.map.closePopup();
}

window.showPublicTransportOverlay = showPublicTransportOverlay;
window.hidePublicTransportOverlay = hidePublicTransportOverlay;