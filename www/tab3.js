document.addEventListener('DOMContentLoaded', () => {
    // Set up the SVG margins
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    // Get references to the select elements
    const scenarioSelect = document.getElementById('scenarioSelect3');
    const variableSelect = document.getElementById('variableSelect3');
    const container = document.getElementById('simulator').parentElement;

    // Function to get dynamic dimensions
    function getSvgDimensions() {
    const linechart = document.getElementById('simulator');
    const container = linechart.parentElement;
    const containerWidth = container.clientWidth;
    
    // If the element is hidden, calculate based on container and CSS percentage
    const width = linechart.clientWidth || (containerWidth * 0.9); // 90% as per CSS
    const height = linechart.clientHeight || 400; // Direct value from CSS
        
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    };
  }

    // Remove any existing SVG
    d3.select('#simulator').selectAll('*').remove();

    // Create SVG container
    const svg = d3.select('#simulator')
        .attr('width', null)
        .attr('height', null)
        .append('g'); // Will set transform later

    // Create initial empty elements for axes and line
    const xAxis = svg.append('g')
        .attr('class', 'x-axis');

    const yAxis = svg.append('g')
        .attr('class', 'y-axis');

    const yLabel = svg.append('text')
        .attr('transform', 'rotate(-90)')
        .style('text-anchor', 'middle')
        .style('font-size', '12px');

    // Function to update the chart
    function updateChart() {
        // Get dynamic dimensions
        const { width, height } = getSvgDimensions();
        // Update SVG size and group transform
        d3.select('#simulator')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        svg.attr('transform', `translate(${margin.left},${margin.top})`);

        xAxis.attr('transform', `translate(0,${height})`);

        const selectedScenario = scenarioSelect.options[scenarioSelect.selectedIndex].text.replace("Scenario ", "");
        const selectedVariable = variableSelect.options[variableSelect.selectedIndex].text;

        d3.csv('data/scenarios_simulation.csv').then(function(data) {
            // Filter data based on selections
            const filteredData = data.filter(d => 
                d.scenario === selectedScenario && 
                d.variable === selectedVariable
            );

            // Convert year and value to numbers
            filteredData.forEach(d => {
                d.year = +d.year;
                d.value = +d.value;
            });

            // Update scales
            const xScale = d3.scaleLinear()
                .domain(d3.extent(filteredData, d => d.year))
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max(filteredData, d => d.value) * 1.1])
                .range([height, 0]);

            // Update X axis
            xAxis.call(d3.axisBottom(xScale).ticks(filteredData.length))
                .selectAll('text')
                .style('text-anchor', 'middle')
                .style('font-size', '12px');

            // Update Y axis
            yAxis.call(d3.axisLeft(yScale))
                .selectAll('text')
                .style('font-size', '12px');

            // Update Y axis label
            yLabel.attr('transform', 'rotate(-90)')
                .attr('y', 4 - margin.left)
                .attr('x', 0 - (height / 2))
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .text(selectedVariable)
                .style('font-size', '12px');

            // Update line
            const line = d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.value))
                .curve(d3.curveMonotoneX);

            // Remove existing line path
            svg.selectAll('.line-path').remove();

            // Create new line path
            svg.append('path')
                .attr('class', 'line-path')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 2)
                .transition()
                .duration(750)
                .attr('d', line(filteredData));

            // Update points
            const points = svg.selectAll('circle')
                .data(filteredData);

            // Remove old points
            points.exit()
                .transition()
                .duration(750)
                .attr('r', 0)
                .remove();

            // Add new points
            const pointsEnter = points.enter()
                .append('circle')
                .attr('r', 0)
                .attr('fill', 'steelblue')
                .style('stroke', 'white')
                .style('stroke-width', '2px');

            // Update all points
            points.merge(pointsEnter)
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 6)
                        .style('fill', '#ff7f0e');
                })
                .on('mouseout', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 4)
                        .style('fill', 'steelblue');
                })
                .transition()
                .duration(750)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.value))
                .attr('r', 4);
        });
    }

    // Add event listeners to the select elements
    scenarioSelect.addEventListener('change', updateChart);
    variableSelect.addEventListener('change', updateChart);

    // Add resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateChart();
        }, 250);
    });

    // Initial chart render
    updateChart();
});
