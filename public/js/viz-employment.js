/**
 * Employment Connectivity
 * Bar chart: All 25 cantons by travel time
 */

function renderEmploymentChart(containerId, dataUrl) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear previous content
  container.innerHTML = '';
  
  const margin = { top: 20, right: 20, bottom: 80, left: 70 };
  const chartWidth = 450 - margin.left - margin.right;
  const chartHeight = 350 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.canton_summary || data.canton_summary.length === 0) return;

      // Sort by travel time descending
      const cantonData = data.canton_summary.sort((a, b) => b.avg_travel_time - a.avg_travel_time);

      const svg = d3.select('#' + containerId)
        .append('svg')
        .attr('width', chartWidth + margin.left + margin.right)
        .attr('height', chartHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      const xScale = d3.scaleBand()
        .domain(cantonData.map(d => d.canton))
        .range([0, chartWidth])
        .padding(0.2);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(cantonData, d => d.avg_travel_time)])
        .range([chartHeight, 0]);

      // Bars
      svg.selectAll('.bar')
        .data(cantonData)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.canton))
        .attr('y', d => yScale(d.avg_travel_time))
        .attr('width', xScale.bandwidth())
        .attr('height', d => chartHeight - yScale(d.avg_travel_time))
        .attr('fill', '#ff8c42')
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 1);
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.innerHTML = d.canton + '<br/>Avg Travel: ' + d.avg_travel_time.toFixed(1) + ' min';
          document.body.appendChild(tooltip);
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY + 10) + 'px';
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.8);
          const tooltips = document.querySelectorAll('.tooltip');
          tooltips.forEach(t => t.remove());
        });

      // X axis
      svg.append('g')
        .attr('transform', 'translate(0,' + chartHeight + ')')
        .call(d3.axisBottom(xScale))
        .attr('font-size', '11px')
        .selectAll('text')
        .attr('transform', 'rotate(45)')
        .attr('text-anchor', 'start');

      svg.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 70)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#475569')
        .text('Canton');

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .attr('font-size', '12px');

      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#475569')
        .text('Avg Travel Time (min)');
    });
}
