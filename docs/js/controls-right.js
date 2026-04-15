document.addEventListener("DOMContentLoaded", () => {
  const rightPanelState = {
    mode: "nearestIC",
    maxTravelTime: 30,
    departureTime: "09:00"
  };

  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const timeButtons = document.querySelectorAll(".time-chip");
  const departureTimeInput = document.getElementById("departureTime");
  const helpButton = document.querySelector(".help-button");

  function isValidTimeString(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
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
      console.log("Selected mode:", rightPanelState.mode);

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

  if (departureTimeInput) {
    departureTimeInput.addEventListener("change", (event) => {
      const value = event.target.value;

      if (!isValidTimeString(value)) {
        event.target.value = "09:00";
        rightPanelState.departureTime = "09:00";
        return;
      }

      rightPanelState.departureTime = value;
      console.log("Departure time:", rightPanelState.departureTime);
    });
  }

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      alert("Use the controls to choose a mode, point, and travel time.");
    });
  }

  window.rightPanelState = rightPanelState;
});