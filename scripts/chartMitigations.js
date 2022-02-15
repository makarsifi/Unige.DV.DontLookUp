var barchartTicker;

function drawChartSolarCollectorSurface(data) {
    // use svg inside viewbox
    var wsvg = 100,
        hsvg = 90,
        wtot = 800,
        htot = 400;

    // set the dimensions and margins of the graph
    var margin = { top: 50, right: 0, bottom: 5, left: 110 },
        width = wtot - margin.left - margin.right,
        height = htot - margin.top - margin.bottom;

    const top_n = 10; // number of top countries to show

    const tickDuration = 1000; //delay of an animation
    const delayDuration = 2000; //delay between two years

    const yearStart = 1990;
    const yearEnd = 2019;

    const svg = d3.select("#mitigation-solar")
        .attr("width", wsvg + "%")
        .attr("height", hsvg + "%")
        .attr("viewBox", "0 0 " + wtot + " " + htot)

    const barPadding = (height - (margin.bottom + margin.top)) / (top_n * 5);

    svg.append('text')
        .attr('class', 'mitigation-race-title')
        .attr('x', 60)
        .attr('y', 20)
        .html(`Solar thermal collectors' surface (${yearStart}-${yearEnd})`);

    let year = yearStart;

    data.forEach(d => { d.colour = d3.hsl(Math.random() * 360, 0.75, 0.75); });

    let lastValues = {};

    function _normalizeData() {
        const values = {};

        const ret = [];
        data.forEach(d => {
            const name = d["geo"];
            const lbl = `${year}`;
            let val = parseInt(d[lbl]);

            let lastValue = lastValues[name];
            if (lastValue == null)
                lastValue = 0;

            ret.push({
                name: name,
                colour: d.colour,
                value: val,
                lastValue: lastValue
            });

            //remember current value of the country
            values[name] = val;
        });

        lastValues = values;

        return ret.sort((a, b) => b.value - a.value).slice(0, top_n);
    }

    let yearSlice = _normalizeData();

    yearSlice.forEach((d, i) => d.rank = i);

    let x = d3.scaleLinear()
        .domain([0, d3.max(yearSlice, d => d.value)])
        .range([margin.left, width - margin.right - 65]);

    let y = d3.scaleLinear()
        .domain([top_n, 0])
        .range([height - margin.bottom, margin.top]);

    let xAxis = d3.axisTop()
        .scale(x)
        .ticks(width > 500 ? 5 : 2)
        .tickSize(-(height - margin.top - margin.bottom))
        .tickFormat(d => d3.format(',')(d));

    svg.append('g')
        .attr('class', 'axis xAxis')
        .attr('transform', `translate(0, ${margin.top})`)
        .call(xAxis)
        .selectAll('.tick line')
        .classed('origin', d => d == 0);

    svg.selectAll('rect.bar')
        .data(yearSlice, d => d.name)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', x(0) + 1)
        .attr('width', d => x(d.lastValue) - x(0))
        .attr('y', d => y(d.rank) + 5)
        .attr('height', y(1) - y(0) - barPadding)
        .style('fill', d => d.colour);

    svg.selectAll('.mitigation-race-label')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'mitigation-race-label')
        .attr('x', margin.left - 8)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .style('text-anchor', 'end')
        .html(d => d.name);

    svg.selectAll('.mitigation-race-value')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'mitigation-race-value')
        .attr('x', d => x(d.lastValue) + 5)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .text(d => d.lastValue);

    let yearText = svg.append('text')
        .attr('class', 'mitigation-race-year')
        .attr('x', width - margin.right)
        .attr('y', height - 25)
        .style('text-anchor', 'end')
        .html(year);


    var tickerMethod = function() {
        yearSlice = _normalizeData();

        yearSlice.forEach((d, i) => d.rank = i);

        x.domain([0, d3.max(yearSlice, d => d.value)]);

        svg.select('.xAxis')
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .call(xAxis);

        const bars = svg.selectAll('.bar').data(yearSlice, d => d.name);

        // bars
        bars.enter()
            .append('rect')
            .attr('class', d => `bar ${d.name.replace(/\s/g,'_')}`)
            .attr('x', x(0) + 1)
            .attr('width', d => x(d.value) - x(0))
            .attr('y', d => y(top_n + 1) + 5)
            .attr('height', y(1) - y(0) - barPadding)
            .style('fill', d => d.colour)
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + 5);

        bars.transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('width', d => Math.max(0, x(d.value) - x(0)))
            .attr('y', d => y(d.rank) + 5);

        bars.exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('width', d => Math.max(0, x(d.value) - x(0)))
            .attr('y', d => y(top_n + 1) + 5)
            .remove();

        // country labels
        const labels = svg.selectAll('.mitigation-race-label')
            .data(yearSlice, d => d.name);

        labels.enter()
            .append('text')
            .attr('class', 'mitigation-race-label')
            .attr('x', margin.left - 8)
            .attr('y', d => y(top_n + 1) + 5 + ((y(1) - y(0)) / 2))
            .style('text-anchor', 'end')
            .html(d => d.name)
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

        labels.transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

        labels.exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(top_n + 1) + 5)
            .remove();

        // values on the right
        const valueLabels = svg.selectAll('.mitigation-race-value').data(yearSlice, d => d.name);

        valueLabels.enter()
            .append('text')
            .attr('class', 'mitigation-race-value')
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(top_n + 1) + 5)
            .html(d => d.value)
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

        valueLabels.transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
            .tween("text", function(d) {
                const i = d3.interpolateNumber(d.lastValue, d.value);
                return function(t) {
                    let v = i(t);
                    if (v < 0)
                        v = 0;
                    this.textContent = v.toFixed(0);
                };
            });

        valueLabels.exit()
            .transition()
            .duration(tickDuration)
            .ease(d3.easeLinear)
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(top_n + 1) + 5)
            .remove();

        // big year label on the bottom right
        yearText.html(year);

        year++;
        if (year > yearEnd) barchartTicker.stop();
    };

    barchartTicker = d3.interval(tickerMethod, delayDuration);
}

