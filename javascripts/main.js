// var fileList = ["WikiNews","Huffington","CrooksAndLiars","EmptyWheel","Esquire","FactCheck"
//                 ,"VIS_papers","IMDB","PopCha","Cards_PC","Cards_Fries"]
var svg = d3.select("body").append('svg')
    .attr({
        id: "mainsvg",
        width: 1400,
        height: 660
    });
var fileList = ["WikiNews", "Huffington", "CrooksAndLiars", "EmptyWheel", "Esquire", "FactCheck", "VIS_papers", "IMDB", "PopCha", "Cards_PC", "Cards_Fries", "QuantumComputing"]

var initialDataset = "EmptyWheel";
var categories = ["person", "location", "organization", "miscellaneous"];

var fileName;

var opacity, layerPath, maxFreq;

// Store current data for redraw on palette change
var currentDrawData = null;

// Store metadata from uploaded datasets (for legend detection)
var uploadedMetadata = null;

var axisGroup = svg.append('g').attr("id", "axisGroup");
var xGridlinesGroup = svg.append('g').attr("id", "xGridlinesGroup");
var mainGroup = svg.append('g').attr("id", "main");
var legendGroup = svg.append('g').attr("id", "legend");

// Store uploaded datasets in memory (MUST be before addDatasetsOptions)
var uploadedDatasets = {};

addDatasetsOptions();

async function addDatasetsOptions() {
    var select = document.getElementById("datasetsSelect");

    // First, add hardcoded datasets
    for (var i = 0; i < fileList.length; i++) {
        var opt = fileList[i];
        var el = document.createElement("option");
        el.textContent = opt;
        el.value = opt;
        el["data-image"] = "images2/datasetThumnails/" + fileList[i] + ".png";
        select.appendChild(el);
    }

    // Then, fetch and add all datasets from the data/ folder via API
    try {
        console.log('Fetching datasets from API...');
        const response = await fetch('http://localhost:5000/api/datasets');
        console.log('API response status:', response.status, response.ok);
        const result = await response.json();
        console.log('API result:', result);

        if (result.success && result.datasets) {
            console.log(`✓ Found ${result.count} datasets in data/ folder`);
            console.log('Datasets:', result.datasets.map(d => d.name));

            result.datasets.forEach(dataset => {
                console.log(`Processing dataset: ${dataset.name}`);
                // Check if not already in the hardcoded list
                const existing = select.querySelector(`option[value="${dataset.name}"]`);
                if (!existing) {
                    const el = document.createElement("option");
                    el.textContent = `${dataset.name} (${dataset.file_size_mb} MB)`;
                    el.value = dataset.name;
                    el.setAttribute('data-filepath', dataset.filepath);
                    el.setAttribute('data-from-folder', 'true');
                    select.appendChild(el);

                    // Store metadata for loading later
                    uploadedDatasets[dataset.name] = {
                        filepath: dataset.filepath,
                        metadata: dataset.metadata || {}
                    };

                    console.log(`✓ Added dataset from folder: ${dataset.name}`);
                }
            });
        }
    } catch (error) {
        console.warn('Could not fetch datasets from API:', error);
        console.log('Falling back to hardcoded list only');
    }

    // Load uploaded datasets from sessionStorage
    loadUploadedDatasetsFromStorage();

    // Log dataset options for debugging
    const selectElement = document.getElementById('datasetsSelect');
    if (selectElement) {
        console.log('Datasets loaded:', selectElement.options.length);
        const optionNames = Array.from(selectElement.options).map(opt => opt.value);
        console.log('Available datasets:', optionNames);
    }

    // Set initial dataset selection
    document.getElementById('datasetsSelect').value = initialDataset;
    console.log('Initial dataset selected:', initialDataset);

    fileName = document.getElementById("datasetsSelect").value;
    loadData();
}

/**
 * Load uploaded datasets from sessionStorage and add to dropdown
 */
function loadUploadedDatasetsFromStorage() {
    const select = document.getElementById("datasetsSelect");

    // Check sessionStorage for uploaded datasets
    try {
        for (let key in sessionStorage) {
            if (key.startsWith('dataset_')) {
                try {
                    const datasetName = key.replace('dataset_', '');
                    const datasetData = JSON.parse(sessionStorage.getItem(key));

                    // Store in memory
                    uploadedDatasets[datasetName] = datasetData;

                    // Check if option already exists
                    const existing = select.querySelector(`option[value="${datasetName}"]`);
                    if (!existing) {
                        // Add to dropdown
                        const option = document.createElement("option");
                        option.textContent = datasetName + " (uploaded)";
                        option.value = datasetName;
                        option.setAttribute('data-uploaded', 'true');
                        select.appendChild(option);

                        console.log(`✓ Loaded uploaded dataset: ${datasetName}`);
                    }
                } catch (e) {
                    console.warn(`Error loading dataset from storage: ${e}`);
                }
            }
        }
    } catch (e) {
        console.warn(`Error reading sessionStorage: ${e}`);
    }
}

/**
 * Reload datasets (called when new dataset is uploaded)
 */
function reloadDatasets() {
    const select = document.getElementById("datasetsSelect");

    // Remove old uploaded options
    const uploadedOptions = select.querySelectorAll('[data-uploaded="true"]');
    uploadedOptions.forEach(opt => opt.remove());

    // Reload from storage
    loadUploadedDatasetsFromStorage();

    console.log('✓ Datasets reloaded');
}

// Expose to window for upload.js to call
window.reloadDatasets = reloadDatasets;

