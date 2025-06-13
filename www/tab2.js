document.addEventListener('DOMContentLoaded', () => {
  // Get select elements
  const scenarioSelect = document.getElementById('scenarioSelect');
  const variableSelect = document.getElementById('variableSelect');
  const monthSelect = document.getElementById('monthSelect');
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const pi = Math.PI;

  // Initialize speedometers
  const speedometerConfig = [
    { id: 'speedometer-fs', property: 'perc_fs' },
    { id: 'speedometer-beneficiaries', property: 'perc_fs_beneficiaries' },
    { id: 'speedometer-stamps', property: 'perc_stamps' }
  ];
  
  const speedometers = speedometerConfig.map(config => ({
    svg: d3.select(`#${config.id}`),
    center: { x: 150, y: 80 },
    radius: 70,
    property: config.property,
    minValue: 0,
    maxValue: 0
  }));

  function createSpeedometer(speedometer) {
    const arc = d3.arc()
      .innerRadius(speedometer.radius - 20)
      .outerRadius(speedometer.radius)
      .startAngle(-pi / 2)
      .endAngle(pi / 2);

    speedometer.svg
      .attr('width', speedometer.center.x * 2)
      .attr('height', speedometer.center.y * 2);

    speedometer.svg.append('path')
      .attr('class', 'gauge-background')
      .attr('transform', `translate(${speedometer.center.x},${speedometer.center.y})`)
      .attr('d', arc)
      .style('fill', '#ddd');

    // Add value text in center
    speedometer.svg.append('text')
      .attr('class', 'speed-value')
      .attr('x', speedometer.center.x)
      .attr('y', speedometer.center.y - 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '30px')
      .text('0');

    // Add min value
    speedometer.svg.append('text')
      .attr('class', 'min-value')
      .attr('x', speedometer.center.x - speedometer.radius + 10)
      .attr('y', speedometer.center.y + 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('0.0');

    // Add max value
    speedometer.svg.append('text')
      .attr('class', 'max-value')
      .attr('x', speedometer.center.x + speedometer.radius - 10)
      .attr('y', speedometer.center.y + 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('0.0');
  }

  function updateSpeedometer(speedometer, value, minValue, maxValue) {
    if (value === null || value === undefined) {
      value = 0;
    }

    speedometer.minValue = minValue;
    speedometer.maxValue = maxValue;
    
    const scale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([-pi/2, pi/2]);    // Ensure the value is within bounds to avoid invalid arcs
    const safeValue = Math.max(minValue, Math.min(maxValue, value));
    const endAngle = scale(safeValue);
    
    // Check if the angle is valid
    const arc = d3.arc()
      .innerRadius(speedometer.radius - 20)
      .outerRadius(speedometer.radius)
      .startAngle(-pi / 2)
      .endAngle(Number.isFinite(endAngle) ? endAngle : -pi / 2);

    // Update or create gauge fill
    let gaugeFill = speedometer.svg.select('.gauge-fill');
    if (gaugeFill.empty()) {
      gaugeFill = speedometer.svg.append('path')
        .attr('class', 'gauge-fill')
        .attr('transform', `translate(${speedometer.center.x},${speedometer.center.y})`)
        .style('fill', 'steelblue');
    }

    if (Number.isFinite(endAngle)) {
      gaugeFill.transition()
        .duration(750)
        .attr('d', arc);
    } else {
      gaugeFill.attr('d', ''); // Empty path if angle is invalid
    }

    // Update value text
    speedometer.svg.select('.speed-value')
      .transition()
      .duration(750)
      .text((value * 100).toFixed(1));

    // Update min and max values
    speedometer.svg.select('.min-value')
      .text((minValue * 100).toFixed(1));
    
    speedometer.svg.select('.max-value')
      .text((maxValue * 100).toFixed(1));
  }
  // Function to update speedometers
  function updateSpeedometers() {
    d3.csv('data/scenarios_perc_changes.csv').then(data => {
      // Get the selected scenario and month
      const selectedScenario = scenarioSelect.options[scenarioSelect.selectedIndex].text.replace("Scenario ", "");
      const selectedMonth = monthSelect.value;

      // Find the matching row
      const row = data.find(d => d.scenario === selectedScenario && d.month === selectedMonth);

      if (row) {
        // Calculate min and max values for each metric
        const metrics = {
          perc_fs: data.map(d => +d.perc_fs),
          perc_fs_beneficiaries: data.map(d => +d.perc_fs_beneficiaries),
          perc_stamps: data.map(d => +d.perc_stamps)
        };

        // Update each speedometer
        speedometers.forEach(speedometer => {
          const values = metrics[speedometer.property];
          const minValue = d3.min(values);
          const maxValue = d3.max(values);
          const value = +row[speedometer.property];
          updateSpeedometer(speedometer, value, minValue, maxValue);
        });
      }
    });
  }

  // Function to get SVG dimensions, using percentages if element is hidden
  function getSvgDimensions() {
    const boxplot = document.getElementById('boxplot');
    const container = boxplot.parentElement;
    const containerWidth = container.clientWidth;
    
    // If the element is hidden, calculate based on container and CSS percentage
    const width = boxplot.clientWidth || (containerWidth * 0.9); // 90% as per CSS
    const height = boxplot.clientHeight || 400; // Direct value from CSS
        
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    };
  }

  // Function to update the boxplot
  function updateBoxplot() {
    // Clear existing boxplot
    d3.select('#boxplot').selectAll('*').remove();

    // Get current dimensions
    const { width, height } = getSvgDimensions();    // Create the SVG container
    const svg = d3.select('#boxplot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

  // Load and process the data
  d3.csv('data/scenarios_distribution.csv').then(data => {    // Filter data based on current selections
    let filteredData = data.filter(d => 
      d.scenario === scenarioSelect.options[scenarioSelect.selectedIndex].text.replace("Scenario ", "") && 
      d.variable === variableSelect.options[variableSelect.selectedIndex].text && 
      d.month === monthSelect.value
    );
        
    if (filteredData.length === 0) {
      console.log('No data found for:', {
        scenario: scenarioSelect.options[scenarioSelect.selectedIndex].text,
        variable: variableSelect.options[variableSelect.selectedIndex].text,
        month: monthSelect.value
      });
      return;
    }

    // Process data for boxplot
    const boxplotData = d3.rollup(filteredData,
      group => {
        const values = group.map(d => +d.y).sort(d3.ascending);
        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(q1 - 1.5 * iqr, d3.min(values));
        const max = Math.min(q3 + 1.5 * iqr, d3.max(values));
        return {
          q1, median, q3,
          min, max,
          outliers: values.filter(v => v < min || v > max)
        };
      },
      d => d.x
    );

    // Create scales
    const xScale = d3.scaleBand()
      .domain([...boxplotData.keys()])
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => +d.y)])
      .range([height, 0])
      .nice();

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale));

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 10 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Food insecurity (%)')
        .style('font-size', '12px');

    // Draw boxplots
    boxplotData.forEach((stats, category) => {
      const x = xScale(category);
      const width = xScale.bandwidth();

      // Box
      svg.append('rect')
        .attr('x', x)
        .attr('y', yScale(stats.q3))
        .attr('height', yScale(stats.q1) - yScale(stats.q3))
        .attr('width', width)
        .attr('fill', 'steelblue')
        .attr('opacity', 0.7);

      // Median line
      svg.append('line')
        .attr('x1', x)
        .attr('x2', x + width)
        .attr('y1', yScale(stats.median))
        .attr('y2', yScale(stats.median))
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      // Whiskers
      svg.append('line')
        .attr('x1', x + width/2)
        .attr('x2', x + width/2)
        .attr('y1', yScale(stats.min))
        .attr('y2', yScale(stats.max))
        .attr('stroke', 'black');

      // Min and max horizontal lines
      ['min', 'max'].forEach(key => {
        svg.append('line')
          .attr('x1', x)
          .attr('x2', x + width)
          .attr('y1', yScale(stats[key]))
          .attr('y2', yScale(stats[key]))
          .attr('stroke', 'black');
      });

      // Outliers
      stats.outliers.forEach(value => {
        svg.append('circle')
          .attr('cx', x + width/2)
          .attr('cy', yScale(value))
          .attr('r', 3)
          .attr('fill', 'red');
      });
    });
    });
  }

  // Add event listeners for select changes
  scenarioSelect.addEventListener('change', () => {
    updateBoxplot();
    updateSpeedometers();
  });

  variableSelect.addEventListener('change', updateBoxplot);

  monthSelect.addEventListener('change', () => {
    updateBoxplot();
    updateSpeedometers();
  });
  // Initialize speedometers
  speedometers.forEach(createSpeedometer);

  // Watch for tab visibility changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'tab2' && mutation.target.classList.contains('active')) {
        updateBoxplot();
        updateSpeedometers();
      }
    });
  });

  // Start observing tab2 for visibility changes
  observer.observe(document.getElementById('tab2'), {
    attributes: true,
    attributeFilter: ['class']
  });
  
  // If tab2 is already active on load, render visualizations
  if (document.getElementById('tab2').classList.contains('active')) {
    updateBoxplot();
    updateSpeedometers();
  }

  // Add resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (document.getElementById('tab2').classList.contains('active')) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateBoxplot();
      }, 250);
    }
  });
});
