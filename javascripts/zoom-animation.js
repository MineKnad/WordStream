/**
 * Zoom and Animation functionality for WordStream
 * Provides interactive zoom/pan and animated tour of large datasets
 */

var zoom;
var zoomContainer;
var isAnimating = false;
var animationDuration = 30000; // 30 seconds for full tour
var originalAxisX = 0; // Store original axis X position for tour
var originalAxisY = 0; // Store original axis Y position for tour

// Selected word tracking for tour
var selectedWordForTour = null; // {text: string, topic: string, color: string}
var selectedWordAverageY = null; // Cached average Y position

/**
 * Initialize zoom behavior on the visualization
 */
function initializeZoom() {
    // Only initialize once
    if (zoom) {
        console.log('Zoom already initialized');
        return;
    }

    console.log('Initializing zoom behavior...');

    var svg = d3.select("#mainsvg");

    // Check if SVG has content - get all direct child g elements
    var svgNode = svg.node();
    if (!svgNode) {
        console.warn('SVG element not found');
        return;
    }

    var childGroups = svgNode.querySelectorAll(':scope > g');
    if (childGroups.length === 0) {
        console.warn('No SVG content found, cannot initialize zoom yet');
        return;
    }

    // Create zoom layer if it doesn't exist
    var zoomLayer = svg.select("#zoomLayer");
    if (!zoomLayer.node()) {
        console.log('Creating zoom layer...');

        // Create the zoom layer at the beginning
        zoomLayer = svg.insert("g", ":first-child")
            .attr("id", "zoomLayer")
            .attr("transform", "translate(0,0)scale(1)");

        // Move all existing children (except zoomLayer itself) into the zoom layer
        var existingChildren = Array.from(svgNode.children).filter(function(child) {
            return child.tagName === 'g' && child.id !== 'zoomLayer';
        });

        existingChildren.forEach(function(child) {
            zoomLayer.node().appendChild(child);
        });

        console.log('✓ Zoom layer created with', existingChildren.length, 'child elements');
    }

    // Create zoom behavior
    zoom = d3.behavior.zoom()
        .scaleExtent([0.5, 10]) // Min zoom 0.5x, max zoom 10x
        .on("zoom", handleZoom)
        .on("zoomend", handleZoomEnd); // Update axis only when zoom completes

    // Apply zoom to SVG
    svg.call(zoom);

    // Prevent default double-click zoom
    svg.on("dblclick.zoom", null);

    console.log('✓ Zoom behavior initialized and attached to SVG');
}

/**
 * Store original transforms of all groups
 */
function storeOriginalTransforms() {
    if (!mainGroup || !axisGroup || !legendGroup) return;

    mainGroup.attr("data-original-transform", mainGroup.attr("transform"));
    axisGroup.attr("data-original-transform", axisGroup.attr("transform"));
    legendGroup.attr("data-original-transform", legendGroup.attr("transform"));
    if (xGridlinesGroup) {
        xGridlinesGroup.attr("data-original-transform", xGridlinesGroup.attr("transform"));
    }
}

/**
 * Handle zoom events (called continuously during zoom)
 */
function handleZoom() {
    if (isAnimating) return; // Don't allow manual zoom during animation

    var zoomLayer = d3.select("#zoomLayer");

    if (zoomLayer.node()) {
        var translate = d3.event.translate;
        var scale = d3.event.scale;
        zoomLayer.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
        // Note: Axis update moved to handleZoomEnd for performance
    } else {
        console.warn('Zoom layer not found - zoom may not work properly');
    }
}

/**
 * Handle zoom end event (called once when zoom completes)
 * Updates axis labels here for better performance
 */
function handleZoomEnd() {
    if (isAnimating) return;

    var currentScale = zoom.scale();

    // Update axis labels based on zoom level
    // Axis is in zoomLayer so dates naturally align with visualization
    if (typeof window.updateAxisForZoom === 'function') {
        window.updateAxisForZoom(currentScale);
    }
}