/**
 * Clear all uploaded datasets
 */
function clearAllDatasets() {
    const select = document.getElementById("datasetsSelect");

    // Remove all uploaded options from dropdown
    const uploadedOptions = select.querySelectorAll('[data-uploaded="true"]');
    uploadedOptions.forEach(opt => opt.remove());

    // Clear from sessionStorage
    const keysToRemove = [];
    for (let key in sessionStorage) {
        if (key.startsWith('dataset_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));

    // Clear from memory
    uploadedDatasets = {};

    console.log('✓ All uploaded datasets cleared');

    // Reset to initial dataset
    select.value = initialDataset;
    fileName = initialDataset;
    loadData();
}

var spinner;

/**
 * Process and display uploaded dataset
 */
function processUploadedDataset(fileName, datasetData) {
    try {
        // Extract categories from metadata
        let declaredCategories = [];
        if (datasetData.metadata && datasetData.metadata.categories) {
            declaredCategories = datasetData.metadata.categories;
            console.log('Declared categories from metadata:', declaredCategories);
        }

        if (datasetData.data) {
            let uploadedData = datasetData.data;

            console.log('Data before validation:', uploadedData.length, 'periods');

            // VALIDATE: Check which categories actually have data
            const validation = validateAndFilterCategories(uploadedData, declaredCategories);
            console.log('Category validation results:', validation);

            // WARN: Show missing categories
            if (validation.missingCategories.length > 0) {
                let message = '⚠️ Category Data Issues:\n\n';
                validation.missingCategories.forEach(cat => {
                    message += `• ${cat.category}: Present in ${cat.presenceCount}/${validation.totalPeriods} periods (${cat.presenceRate}%)\n`;
                    if (cat.presenceCount === 0) {
                        message += `  → Completely missing - excluded from visualization\n`;
                    } else {
                        message += `  → Too sparse - excluded from visualization\n`;
                    }
                });
                message += `\nVisualization will continue with categories that have data.`;
                console.warn(message);
            }

            // CLEANUP: Remove invalid categories from data
            uploadedData = cleanupDataWithValidCategories(uploadedData, validation.validCategories);

            // UPDATE: Set categories to only valid ones
            categories = validation.validCategories;
            console.log('Updated categories to valid ones:', categories);

            // UPDATE METADATA: Reflect actual categories
            if (datasetData.metadata) {
                datasetData.metadata.categories = validation.validCategories;
            }

            uploadedMetadata = datasetData.metadata;

            console.log('Data before processSudden:', uploadedData.length, 'periods');
            processSudden(uploadedData);

            totalData = JSON.parse(JSON.stringify(uploadedData));
            const processedData = getTop(JSON.parse(JSON.stringify(totalData)), categories, initTop);

            console.log('Data after processing:', processedData.length, 'periods');

            globalData = processedData;
            draw(processedData);
            console.log('✓ Uploaded dataset visualized with validated categories');
        } else {
            console.error('No data in uploaded dataset:', datasetData);
        }
    } catch (e) {
        console.error('Error processing uploaded dataset:', e);
    } finally {
        spinner.stop();
    }
}

function loadData() {
    // START: loader spinner settings ****************************
    var opts = {
        lines: 25, // The number of lines to draw
        length: 15, // The length of each line
        width: 5, // The line thickness
        radius: 25, // The radius of the inner circle
        color: '#000', // #rgb or #rrggbb or array of colors
        speed: 2, // Rounds per second
        trail: 50, // Afterglow percentage
        className: 'spinner', // The CSS class to assign to the spinner
    };
    var target = document.getElementById('loadingSpinner');
    spinner = new Spinner(opts).spin(target);
    // END: loader spinner settings ****************************

    // Check if it's an uploaded dataset
    if (fileName in uploadedDatasets) {
        console.log(`✓ Loading uploaded dataset: ${fileName}`);

        // Check if we have full data or just metadata
        const storedData = uploadedDatasets[fileName];
        if (storedData.filepath && !storedData.data) {
            // We only have metadata, need to load the actual file
            console.log(`Loading dataset from file: ${storedData.filepath}`);
            fetch(storedData.filepath)
                .then(res => res.json())
                .then(fileData => {
                    // Cache it in memory for future use
                    uploadedDatasets[fileName] = fileData;
                    // Process and display
                    processUploadedDataset(fileName, fileData);
                })
                .catch(err => {
                    console.error('Error loading dataset file:', err);
                    spinner.stop();
                });
            return; // Exit early, will continue in the promise
        }

        // We have full data cached in memory
        processUploadedDataset(fileName, storedData);
        return;
    }

    // Clear uploaded metadata when switching to built-in dataset
    uploadedMetadata = null;
    console.log('Cleared uploadedMetadata for built-in dataset');

    fileName = "data/" + fileName + ".tsv"; // Add data folder path
    if (fileName.indexOf("Cards_Fries") >= 0) {
        categories = ["increases_activity", "decreases_activity"];
        loadAuthorData(draw, initTop);
    }
    else if (fileName.indexOf("Cards_PC") >= 0) {
        categories = ["adds_modification", "removes_modification", "increases", "decreases", "binds", "translocation"];
        loadAuthorData(draw, initTop);
    }
    else if (fileName.indexOf("PopCha") >= 0) {
        categories = ["Comedy", "Drama", "Action", "Fantasy", "Horror"];
        loadAuthorData(draw, initTop);
    }
    else if (fileName.indexOf("IMDB") >= 0) {
        categories = ["Comedy", "Drama", "Action", "Family"];
        loadAuthorData(draw, initTop);
    }
    else if (fileName.indexOf("VIS") >= 0) {
        categories = ["Vis", "VAST", "InfoVis", "SciVis"];
        loadAuthorData(draw, initTop);
    }
    else if (fileName.indexOf("QuantumComputing") >= 0) {
        fileName = "data/" + fileName + ".tsv"; // Add data folder path
        categories = ["Unknown citation", "Have citation", "Affiliations", "Author"];
        initTop = 15;
        loadQuantumComputing(draw, initTop);
    }
    else if (fileName.indexOf("Huffington") >= 0) {
        categories = ["person", "location", "organization", "miscellaneous"];
        loadBlogPostData(draw, initTop);
        document.getElementById("rel").checked = true;
    }
    else {
        categories = ["person", "location", "organization", "miscellaneous"];
        loadBlogPostData(draw, initTop);
    }
}

function loadNewData(event) {
    legendGroup.selectAll("*").remove();
    axisGroup.selectAll("*").remove();
    xGridlinesGroup.selectAll("*").remove();
    mainGroup.selectAll("*").remove();

    // Use value instead of text to get the actual dataset name (works for both built-in and uploaded)
    fileName = this.options[this.selectedIndex].value;
    document.getElementById("rel").checked = false;
    loadData();
}

// Expose to window for upload.js to call
window.loadNewData = loadNewData;

function draw(data) {
    // Clear selected word when drawing new dataset
    if (typeof window.clearSelectedWordForTour === 'function') {
        window.clearSelectedWordForTour();
    }

    // Store data for redraw on color palette changes
    currentDrawData = data;

    // Extract and dispatch periods for A/B Compare
    if (data && data.length > 0) {
        console.log('Draw function - First data item:', JSON.stringify(data[0], null, 2));
        const periods = data.map(d => d.date);
        console.log('✓ Extracted periods:', periods);
        console.log('Periods count:', periods.length);
        console.log('Periods with details:', periods.map((p, i) => ({ index: i, period: p, type: typeof p, isEmpty: !p })));

        // Dispatch dataLoaded event with periods
        window.dispatchEvent(new CustomEvent('dataLoaded', {
            detail: { periods: periods }
        }));
    } else {
        console.warn('Draw function - No data or empty data array');
    }

    //Layout data
    var font = "Arial";
    var interpolation = "cardinal";
    const axisPadding = 10;
    const legendFontSize = 12;
    const legendOffset = 10;
    var legendHeight = categories.length * legendFontSize;

    const margins = {left: 20, top: 20, right: 10, bottom: 30};
    var width = globalWidth - (margins.left + margins.top);
    var height = globalHeight - (+margins.top + margins.bottom + axisPadding + legendHeight);

    // Reorder data to match the correct category order before visualization
    var categoryOrder = categories;  // Use the categories array
    data.forEach(function(period) {
        if (period.words) {
            var reorderedWords = {};
            categoryOrder.forEach(function(cat) {
                if (period.words[cat]) {
                    reorderedWords[cat] = period.words[cat];
                }
            });
            // Add any categories that weren't in the expected order (edge case)
            Object.keys(period.words).forEach(function(cat) {
                if (!reorderedWords[cat]) {
                    reorderedWords[cat] = period.words[cat];
                }
            });
            period.words = reorderedWords;
        }
    });

    var ws = d3.layout.wordStream()
            .size([width, height])
            .fontScale(d3.scale.linear())
            .minFontSize(globalMinFont)
            .maxFontSize(globalMaxFont)
            .data(data)
            .flag(globalFlag)
        // .font(font)
        // .interpolate(interpolation)
        // .fontScale(d3.scale.linear())
    ;
    var boxes = ws.boxes();
    var minSud = ws.minSud();
    var maxSud = ws.maxSud();
    maxFreq = ws.maxFreq();

    //set svg data.
    svg
        .transition()
        .duration(300)
        .attr({
            width: globalWidth,
            height: globalHeight,
        });

    var area = d3.svg.area()
        .interpolate(interpolation)
        .x(function (d) {
            return (d.x);
        })
        .y0(function (d) {
            return d.y0;
        })
        .y1(function (d) {
            return (d.y0 + d.y);
        });

    //Display time axes
    var dates = [];
    boxes.data.forEach(row => {
        dates.push(row.date);
    });

    // Store all dates globally for zoom-based filtering
    allAxisDates = dates;

    // Create scale with ALL dates for proper positioning
    var xAxisScale = d3.scale.ordinal().domain(dates).rangeBands([0, width]);

    // Initially show filtered dates (at zoom scale 1)
    var filteredDates = getFilteredAxisDates(dates, 1.0);
    var xAxis = d3.svg.axis()
        .orient('bottom')
        .scale(xAxisScale)
        .tickValues(filteredDates); // Only show filtered dates

    axisGroup.attr('transform', 'translate(' + (margins.left) + ',' + (height + margins.top + axisPadding + legendHeight) + ')');
    var axisNodes = axisGroup.call(xAxis);
    styleAxis(axisNodes);

    //Display the vertical gridline
    var xGridlineScale = d3.scale.ordinal().domain(d3.range(0, dates.length + 1)).rangeBands([0, width + width / boxes.data.length]);
    var xGridlinesAxis = d3.svg.axis().orient('bottom').scale(xGridlineScale);

    xGridlinesGroup.attr('transform', 'translate(' + (margins.left - width / boxes.data.length / 2) + ',' + (height + margins.top + axisPadding + legendHeight + margins.bottom) + ')');
    var gridlineNodes = xGridlinesGroup.call(xGridlinesAxis.tickSize(-height - axisPadding - legendHeight - margins.bottom, 0, 0).tickFormat(''));
    styleGridlineNodes(gridlineNodes);

    //Main group
    mainGroup.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');
    var wordStreamG = mainGroup.append('g').attr("id", "wordStreamG");

// =============== Get BOUNDARY and LAYERPATH ===============
    const lineCardinal = d3.svg.line()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .interpolate("cardinal");

    var boundary = [];
    for (var i = 0; i < boxes.layers[0].length; i++) {
        var tempPoint = Object.assign({}, boxes.layers[0][i]);
        tempPoint.y = tempPoint.y0;
        boundary.push(tempPoint);
    }

    for (var i = boxes.layers[boxes.layers.length - 1].length - 1; i >= 0; i--) {
        var tempPoint2 = Object.assign({}, boxes.layers[boxes.layers.length - 1][i]);
        tempPoint2.y = tempPoint2.y + tempPoint2.y0;
        boundary.push(tempPoint2);
    }       // Add next (8) elements

    var lenb = boundary.length;

    // Get the string for path

    var combined = lineCardinal(boundary.slice(0, lenb / 2))
        + "L"
        + lineCardinal(boundary.slice(lenb / 2, lenb))
            .substring(1, lineCardinal(boundary.slice(lenb / 2, lenb)).length)
        + "Z";
    // ============= Get LAYER PATH ==============

    layerPath = mainGroup.append("path")
        .attr("d", combined)
        .attr("visibility", "hidden")
        .attr("class", "layerpath")
        .attr({
            'fill-opacity': 1,
            'stroke-opacity': 0,
        });
    // draw curves
    var topics = boxes.topics;

    var curve = mainGroup.selectAll('.curve').data(boxes.layers);

    curve.exit().remove();

    curve.enter()
        .append('path')
        .attr('d', area)
        .style('fill', function (d, i) {
            return color(i);
        })
        .attr({
            "class": "curve",
            'fill-opacity': 0,
            stroke: 'black',
            'stroke-width': 0,
            topic: function (d, i) {
                return topics[i];
            }
        });

    curve.attr("d", area)
        .style('fill', function (d, i) {
            return color(i);
        })
        .attr({
            'fill-opacity': 0,
            stroke: 'black',
            'stroke-width': 0,
            topic: function (d, i) {
                return topics[i];
            }
        });


    var allWords = [];
    d3.map(boxes.data, function (row) {
        boxes.topics.forEach(topic => {
            allWords = allWords.concat(row.words[topic]);
        });
    });

    allW = JSON.parse(JSON.stringify(allWords));

    opacity = d3.scale.log()
        .domain([minSud, maxSud])
        .range([0.4, 1]);

    var lineScale;
    if (fileName.indexOf("Huffington") >= 0) {
        d3.json("data/linksHuff2012.json", function (error, rawLinks) {
            if (error) {
                console.warn("Huffington links file not found, displaying without relationships:", error);
                drawWords();
                return;
            }
            const threshold = 5;
            const links = rawLinks.filter(d => d.weight > threshold);
            var isRel = document.getElementById("rel").checked;

            links.forEach(d => {
                d.sourceID = d.sourceID.split(".").join("_").split(" ").join("_");
                d.targetID = d.targetID.split(".").join("_").split(" ").join("_");
            });
            let visibleLinks = [];

            // select only links with: word place = true and have same id
            links.forEach(d => {
                let s = allWords.find(w => (w.id === d.sourceID) && (w.placed === true));
                let t = allWords.find(w => (w.id === d.targetID) && (w.placed === true));
                if ((s !== undefined) && (t !== undefined)) {
                    visibleLinks.push({
                        sourceX: s.x,
                        sourceY: s.y,
                        targetX: t.x,
                        targetY: t.y,
                        weight: d.weight,
                        sourceID: d.sourceID,
                        targetID: d.targetID,
                        id: d.sourceID + "_" + d.targetID
                    });
                }
            });

            lineScale = d3.scale.linear()
                .domain(d3.extent(visibleLinks, d => d.weight))
                .range([0.5, 3]);

            opacScale = d3.scale.linear()
                .domain(d3.extent(visibleLinks, d => d.weight))
                .range([0.5, 1]);

            var connection = mainGroup.selectAll(".connection").data(visibleLinks, d => d.id);
            connection.exit().remove();

            connection.enter()
                .append("line")
                .attr("class", "connection");

            connection.transition()
                .duration(800)
                .attr("opacity", isRel ? 1 : 0)
                .attr({
                    "x1": d => d.sourceX,
                    "y1": d => d.sourceY,
                    "x2": d => d.targetX,
                    "y2": d => d.targetY,
                    "stroke": "#444444",
                    "stroke-opacity": d => opacScale(d.weight),
                    "stroke-width": d => lineScale(d.weight)
                });
            drawWords();
        });
    } else drawWords();

    function drawWords() {
        var prevColor;

        var texts = mainGroup.selectAll('.word').data(allWords, d => d.id);

        texts.exit().remove();

        var textEnter = texts.enter().append('g')
            .attr({
                transform: function (d) {
                    return 'translate(' + d.x + ', ' + d.y + ')rotate(' + d.rotate + ')';
                }
            })
            .attr("class", "word")
            .append('text')

        textEnter
            .text(function (d) {
                return d.text;
            })
            .attr({
                "id": d => d.id,
                "class": "textData",
                'font-family': font,
                'font-size': function (d) {
                    return d.fontSize;
                },
                "fill": function (d, i) {
                    // Use sentiment color if available, otherwise use category color
                    if (typeof SentimentVisualization !== 'undefined' && SentimentVisualization.getWordColor) {
                        return SentimentVisualization.getWordColor(d, categories.indexOf(d.topic));
                    }
                    return color(categories.indexOf(d.topic));
                },
                "fill-opacity": function (d) {
                    return opacity(d.sudden);
                },
                'text-anchor': 'middle',
                'alignment-baseline': 'middle',
                topic: function (d) {
                    return d.topic;
                },
                visibility: function (d) {
                    return d.placed ? "visible" : "hidden";
                }
            });

        texts.transition().duration(800)
            .attr({
                transform: function (d) {
                    return 'translate(' + d.x + ', ' + d.y + ')rotate(' + d.rotate + ')';
                }
            })
            .select("text")
            .attr('font-size', function (d) {
                return d.fontSize;
            })
            .attr({
                visibility: function (d) {
                    return d.placed ? "visible" : "hidden";
                }
            });

        // texts.style("text-decoration", "underline");

        mainGroup.selectAll(".connection").on("mouseover", function () {
            var thisLink = d3.select(this);
            thisLink.style('cursor', 'crosshair');
            // in order to select by byid, the id must not have space
            var sourceText = mainGroup.select("#" + thisLink[0][0].__data__.sourceID);
            var prevSourceColor = sourceText.attr("fill");
            var targetText = mainGroup.select("#" + thisLink[0][0].__data__.targetID);
            var prevTargetColor = targetText.attr("fill");

            thisLink.attr("stroke-width", 4);

            sourceText.attr({
                stroke: prevSourceColor,
                fill: prevSourceColor,
                'stroke-width': 1.5
            });

            targetText.attr({
                stroke: prevTargetColor,
                fill: prevTargetColor,
                'stroke-width': 1.5
            });
        });

        mainGroup.selectAll(".connection").on("mouseout", function () {
            var thisLink = d3.select(this);
            thisLink.style('cursor', 'crosshair');
            var sourceText = mainGroup.select("#" + thisLink[0][0].__data__.sourceID);
            var targetText = mainGroup.select("#" + thisLink[0][0].__data__.targetID);

            thisLink.attr("stroke-width", lineScale(thisLink[0][0].__data__.weight));

            sourceText.attr({
                stroke: 'none',
                'stroke-width': 0
            });

            targetText.attr({
                stroke: 'none',
                'stroke-width': 0
            });
        });

        //Highlight
        mainGroup.selectAll('.textData').on('mouseenter', function () {
            var thisText = d3.select(this);
            thisText.style('cursor', 'pointer');
            prevColor = thisText.attr('fill');
            var text = thisText.text();
            var topic = thisText.attr('topic');
            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && t.text === text && t.topic === topic;
            });
            allTexts.attr({
                stroke: prevColor,
                'stroke-width': 1
            });
        });
        mainGroup.selectAll('.textData').on('mouseout', function () {
            var thisText = d3.select(this);
            thisText.style('cursor', 'default');
            var text = thisText.text();
            var topic = thisText.attr('topic');
            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && !t.cloned && t.text === text && t.topic === topic;
            });
            allTexts.attr({
                stroke: 'none',
                'stroke-width': '0'
            });
        });
        //Click
        mainGroup.selectAll('.textData').on('click', function () {
            var thisText = d3.select(this);
            var text = thisText.text();
            var topic = thisText.attr('topic');

            // Store selected word for tour
            var wordColor = thisText.attr('fill');
            if (typeof window.setSelectedWordForTour === 'function') {
                window.setSelectedWordForTour(text, topic, wordColor);
            }

            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && t.text === text && t.topic === topic;
            });

            //Select the data for the stream layers
            var pathElement = d3.select("path[topic='" + topic + "']");
            if (!pathElement || !pathElement.node()) {
                console.warn('Stream layer path not found for topic:', topic);
                return;
            }

            var streamLayer = pathElement.datum();
            if (!streamLayer) {
                console.warn('No data bound to stream layer path');
                return;
            }

            //Push all points
            var points = Array();
            //Initialize all points
            streamLayer.forEach(elm => {
                points.push({
                    x: elm.x,
                    y0: elm.y0 + elm.y,
                    y: 0//zero as default
                });
            });
            allTexts[0].forEach(t => {
                var data = t.__data__;
                var fontSize = data.fontSize;
                //The point
                var thePoint = points[data.timeStep + 1];
                ;//+1 since we added 1 to the first point and 1 to the last point.
                thePoint.y = -data.streamHeight;
                //Set it to visible.
                //Clone the nodes.
                var clonedNode = t.cloneNode(true);
                d3.select(clonedNode).attr({
                    visibility: "visible",
                    stroke: 'none',
                    'stroke-size': 0,
                });
                var clonedParentNode = t.parentNode.cloneNode(false);
                clonedParentNode.appendChild(clonedNode);

                t.parentNode.parentNode.appendChild(clonedParentNode);
                d3.select(clonedParentNode).attr({
                    cloned: true,
                    topic: topic
                }).transition().duration(300).attr({
                    transform: function (d, i) {
                        return 'translate(' + thePoint.x + ',' + (thePoint.y0 + thePoint.y - fontSize / 2) + ')';
                    },
                });
            });
            //Add the first and the last points
            points[0].y = points[1].y;//First point
            points[points.length - 1].y = points[points.length - 2].y;//Last point
            //Append stream
            wordStreamG.append('path')
                .datum(points)
                .attr('d', area)
                .style('fill', prevColor)
                .attr({
                    'fill-opacity': prevColor,
                    stroke: 'black',
                    'stroke-width': 0.3,
                    topic: topic,
                    wordStream: true
                });
            //Hide all other texts
            var allOtherTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && !t.cloned && t.topic === topic;
            });
            allOtherTexts.attr('visibility', 'hidden');
        });
        topics.forEach(topic => {
            d3.select("path[topic='" + topic + "']").on('click', function () {
                mainGroup.selectAll('.textData').filter(t => {
                    return t && !t.cloned && t.placed && t.topic === topic;
                }).attr({
                    visibility: 'visible'
                });
                //Remove the cloned element
                document.querySelectorAll("g[cloned='true'][topic='" + topic + "']").forEach(node => {
                    node.parentNode.removeChild(node);
                });
                //Remove the added path for it
                document.querySelectorAll("path[wordStream='true'][topic='" + topic + "']").forEach(node => {
                    node.parentNode.removeChild(node);
                });

                // Clear selection when clicking stream to deselect
                if (typeof window.clearSelectedWordForTour === 'function') {
                    window.clearSelectedWordForTour();
                }
            });

        });

        //Build the legends
        legendGroup.attr('transform', 'translate(' + margins.left + ',' + (height + margins.top + legendOffset) + ')');

        // Determine what type of categories we're using: sentiment, emotions, happiness, or topics
        var sentimentCategories = ['Positive', 'Negative', 'Neutral'];
        var emotionCategories = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'disgust', 'anger'];
        var happinessCategories = ['very_happy', 'happy', 'fine', 'unhappy', 'very_unhappy'];
        var isTopicBased = false;
        var isEmotionBased = false;
        var isHappinessBased = false;
        var legendData;

        // Check metadata first if available (more reliable than boxes.topics)
        var categoriesToCheck = null;
        if (typeof uploadedMetadata !== 'undefined' && uploadedMetadata && uploadedMetadata.categories) {
            categoriesToCheck = uploadedMetadata.categories;
            console.log('Using metadata categories:', categoriesToCheck);
        } else {
            categoriesToCheck = boxes.topics;
            console.log('Using boxes.topics:', categoriesToCheck);
        }

        // Check what categories we actually have
        if (categoriesToCheck && categoriesToCheck.length > 0) {
            // Check if categories are emotions, happiness, topics, or sentiments
            if (happinessCategories.some(h => categoriesToCheck.includes(h))) {
                isHappinessBased = true;
                console.log('Detected happiness-based data');
            } else if (emotionCategories.some(e => categoriesToCheck.includes(e))) {
                isEmotionBased = true;
                console.log('Detected emotion-based data');
            } else if (!sentimentCategories.includes(categoriesToCheck[0])) {
                isTopicBased = true;
                console.log('Detected topic-based data');
            } else {
                console.log('Detected sentiment-based data');
            }
        }

        if (isTopicBased) {
            // Use topic-based legend with topic colors
            var palette = (typeof SentimentVisualization !== 'undefined')
                ? SentimentVisualization.colorPalettes[SentimentVisualization.currentPalette]
                : {};

            legendData = boxes.topics.map(function(topic) {
                // Get color for topic from palette
                var topicColor = palette[topic];
                if (!topicColor) {
                    // Fallback to D3 color scale if not in palette
                    var topicIndex = boxes.topics.indexOf(topic);
                    topicColor = color(topicIndex);
                }
                return { label: topic, color: topicColor };
            });
        } else if (isEmotionBased) {
            // Use emotion-based legend with emotion colors
            var emotionPalette = (typeof SentimentVisualization !== 'undefined')
                ? SentimentVisualization.colorPalettes[SentimentVisualization.currentPalette]
                : { joy: '#2E7D32', surprise: '#42A5F5', neutral: '#757575', fear: '#1565C0', sadness: '#1565C0', disgust: '#D32F2F', anger: '#F57C00' };

            // For emotion-based data, only display emotions that actually exist in the data (boxes.topics)
            // Don't use metadata.categories which contains all possible emotions
            var emotionsToDisplay = boxes.topics || [];
            if (!emotionsToDisplay || emotionsToDisplay.length === 0) {
                emotionsToDisplay = categoriesToCheck;
            }

            // Map emotions to colors, capitalizing labels for display
            legendData = emotionsToDisplay.map(function(emotion) {
                var emotionColor = emotionPalette[emotion];
                var displayLabel = emotion.charAt(0).toUpperCase() + emotion.slice(1);
                return { label: displayLabel, color: emotionColor };
            });

            console.log('Emotion legend data:', legendData);
        } else if (isHappinessBased) {
            // Use happiness-based legend with happiness colors
            var happinessPalette = (typeof SentimentVisualization !== 'undefined')
                ? SentimentVisualization.colorPalettes[SentimentVisualization.currentPalette]
                : { very_happy: '#2E7D32', happy: '#66BB6A', fine: '#FBC02D', unhappy: '#F57C00', very_unhappy: '#D32F2F' };

            // For happiness-based data, only display happiness categories that actually exist in the data (boxes.topics)
            var happinessToDisplay = boxes.topics || [];
            if (!happinessToDisplay || happinessToDisplay.length === 0) {
                happinessToDisplay = categoriesToCheck;
            }

            // Define the proper order for happiness categories (most happy to least happy)
            var happinessOrder = ['very_happy', 'happy', 'fine', 'unhappy', 'very_unhappy'];

            // Map happiness categories to colors, with readable labels
            var happinessLabels = {
                'very_happy': 'Very Happy',
                'happy': 'Happy',
                'fine': 'Fine',
                'unhappy': 'Unhappy',
                'very_unhappy': 'Very Unhappy'
            };

            // Sort happiness categories in the proper order
            var sortedHappiness = happinessToDisplay.sort(function(a, b) {
                return happinessOrder.indexOf(a) - happinessOrder.indexOf(b);
            });

            legendData = sortedHappiness.map(function(happiness) {
                var happinessColor = happinessPalette[happiness];
                var displayLabel = happinessLabels[happiness] || happiness;
                return { label: displayLabel, color: happinessColor };
            });

            console.log('Happiness legend data:', legendData);
        } else {
            // Use sentiment-based legend with colors from current palette
            var sentimentPalette = (typeof SentimentVisualization !== 'undefined')
                ? SentimentVisualization.colorPalettes[SentimentVisualization.currentPalette]
                : { positive: '#2E7D32', neutral: '#757575', negative: '#F57C00' };

            legendData = [
                { label: 'Positive', color: sentimentPalette.positive || '#2E7D32' },
                { label: 'Neutral', color: sentimentPalette.neutral || '#757575' },
                { label: 'Negative', color: sentimentPalette.negative || '#F57C00' }
            ];
        }

        var legendNodes = legendGroup.selectAll('g').data(legendData).enter().append('g')
            .attr('transform', function (d, i) {
                return 'translate(' + 10 + ',' + (i * legendFontSize) + ')';
            });
        legendNodes.append('circle').attr({
            r: 5,
            fill: function (d) {
                return d.color;
            },
            'fill-opacity': 1,
            stroke: 'black',
            'stroke-width': .5,
        });
        legendNodes.append('text').text(function (d) {
            return d.label;
        }).attr({
            'font-size': legendFontSize,
            'alignment-baseline': 'middle',
            dx: 8
        });

        // Update legend height calculation
        var actualLegendHeight = legendData.length * legendFontSize;
        if (actualLegendHeight !== legendHeight) {
            legendHeight = actualLegendHeight;
        }

        spinner.stop();
    };
}

