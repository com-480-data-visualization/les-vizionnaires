// js/real-estate.js

let realEstateLayer = null;
let realEstateLegend = null;

function getRealEstateColor(pricePerM2) {
  if (pricePerM2 == null || Number.isNaN(pricePerM2)) return "#bdbdbd";
  if (pricePerM2 > 15000) return "#bd0026";
  if (pricePerM2 > 10000) return "#f03b20";
  if (pricePerM2 > 8000)  return "#fd8d3c";
  if (pricePerM2 > 6000)  return "#feb24c";
  if (pricePerM2 > 4000)  return "#fed976";
  return "#ffffb2";
}

function addRealEstateLegend() {
  if (realEstateLegend) return;

  realEstateLegend = L.control({ position: "topright" });
  realEstateLegend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <strong>Real Estate Prices</strong>
      <div class="legend-row"><span class="legend-color" style="background:#bd0026"></span>> 15,000 CHF/m²</div>
      <div class="legend-row"><span class="legend-color" style="background:#f03b20"></span>10,001 – 15,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#fd8d3c"></span>8,001 – 10,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#feb24c"></span>6,001 – 8,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#fed976"></span>4,001 – 6,000</div>
      <div class="legend-row"><span class="legend-color" style="background:#ffffb2"></span>≤ 4,000 CHF/m²</div>
      <div class="legend-row"><span class="legend-color" style="background:#bdbdbd"></span>No data</div>
    `;
    return div;
  };
  realEstateLegend.addTo(window.map);
}

function removeRealEstateLegend() {
  if (realEstateLegend) {
    window.map.removeControl(realEstateLegend);
    realEstateLegend = null;
  }
}

async function showRealEstateOverlay() {
  if (!realEstateLayer) {
    try {
      const res = await fetch("data/real_estate_prices.geojson");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();

      realEstateLayer = L.geoJSON(geojson, {
        style: function (feature) {
          return {
            fillColor: getRealEstateColor(feature.properties.Price_per_m2),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.name || "Unknown";
          const priceM2 = feature.properties.Price_per_m2 
            ? Math.round(feature.properties.Price_per_m2).toLocaleString() + " CHF/m²" 
            : "No data available";
            
          layer.bindPopup(`<strong>${name}</strong><br/>Average Price: ${priceM2}`);
        }
      });
    } catch (err) {
      console.error("Error loading real estate data:", err);
      return;
    }
  }
  
  realEstateLayer.addTo(window.map);
  addRealEstateLegend();
}

function hideRealEstateOverlay() {
  if (realEstateLayer && window.map.hasLayer(realEstateLayer)) {
    window.map.removeLayer(realEstateLayer);
  }
  removeRealEstateLegend();
  window.map.closePopup();
}

window.showRealEstateOverlay = showRealEstateOverlay;
window.hideRealEstateOverlay = hideRealEstateOverlay;