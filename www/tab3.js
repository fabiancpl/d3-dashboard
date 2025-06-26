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

    // Tooltip for line chart points
    const chartTooltip = d3.select('body').append('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('padding', '6px')
        .style('background', 'rgba(0,0,0,0.7)')
        .style('color', '#fff')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

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

        // Get selected scenarios
        const selectedScenarios = Array.from(scenarioSelect.selectedOptions).map(option => 
            option.text.replace("Scenario ", "")
        );
        const selectedVariable = variableSelect.options[variableSelect.selectedIndex].text;

        // Clear existing legend
        svg.selectAll('.legend').remove();

        // Create color scale for scenarios
        const colorScale = d3.scaleOrdinal()
            .domain(selectedScenarios)
            .range(d3.schemeCategory10);

        d3.csv('data/scenarios_simulation.csv').then(function(data) {
            // Filter data based on selections
            const filteredData = data.filter(d => 
                selectedScenarios.includes(d.scenario) && 
                d.variable === selectedVariable
            );

            // Convert year and value to numbers
            filteredData.forEach(d => {
                d.year = +d.year;
                d.value = +d.value;
            });

            // Group data by scenario
            const dataByScenario = d3.group(filteredData, d => d.scenario);

            // Get unique years for x-axis
            const uniqueYears = Array.from(new Set(filteredData.map(d => d.year))).sort((a, b) => a - b);

            // Calculate min and max for y-axis
            let minValue = d3.min(filteredData, d => d.value);
            let maxValue = d3.max(filteredData, d => d.value);
            if (minValue === undefined || maxValue === undefined) {
                minValue = 0;
                maxValue = 1;
            }
            const yMin = minValue - Math.abs(minValue) * 0.1;
            const yMax = maxValue + Math.abs(maxValue) * 0.1;

            // Update scales
            const xScale = d3.scaleLinear()
                .domain(d3.extent(uniqueYears))
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain([yMin, yMax])
                .range([height, 0]);

            // Update X axis with unique years and a sensible number of ticks
            xAxis.call(d3.axisBottom(xScale)
                .tickValues(uniqueYears)
                .tickFormat(d3.format('d')))
                .selectAll('text')
                .style('text-anchor', 'middle');

            // Update Y axis
            yAxis.call(d3.axisLeft(yScale))
                .selectAll('text');

            // Update Y axis label
            yLabel.attr('transform', 'rotate(-90)')
                .attr('y', 5 - margin.left)
                .attr('x', 0 - (height / 2))
                .attr('dy', '1em')
                .style('text-anchor', 'middle')
                .text(selectedVariable)
                .style('font-size', '12px');

            // Remove existing lines and points
            svg.selectAll('.line-path').remove();
            svg.selectAll('.scenario-points').remove();

            // Create line generator
            const line = d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.value))
                .curve(d3.curveMonotoneX);

            // Draw lines and points for each scenario
            dataByScenario.forEach((scenarioData, scenario) => {
                // Add line
                svg.append('path')
                    .attr('class', 'line-path')
                    .attr('fill', 'none')
                    .attr('stroke', colorScale(scenario))
                    .attr('stroke-width', 2)
                    .transition()
                    .duration(750)
                    .attr('d', line(scenarioData));

                // Add points
                const points = svg.selectAll(`.points-${scenario}`)
                    .data(scenarioData)
                    .enter()
                    .append('circle')
                    .attr('class', `scenario-points points-${scenario}`)
                    .attr('r', 4)
                    .attr('fill', colorScale(scenario))
                    .attr('cx', d => xScale(d.year))
                    .attr('cy', d => yScale(d.value))
                    .style('stroke', 'white')
                    .style('stroke-width', '2px');

                // Add hover effects and tooltip
                points.on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 6)
                        .style('fill', d3.color(colorScale(scenario)).brighter());
                    chartTooltip.transition()
                        .duration(0)
                        .style('opacity', 1);
                    chartTooltip.html(
                        `<strong>Scenario:</strong> ${scenario}<br><strong>Year:</strong> ${d.year}<br><strong>Value:</strong> ${d.value.toFixed(4)}`
                    )
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
                })
                .on('mousemove', function(event) {
                    chartTooltip
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                })
                .on('mouseout', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 4)
                        .style('fill', colorScale(scenario));
                    chartTooltip.transition().duration(200).style('opacity', 0);
                });
            });

            // Add legend
            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width - 120}, 20)`);

            selectedScenarios.forEach((scenario, i) => {
                const legendItem = legend.append('g')
                    .attr('transform', `translate(0, ${i * 20})`);

                legendItem.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', colorScale(scenario));

                legendItem.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .style('font-size', '12px')
                    .text(`Scenario ${scenario}`);
            });
        });
    }

    // Ensure at least one scenario is selected on load
    if (scenarioSelect.selectedOptions.length === 0) {
        scenarioSelect.options[0].selected = true;
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
