// Create map and attach id to element with id "mapid"
var map = L.map('mapid', {
  // Use LV95 (EPSG:2056) projection
  crs: L.CRS.EPSG2056,
});

// Add Swiss layer with default options
L.tileLayer.swiss().addTo(map);

// Center the map on Switzerland
map.fitSwitzerland();


// Layer groups
const icHubsLayer = L.layerGroup().addTo(map);      // Swiss hubs
const foreignHubsLayer = L.layerGroup().addTo(map); // foreign hubs

window.icHubsLayer = icHubsLayer;
window.foreignHubsLayer = foreignHubsLayer;

fetch('data/ic_hubs_stops.json')
  .then(r => r.json())
  .then(hubs => {
    hubs.forEach(hub => {
      const latlng = L.latLng(hub.lat, hub.lon);
      const p2056 = L.CRS.EPSG2056.project(latlng);
      const latlng2056 = L.CRS.EPSG2056.unproject(p2056);

      if (hub.in_switzerland) {
        // Swiss IC hubs
        L.marker(latlng2056)
          .addTo(icHubsLayer)
          .bindPopup(hub.stop_name);
      } else {
        // Foreign IC hubs
        L.marker(latlng2056)
          .addTo(foreignHubsLayer)
          .bindPopup(hub.stop_name + ' (foreign)');
      }
    });
  })
  .catch(err => console.error('Error loading IC hubs JSON:', err));
