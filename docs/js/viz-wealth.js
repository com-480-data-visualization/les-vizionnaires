/**
 * Wealth Gaps & Mobility
 * Scatter chart showing average income vs accessibility by canton
 */

function renderWealthChart(containerId, dataUrl) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear previous content
  container.innerHTML = '';
  
  const margin = { top: 20, right: 20, bottom: 60, left: 70 };
  const width = Math.min(container.clientWidth - 30, 500) - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

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

      const xScale = d3.scaleLinear()
        .domain([d3.min(data.data, d => d.avg_income), d3.max(data.data, d => d.avg_income)])
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(data.data, d => d.avg_travel_time)])
        .range([height, 0]);

      // Circles
      svg.selectAll('.point')
        .data(data.data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.avg_income))
        .attr('cy', d => yScale(d.avg_travel_time))
        .attr('r', 5)
        .attr('fill', '#2ca02c')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 7).attr('opacity', 1);
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.innerHTML = d.canton + '<br/>Income: CHF ' + d.avg_income.toFixed(0) + '<br/>Travel: ' + d.avg_travel_time.toFixed(0) + ' min';
          document.body.appendChild(tooltip);
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY + 10) + 'px';
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 5).attr('opacity', 0.7);
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
        });

      // Axes
      svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'black')
        .text('Average Income (CHF)');

      svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .attr('fill', 'black')
        .text('Avg Travel Time to IC (min)');

      const stats = document.createElement('div');
      stats.className = 'correlation-stats';
      stats.innerHTML = `<strong>Correlation:</strong> r = ${data.correlation.toFixed(3)}<br/><strong>Sample:</strong> ${data.n_data} cantons`;
      container.appendChild(stats);
    });
}

