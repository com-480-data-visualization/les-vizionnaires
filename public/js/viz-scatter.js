/**
 * Scatter Plot: Accessibility Paradox
 * Travel time to IC vs Real Estate Price
 */

function renderScatterPlot(containerId, dataUrl) {
  const margin = { top: 20, right: 20, bottom: 60, left: 70 };
  const container = document.getElementById(containerId);
  const width = Math.min(container.clientWidth - 30, 500) - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.data || data.data.length === 0) return;

      // Filter out null prices
      const validData = data.data.filter(d => d.Price_per_m2 != null && !isNaN(d.Price_per_m2) && d.Price_per_m2 > 0);

      const svg = d3.select('#' + containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Scales
      const xScale = d3.scaleLinear()
        .domain([0, d3.max(validData, d => d.avg_travel_time_ic)])
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(validData, d => d.Price_per_m2)])
        .range([height, 0]);

      // X axis
      svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale).ticks(5))
        .attr('font-size', '12px');
      
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#475569')
        .text('Travel Time to IC (minutes)');

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .attr('font-size', '12px');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#475569')
        .text('Real Estate Price (CHF/m²)');

      // Points
      svg.selectAll('.point')
        .data(validData)
        .enter()
        .append('circle')
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
          const tooltips = document.querySelectorAll('.tooltip');
          tooltips.forEach(t => t.remove());
        });
    });
}