/**
 * Calculate and apply Y offset to axis to keep it visible at bottom during zoom
 * @param {number} translateY - Current Y translation of zoomLayer
 * @param {number} scale - Current zoom scale
 * @param {number} originalAxisY - Original Y position of axis (before zoom)
 */
function adjustAxisYPosition(translateY, scale, originalAxisY) {
    var axisGroup = d3.select("#axisGroup");
    if (!axisGroup.node()) return;

    // Calculate desired position (bottom of viewport, moved up 10% more)
    var desiredY = globalHeight - (globalHeight * 0.10) - 40; // Move up by 10% + margin

    // Calculate what Y coordinate in data space will appear at desiredY after transform
    // Formula: screenY = translateY + (dataY * scale)
    // So: dataY = (screenY - translateY) / scale
    var newAxisY = (desiredY - translateY) / scale;

    // Apply transform to move axis to new Y position
    var currentTransform = axisGroup.attr("transform") || "";
    var translateMatch = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
    var currentX = translateMatch ? parseFloat(translateMatch[1]) : 0;

    axisGroup.attr("transform", "translate(" + currentX + "," + newAxisY + ")");

    // Update axis labels to show more dates when zoomed in
    if (typeof window.updateAxisForZoom === 'function') {
        window.updateAxisForZoom(scale);
    }

    console.log('Axis Y adjusted: originalY=' + originalAxisY +
                ', newY=' + newAxisY.toFixed(1) +
                ', scale=' + scale.toFixed(2));
}

/**
 * Apply counter-scaling to axis text to keep labels readable during zoom
 * @param {number} scale - Current zoom scale
 */
function counterScaleAxisText(scale) {
    var axisGroup = d3.select("#axisGroup");

    if (!axisGroup.node()) return;

    // Calculate inverse scale for text
    var inverseScale = 1.0 / scale;

    // Apply counter-transform to axis text elements
    axisGroup.selectAll('text')
        .attr('transform', function() {
            // Get current translation (if any)
            var currentTransform = d3.select(this).attr('transform') || '';

            // Extract current translation values (preserve them)
            var translateMatch = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
            var tx = translateMatch ? parseFloat(translateMatch[1]) : 0;
            var ty = translateMatch ? parseFloat(translateMatch[2]) : 0;

            // Apply inverse scale to counteract zoom
            return 'translate(' + tx + ',' + ty + ')scale(' + inverseScale + ')';
        });
}

/**
 * Reset zoom to default view
 */
function resetZoom() {
    if (isAnimating) return;

    console.log('Resetting zoom...');

    ensureZoomInitialized();
    if (!zoom) {
        console.warn('Zoom could not be initialized');
        return;
    }

    zoom.translate([0, 0]).scale(1);

    var zoomLayer = d3.select("#zoomLayer");
    zoomLayer.transition()
        .duration(750)
        .attr("transform", "translate(0,0)scale(1)");

    // Reset axis to original position
    var axisGroup = d3.select("#axisGroup");
    if (axisGroup.node()) {
        var originalTransform = axisGroup.attr("data-original-transform");
        if (originalTransform) {
            axisGroup.transition()
                .duration(750)
                .attr("transform", originalTransform);
            console.log('✓ Axis reset to original position');
        }
    }

    console.log('✓ Zoom reset');
}

/**
 * Zoom to a specific area
 * @param {number} x - X position to center on
 * @param {number} scale - Zoom scale
 */
function zoomTo(x, scale, duration) {
    duration = duration || 750;

    var svg = d3.select("#mainsvg");
    var width = parseInt(svg.attr("width"));

    // Calculate translation to center the x position
    var translate = [width / 2 - x * scale, 0];

    svg.transition()
        .duration(duration)
        .call(zoom.translate(translate).scale(scale).event);
}

/**
 * Calculate the center point of the stream visualization
 * Returns {x, y} coordinates for the center of the stream content area
 */
