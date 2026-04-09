document.addEventListener("DOMContentLoaded", () => {
  const rightPanelState = {
    mode: "fromA",
    maxTravelTime: 30,
    pointA: "",
    departureTime: "09 : 00"
  };

  const modeInputs = document.querySelectorAll('input[name="mode"]');
  const timeButtons = document.querySelectorAll(".time-chip");
  const pointAInput = document.getElementById("pointA");
  const departureTimeInput = document.getElementById("departureTime");
  const helpButton = document.querySelector(".help-button");

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        rightPanelState.mode = input.value;
        console.log("Selected mode:", rightPanelState.mode);
      }
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

  if (pointAInput) {
    pointAInput.addEventListener("input", (event) => {
      rightPanelState.pointA = event.target.value;
      console.log("Point A:", rightPanelState.pointA);
    });
  }

  if (departureTimeInput) {
    departureTimeInput.addEventListener("input", (event) => {
      rightPanelState.departureTime = event.target.value;
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

// Validate time input in HH:MM format
function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

const departureTimeInput = document.getElementById("departureTime");

if (departureTimeInput) {
  departureTimeInput.addEventListener("change", (event) => {
    const value = event.target.value;

    if (!isValidTimeString(value)) {
      event.target.value = "09:00";
      return;
    }

    rightPanelState.departureTime = value;
  });
}