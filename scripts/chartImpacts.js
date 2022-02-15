function drawChartTemperatureDeviation(data) {
    // use svg inside viewbox
    var wsvg = 100,
        hsvg = 100,
        wtot = 400,
        htot = 300;

    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 0, bottom: 10, left: 40 },
        width = wtot - margin.left - margin.right,
        height = htot - margin.top - margin.bottom;

    // Data values
    const X = d3.map(data, d => parseInt(d.TIME_PERIOD));
    const Y = d3.map(data, d => parseFloat(d.OBS_VALUE));
    const Z = d3.map(data, d => d.source);

    // Data domains
    var xDomain = d3.extent(X); // [min, max]
    var yDomain = [-0.3, 1.3];
    const zDomain = Array.from(new Set(Z)); // 3 unique values of Z (source), used to determine the line colors
    const I = d3.range(X.length); //all indexes

    // Construct scales and axes.
    const xScale = d3.scaleLinear(xDomain, [margin.left, width - margin.right]);
    const yScale = d3.scaleLinear(yDomain, [height - margin.bottom, margin.top]);
    const xAxis = d3.axisBottom(xScale).ticks(width / 50).tickFormat(d => d);
    const yAxis = d3.axisLeft(yScale).ticks(height / 40);

    // Construct a line generator.
    const line = d3.line()
        .curve(d3.curveLinear)
        .x(i => xScale(X[i]))
        .y(i => yScale(Y[i]));

    // svg
    const svg = d3.select("#impact-temperature")
        .attr("width", wsvg + "%")
        .attr("height", hsvg + "%")
        .attr("viewBox", "0 0 " + wtot + " " + htot)
        .on("pointerenter", pointerentered)
        .on("pointermove", pointermoved)
        .on("pointerleave", pointerleft);

    //xAxis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("x", width - margin.right)
            .attr("y", 20)
            .attr("class", "impact-axis-title")
            .html("Year"));

    //yAxis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - margin.left - margin.right)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -margin.left)
            .attr("y", 10)
            .attr("class", "impact-axis-title")
            .html("Temperature deviation (&#8451;)"));

    var colorArray = ["#7e83e4", "#ee6866", "#9acd32"];
    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(d3.group(I, i => Z[i])) //group each dataset by the source
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("stroke", z => colorArray[zDomain.indexOf(z[0])])
        .attr("d", ([, I]) => line(I));

    // hover effect
    const dot = svg.append("g")
        .attr("display", "none");

    dot.append("circle")
        .attr("r", 2.5);

    dot.append("text")
        .attr("class", "impact-pointerdot")
        .attr("y", -8);

    function pointermoved(event) {
        const [xm, ym] = d3.pointer(event);
        const i = d3.least(I, i => Math.hypot(xScale(X[i]) - xm, yScale(Y[i]) - ym)); // closest point
        path.style("stroke", ([z]) => Z[i] === z ? null : "#ddd").filter(([z]) => Z[i] === z).raise();
        dot.attr("transform", `translate(${xScale(X[i])},${yScale(Y[i])})`);
        dot.select("text").text(Y[i]);
    }

    function pointerentered() {
        path.style("mix-blend-mode", null).style("stroke", "#ddd");
        dot.attr("display", null);
    }

    function pointerleft() {
        path.style("mix-blend-mode", "multiply").style("stroke", null);
        dot.attr("display", "none");
    }

    // legend
    var colorScale = d3.scaleThreshold()
        .domain(zDomain)
        .range(colorArray);
    var legend = d3.legendColor()
        .labels(zDomain)
        .scale(colorScale);

    var legend_x = margin.left + 20;
    var legend_y = margin.top + 10;
    svg.append("g")
        .attr("class", "impact-temp-legend")
        .attr("transform", "translate(" + legend_x + "," + legend_y + ")")
        .call(legend);
}

function drawChartOceanAcidity(data) {
    // use svg inside viewbox
    var wsvg = 100,
        hsvg = 100,
        wtot = 400,
        htot = 300;

    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 0, bottom: 10, left: 40 },
        width = wtot - margin.left - margin.right,
        height = htot - margin.top - margin.bottom;

    // Data values
    const X = d3.map(data, d => parseInt(d.TIME_PERIOD));
    const Y = d3.map(data, d => parseFloat(d.OBS_VALUE));

    // Data domains
    var xDomain = d3.extent(X);
    var yDomain = [8.01, 8.13];
    const I = d3.range(X.length);

    // Construct scales and axes.
    const xScale = d3.scaleLinear(xDomain, [margin.left, width - margin.right]);
    const yScale = d3.scaleLinear(yDomain, [height - margin.bottom, margin.top]);
    const xAxis = d3.axisBottom(xScale).ticks(width / 50).tickFormat(d => d);
    const yAxis = d3.axisLeft(yScale).ticks(height / 60);

    // Construct a line generator.
    const line = d3.line()
        .curve(d3.curveStep)
        .x(i => xScale(X[i]))
        .y(i => yScale(Y[i]));

    // svg
    var svg = d3.select("#impact-oceanacidity")
        .attr("width", wsvg + "%")
        .attr("height", hsvg + "%")
        .attr("viewBox", "0 0 " + wtot + " " + htot)
        .on("pointerenter", pointerentered)
        .on("pointermove", pointermoved)
        .on("pointerleave", pointerleft);

    //xAxis
    svg.append("g")
        .style("font-size", "10px")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("x", width - margin.right)
            .attr("y", 20)
            .attr("class", "impact-axis-title")
            .html("Year"));

    //yAxis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - margin.left - margin.right)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -margin.left)
            .attr("y", 10)
            .attr("class", "impact-axis-title")
            .html("Ocean water acidity (pH)"));

    // Draw Line
    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(I)
        .join("path")
        .attr("stroke", "rgb(110, 64, 170)")
        .attr("d", line(I));

    // hover effect
    const dot = svg.append("g")
        .attr("display", "none");

    dot.append("circle")
        .attr("r", 2.5);

    dot.append("text")
        .attr("class", "impact-pointerdot")
        .attr("y", -15);

    function pointermoved(event) {
        const [xm, ym] = d3.pointer(event);
        const i = d3.least(I, i => Math.hypot(xScale(X[i]) - xm, yScale(Y[i]) - ym)); // closest point
        dot.attr("transform", `translate(${xScale(X[i])},${yScale(Y[i])})`);
        dot.select("text").text(Y[i]);
    }

    function pointerentered() {
        dot.attr("display", null);
    }

    function pointerleft() {
        dot.attr("display", "none");
    }
}


d3.csv("/datasets/cli_iad_td_linear.csv").then(function(data) {
    drawChartTemperatureDeviation(data);
})


d3.csv("/datasets/sdg_14_50_linear.csv").then(function(data) {
    drawChartOceanAcidity(data);
})