function getStreamCenterPoint() {
    // Get dimensions from global variables
    var svgHeight = globalHeight;
    var svgWidth = globalWidth;

    // Calculate layout parameters (must match main.js draw() function)
    var legendFontSize = 12;
    var legendHeight = categories.length * legendFontSize;
    var axisPadding = 10;
    var margins = {left: 20, top: 20, right: 10, bottom: 30};

    // Stream content height (same calculation as in main.js line 398)
    var streamHeight = svgHeight - (margins.top + margins.bottom + axisPadding + legendHeight);
    var streamWidth = svgWidth - (margins.left + margins.right);

    // Center point in absolute SVG coordinates
    var centerX = margins.left + streamWidth / 2;
    var centerY = margins.top + streamHeight / 2;

    return {
        x: centerX,
        y: centerY,
        streamWidth: streamWidth,
        streamHeight: streamHeight
    };
}

/**
 * Calculate the average Y position of a selected word across all time periods
 * @param {string} text - The word text
 * @param {string} topic - The word's topic/category
 * @returns {number|null} - Average Y position in SVG coordinates, or null if word not found
 */
function calculateWordAverageY(text, topic) {
    // Validate inputs
    if (!text || !topic) {
        console.warn('calculateWordAverageY: Invalid text or topic');
        return null;
    }

    // Get the stream layer data for this topic
    var pathElement = d3.select("path[topic='" + topic + "']");
    if (!pathElement || !pathElement.node()) {
        console.warn('Stream layer path not found for topic:', topic);
        return null;
    }

    var streamLayer = pathElement.datum();
    if (!streamLayer || streamLayer.length === 0) {
        console.warn('No stream layer data found');
        return null;
    }

    // Get all instances of this word
    var mainGroup = d3.select("#main");
    var wordInstances = mainGroup.selectAll('.textData').filter(function(d) {
        return d && d.text === text && d.topic === topic && !d.cloned;
    });

    if (!wordInstances || wordInstances[0].length === 0) {
        console.warn('No word instances found for:', text, topic);
        return null;
    }

    // Calculate Y positions for each time period where word appears
    var yPositions = [];

    wordInstances.each(function(d) {
        var timeStep = d.timeStep;

        // Stream layer has +1 offset (first and last points are duplicates)
        var layerIndex = timeStep + 1;

        if (layerIndex >= 0 && layerIndex < streamLayer.length) {
            var layerPoint = streamLayer[layerIndex];

            // Calculate center Y of this word in this time period
            // Formula: y0 (base) + y/2 (half of stream height)
            var wordCenterY = layerPoint.y0 + (layerPoint.y / 2);

            yPositions.push(wordCenterY);
        }
    });

    if (yPositions.length === 0) {
        console.warn('No valid Y positions found for word');
        return null;
    }

    // Calculate average Y position
    var sumY = yPositions.reduce(function(acc, y) { return acc + y; }, 0);
    var averageY = sumY / yPositions.length;

    // Account for margins (word positions are relative to mainGroup)
    var margins = {left: 20, top: 20, right: 10, bottom: 30};
    var absoluteY = margins.top + averageY;

    console.log('Word average Y calculation:', {
        word: text,
        topic: topic,
        instances: yPositions.length,
        averageY: averageY.toFixed(2),
        absoluteY: absoluteY.toFixed(2)
    });

    return absoluteY;
}

/**
 * Calculate the selected word's Y position at a specific X coordinate
 * @param {number} xPosition - X coordinate in SVG space
 * @param {object} selectedWord - {text, topic, color}
 * @returns {number|null} - Absolute Y coordinate, or null if unavailable
 */
