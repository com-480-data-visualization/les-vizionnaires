/**
 * Density vs Isolation
 * Faceted scatter plots by canton
 */

function renderDensityChart(containerId, dataUrl) {
  const margin = { top: 20, right: 15, bottom: 40, left: 50 };
  const container = document.getElementById(containerId);
  const chartWidth = 250 - margin.left - margin.right;
  const chartHeight = 250 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.data || data.data.length === 0) return;

      const cantons = data.major_cantons || [];
      const cantonData = {};

      data.data.forEach(d => {
        if (!cantonData[d.canton]) cantonData[d.canton] = [];
        cantonData[d.canton].push(d);
      });

      const container_el = document.getElementById(containerId);
      const grid = document.createElement('div');
      grid.className = 'facet-grid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
      grid.style.gap = '20px';

      cantons.slice(0, 8).forEach(canton => {
        const cantonPoints = cantonData[canton] || [];
        if (cantonPoints.length === 0) return;

        const cellDiv = document.createElement('div');
        cellDiv.className = 'facet-cell';
        cellDiv.innerHTML = '<h4>' + canton + '</h4><svg class="facet-svg"></svg>';
        grid.appendChild(cellDiv);

        const svg = d3.select(cellDiv).select('svg')
          .attr('width', chartWidth + margin.left + margin.right)
          .attr('height', chartHeight + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const xScale = d3.scaleLinear()
          .domain([0, d3.max(cantonPoints, d => d.Pop_Density)])
          .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
          .domain([0, d3.max(cantonPoints, d => d.avg_travel_time_ic)])
          .range([chartHeight, 0]);

        svg.selectAll('.point')
          .data(cantonPoints)
          .enter()
          .append('circle')
          .attr('cx', d => xScale(d.Pop_Density))
          .attr('cy', d => yScale(d.avg_travel_time_ic))
          .attr('r', 3)
          .attr('fill', '#9467bd')
          .attr('opacity', 0.6);

        // Axes
        svg.append('g')
          .attr('transform', 'translate(0,' + chartHeight + ')')
          .call(d3.axisBottom(xScale))
          .attr('font-size', '10px');

        svg.append('g')
          .call(d3.axisLeft(yScale))
          .attr('font-size', '10px');
      });

      container_el.appendChild(grid);

      const stats = document.createElement('div');
      stats.className = 'correlation-stats';
      stats.innerHTML = `<strong>Cantons Analyzed:</strong> ${cantons.length}<br/><strong>Sample:</strong> ${data.n_data} municipalities`;
      container_el.appendChild(stats);
    });
}

