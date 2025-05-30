document.addEventListener('DOMContentLoaded', () => {
  const propertyMapping = {
    'Prop_white': 'Proportion of White',
    'Prop_black': 'Proportion of African American',
    'Prop_asian': 'Proportion of Asian',
    'Prop_hispanic': 'Proportion of Hispanic or Latino',
    'Prop_others': 'Proportion of others',
    'food_insec': 'Proportion of people in food insecurity',
    'house_insec': 'Proportion of people in house insecurity',
    'both_insec': 'Proportion of people in food and house insecurity',
    'Low_cost': 'Proportion of costumers of low-cost baskets',
    'Low_to_moderate': 'Proportion of costumers of low-to-moderate-cost baskets',
    'Moderate': 'Proportion of costumers of moderate-cost baskets',
    'Moderate_to_high': 'Proportion of costumers of moderate-to-high-cost baskets',
    'High': 'Proportion of costumers of high-cost baskets'
  };

  const layerSelect = document.getElementById('layerSelect');
  Object.entries(propertyMapping).forEach(([key, label]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    layerSelect.appendChild(option);
  });
  layerSelect.value = 'Prop_white';

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('padding', '6px')
    .style('background', 'rgba(0,0,0,0.7)')
    .style('color', '#fff')
    .style('border-radius', '4px')
    .style('pointer-events', 'none')
    .style('opacity', 0);
  const buttons = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  // Initialize tab states
  contents.forEach(c => {
    if (c.classList.contains('active')) {
      c.style.display = c.id === 'tab1' ? 'flex' : 'block';
    } else {
      c.style.display = 'none';
    }
  });

  buttons.forEach(button => button.addEventListener('click', () => {
    // Update button active states
    buttons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
      // Update content visibility
    contents.forEach(c => {
      c.classList.remove('active');
      c.style.display = 'none';
    });
    const activeContent = document.getElementById(button.dataset.tab);
    activeContent.classList.add('active');
    activeContent.style.display = activeContent.id === 'tab1' ? 'flex' : 'block';
  }));

  const svg = d3.select('#map');
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const projection = d3.geoMercator()
    .center([-75.1352, 40.0020])
    .scale(55000)
    .translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const legendWidth = 20;
  const legendHeight = height * 0.6;
  let legendX = 50;
  const legendY = (height - legendHeight) / 2;
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '0%').attr('y2', '0%');
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    gradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', d3.interpolateYlOrRd(t));
  });
  svg.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#legend-gradient)')
    .style('stroke', '#333');
  const legendScale = d3.scaleLinear().domain([0, 100]).range([legendHeight, 0]);
  const legendAxis = d3.axisLeft(legendScale).ticks(5);
  svg.append('g')
    .attr('class', 'legend axis')
    .attr('transform', `translate(${legendX}, ${legendY})`)
    .call(legendAxis);
  let featuresData = [];
  let globalMeans = {};
  const pi = Math.PI;

  // Function to calculate mean of values
  function calculateMean(arr) {
    const validValues = arr.filter(v => v != null && !isNaN(v));
    return validValues.length ? d3.mean(validValues) : 0;
  }

  // Initialize speedometers
  const speedometerConfig = [
    { id: 'speedometer1', property: 'food_insec' },
    { id: 'speedometer2', property: 'house_insec' },
    { id: 'speedometer3', property: 'both_insec' }
  ];
  
  const speedometers = speedometerConfig.map(config => ({
    svg: d3.select(`#${config.id}`),
    center: { x: 150, y: 80 }, // Adjusted center coordinates
    radius: 70, // Slightly smaller radius
    property: config.property,
    maxValue: 0
  }));

  function createSpeedometer(speedometer) {
    const arc = d3.arc()
      .innerRadius(speedometer.radius - 20)
      .outerRadius(speedometer.radius)
      .startAngle(-pi / 2)
      .endAngle(pi / 2);

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

    // Add min value (0%)
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
      .text(speedometer.maxValue.toFixed(1));
  }

  function updateSpeedometer(speedometer, value) {
    if (value === null || value === undefined) {
      value = 0;
    }
    
    const scale = d3.scaleLinear()
      .domain([0, speedometer.maxValue])
      .range([-pi/2, pi/2]);

    const arc = d3.arc()
      .innerRadius(speedometer.radius - 20)
      .outerRadius(speedometer.radius)
      .startAngle(-pi / 2)
      .endAngle(scale(value));

    // Update or create gauge fill
    let gaugeFill = speedometer.svg.select('.gauge-fill');
    if (gaugeFill.empty()) {
      gaugeFill = speedometer.svg.append('path')
        .attr('class', 'gauge-fill')
        .attr('transform', `translate(${speedometer.center.x},${speedometer.center.y})`)
        .style('fill', 'steelblue');
    }

    gaugeFill.transition()
      .duration(750)
      .attr('d', arc);

    // Update value text
    speedometer.svg.select('.speed-value')
      .transition()
      .duration(750)
      .text(value.toFixed(1));
  }

  // Initialize bar chart
  const barChart = {
    svg: d3.select('#bar-chart'),
    width: d3.select('#bar-chart').node().clientWidth,
    height: d3.select('#bar-chart').node().clientHeight - 10,
    margin: { top: 20, right: 20, bottom: 30, left: 50 }
  };

  // Set up bar chart scales and groups
  barChart.innerWidth = barChart.width - barChart.margin.left - barChart.margin.right;
  barChart.innerHeight = barChart.height - barChart.margin.top - barChart.margin.bottom;

  barChart.g = barChart.svg.append('g')
    .attr('transform', `translate(${barChart.margin.left},${barChart.margin.top})`);

  barChart.xScale = d3.scaleBand()
    .domain(['white_asian', 'white_black', 'white_hispanic', 'white_others'])
    .range([0, barChart.innerWidth])
    .padding(0.1);

  barChart.yScale = d3.scaleLinear()
    .domain([0, 0.5])
    .range([barChart.innerHeight, 0]);

  // Add axes
  barChart.g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${barChart.innerHeight})`)
    .call(d3.axisBottom(barChart.xScale)
      .tickFormat(d => {
        const labels = {
          'white_asian': 'DD White vs. Asian',
          'white_black': 'DD White vs. Black',
          'white_hispanic': 'DD White vs. Hispanic',
          'white_others': 'DD White vs. Others'
        };
        return labels[d];
      }));

  barChart.g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(barChart.yScale));

  // Add y-axis label
  barChart.g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - barChart.margin.left)
    .attr('x', 0 - (barChart.innerHeight / 2))
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text('Duncan Dissimilarity Index')
    .style('font-size', '12px');

  // Initial bars with 0 height
  barChart.g.selectAll('.bar')
    .data(['white_asian', 'white_black', 'white_hispanic', 'white_others'])
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => barChart.xScale(d))
    .attr('width', barChart.xScale.bandwidth())
    .attr('y', barChart.innerHeight)
    .attr('height', 0);

  function updateBarChart(properties) {
    const data = ['white_asian', 'white_black', 'white_hispanic', 'white_others'].map(prop => ({
      name: prop,
      value: properties ? (properties[prop] || 0) : 0
    }));

    barChart.g.selectAll('.bar')
      .data(data)
      .transition()
      .duration(750)
      .attr('x', d => barChart.xScale(d.name))
      .attr('width', barChart.xScale.bandwidth())
      .attr('y', d => barChart.yScale(d.value))
      .attr('height', d => barChart.innerHeight - barChart.yScale(d.value));
  }

  // Initial update with no selection
  updateBarChart(null);
  d3.json('data/ct2020.geojson').then(data => {
    featuresData = data.features;
    
    // Calculate max values for each speedometer and global means
    speedometers.forEach(speedometer => {
      speedometer.maxValue = d3.max(featuresData, d => d.properties[speedometer.property]) || 100;
      // Calculate global mean for each speedometer property
      globalMeans[speedometer.property] = calculateMean(featuresData.map(d => d.properties[speedometer.property]));
      createSpeedometer(speedometer);
    });

    // Calculate global means for bar chart properties
    ['white_asian', 'white_black', 'white_hispanic', 'white_others'].forEach(prop => {
      globalMeans[prop] = calculateMean(featuresData.map(d => d.properties[prop]));
    });

    // Initialize with global means
    speedometers.forEach(speedometer => {
      updateSpeedometer(speedometer, globalMeans[speedometer.property]);
    });
    updateBarChart({ 
      white_asian: globalMeans.white_asian,
      white_black: globalMeans.white_black,
      white_hispanic: globalMeans.white_hispanic,
      white_others: globalMeans.white_others
    });

    svg.selectAll('path.feature')
      .data(featuresData)
      .enter().append('path')
        .attr('class', 'feature')
        .attr('d', path)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .attr('data-tract', d => d.properties.TRACTCEmod)
        .on('mouseover', (event, d) => {
          const prop = layerSelect.value;
          const label = propertyMapping[prop];          const value = d.properties[prop];
          tooltip.transition()
            .duration(0)  // Immediate appearance
            .style('opacity', 1);
          tooltip.html(`TRACTCE: ${d.properties.TRACTCE}<br>${label}: ${
            value != null ? value.toFixed(2) + '%' : 'No value'
          }`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
          
          // Update all speedometers
          speedometers.forEach(speedometer => {
            updateSpeedometer(speedometer, d.properties[speedometer.property]);
          });

          // Update bar chart
          updateBarChart(d.properties);
        })        .on('mousemove', event => {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .style('opacity', 1);
        })        .on('mouseout', () => {
          tooltip.transition().duration(200).style('opacity', 0);
          // Show global means in speedometers
          speedometers.forEach(speedometer => {
            updateSpeedometer(speedometer, globalMeans[speedometer.property]);
          });
          // Show global means in bar chart
          updateBarChart({ 
            white_asian: globalMeans.white_asian,
            white_black: globalMeans.white_black,
            white_hispanic: globalMeans.white_hispanic,
            white_others: globalMeans.white_others
          });
        });
    updateChoropleth(layerSelect.value);
  }).catch(err => console.error('Error loading GeoJSON:', err));

  function updateChoropleth(property) {
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 100]);
    svg.selectAll('path.feature')
      .transition().duration(500)
      .attr('fill', d => {
        const v = d.properties[property];
        return (v != null) ? colorScale(v) : '#eee';
      });
  }

  layerSelect.addEventListener('change', e => updateChoropleth(e.target.value));
});