function getWordYAtX(xPosition, selectedWord) {
    // Validate inputs
    if (!selectedWord || !selectedWord.text || !selectedWord.topic) {
        return null;
    }

    // Get stream layer data for this topic
    var pathElement = d3.select("path[topic='" + selectedWord.topic + "']");
    if (!pathElement.node()) return null;

    var streamLayer = pathElement.datum();
    if (!streamLayer || streamLayer.length === 0) return null;

    // Calculate dimensions
    var margins = {left: 20, top: 20, right: 10, bottom: 30};
    var vizWidth = globalWidth - (margins.left + margins.right);
    var periodsCount = currentDrawData.length;

    // Map X position to time step index
    var relativeX = xPosition - margins.left;
    var timeStepFloat = (relativeX / vizWidth) * periodsCount;
    timeStepFloat = Math.max(0, Math.min(periodsCount - 1, timeStepFloat));

    // Get integer bounds for interpolation
    var timeStepLow = Math.floor(timeStepFloat);
    var timeStepHigh = Math.ceil(timeStepFloat);
    var fraction = timeStepFloat - timeStepLow;

    // Stream layer has +1 offset (first point is duplicate)
    var layerIndexLow = timeStepLow + 1;
    var layerIndexHigh = timeStepHigh + 1;

    // Get Y positions at both time steps
    var layerPointLow = streamLayer[layerIndexLow];
    var layerPointHigh = streamLayer[layerIndexHigh];

    if (!layerPointLow || !layerPointHigh) return null;

    // Calculate center Y for each time step
    var yLow = layerPointLow.y0 + (layerPointLow.y / 2);
    var yHigh = layerPointHigh.y0 + (layerPointHigh.y / 2);

    // Interpolate between them
    var interpolatedY = yLow + (yHigh - yLow) * fraction;

    // Convert to absolute SVG coordinates
    var absoluteY = margins.top + interpolatedY;

    return absoluteY;
}

/**
 * Set the selected word for tour and calculate its average Y position
 * Called from main.js when user clicks a word
 * @param {string} text - The word text
 * @param {string} topic - The word's topic/category
 * @param {string} color - The word's color
 */
function setSelectedWordForTour(text, topic, color) {
    selectedWordForTour = {
        text: text,
        topic: topic,
        color: color
    };

    // Calculate and cache average Y position
    selectedWordAverageY = calculateWordAverageY(text, topic);

    if (selectedWordAverageY !== null) {
        console.log('✓ Word selected for tour:', text,
                    'Topic:', topic,
                    'Average Y:', selectedWordAverageY.toFixed(2));
    } else {
        console.warn('Failed to calculate Y position for selected word');
        selectedWordForTour = null; // Clear selection if calculation fails
    }
}

/**
 * Clear the selected word for tour
 * Called when user deselects or clicks stream layer
 */
function clearSelectedWordForTour() {
    if (selectedWordForTour) {
        console.log('Clearing selected word for tour:', selectedWordForTour.text);
    }
    selectedWordForTour = null;
    selectedWordAverageY = null;
}

// Expose functions to window for cross-file access
window.setSelectedWordForTour = setSelectedWordForTour;
window.clearSelectedWordForTour = clearSelectedWordForTour;

/**
 * Create a custom interpolator for conservative Y tracking during pan
 * Only adjusts Y when word would go outside visible zone (center 60% of viewport)
 * @param {array} startTranslate - [x, y] starting translation
 * @param {array} endTranslate - [x, y] ending translation
 * @param {number} scale - Zoom scale
 * @param {object} selectedWord - {text, topic, color}
 * @param {number} svgHeight - SVG viewport height
 * @param {number} averageY - Average Y position to prefer (for stability)
 * @returns {function} - Interpolator function for d3 transition
 */