function styleAxis(axisNodes) {
    axisNodes.selectAll('.domain').attr({
        fill: 'none'
    });
    axisNodes.selectAll('.tick line').attr({
        fill: 'none',
    });
    axisNodes.selectAll('.tick text').attr({
        'font-family': 'serif',
        'font-size': 15
    });
}

function styleGridlineNodes(gridlineNodes) {
    gridlineNodes.selectAll('.domain').attr({
        fill: 'none',
        stroke: 'none'
    });
    gridlineNodes.selectAll('.tick line').attr({
        fill: 'none',
        'stroke-width': 0.7,
        stroke: 'lightgray'
    });
}

/**
 * Calculate which axis labels to show based on dataset size and zoom level
 * @param {Array} allDates - All date labels
 * @param {number} zoomScale - Current zoom scale (1 = no zoom, 3 = 3x zoomed)
 * @returns {Array} Filtered array of dates to display
 */
function getFilteredAxisDates(allDates, zoomScale) {
    var periodCount = allDates.length;
    var skipInterval;

    // At zoom scale 1 (no zoom), determine skip interval based on dataset size
    if (zoomScale <= 1.5) {
        if (periodCount >= 300) {
            skipInterval = 25; // Show every 25th label (312 periods → ~12 labels)
        } else if (periodCount >= 200) {
            skipInterval = 20; // Show every 20th label
        } else if (periodCount >= 150) {
            skipInterval = 15; // Show every 15th label
        } else if (periodCount >= 100) {
            skipInterval = 10; // Show every 10th label
        } else if (periodCount >= 50) {
            skipInterval = 5; // Show every 5th label
        } else {
            skipInterval = 2; // Show every 2nd label
        }
    }
    // At moderate zoom (1.5x - 2.5x), show more labels
    else if (zoomScale <= 2.5) {
        if (periodCount >= 300) {
            skipInterval = 15; // Show every 15th
        } else if (periodCount >= 200) {
            skipInterval = 12;
        } else if (periodCount >= 100) {
            skipInterval = 8;
        } else if (periodCount >= 50) {
            skipInterval = 3;
        } else {
            skipInterval = 1; // Show all
        }
    }
    // At high zoom (2.5x+), show most or all labels
    else {
        if (periodCount >= 300) {
            skipInterval = 8; // Show every 8th
        } else if (periodCount >= 200) {
            skipInterval = 5;
        } else if (periodCount >= 100) {
            skipInterval = 3;
        } else {
            skipInterval = 1; // Show all
        }
    }

    // Filter dates: always include first and last
    var filteredDates = [];
    for (var i = 0; i < allDates.length; i++) {
        if (i === 0 || i === allDates.length - 1 || i % skipInterval === 0) {
            filteredDates.push(allDates[i]);
        }
    }

    return filteredDates;
}

