/**
 * Density vs Isolation
 * Faceted scatter plots by canton with selector
 */

function renderDensityChart(containerId, dataUrl) {
  const margin = { top: 20, right: 15, bottom: 50, left: 60 };
  const chartWidth = 450 - margin.left - margin.right;
  const chartHeight = 350 - margin.top - margin.bottom;

  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.data || data.data.length === 0) return;

      const container_el = document.getElementById(containerId);
      const cantons = data.major_cantons || [];
      
      // Create selector
      const selectorDiv = document.createElement('div');
      selectorDiv.style.marginBottom = '20px';
      selectorDiv.innerHTML = '<label style="font-weight: 600; margin-right: 10px;">Select Canton:</label>';
      
      const select = document.createElement('select');
      select.id = 'canton-selector';
      select.style.padding = '8px 12px';
      select.style.borderRadius = '4px';
      select.style.border = '1px solid #e2e8f0';
      select.style.fontSize = '14px';
      select.style.cursor = 'pointer';
      
      cantons.forEach(canton => {
        const option = document.createElement('option');
        option.value = canton;
        option.textContent = canton;
        select.appendChild(option);
      });
      
      selectorDiv.appendChild(select);
      container_el.appendChild(selectorDiv);
      
      // Create chart container
      const chartDiv = document.createElement('div');
      chartDiv.id = 'density-chart';
      container_el.appendChild(chartDiv);
      
      const cantonData = {};
      data.data.forEach(d => {
        if (!cantonData[d.canton]) cantonData[d.canton] = [];
        cantonData[d.canton].push(d);
      });

      function renderCantonChart(canton) {
        document.getElementById('density-chart').innerHTML = '';
        const cantonPoints = cantonData[canton] || [];
        if (cantonPoints.length === 0) return;

        const svg = d3.select('#density-chart')
          .append('svg')
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
          .attr('r', 4)
          .attr('fill', '#9467bd')
          .attr('opacity', 0.6)
          .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 6).attr('opacity', 1);
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = d.name + '<br/>Density: ' + d.Pop_Density.toFixed(0) + '/km²<br/>Travel: ' + d.avg_travel_time_ic.toFixed(0) + ' min';
            document.body.appendChild(tooltip);
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';
          })
          .on('mouseout', function() {
            d3.select(this).attr('r', 4).attr('opacity', 0.6);
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(t => t.remove());
          });

        // X axis
        svg.append('g')
          .attr('transform', 'translate(0,' + chartHeight + ')')
          .call(d3.axisBottom(xScale).ticks(5))
          .attr('font-size', '12px');
        
        svg.append('text')
          .attr('x', chartWidth / 2)
          .attr('y', chartHeight + 40)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .text('Population Density (per km²)');

        // Y axis
        svg.append('g')
          .call(d3.axisLeft(yScale).ticks(5))
          .attr('font-size', '12px');
        
        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -chartHeight / 2)
          .attr('y', -45)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .text('Travel Time to IC (min)');
      }

      // Initial render
      renderCantonChart(cantons[0]);

      // Selector listener
      select.addEventListener('change', function() {
        renderCantonChart(this.value);
      });

      const stats = document.createElement('div');
      stats.className = 'correlation-stats';
      stats.innerHTML = '<strong>Cantons Analyzed:</strong> ' + cantons.length + '<br/><strong>Total Sample:</strong> ' + data.n_data + ' municipalities';
      container_el.appendChild(stats);
    });
}