function createDynamicYInterpolator(startTranslate, endTranslate, scale, selectedWord, svgHeight, averageY) {
    // Define visible zone: center 60% of viewport (20% margin top/bottom)
    var visibleZoneTop = svgHeight * 0.20;
    var visibleZoneBottom = svgHeight * 0.80;

    // Anti-jitter: Add hysteresis buffer (10% of viewport = 6% of visible area)
    var hysteresisBuffer = svgHeight * 0.10;
    var adjustmentZoneTop = visibleZoneTop - hysteresisBuffer;
    var adjustmentZoneBottom = visibleZoneBottom + hysteresisBuffer;

    // Smooth interpolation: Track current Y for damping
    var currentY = averageY;  // Start at average
    var dampingFactor = 0.15;  // How quickly to approach target (0=slow, 1=instant)

    return function(t) {
        // t ranges from 0 to 1 during transition

        // Interpolate X translation linearly
        var currentTranslateX = startTranslate[0] + (endTranslate[0] - startTranslate[0]) * t;

        // Calculate current focus point X in data space
        var svgWidth = globalWidth;
        var viewportCenterX = svgWidth / 2;
        var focusDataX = (viewportCenterX - currentTranslateX) / scale;

        // Get word's actual Y position at this X
        var wordActualY = getWordYAtX(focusDataX, selectedWord);

        // Determine ideal target Y position
        var idealTargetY = averageY;

        if (wordActualY !== null) {
            // Calculate where word would appear in screen space with current Y
            var currentYTranslate = (svgHeight / 2) - (currentY * scale);
            var wordScreenY = currentYTranslate + (wordActualY * scale);

            // Check if word is outside adjustment zone (with hysteresis buffer)
            if (wordScreenY < adjustmentZoneTop) {
                // Word is too high - adjust Y to bring it to top of visible zone
                var adjustedTranslateY = visibleZoneTop - (wordActualY * scale);
                idealTargetY = (svgHeight / 2 - adjustedTranslateY) / scale;
            } else if (wordScreenY > adjustmentZoneBottom) {
                // Word is too low - adjust Y to bring it to bottom of visible zone
                var adjustedTranslateY = visibleZoneBottom - (wordActualY * scale);
                idealTargetY = (svgHeight / 2 - adjustedTranslateY) / scale;
            }
            // else: word is within safe zone, keep idealTargetY = averageY
        } else {
            // Fallback to center if calculation fails
            var center = getStreamCenterPoint();
            idealTargetY = center.y;
        }

        // Apply smooth damping: gradually approach ideal target instead of instant snap
        // currentY = currentY + (idealTargetY - currentY) * dampingFactor
        currentY = currentY + (idealTargetY - currentY) * dampingFactor;

        // Clamp to reasonable bounds (safety)
        var minY = svgHeight * 0.10;
        var maxY = svgHeight * 0.90;
        currentY = Math.max(minY, Math.min(maxY, currentY));

        // Calculate Y translation to center this target point
        var currentTranslateY = (svgHeight / 2) - (currentY * scale);

        return "translate(" + currentTranslateX + "," + currentTranslateY + ")scale(" + scale + ")";
    };
}

/**
 * Animated tour of the timeline
 * Zooms in on start, pans across all years, then zooms out
 */
