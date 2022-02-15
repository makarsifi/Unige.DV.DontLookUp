var drivers = new Map();
drivers.set("Energy", { filename: "sdg_07_10_linear.csv", unit: "MTOE", datamap: new Map() });
drivers.set("Transport", { filename: "ten00126_linear.csv", unit: "KTOE", datamap: new Map() });
drivers.set("Waste", { filename: "env_wasmun_linear.csv", unit: "Kg", datamap: new Map() });
drivers.set("Agriculture", { filename: "tai01_linear.csv", unit: "T", datamap: new Map() });

var mapColorScale;
var displayUnit;

function mapToPercentage(value, in_min, in_max) {
    value = parseFloat(value);
    return (value - in_min) * 100 / (in_max - in_min);
}

var promises = []
promises.push(d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"));

// Mapping between alpha2 and alpha3 country names
var countries = [];
promises.push(d3.csv("/datasets/countries.csv", function(row) {
    countries.push({
        id: row.id,
        name: row.name,
        alpha2: row.alpha2.toUpperCase(),
        alpha3: row.alpha3.toUpperCase()
    });
}));

var resolveEnergy, resolveTransport, resolveWaste, resolveAgriculture;
promises.push(new Promise((resolve, reject) => { resolveEnergy = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveTransport = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveWaste = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveAgriculture = resolve; }));

// reading the data
drivers.forEach(function(value, key) {
    d3.csv("/datasets/" + value.filename).then(function(data) {
        // Filter out all records countries not listed in countries.csv (for example we may have EU...)
        data = data.filter(x => countries.some(c => c.alpha2 == x.geo));

        var resolveCallback;
        switch (key) {
            case "Energy":
                data = data.filter(x => x.unit == "MTOE");
                resolveCallback = resolveEnergy;
                break;
            case "Transport":
                data = data.filter(x => x.siec == "TOTAL");
                resolveCallback = resolveTransport;
                break;
            case "Waste":
                data = data.filter(x => x.unit == "KG_HAB" && x.wst_oper == "GEN");
                resolveCallback = resolveWaste;
                break;
            case "Agriculture":
                data = data.filter(x => x.nutrient == "N");
                resolveCallback = resolveAgriculture;
                break;
        }
        var obsValues = data.map(d => parseFloat(d.OBS_VALUE));
        var minOBS = d3.min(obsValues);
        var maxOBS = d3.max(obsValues);

        var currentdriver = drivers.get(key);
        var datamap = currentdriver.datamap;
        data.forEach(row => {
            let alpha3 = countries.filter(c => c.alpha2 == row.geo)[0].alpha3;
            let countryDataArray = datamap.get(alpha3);
            if (!countryDataArray)
                countryDataArray = new Array();

            countryDataArray.push({
                year: parseInt(row.TIME_PERIOD),
                obs: parseFloat(row.OBS_VALUE),
                obsPercentage: mapToPercentage(row.OBS_VALUE, minOBS, maxOBS)
            });

            datamap.set(alpha3, countryDataArray);
        });

        currentdriver.datamap = datamap;
        drivers.set(key, currentdriver);

        resolveCallback();
    });
});


//// Filters
// Category icons
var selectedCat = $("#selectedCategory");
// Step slider
var sliderStep = d3.sliderLeft()
    .min(2000)
    .max(2020)
    .height(400)
    .tickFormat(d3.format(''))
    .ticks(20)
    .step(1)
    .on('onchange', val => {
        changeFilters(selectedCat.val(), sliderStep.value())
    });

var gStep = d3
    .select('#slider-year')
    .append('svg')
    .attr('width', 150)
    .attr('height', 450)
    .append('g')
    .attr('transform', 'translate(90,30)')
    .call(sliderStep);

// Promise is used to wait for all data read to finish
Promise.all(promises).then(function(fullfilled) {
    drawChartDrivers(fullfilled[0]);
});

function drawChartDrivers(topo) {
    // use svg inside viewbox
    var wsvg = 80,
        hsvg = 100,
        wtot = 800,
        htot = 400;

    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 10, bottom: 40, left: 100 },
        width = wtot - margin.left - margin.right,
        height = htot - margin.top - margin.bottom;

    // The map svg
    var svg = d3.select("#map")
        .attr("width", wsvg + "%")
        .attr("height", hsvg + "%")
        .attr("viewBox", "0 0 " + wtot + " " + htot)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Map and projection on europe
    var projection = d3.geoMercator()
        .scale(400)
        .center([0, 53])
        .translate([width / 2 - margin.left, height / 2]);


    // Each value in the domain is a threshold, values < 0 are considered "No Data"
    var domain = [0, 20, 40, 60, 80, 100];
    var range = ["#dedede", "#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"];
    var labels = ["No Data", "< 20%", "20% - 40%", "40% - 60%", "60% - 80%", "> 80%"];
    mapColorScale = d3.scaleThreshold()
        .domain(domain)
        .range(range);

    var tooltip = d3.select(".maptooltip");

    let mouseOver = function(event, d) {
        d3.selectAll(".topo")
            .transition()
            .duration(200)
            .style("opacity", .6)

        d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)

        tooltip.style("opacity", 0.95)
            .style("left", (event.layerX + 160) + "px")
            .style("top", (event.layerY - 15) + "px")
            .select(".maptooltip-country")
            .html(countries.filter(c => c.alpha3 == d.id)[0].name)

        var record = getDataMapRecord(selectedCat.val(), sliderStep.value(), d.id);
        var htmlValue = "No data";
        if (record) {
            htmlValue = "Level: " + record.obsPercentage.toFixed(2) + "%<br/>";
            htmlValue += "Value: " + record.obs.toFixed(2) + " " + displayUnit;
        }
        tooltip.select(".maptooltip-data")
            .html(htmlValue)
    }

    let mouseLeave = function(d) {
        d3.selectAll(".topo")
            .transition()
            .duration(200)
            .style("opacity", 1)

        tooltip.style("opacity", 0)
    }

    // Draw the map
    svg.append("g")
        .selectAll("path")
        .data(topo.features)
        .enter()
        .append("path")
        .attr("class", "topo")
        .style("stroke", "black")
        .attr("d", d3.geoPath().projection(projection))
        .on("mouseover", mouseOver)
        .on("mouseleave", mouseLeave);

    // legend
    var legend = d3.legendColor()
        .title("Driver effect level")
        .labels(labels)
        .scale(mapColorScale);

    var legend_x = -margin.left
    var legend_y = height - 100
    svg.append("g")
        .attr("class", "maplegend")
        .attr("transform", "translate(" + legend_x + "," + legend_y + ")")
        .call(legend);

    //show Energy graph for the first time
    changeFilters(selectedCat.val(), sliderStep.value());
}

function changeFilters(category, year) {

    d3.select("#map")
        .selectAll("path")
        .attr("fill", function(d) {
            var record = getDataMapRecord(category, year, d.id);
            if (record)
                return mapColorScale(record.obsPercentage);
            return mapColorScale(-1);
        });

    displayUnit = drivers.get(category).unit;


}

$(".category-icon").click(function() {
    selectedCat.val(this.id);
    changeFilters(selectedCat.val(), sliderStep.value());

    $(".category-icon-selected").removeClass("category-icon-selected");
    $(this).addClass("category-icon-selected");
});


function getDataMapRecord(category, year, country) {
    var datamap = drivers.get(category).datamap;
    var countryDataArray = datamap.get(country);
    if (!countryDataArray)
        return;

    let record = countryDataArray.filter(x => x.year == year)[0];
    if (!record)
        return;

    return record;
}