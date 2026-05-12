document.addEventListener("DOMContentLoaded", () => {
  const rightPanelState = {
    mode: "nearestIC",
    maxTravelTime: 240,
    departureTime: "09:00"
  };

  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const timeButtons = document.querySelectorAll(".time-chip");
  const departureButtons = document.querySelectorAll(".departure-chip");
  const departureTimeGroup = document.getElementById("departureTimeGroup");
  const helpButton = document.querySelector(".help-button");

  const slider = document.getElementById("maxTravelTime");
  const sliderLabel = document.getElementById("maxTravelTimeLabel");
  const sliderGroup = document.getElementById("maxTravelTimeGroup");

  const sliderSteps = [
    30,   // 0 → 30 min
    60,   // 1 → 1 h
    90,   // 2 → 1 h 30
    120,  // 3 → 2 h
    150,  // 4 → 2 h 30
    180,  // 5 → 3 h
    210,  // 6 → 3 h 30
    240   // 7 → 4 h
  ];

  function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} h`;
    return `${h} h ${m}`;
  }

  function updateSliderState(index) {
    const minutes = sliderSteps[index];
    rightPanelState.maxTravelTime = minutes;
    if (sliderLabel) {
      sliderLabel.textContent = formatMinutes(minutes);
    }
    console.log("Max travel time:", rightPanelState.maxTravelTime);
  }

  if (slider) {
    updateSliderState(parseInt(slider.value, 10));

    slider.addEventListener("input", (event) => {
      const index = parseInt(event.target.value, 10);
      updateSliderState(index);
    });
  }

  function updateNearestICControlsVisibility(mode) {
    const isNearestIC = mode === "nearestIC";

    if (sliderGroup) {
      sliderGroup.style.display = isNearestIC ? "" : "none";
    }

    if (departureTimeGroup) {
      departureTimeGroup.style.display = isNearestIC ? "" : "none";
    }
  }

 async function applyMode(mode) {
  if (mode === "nearestIC") {
    if (window.showNearestICOverlay) {
      await window.showNearestICOverlay();
    }
  } else {
    if (window.hideNearestICOverlay) {
      window.hideNearestICOverlay();
    }
  }
}

  modeInputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) return;

      rightPanelState.mode = input.value;
      updateNearestICControlsVisibility(rightPanelState.mode);
      await applyMode(rightPanelState.mode);
      });
 });

  timeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      timeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      rightPanelState.maxTravelTime = Number(button.dataset.time);
      console.log("Max travel time:", rightPanelState.maxTravelTime);
    });
  });

  departureButtons.forEach((button) => {
    button.addEventListener("click", () => {
      departureButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      rightPanelState.departureTime = button.dataset.time;
      console.log("Departure time:", rightPanelState.departureTime);
    });
  });

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      alert("Use the controls to choose a mode, point, and travel time.");
    });
  }

  window.rightPanelState = rightPanelState;
});