function playAnimatedTour() {
    if (isAnimating) {
        stopAnimation();
        return;
    }

    if (!currentDrawData || currentDrawData.length === 0) {
        console.warn('No data loaded for animation');
        alert('Please load a dataset first');
        return;
    }

    // Ensure zoom is initialized before starting tour
    ensureZoomInitialized();
    if (!zoom) {
        console.error('Cannot start tour: zoom not initialized');
        alert('Zoom system not ready. Please wait a moment and try again.');
        return;
    }

    console.log('Starting animated tour...');
    isAnimating = true;

    // Update button state
    var tourButton = document.querySelector('.tour-btn');
    if (tourButton) {
        tourButton.classList.add('playing');
        tourButton.innerHTML = '<span class="btn-icon">■</span> Stop';
    }

    var zoomLayer = d3.select("#zoomLayer");
    if (!zoomLayer.node()) {
        console.warn('Zoom layer not found, initializing...');
        initializeZoom();
        zoomLayer = d3.select("#zoomLayer");
    }

    var svg = d3.select("#mainsvg");
    var vizWidth = globalWidth - 40; // Subtract margins
    var periodsCount = currentDrawData.length;

    // Log dataset info
    console.log('Dataset info - Periods:', periodsCount, 'Viz width:', vizWidth + 'px');

    // Detect large datasets
    var isLargeDataset = periodsCount > 200;
    var isVeryLargeDataset = periodsCount > 300;

    if (isVeryLargeDataset) {
        console.log('⚠ Very large dataset detected - optimizing tour animation');
    }

    // Calculate animation parameters - use moderate zoom to keep all streams visible
    var zoomInScale;
    if (isVeryLargeDataset) {
        zoomInScale = 2.5; // Moderate zoom for very large datasets - keeps all streams visible
    } else if (isLargeDataset) {
        zoomInScale = 2.8; // Slightly higher zoom
    } else {
        zoomInScale = 3.0; // Standard zoom
    }

    var panDuration = animationDuration * 0.7; // 70% of time for panning (21s)
    var zoomDuration = animationDuration * 0.15; // 15% for each zoom (4.5s)

    console.log('Tour parameters - Scale:', zoomInScale + 'x',
        'Duration: ' + (animationDuration/1000) + 's');

    // Disable manual zoom during animation
    svg.on(".zoom", null);

    // Get and store original axis position
    var axisGroup = d3.select("#axisGroup");
    var axisTransform = axisGroup.attr("transform") || "";
    var axisTranslateMatch = axisTransform.match(/translate\(([^,]+),([^)]+)\)/);
    originalAxisX = axisTranslateMatch ? parseFloat(axisTranslateMatch[1]) : 0;
    originalAxisY = axisTranslateMatch ? parseFloat(axisTranslateMatch[2]) : 0;

    // Move axis to end of parent to ensure it renders on top during tour
    if (axisGroup.node() && axisGroup.node().parentNode) {
        axisGroup.node().parentNode.appendChild(axisGroup.node());
    }

    console.log('Original axis position:', {x: originalAxisX, y: originalAxisY});

    // Step 1: Zoom in on the left-center of the timeline
    console.log('Step 1: Zooming in on timeline start...');

    var center = getStreamCenterPoint();
    var margins = {left: 20, top: 20, right: 10, bottom: 30};
    var svgWidth = globalWidth;
    var svgHeight = globalHeight;

    // Target point: left side horizontally, center vertically
    // Horizontal: Show the leftmost portion (about 20% into the timeline)
    var targetX = margins.left + (vizWidth / zoomInScale / 2);

    // Vertical: Use selected word's average Y if available, otherwise center
    var targetY;
    if (selectedWordForTour && selectedWordAverageY !== null) {
        targetY = selectedWordAverageY;
        console.log('Tour targeting selected word "' + selectedWordForTour.text +
                    '" at Y=' + targetY.toFixed(2));
    } else {
        targetY = center.y;
        console.log('Tour targeting center at Y=' + targetY.toFixed(2));
    }

    // Clamp targetY to reasonable bounds (10% - 90% of height) for smooth animation
    var minY = svgHeight * 0.10;
    var maxY = svgHeight * 0.90;
    targetY = Math.max(minY, Math.min(maxY, targetY));

    // Calculate translation to center this target point in the viewport after scaling
    // Formula: translate = viewportCenter - (targetPoint * scale)
    var translateX = (svgWidth / 2) - (targetX * zoomInScale);
    var translateY = (svgHeight / 2) - (targetY * zoomInScale);

    var translate1 = [translateX, translateY];

    console.log('Zoom parameters:');
    console.log('  Scale:', zoomInScale + 'x');
    console.log('  Target point:', {x: targetX, y: targetY});
    console.log('  Translate:', translate1);
    console.log('  Viewport center:', {x: svgWidth/2, y: svgHeight/2});

    zoomLayer.transition()
        .duration(zoomDuration)
        .attr("transform", "translate(" + translate1 + ")scale(" + zoomInScale + ")")
        .each("start", function() {
            // Adjust axis Y position to keep it at bottom of viewport
            adjustAxisYPosition(translateY, zoomInScale, originalAxisY);
        })
        .each("end", function() {
            if (!isAnimating) return; // Animation was stopped

            // Ensure axis is properly positioned after zoom
            adjustAxisYPosition(translateY, zoomInScale, originalAxisY);

            // Step 2: Pan across the entire timeline
            console.log('Step 2: Panning across timeline...');

            // Pan to the right end while dynamically tracking vertical position
            // Calculate the rightmost target point
            var rightTargetX = margins.left + center.streamWidth - (vizWidth / zoomInScale / 2);
            var endX = (svgWidth / 2) - (rightTargetX * zoomInScale);

            // Calculate end Y position for smooth finish
            var endTargetY;
            if (selectedWordForTour && selectedWordAverageY !== null) {
                endTargetY = getWordYAtX(rightTargetX, selectedWordForTour);
                if (endTargetY === null) endTargetY = targetY; // Fallback
            } else {
                endTargetY = targetY; // Use center Y
            }
            endTargetY = Math.max(minY, Math.min(maxY, endTargetY));

            var translate2 = [endX, (svgHeight / 2) - (endTargetY * zoomInScale)];

            // Create custom interpolator for conservative Y tracking
            var panInterpolator = createDynamicYInterpolator(
                [translateX, translateY],  // Start position (from Step 1)
                translate2,                 // End position
                zoomInScale,               // Zoom scale
                selectedWordForTour,       // Selected word object
                svgHeight,                 // Viewport height
                targetY                    // Average Y position (prefer to stay here)
            );

            zoomLayer.transition()
                .duration(panDuration)
                .ease("linear") // Constant speed pan
                .attrTween("transform", function() { return panInterpolator; })
                .tween("updateAxis", function() {
                    // Update axis continuously during pan
                    return function(t) {
                        var currentTransform = zoomLayer.attr("transform");
                        var match = currentTransform.match(/translate\(([^,]+),([^)]+)\)scale/);
                        if (match) {
                            var currentTranslateY = parseFloat(match[2]);
                            adjustAxisYPosition(currentTranslateY, zoomInScale, originalAxisY);
                        }
                    };
                })
                .each("end", function() {
                    if (!isAnimating) return; // Animation was stopped

                    // Axis Y position is continuously updated during pan via tween

                    // Step 3: Zoom back out to full view
                    console.log('Step 3: Zooming out to full view...');

                    zoomLayer.transition()
                        .duration(zoomDuration)
                        .attr("transform", "translate(0,0)scale(1)")
                        .each("start", function() {
                            // Restore axis to original Y position
                            adjustAxisYPosition(0, 1.0, originalAxisY);
                        })
                        .each("end", function() {
                            console.log('✓ Animated tour complete');
                            isAnimating = false;

                            // Restore axis to its original Y position
                            var axisGroup = d3.select("#axisGroup");
                            var currentTransform = axisGroup.attr("transform") || "";
                            var translateMatch = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
                            var currentX = translateMatch ? parseFloat(translateMatch[1]) : 0;
                            axisGroup.attr("transform", "translate(" + currentX + "," + originalAxisY + ")");
                            console.log('✓ Axis Y restored to', originalAxisY);

                            // Update button state
                            if (tourButton) {
                                tourButton.classList.remove('playing');
                                tourButton.innerHTML = '<span class="btn-icon">▶</span> Tour';
                            }

                            // Re-enable manual zoom
                            svg.call(zoom);
                            svg.on("dblclick.zoom", null);

                            // Reset zoom state
                            zoom.translate([0, 0]).scale(1);
                        });
                });
        });
}

