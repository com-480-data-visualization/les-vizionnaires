document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".view-tab");
  const mapView = document.getElementById("map-view");
  const controlsView = document.getElementById("controls-view");
  const analysisView = document.getElementById("analysis-view");

  function setActiveTab(viewName) {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === viewName);
    });
  }

  function showMapView() {
    setActiveTab("map");

    mapView.classList.add("active");
    controlsView.classList.add("active");
    analysisView.classList.remove("active");

    mapView.style.display = "";
    controlsView.style.display = "";
    analysisView.style.display = "none";

    if (window.map) {
      setTimeout(() => {
        window.map.invalidateSize();
      }, 100);
    }
  }

  function showAnalysisView() {
    setActiveTab("analysis");

    mapView.classList.remove("active");
    controlsView.classList.remove("active");
    analysisView.classList.add("active");

    mapView.style.display = "none";
    controlsView.style.display = "none";
    analysisView.style.display = "block";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.view === "analysis") {
        showAnalysisView();
      } else {
        showMapView();
      }
    });
  });
});