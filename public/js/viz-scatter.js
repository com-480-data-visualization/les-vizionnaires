/**
 * Scatter Plot: Accessibility Paradox
 * Travel time to IC vs Real Estate Price
 */

function renderScatterPlot(containerId, dataUrl) {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const container = document.getElementById(containerId);
  const width = container.clientWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.data || data.data.length === 0) return;

      const svg = d3.select('#' + containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Scales
      const xScale = d3.scaleLinear()
        .domain([0, d3.max(data.data, d => d.avg_travel_time_ic)])
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(data.data, d => d.Price_per_m2)])
        .range([height, 0]);

      // Axes
      svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text('Travel Time to IC (minutes)');

      svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text('Real Estate Price (CHF/))');m

      // Points
      svg.selectAll('.point')
        .data(data.data)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.avg_travel_time_ic))
        .attr('cy', d => yScale(d.Price_per_m2))
        .attr('r', 4)
        .attr('fill', '#1f77b4')
        .attr('opacity', 0.6)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 6).attr('opacity', 1);
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.innerHTML = d.name + '<br/>Travel: ' + d.avg_travel_time_ic.toFixed(0) + ' min<br/>Price: CHF ' + d.Price_per_m2.toFixed(0) + '/m²';
          document.body.appendChild(tooltip);
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY + 10) + 'px';
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 4).attr('opacity', 0.6);
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
        });

      // Stats
      const stats = document.createElement('div');
      stats.className = 'correlation-stats';
      stats.innerHTML = `<strong>Correlation:</strong> r = ${data.correlation.toFixed(3)}<br/><strong>Sample:</strong> ${data.n_data} municipalities`;
      container.appendChild(stats);
    });
}