/**
 * Stop the current animation
 */
function stopAnimation() {
    if (!isAnimating) return;

    console.log('Stopping animation...');
    isAnimating = false;

    var zoomLayer = d3.select("#zoomLayer");
    var svg = d3.select("#mainsvg");

    // Stop all transitions on zoom layer and axis
    if (zoomLayer.node()) {
        zoomLayer.transition().duration(0);
    }

    // Restore axis to original position
    var axisGroup = d3.select("#axisGroup");
    if (axisGroup.node()) {
        axisGroup.transition().duration(0);
        axisGroup.attr("transform", "translate(" + originalAxisX + "," + originalAxisY + ")");
        console.log('✓ Axis position restored to', {x: originalAxisX, y: originalAxisY});

        // Ensure axis is still on top after stopping
        if (axisGroup.node().parentNode) {
            axisGroup.node().parentNode.appendChild(axisGroup.node());
        }
    }

    // Update button state
    var tourButton = document.querySelector('.tour-btn');
    if (tourButton) {
        tourButton.classList.remove('playing');
        tourButton.innerHTML = '<span class="btn-icon">▶</span> Tour';
    }

    // Re-enable manual zoom
    if (zoom) {
        svg.call(zoom);
        svg.on("dblclick.zoom", null);
    }

    console.log('✓ Animation stopped');
}

