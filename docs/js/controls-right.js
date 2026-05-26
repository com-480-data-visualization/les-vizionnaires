// js/controls-right.js

document.addEventListener("DOMContentLoaded", () => {
  const rightPanelState = {
    mode: "nearestIC",
    maxTravelTime: 240,
    departureTime: "09:00",
    dayType: "weekday"
  };

  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const departureButtons = document.querySelectorAll(".departure-chip");
  const dayButtons = document.querySelectorAll(".day-chip");
  const departureTimeGroup = document.getElementById("departureTimeGroup");
  const dayTypeGroup = document.getElementById("dayTypeGroup");
  const helpButton = document.querySelector(".help-button");

  const slider = document.getElementById("maxTravelTime");
  const sliderLabel = document.getElementById("maxTravelTimeLabel");
  const sliderGroup = document.getElementById("maxTravelTimeGroup");

  const sliderSteps = [30, 60, 90, 120, 150, 180, 210, 240];

  function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} h`;
    return `${h} h ${m}`;
  }

  if (slider) {
    updateSliderState(parseInt(slider.value, 10));
    slider.addEventListener("input", (event) => {
      updateSliderState(parseInt(event.target.value, 10));
      if (rightPanelState.mode === "pointToPoint" && typeof window.updatePointToPointOverlay === 'function') {
        window.updatePointToPointOverlay(rightPanelState);
      } else if (typeof window.updateNearestICOverlay === 'function') {
        window.updateNearestICOverlay(rightPanelState);
      }
    });
  }

  function updateSliderState(index) {
    const minutes = sliderSteps[index];
    rightPanelState.maxTravelTime = minutes;
    if (sliderLabel) {
      sliderLabel.textContent = formatMinutes(minutes);
    }
  }

  function hideAllOverlays() {
    if (typeof window.hideNearestICOverlay === 'function') window.hideNearestICOverlay();
    if (typeof window.hidePointToPointOverlay === 'function') window.hidePointToPointOverlay();
    if (typeof window.hideRealEstateOverlay === 'function') window.hideRealEstateOverlay();
    if (typeof window.hideEmploymentOverlay === 'function') window.hideEmploymentOverlay();
    if (typeof window.hideTaxableIncomeOverlay === 'function') window.hideTaxableIncomeOverlay();
    if (typeof window.hidePopulationDensityOverlay === 'function') window.hidePopulationDensityOverlay();
    if (typeof window.hidePublicTransportOverlay === 'function') window.hidePublicTransportOverlay();
  }

  async function applyMode(mode) {
    hideAllOverlays();

    const isNearestIC = mode === "nearestIC";
    const isPointToPoint = mode === "pointToPoint";
    const isTravelMode = isNearestIC || isPointToPoint;
    if (sliderGroup) sliderGroup.style.display = isTravelMode ? "" : "none";
    if (departureTimeGroup) departureTimeGroup.style.display = isTravelMode ? "" : "none";
    if (dayTypeGroup) dayTypeGroup.style.display = isNearestIC ? "" : "none";

    if (mode === "nearestIC" && typeof window.showNearestICOverlay === 'function') {
      await window.showNearestICOverlay(rightPanelState);
    } else if (mode === "pointToPoint" && typeof window.showPointToPointOverlay === 'function') {
      await window.showPointToPointOverlay(rightPanelState);
    } else if (mode === "realEstate" && typeof window.showRealEstateOverlay === 'function') {
      await window.showRealEstateOverlay();
    } else if (mode === "employment" && typeof window.showEmploymentOverlay === 'function') {
      await window.showEmploymentOverlay();
    } else if (mode === "taxableIncome" && typeof window.showTaxableIncomeOverlay === 'function') {
      await window.showTaxableIncomeOverlay();
    } else if (mode === "populationDensity" && typeof window.showPopulationDensityOverlay === 'function') {
      await window.showPopulationDensityOverlay();
    } else if (mode === "publicTransport" && typeof window.showPublicTransportOverlay === 'function') {
      await window.showPublicTransportOverlay();
    }
  }

  modeInputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      rightPanelState.mode = input.value;
      await applyMode(rightPanelState.mode);
    });
  });

  departureButtons.forEach((button) => {
    button.addEventListener("click", () => {
      departureButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      rightPanelState.departureTime = button.dataset.time;
      if (rightPanelState.mode === "pointToPoint" && typeof window.updatePointToPointOverlay === 'function') {
        window.updatePointToPointOverlay(rightPanelState);
      } else if (typeof window.updateNearestICOverlay === 'function') {
        window.updateNearestICOverlay(rightPanelState);
      }
    });
  });

  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      dayButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      rightPanelState.dayType = button.dataset.day;
      if (typeof window.updateNearestICOverlay === 'function') {
        window.updateNearestICOverlay(rightPanelState);
      }
    });
  });

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      alert("Select an indicator mode to explore geographic metrics across Switzerland.");
    });
  }

  const defaultRadio = document.querySelector('input[name="mode"]:checked');
  if (defaultRadio) {
    applyMode(defaultRadio.value);
  }

  window.rightPanelState = rightPanelState;
});