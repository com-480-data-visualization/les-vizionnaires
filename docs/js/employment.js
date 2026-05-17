// js/employment.js

let employmentLayer = null;
let employmentLegend = null;

function getEmploymentColor(jobs) {
  if (jobs == null || Number.isNaN(jobs)) return "#bdbdbd";
  if (jobs > 20000) return "#084594";
  if (jobs > 5000)  return "#2171b5";
  if (jobs > 1000)  return "#4292c6";
  if (jobs > 500)   return "#6baed6";
  if (jobs > 100)   return "#9ecae1";
  return "#eff3ff";
}

function addEmploymentLegend() {
  if (employmentLegend) return;

  employmentLegend = L.control({ position: "topright" });
  employmentLegend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Employment Volume</strong>
      <div class="legend-row"><span class="legend-color" style="background:#084594"></span>> 20,000 jobs</div>
      <div class="legend-row"><span class="legend-color" style="background:#2171b5"></span>5,001 – 20,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#4292c6"></span>1,001 – 5,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#6baed6"></span>501 – 1,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#9ecae1"></span>101 – 500</div>
      <div class="legend-row"><span class="legend-color" style="background:#eff3ff"></span>≤ 100 jobs</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };
  employmentLegend.addTo(window.map);
}

function removeEmploymentLegend() {
  if (employmentLegend) {
    window.map.removeControl(employmentLegend);
    employmentLegend = null;
  }
}

async function showEmploymentOverlay() {
  if (!employmentLayer) {
    try {
      const res = await fetch("data/municipal_jobs.geojson");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      employmentLayer = L.geoJSON(geojson, {
        style: function (feature) {
          return {
            fillColor: getEmploymentColor(feature.properties.Total_Jobs),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.name || "Unknown";
          const jobs = feature.properties.Total_Jobs 
            ? Math.round(feature.properties.Total_Jobs).toLocaleString() + " jobs" 
            : "No data available";
            
          layer.bindPopup(`<strong>${name}</strong><br/>Total Jobs: ${jobs}`);
        }
      });
    } catch (err) {
      console.error("Error loading employment data:", err);
      return;
    }
  }
  
  employmentLayer.addTo(window.map);
  addEmploymentLegend();
}

function hideEmploymentOverlay() {
  if (employmentLayer && window.map.hasLayer(employmentLayer)) {
    window.map.removeLayer(employmentLayer);
  }
  removeEmploymentLegend();
  window.map.closePopup();
}

window.showEmploymentOverlay = showEmploymentOverlay;
window.hideEmploymentOverlay = hideEmploymentOverlay;