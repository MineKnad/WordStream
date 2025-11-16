/**
 * Sentiment-Aware Color and Visualization Module for WordStream
 * Handles sentiment-based coloring, emotion visualization, and color-blind palettes
 */

const SentimentVisualization = {

    // Color-blind friendly palettes
    colorPalettes: {
        default: {
            // Emotion-based colors (color-blind friendly)
            positive: "#2E7D32",      // Green - positive/joy
            joy: "#2E7D32",           // Green
            surprise: "#42A5F5",      // Light Blue
            neutral: "#757575",       // Gray
            fear: "#1565C0",          // Dark Blue
            sadness: "#1565C0",       // Dark Blue
            anger: "#F57C00",         // Orange
            disgust: "#F57C00",       // Orange
            negative: "#F57C00"       // Orange
        },
        colorBlindProtan: {
            // For protanopia (red-blind)
            positive: "#0173B2",      // Blue
            joy: "#0173B2",           // Blue
            surprise: "#29B09D",      // Teal
            neutral: "#999999",       // Gray
            fear: "#CC78BC",          // Purple
            sadness: "#CC78BC",       // Purple
            anger: "#F0E442",         // Yellow
            disgust: "#F0E442",        // Yellow
            negative: "#F0E442"       // Yellow
        },
        colorBlindDeutan: {
            // For deuteranopia (green-blind)
            positive: "#0173B2",      // Blue
            joy: "#0173B2",           // Blue
            surprise: "#D55E00",      // Orange
            neutral: "#999999",       // Gray
            fear: "#CC78BC",          // Purple
            sadness: "#CC78BC",       // Purple
            anger: "#F0E442",         // Yellow
            disgust: "#F0E442",       // Yellow
            negative: "#F0E442"       // Yellow
        },
        colorBlindTritan: {
            // For tritanopia (blue-yellow-blind)
            positive: "#0173B2",      // Blue
            joy: "#0173B2",           // Blue
            surprise: "#E69F00",      // Orange
            neutral: "#999999",       // Gray
            fear: "#56B4E9",          // Light Blue
            sadness: "#56B4E9",       // Light Blue
            anger: "#D55E00",         // Red-orange
            disgust: "#D55E00",       // Red-orange
            negative: "#D55E00"       // Red-orange
        },
        grayscale: {
            // Grayscale palette for accessibility
            positive: "#333333",      // Dark gray
            joy: "#333333",
            surprise: "#555555",
            neutral: "#888888",       // Medium gray
            fear: "#AAAAAA",
            sadness: "#AAAAAA",
            anger: "#CCCCCC",         // Light gray
            disgust: "#CCCCCC",
            negative: "#CCCCCC"
        }
    },

    currentPalette: 'default',

    /**
     * Initialize sentiment visualization module
     */
    init: function() {
        this.addColorPaletteToggle();
        console.log('✓ Sentiment Visualization module initialized');
    },

    /**
     * Add color palette selector to UI
     */
    addColorPaletteToggle: function() {
        if (!BottomPanelManager.panelExists()) {
            console.warn('Bottom panel not ready, retrying...');
            setTimeout(() => this.addColorPaletteToggle(), 100);
            return;
        }

        const paletteHTML = `
            <select id="paletteSelect" style="padding: 5px 8px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px; cursor: pointer;">
                <option value="default">Standard Colors</option>
                <option value="colorBlindProtan">Protanopia (Red-blind)</option>
                <option value="colorBlindDeutan">Deuteranopia (Green-blind)</option>
                <option value="colorBlindTritan">Tritanopia (Blue-yellow-blind)</option>
                <option value="grayscale">Grayscale</option>
            </select>
        `;

        BottomPanelManager.addFeatureSection('🎨 Color Palette', paletteHTML, 'palette-feature');

        // Store reference to this for use in callback
        const self = this;

        // Delay to ensure element is in DOM - use longer delay for safety
        setTimeout(() => {
            const select = document.getElementById('paletteSelect');
            if (select) {
                console.log('✓ Palette select found and attaching listener');
                console.log('Current palette:', self.currentPalette);

                select.addEventListener('change', function(e) {
                    const selectedValue = e.target.value;
                    console.log('Palette select change event triggered, value:', selectedValue);
                    console.log('SentimentVisualization object:', typeof SentimentVisualization);
                    console.log('updateWordColors function:', typeof window.updateWordColors);

                    self.setPalette(selectedValue);
                });

                // Test: Log that listener is attached
                console.log('✓ Event listener attached to palette select');
            } else {
                console.warn('❌ Palette select not found in DOM');
                console.log('Available elements:', document.querySelectorAll('select').length);
            }
        }, 100);
    },

    /**
     * Set active color palette and update colors
     */
    setPalette: function(paletteName) {
        console.log('setPalette called with:', paletteName);
        console.log('Available palettes:', Object.keys(this.colorPalettes));

        if (paletteName in this.colorPalettes) {
            this.currentPalette = paletteName;
            console.log(`✓ Switched to palette: ${paletteName}`);
            console.log('Updated currentPalette to:', this.currentPalette);

            // Update word colors with new palette
            console.log('Attempting to call updateWordColors...');
            console.log('typeof window.updateWordColors:', typeof window.updateWordColors);

            if (typeof window.updateWordColors === 'function') {
                console.log('✓ Calling updateWordColors');
                window.updateWordColors();
            } else {
                console.warn('❌ updateWordColors is not a function');
            }
        } else {
            console.warn(`❌ Palette "${paletteName}" not found in colorPalettes`);
        }
    },

    /**
     * Get color for a word based on sentiment
     * @param {Object} wordData - Word object with sentiment properties
     * @param {number} topicIndex - Index of topic in categories array
     * @returns {string} Hex color code
     */
    getWordColor: function(wordData, topicIndex) {
        const palette = this.colorPalettes[this.currentPalette];

        // If word has sentiment data, use sentiment score to determine color
        // This ensures words with different sentiments get different colors
        if (wordData.sentiment !== undefined) {
            const sentiment = parseFloat(wordData.sentiment);

            // Map sentiment score to color (primary determinant)
            if (sentiment > 0.3) {
                return palette.positive || palette.joy;
            } else if (sentiment < -0.3) {
                return palette.negative || palette.anger;
            } else {
                return palette.neutral;
            }
        }

        // Fallback: use palette-based category colors (responds to palette changes)
        // Map categories to different palette colors (supports both 4 and 5+ categories)
        const categoryColorMapping = [
            palette.positive,   // 0: person/business -> positive/joy
            palette.neutral,    // 1: location/service -> neutral
            palette.surprise,   // 2: organization/tech -> surprise
            palette.negative,   // 3: miscellaneous/complaint -> negative
            palette.sadness     // 4: review -> sadness (for 5-category datasets)
        ];
        return categoryColorMapping[topicIndex] || palette.neutral;
    },

    /**
     * Get opacity for a word based on sentiment strength
     * @param {Object} wordData - Word object
     * @param {number} defaultOpacity - Fallback opacity
     * @returns {number} Opacity value [0, 1]
     */
    getWordOpacity: function(wordData, defaultOpacity) {
        // If word has sentiment data, use confidence to modulate opacity
        if (wordData.sentiment !== undefined) {
            const confidence = wordData.confidence || 0.7;
            const sentimentAbs = Math.abs(parseFloat(wordData.sentiment));

            // Strong sentiment (positive/negative) with high confidence = more opaque
            const sentimentBoost = sentimentAbs * confidence * 0.3; // Up to +0.3
            return Math.min(1, defaultOpacity + sentimentBoost);
        }

        return defaultOpacity;
    },

    /**
     * Create sentiment indicator (small badge) for a word
     * @param {Object} wordData - Word object
     * @returns {string} SVG element as string
     */
    createSentimentBadge: function(wordData) {
        if (!wordData.sentiment || !wordData.emotion) {
            return '';
        }

        const sentiment = parseFloat(wordData.sentiment);
        const emotion = wordData.emotion;
        const palette = this.colorPalettes[this.currentPalette];
        const color = palette[emotion] || palette.neutral;

        // Small circle indicator for sentiment
        const size = 4;
        const svg = `
            <circle
                cx="0"
                cy="0"
                r="${size}"
                fill="${color}"
                opacity="0.8"
                stroke="white"
                stroke-width="0.5"
            />
        `;

        return svg;
    },

    /**
     * Format sentiment score for display in tooltip
     * @param {number} sentiment - Sentiment score [-1, 1]
     * @returns {string} Formatted string
     */
    formatSentimentScore: function(sentiment) {
        const score = parseFloat(sentiment);
        const percent = Math.round(score * 100);

        if (score > 0.3) {
            return `😊 Positive (+${percent}%)`;
        } else if (score < -0.3) {
            return `😞 Negative (${percent}%)`;
        } else {
            return `😐 Neutral`;
        }
    },

    /**
     * Add sentiment tooltip to word
     * @param {d3 selection} textElement - D3 selected text element
     * @param {Object} wordData - Word object
     */
    addSentimentTooltip: function(textElement, wordData) {
        if (!wordData.sentiment) return;

        const sentiment = parseFloat(wordData.sentiment);
        const emotion = wordData.emotion || 'neutral';
        const frequency = wordData.frequency || 0;

        let tooltipText = `${wordData.text}\n`;
        tooltipText += `Frequency: ${frequency}\n`;
        tooltipText += `Emotion: ${emotion}\n`;
        tooltipText += this.formatSentimentScore(sentiment);

        textElement.attr('title', tooltipText);
    },

    /**
     * Highlight words with specific sentiment
     * @param {number} minSentiment - Minimum sentiment threshold
     * @param {number} maxSentiment - Maximum sentiment threshold
     */
    highlightBySentiment: function(minSentiment, maxSentiment) {
        const texts = d3.selectAll('.textData');

        texts.style('opacity', function(d) {
            if (!d.sentiment) return 0.5;

            const sentiment = parseFloat(d.sentiment);
            return (sentiment >= minSentiment && sentiment <= maxSentiment) ? 1 : 0.2;
        });
    },

    /**
     * Filter words by emotion
     * @param {string} emotion - Emotion to show (or null to show all)
     */
    filterByEmotion: function(emotion) {
        const texts = d3.selectAll('.textData');

        if (!emotion) {
            texts.style('opacity', 1);
            return;
        }

        texts.style('opacity', function(d) {
            return (d.emotion === emotion) ? 1 : 0.2;
        });
    },

    /**
     * Create a sentiment legend
     * @returns {string} HTML for legend
     */
    createSentimentLegend: function() {
        const palette = this.colorPalettes[this.currentPalette];
        const emotions = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'anger'];

        let legend = '<div style="margin-top: 10px;"><strong>Sentiment Legend:</strong><br>';
        emotions.forEach(emotion => {
            const color = palette[emotion];
            legend += `<span style="display: inline-block; margin-right: 10px;">`;
            legend += `<span style="display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 2px; margin-right: 4px;"></span>`;
            legend += `${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
            legend += `</span>`;
        });
        legend += '</div>';

        return legend;
    },

    /**
     * Enhanced word color function for use in main.js draw()
     * Replaces the simple color() function
     */
    wordColorFunction: function(d, i, topicIndex) {
        return this.getWordColor(d, topicIndex);
    },

    /**
     * Enhanced opacity function for use in main.js draw()
     */
    wordOpacityFunction: function(d, defaultOpacityFunc) {
        const baseOpacity = defaultOpacityFunc(d);
        return this.getWordOpacity(d, baseOpacity);
    }
};

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    SentimentVisualization.init();
});
