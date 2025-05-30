document.addEventListener('DOMContentLoaded', () => {
  // Get select elements
  const scenarioSelect = document.getElementById('scenarioSelect');
  const variableSelect = document.getElementById('variableSelect');
  const monthSelect = document.getElementById('monthSelect');

  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    // Function to get SVG dimensions, using percentages if element is hidden
  function getSvgDimensions() {
    const boxplot = document.getElementById('boxplot');
    const container = boxplot.parentElement;
    const containerWidth = container.clientWidth;
    
    console.log('Container width:', containerWidth);
    // If the element is hidden, calculate based on container and CSS percentage
    const width = boxplot.clientWidth || (containerWidth * 0.9); // 90% as per CSS
    const height = boxplot.clientHeight || 400; // Direct value from CSS
    
    console.log('Final dimensions:', {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    });
    
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
    
    console.log('Filtered data:', filteredData);
    
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
  scenarioSelect.addEventListener('change', updateBoxplot);
  variableSelect.addEventListener('change', updateBoxplot);
  monthSelect.addEventListener('change', updateBoxplot);

  // Watch for tab visibility changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'tab2' && mutation.target.classList.contains('active')) {
        updateBoxplot();
      }
    });
  });

  // Start observing tab2 for visibility changes
  observer.observe(document.getElementById('tab2'), {
    attributes: true,
    attributeFilter: ['class']
  });

  // If tab2 is already active on load, render the boxplot
  if (document.getElementById('tab2').classList.contains('active')) {
    updateBoxplot();
  }

});
