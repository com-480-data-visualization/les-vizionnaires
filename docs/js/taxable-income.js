// js/taxable-income.js

let taxableIncomeLayer = null;
let taxableIncomeLegend = null;

function getTaxableIncomeColor(income) {
  if (income == null || Number.isNaN(income)) return "#bdbdbd";
  if (income > 110000) return "#4a1486";
  if (income > 90000)  return "#7a0177";
  if (income > 75000)  return "#ae017e";
  if (income > 60000)  return "#dd3497";
  if (income > 50000)  return "#fa9fb5";
  return "#fde0dd";
}

function addTaxableIncomeLegend() {
  if (taxableIncomeLegend) return;

  taxableIncomeLegend = L.control({ position: "topright" });
  taxableIncomeLegend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Avg Taxable Income</strong>
      <div class="legend-row"><span class="legend-color" style="background:#4a1486"></span>> 110,000 CHF</div>
      <div class="legend-row"><span class="legend-color" style="background:#7a0177"></span>90,001 – 110,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#ae017e"></span>75,001 – 90,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#dd3497"></span>60,001 – 75,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#fa9fb5"></span>50,001 – 60,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#fde0dd"></span>≤ 50,000 CHF</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };
  taxableIncomeLegend.addTo(window.map);
}

function removeTaxableIncomeLegend() {
  if (taxableIncomeLegend) {
    window.map.removeControl(taxableIncomeLegend);
    taxableIncomeLegend = null;
  }
}

async function showTaxableIncomeOverlay() {
  if (!taxableIncomeLayer) {
    try {
      const res = await fetch("data/income_levels.geojson");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      taxableIncomeLayer = L.geoJSON(geojson, {
        style: function (feature) {
          return {
            fillColor: getTaxableIncomeColor(feature.properties.Avg_Income),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.name || "Unknown";
          const income = feature.properties.Avg_Income 
            ? Math.round(feature.properties.Avg_Income).toLocaleString() + " CHF" 
            : "No data available";
            
          layer.bindPopup(`<strong>${name}</strong><br/>Avg Taxable Income: ${income}`);
        }
      });
    } catch (err) {
      console.error("Error loading taxable income data:", err);
      return;
    }
  }
  
  taxableIncomeLayer.addTo(window.map);
  addTaxableIncomeLegend();
}

function hideTaxableIncomeOverlay() {
  if (taxableIncomeLayer && window.map.hasLayer(taxableIncomeLayer)) {
    window.map.removeLayer(taxableIncomeLayer);
  }
  removeTaxableIncomeLegend();
  window.map.closePopup();
}

window.showTaxableIncomeOverlay = showTaxableIncomeOverlay;
window.hideTaxableIncomeOverlay = hideTaxableIncomeOverlay;