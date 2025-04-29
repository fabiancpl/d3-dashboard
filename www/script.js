// script.js

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
  const mapEl = document.getElementById('map');
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');
    if (button.dataset.tab === 'tab1') {
      mapEl.style.display = 'block'; layerSelect.style.display = 'block';
    } else {
      mapEl.style.display = 'none'; layerSelect.style.display = 'none';
    }
  }));
  if (document.querySelector('.tab-button.active').dataset.tab !== 'tab1') {
    mapEl.style.display = 'none'; layerSelect.style.display = 'none';
  }

  const svg = d3.select('#map');
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const projection = d3.geoMercator()
    .center([-75.1352, 39.9926])
    .scale(80000)
    .translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const legendWidth = 20;
  const legendHeight = height * 0.6;
  let legendX = 170;
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
  d3.json('data/ct2020.geojson').then(data => {
    featuresData = data.features;
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
          const label = propertyMapping[prop];
          const value = d.properties[prop];
          tooltip.html(`TRACTCE: ${d.properties.TRACTCE}<br>${label}: ${
            value != null ? value.toFixed(2) + '%' : 'No value'
          }`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px')
            .transition().duration(200).style('opacity', 1);
        })
        .on('mousemove', event => {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', () => {
          tooltip.transition().duration(200).style('opacity', 0);
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
