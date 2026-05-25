/**
 * Employment Hubs Connectivity
 * Bar chart showing employment density vs accessibility by canton
 */

function renderEmploymentChart(containerId, dataUrl) {
  const margin = { top: 20, right: 20, bottom: 100, left: 60 };
  const container = document.getElementById(containerId);
  const width = container.clientWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.canton_summary || data.canton_summary.length === 0) return;

      const svg = d3.select('#' + containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      const cantons = data.canton_summary.slice(0, 10);

      const xScale = d3.scaleBand()
        .domain(cantons.map(d => d.canton))
        .range([0, width])
        .padding(0.2);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(cantons, d => d.avg_travel_time)])
        .range([height, 0]);

      // Bars
      svg.selectAll('.bar')
        .data(cantons)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.canton))
        .attr('y', d => yScale(d.avg_travel_time))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.avg_travel_time))
        .attr('fill', '#ff7f0e')
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 1);
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.innerHTML = d.canton + '<br/>Avg Travel: ' + d.avg_travel_time.toFixed(0) + ' min<br/>Jobs: ' + d.total_jobs;
          document.body.appendChild(tooltip);
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY + 10) + 'px';
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.8);
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
        });

      // Axes
      svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end');

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
      stats.innerHTML = `<strong>Correlation:</strong> r = ${data.correlation.toFixed(3)}<br/><strong>Sample:</strong> ${data.n_data} municipalities`;
      container.appendChild(stats);
    });
}

