//var drivers is to keep track of all the csv file names, unit of measure and data 
//for different causes of climate change 
var drivers = new Map(); //list of key and values
drivers.set("Energy", { filename: "sdg_07_10_linear.csv", title: "Energy consumption", unit: "MTOE", datamap: new Map() });
drivers.set("Transport", { filename: "ten00126_linear.csv", title: "Transportation emissions", unit: "KTOE", datamap: new Map() });
drivers.set("Waste", { filename: "env_wasmun_linear.csv", title: "Waste per capita", unit: "Kg", datamap: new Map() });
drivers.set("Agriculture", { filename: "tai01_linear.csv", title: "Agriculture fertilizers usage", unit: "T", datamap: new Map() });

var mapColorScale;
var displayUnit;

// convert scales of each dataset into percentages to normalize the data
function mapToPercentage(value, in_min, in_max) {
    value = parseFloat(value);
    return (value - in_min) * 100 / (in_max - in_min);
}

//Promises are data types in javascript that are used to define async functions
//Here we create an array that will contain functions, then we call all those functions at once using Promise.all()
//We need to wait for all readings to finish before start building the map
var promises = []

//read the countries borders
promises.push(d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"));

// Build the countries array that contains mapping between alpha2 and alpha3 country names
// because d3 map works with alpha3 names whereas our data has alpha2 names
var countries = [];
promises.push(d3.csv("/datasets/countries.csv", function(row) {
    countries.push({
        id: row.id,
        name: row.name,
        alpha2: row.alpha2.toUpperCase(),
        alpha3: row.alpha3.toUpperCase()
    });
}));

// adding promise functions to read the csv data
var resolveEnergy, resolveTransport, resolveWaste, resolveAgriculture;
promises.push(new Promise((resolve, reject) => { resolveEnergy = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveTransport = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveWaste = resolve; }));
promises.push(new Promise((resolve, reject) => { resolveAgriculture = resolve; }));

// reading the csv data
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

        //mapping from big scale to %
        var obsValues = data.map(d => parseFloat(d.OBS_VALUE)); //data.map goes over each record and execute something
        var minOBS = d3.min(obsValues);
        var maxOBS = d3.max(obsValues);

        var currentdriver = drivers.get(key);
        var datamap = currentdriver.datamap; //retrieving the variable that will hold the obs values for each country
        data.forEach(row => {
            //data contains raw record from the csv file
            //this record contains alpha2 country we need to map it to alpha3
            let alpha3 = countries.filter(c => c.alpha2 == row.geo)[0].alpha3;
            let countryDataArray = datamap.get(alpha3);
            if (!countryDataArray)
                countryDataArray = new Array();

            countryDataArray.push({
                year: parseInt(row.TIME_PERIOD),
                obs: parseFloat(row.OBS_VALUE), // real obs value
                obsPercentage: mapToPercentage(row.OBS_VALUE, minOBS, maxOBS) //obs value converted to %
            });

            datamap.set(alpha3, countryDataArray);
        });

        currentdriver.datamap = datamap;
        drivers.set(key, currentdriver);

        resolveCallback();
    });
});


//// Define the html components that does the filtering
// Retrieve the selected Category
var selectedCat = $("#selectedCategory");
// Define Step slider object
var sliderStep = d3.sliderLeft()
    .min(2000)
    .max(2020)
    .height(400)
    .tickFormat(d3.format('')) //to remove decimals
    .ticks(20)
    .step(1)
    .on('onchange', val => {
        changeFilters(selectedCat.val(), sliderStep.value())
    });

// add step slider object to html
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
    var wsvg = 100, // %
        hsvg = 95, // %
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
        .center([0, 53]) //coordinates where we need to center
        .translate([width / 2 - margin.left, height / 2]);


    // Each value in the domain is a threshold, values < 0 are considered "No Data"
    var domain = [0, 20, 40, 60, 80, 100];
    var range = ["#dedede", "#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"];
    var labels = ["No Data", "< 20%", "20% - 40%", "40% - 60%", "60% - 80%", "> 80%"];
    mapColorScale = d3.scaleThreshold()
        .domain(domain)
        .range(range);

    //the blue box containing values on hover
    var tooltip = d3.select(".maptooltip");

    //on hover show the data inside the blue box
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

    //hide the box when leaving the map
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
        .data(topo.features) //map the countries' borders to the svg canvas to draw the map
        .enter()
        .append("path")
        .attr("class", "topo")
        .style("stroke", "black") //borders color
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

    var selectedDriver = drivers.get(category);
    displayUnit = selectedDriver.unit;

    d3.select("#maptitle")
        .html(`${selectedDriver.title} in ${year}`);
}

$(".category-icon").click(function() {
    selectedCat.val(this.id);
    changeFilters(selectedCat.val(), sliderStep.value());

    $(".category-icon-selected").removeClass("category-icon-selected");
    $(this).addClass("category-icon-selected");
});



// e.g. For Energy, 2001, Albania return the obs value and %
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