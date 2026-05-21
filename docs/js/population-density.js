// js/population-density.js

let densityLayer = null;
let densityLegend = null;

function getDensityColor(density) {
  if (density == null || Number.isNaN(density)) return "#bdbdbd";
  if (density > 1500) return "#00441b";
  if (density > 500)  return "#2a9247";
  if (density > 200)  return "#74c476";
  if (density > 100)  return "#a1d99b";
  if (density > 50)   return "#c7e9c0";
  return "#f7fcf5";
}

function addDensityLegend() {
  if (densityLegend) return;

  densityLegend = L.control({ position: "topright" });
  densityLegend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Population Density</strong>
      <div class="legend-row"><span class="legend-color" style="background:#00441b"></span>> 1,500 inhab./km²</div>
      <div class="legend-row"><span class="legend-color" style="background:#2a9247"></span>501 – 1,500</div>
      <div class="legend-row"><span class="legend-color" style="background:#74c476"></span>201 – 500</div>
      <div class="legend-row"><span class="legend-color" style="background:#a1d99b"></span>101 – 200</div>
      <div class="legend-row"><span class="legend-color" style="background:#c7e9c0"></span>51 – 100</div>
      <div class="legend-row"><span class="legend-color" style="background:#f7fcf5"></span>≤ 50 inhab./km²</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };
  densityLegend.addTo(window.map);
}

function removeDensityLegend() {
  if (densityLegend) {
    window.map.removeControl(densityLegend);
    densityLegend = null;
  }
}

async function showPopulationDensityOverlay() {
  if (!densityLayer) {
    try {
      const res = await fetch("data/population_density.geojson");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      densityLayer = L.geoJSON(geojson, {
        style: function (feature) {
          return {
            fillColor: getDensityColor(feature.properties.Pop_Density),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.name || "Unknown";
          const density = feature.properties.Pop_Density 
            ? feature.properties.Pop_Density.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " inhab. / km²" 
            : "No data available";
            
          const pop = feature.properties.Total_Population
            ? Math.round(feature.properties.Total_Population).toLocaleString('en-US') + " inhabitants"
            : "Unknown";
            
          layer.bindPopup(`<strong>${name}</strong><br/>Density: ${density}<br/>Population: ${pop}`);
        }
      });
    } catch (err) {
      console.error("Error loading density data:", err);
      return;
    }
  }
  
  densityLayer.addTo(window.map);
  addDensityLegend();
}

function hidePopulationDensityOverlay() {
  if (densityLayer && window.map.hasLayer(densityLayer)) {
    window.map.removeLayer(densityLayer);
  }
  removeDensityLegend();
  window.map.closePopup();
}

window.showPopulationDensityOverlay = showPopulationDensityOverlay;
window.hidePopulationDensityOverlay = hidePopulationDensityOverlay;