function StartBarChartRace() {
    $('#mitigation-solar').html('');
    if (barchartTicker) barchartTicker.stop();
    d3.csv("/datasets/data solar thermal.csv").then(function(data) {
        drawChartSolarCollectorSurface(data);
    });
}
StartBarChartRace();

// Step slider
var sliderStepWaste = d3.sliderLeft()
    .min(1990)
    .max(2020)
    .height(400)
    // .width(400)
    .tickFormat(d3.format(''))
    .ticks(8)
    .step(5)
    .on('onchange', drawChartRenewableWaste);

var gStep = d3
    .select('#slider-year-waste')
    .append('svg')
    .attr('width', 120)
    .attr('height', 450)
    .append('g')
    .attr('transform', 'translate(100,30)')
    .call(sliderStepWaste);

function drawChartRenewableWaste() {
    data = wasteData.get(sliderStepWaste.value())

    // use svg inside viewbox
    var wsvg = 70,
        hsvg = 70,
        wtot = 400,
        htot = 400;

    // set the dimensions and margins of the graph
    var margin = { top: 0, right: 0, bottom: 0, left: 0 },
        width = wtot - margin.left - margin.right,
        height = htot - margin.top - margin.bottom;

    const svg = d3.select("#mitigation-waste")
        .attr("width", wsvg + "%")
        .attr("height", hsvg + "%")
        .attr("viewBox", [-width / 2, -height / 2, wtot, htot])

    // Compute values.
    const N = d3.map(data, d => d.geo);
    const V = d3.map(data, d => parseFloat(d.OBS_VALUE));
    const I = d3.range(N.length);

    var names = new d3.InternSet(N);

    // Chose a default color scheme based on cardinality.
    var colors = d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), names.size);

    // Construct scales.
    const color = d3.scaleOrdinal(names, colors);

    // Compute titles.
    const formatValue = d3.format(",");
    var title = i => `${N[i]}\n${formatValue(V[i])} TJ`;

    // Construct arcs.
    var innerRadius = 0;
    var outerRadius = Math.min(width, height) / 2;
    var labelRadius = (innerRadius * 0.2 + outerRadius * 0.8);
    var padAngle = 0;

    const arcs = d3.pie().padAngle(padAngle).sort(null).value(i => V[i])(I);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

    svg.append("g")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .selectAll("path")
        .data(arcs)
        .join("path")
        .attr("fill", d => color(N[d.data]))
        .attr("d", arc)
        .append("title")
        .text(d => title(d.data));

    svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(arcs)
        .join("text")
        .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
        .selectAll("tspan")
        .data(d => {
            const lines = `${title(d.data)}`.split(/\n/);
            //remove labels if the angle is too small
            return (d.endAngle - d.startAngle) > 0.25 ? lines : "";
        })
        .join("tspan")
        .attr("x", 0)
        .attr("y", (_, i) => `${i * 1.1}em`)
        .attr("font-weight", (_, i) => i ? null : "bold")
        .text(d => d);

}

var wasteData = new Map();
d3.csv("/datasets/data renewable waste.csv").then(function(data) {
    for (i = 1990; i <= 2020; i++) {
        var yeardata = data.filter(d => parseInt(d.TIME_PERIOD) == i && parseFloat(d.OBS_VALUE) != 0);
        wasteData.set(i, yeardata);
    }
    drawChartRenewableWaste();
});