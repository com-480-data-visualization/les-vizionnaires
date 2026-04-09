document.addEventListener('DOMContentLoaded', () => {
	const btnReset = document.getElementById('btn-reset');
	const btnToggleHubs = document.getElementById('btn-toggle-hubs');
	const btnForeignICHubs = document.getElementById('btn-foreign-ic-hubs');

  if (!window.map) {
    console.error('Map is not available on window.map');
    return;
  }


  let swissHubsVisible = true;      
  let foreignHubsVisible = true;  

  function applyVisibility() {
    // Swiss Hubs 
    if (swissHubsVisible) {
      window.icHubsLayer.addTo(window.map);
    } else {
      window.map.removeLayer(window.icHubsLayer);
    }

    // Foreign hubs highlight layer (independent)
    if (foreignHubsVisible) {
      window.foreignHubsLayer.addTo(window.map);
    } else {
      window.map.removeLayer(window.foreignHubsLayer);
    }

    // Button labels depend ONLY on their own state
    btnToggleHubs.textContent = swissHubsVisible ? 'Hide Swiss IC hubs' : 'Show Swiss IC hubs';
    btnForeignICHubs.textContent = foreignHubsVisible
      ? 'Hide foreign IC hubs'
      : 'Show foreign IC hubs';
  }

  applyVisibility();

	// Button 0: reset view
	btnReset.addEventListener('click', () => {
		window.map.fitSwitzerland();
	});

  // Button 1: toggle Swiss IC hubs
  btnToggleHubs.addEventListener('click', () => {
    swissHubsVisible = !swissHubsVisible;
    applyVisibility();
  });

  // Button 2: toggle ONLY foreign hubs
  btnForeignICHubs.addEventListener('click', () => {
    foreignHubsVisible = !foreignHubsVisible;
    applyVisibility();
  });
});