/**
 * Zoom in (increase scale by 1.5x)
 */
function zoomIn() {
    if (isAnimating) return;
    ensureZoomInitialized();
    if (!zoom) {
        console.warn('Zoom could not be initialized');
        return;
    }

    var currentScale = zoom.scale();
    var currentTranslate = zoom.translate();
    var newScale = Math.min(currentScale * 1.5, 10); // Max 10x

    // Calculate new translate to keep center point fixed
    var svg = d3.select("#mainsvg");
    var width = parseInt(svg.attr("width"));
    var height = parseInt(svg.attr("height"));
    var centerX = width / 2;
    var centerY = height / 2;

    var newTranslate = [
        centerX - (centerX - currentTranslate[0]) * (newScale / currentScale),
        centerY - (centerY - currentTranslate[1]) * (newScale / currentScale)
    ];

    zoom.scale(newScale).translate(newTranslate);

    var zoomLayer = d3.select("#zoomLayer");
    zoomLayer.transition()
        .duration(300)
        .attr("transform", "translate(" + newTranslate + ")scale(" + newScale + ")");
}

/**
 * Zoom out (decrease scale by 1.5x)
 */
function zoomOut() {
    if (isAnimating) return;
    ensureZoomInitialized();
    if (!zoom) {
        console.warn('Zoom could not be initialized');
        return;
    }

    var currentScale = zoom.scale();
    var currentTranslate = zoom.translate();
    var newScale = Math.max(currentScale / 1.5, 0.5); // Min 0.5x

    // Calculate new translate to keep center point fixed
    var svg = d3.select("#mainsvg");
    var width = parseInt(svg.attr("width"));
    var height = parseInt(svg.attr("height"));
    var centerX = width / 2;
    var centerY = height / 2;

    var newTranslate = [
        centerX - (centerX - currentTranslate[0]) * (newScale / currentScale),
        centerY - (centerY - currentTranslate[1]) * (newScale / currentScale)
    ];

    zoom.scale(newScale).translate(newTranslate);

    var zoomLayer = d3.select("#zoomLayer");
    zoomLayer.transition()
        .duration(300)
        .attr("transform", "translate(" + newTranslate + ")scale(" + newScale + ")");
}

/**
 * Add keyboard shortcuts for zoom controls
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't interfere with input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
            case '_':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                resetZoom();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                playAnimatedTour();
                break;
            case 'Escape':
                if (isAnimating) {
                    e.preventDefault();
                    stopAnimation();
                }
                break;
        }
    });

    console.log('✓ Keyboard shortcuts enabled:');
    console.log('  +/- : Zoom in/out');
    console.log('  0   : Reset zoom');
    console.log('  T   : Play/stop tour');
    console.log('  Esc : Stop animation');
}

/**
 * Initialize on page load - wait for visualization to be drawn
 */
window.addEventListener('dataLoaded', function() {
    // Wait for visualization to be fully drawn before initializing zoom
    setTimeout(function() {
        // Check if SVG has content before initializing
        var svg = d3.select("#mainsvg");
        var svgNode = svg.node();
        var hasContent = svgNode && svgNode.children.length > 0;

        if (hasContent) {
            console.log('SVG content detected, initializing zoom...');
            initializeZoom();
        } else {
            console.log('SVG content not ready yet, delaying zoom initialization...');
            // Try again after another delay
            setTimeout(function() {
                console.log('Second attempt to initialize zoom...');
                initializeZoom();
            }, 1500);
        }
    }, 1000);
});

// Also try to initialize zoom when user first tries to use it
function ensureZoomInitialized() {
    if (!zoom) {
        console.log('Zoom not initialized, initializing now...');
        initializeZoom();
    }
}

// Setup keyboard shortcuts on page load
document.addEventListener('DOMContentLoaded', function() {
    setupKeyboardShortcuts();
});

// Expose functions to window for UI controls
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.playAnimatedTour = playAnimatedTour;
window.stopAnimation = stopAnimation;