/**
 * Update axis tick labels based on current zoom level
 * Called during zoom events and tour animation
 * @param {number} zoomScale - Current zoom scale
 */
function updateAxisForZoom(zoomScale) {
    if (!allAxisDates || allAxisDates.length === 0) {
        return; // No axis data yet
    }

    var filteredDates = getFilteredAxisDates(allAxisDates, zoomScale);

    // Get the current axis scale and update tick values
    var width = globalWidth - 40;

    var xAxisScale = d3.scale.ordinal().domain(allAxisDates).rangeBands([0, width]);
    var xAxis = d3.svg.axis()
        .orient('bottom')
        .scale(xAxisScale)
        .tickValues(filteredDates);

    // Redraw axis with new tick values
    axisGroup.call(xAxis);
    styleAxis(axisGroup);
}

/**
 * Update axis to show only the dates visible in the current viewport
 * Called during tour animation to sync axis with visible portion
 * @param {number} translateX - Current X translation
 * @param {number} scale - Current zoom scale
 * @param {number} viewportWidth - Width of the viewport
 */
function updateAxisForVisibleRange(translateX, scale, viewportWidth) {
    if (!allAxisDates || allAxisDates.length === 0) {
        return;
    }

    var width = globalWidth - 40;

    // Calculate the visible range in data coordinates
    // When zoomed and translated, we need to find which portion of the original data is visible
    var visibleStartX = -translateX / scale;
    var visibleEndX = visibleStartX + (viewportWidth / scale);

    // Map the visible X range to date indices
    var dateWidth = width / allAxisDates.length;
    var startIndex = Math.floor(visibleStartX / dateWidth);
    var endIndex = Math.ceil(visibleEndX / dateWidth);

    // Clamp to valid range
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(allAxisDates.length - 1, endIndex);

    // Get the visible dates
    var visibleDates = allAxisDates.slice(startIndex, endIndex + 1);

    // Apply smart filtering based on how many dates are visible
    var filteredDates = getFilteredAxisDates(visibleDates, scale);

    console.log('Visible range: indices', startIndex, 'to', endIndex,
                '(', visibleDates.length, 'dates,', filteredDates.length, 'shown)');

    // Create axis with only visible dates
    var xAxisScale = d3.scale.ordinal()
        .domain(allAxisDates)  // Full domain for proper positioning
        .rangeBands([0, width]);

    var xAxis = d3.svg.axis()
        .orient('bottom')
        .scale(xAxisScale)
        .tickValues(filteredDates);

    // Redraw axis
    axisGroup.call(xAxis);
    styleAxis(axisGroup);
}

