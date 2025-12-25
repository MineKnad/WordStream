/**
 * Zoom and Animation functionality for WordStream
 * Provides interactive zoom/pan and animated tour of large datasets
 */

var zoom;
var zoomContainer;
var isAnimating = false;
var animationDuration = 30000; // 30 seconds for full tour

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
        .on("zoom", handleZoom);

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
 * Handle zoom events
 */
function handleZoom() {
    if (isAnimating) return; // Don't allow manual zoom during animation

    var zoomLayer = d3.select("#zoomLayer");

    if (zoomLayer.node()) {
        var translate = d3.event.translate;
        var scale = d3.event.scale;
        zoomLayer.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    } else {
        console.warn('Zoom layer not found - zoom may not work properly');
    }
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

    // Calculate animation parameters
    var zoomInScale = 3.0; // Zoom in to 3x
    var panDuration = animationDuration * 0.7; // 70% of time for panning
    var zoomDuration = animationDuration * 0.15; // 15% for each zoom

    // Disable manual zoom during animation
    svg.on(".zoom", null);

    // Step 1: Zoom in on the beginning (leftmost part)
    console.log('Step 1: Zooming in on timeline start...');
    var translate1 = [50, 0]; // Small offset from edge

    zoomLayer.transition()
        .duration(zoomDuration)
        .attr("transform", "translate(" + translate1 + ")scale(" + zoomInScale + ")")
        .each("end", function() {
            if (!isAnimating) return; // Animation was stopped

            // Step 2: Pan across the entire timeline
            console.log('Step 2: Panning across timeline...');

            var endX = -vizWidth * (zoomInScale - 1) - 50; // Pan to the end
            var translate2 = [endX, 0];

            zoomLayer.transition()
                .duration(panDuration)
                .ease("linear") // Constant speed pan
                .attr("transform", "translate(" + translate2 + ")scale(" + zoomInScale + ")")
                .each("end", function() {
                    if (!isAnimating) return; // Animation was stopped

                    // Step 3: Zoom back out to full view
                    console.log('Step 3: Zooming out to full view...');

                    zoomLayer.transition()
                        .duration(zoomDuration)
                        .attr("transform", "translate(0,0)scale(1)")
                        .each("end", function() {
                            console.log('✓ Animated tour complete');
                            isAnimating = false;

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

    // Stop all transitions on zoom layer
    if (zoomLayer.node()) {
        zoomLayer.transition().duration(0);
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