/**
 * Store all dates globally for zoom updates
 */
var allAxisDates = [];

// Expose globally for zoom-animation.js to call
window.updateAxisForZoom = updateAxisForZoom;
window.updateAxisForVisibleRange = updateAxisForVisibleRange;

/**
 * Update word colors based on current palette
 * Called when color palette changes without full redraw
 */
function updateWordColors() {
    console.log('updateWordColors() called');
    console.log('currentDrawData:', currentDrawData ? 'exists' : 'NULL');
    console.log('SentimentVisualization:', typeof SentimentVisualization);
    console.log('mainGroup:', mainGroup ? 'exists' : 'NULL');

    if (!currentDrawData) {
        console.warn('❌ currentDrawData is null or undefined');
        return;
    }

    if (typeof SentimentVisualization === 'undefined') {
        console.warn('❌ SentimentVisualization object not found');
        return;
    }

    if (!mainGroup) {
        console.warn('❌ mainGroup D3 selection not found');
        return;
    }

    const textElements = mainGroup.selectAll('.textData');
    console.log('Found .textData elements:', textElements.size());

    if (textElements.size() === 0) {
        console.warn('❌ No .textData elements found to update');
        return;
    }

    let updateCount = 0;
    textElements.attr('fill', function (d) {
        const newColor = SentimentVisualization.getWordColor(d, categories.indexOf(d.topic));
        updateCount++;
        return newColor;
    });

    console.log(`✓ Word colors updated for ${updateCount} elements`);
    console.log('New palette:', SentimentVisualization.currentPalette);

    // Update legend colors using the data already bound to legend elements
    if (legendGroup) {
        var palette = SentimentVisualization.colorPalettes[SentimentVisualization.currentPalette];
        console.log('Updating legend with palette:', palette);

        // Select legend items (the parent <g> elements that have data bound)
        var legendItems = legendGroup.selectAll('g');
        console.log('Found legend items:', legendItems.size());

        if (legendItems.size() > 0) {
            // Update circle fill colors using the bound data
            legendItems.select('circle').attr('fill', function(d) {
                console.log('Legend item data:', d);
                if (!d || !d.label) {
                    console.warn('No label found in legend data:', d);
                    return palette.neutral || '#757575';
                }

                var label = d.label;
                var labelLower = label.toLowerCase();

                // Map label to palette color
                // For sentiment labels
                if (labelLower === 'positive') return palette.positive || '#2E7D32';
                if (labelLower === 'neutral') return palette.neutral || '#757575';
                if (labelLower === 'negative') return palette.negative || '#F57C00';

                // For emotion labels (capitalize first letter for display, but palette uses lowercase)
                var emotionKey = labelLower;
                if (palette[emotionKey]) return palette[emotionKey];

                // For happiness labels (with underscores)
                var happinessMap = {
                    'very happy': 'very_happy',
                    'happy': 'happy',
                    'fine': 'fine',
                    'unhappy': 'unhappy',
                    'very unhappy': 'very_unhappy'
                };
                var happinessKey = happinessMap[labelLower];
                if (happinessKey && palette[happinessKey]) return palette[happinessKey];

                // For topic-based labels - try direct lookup
                if (palette[label]) return palette[label];

                // Fallback
                console.warn('No color found for label:', label);
                return palette.neutral || '#757575';
            });

            console.log('✓ Legend colors updated using bound data');
        } else {
            console.warn('No legend items found to update');
        }
    } else {
        console.warn('legendGroup not found');
    }
}
