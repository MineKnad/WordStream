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
            disgust: "#D32F2F",       // Red
            negative: "#F57C00",      // Orange

            // Emotion Detection Advanced - 28 emotions (organized by emotional valence)
            // Positive emotions (warm hues)
            love: "#E91E63",          // Pink
            amusement: "#FF9800",     // Orange
            excitement: "#FF5722",    // Deep Orange
            gratitude: "#8BC34A",     // Light Green
            admiration: "#00BCD4",    // Cyan
            approval: "#4CAF50",      // Medium Green
            caring: "#CDDC39",        // Lime
            optimism: "#FFC107",      // Amber
            pride: "#9C27B0",         // Purple
            relief: "#03A9F4",        // Light Blue
            desire: "#FF4081",        // Pink Accent
            // Neutral emotions
            realization: "#607D8B",   // Blue Gray
            curiosity: "#009688",     // Teal
            // Negative emotions (cool/dark hues)
            confusion: "#795548",     // Brown
            nervousness: "#9E9E9E",   // Medium Gray
            embarrassment: "#FFAB91", // Light Red-Orange
            annoyance: "#FFB74D",     // Light Orange
            disappointment: "#F57C00", // Orange (reuse)
            disapproval: "#E64A19",   // Deep Orange
            remorse: "#6A1B9A",       // Deep Purple
            grief: "#311B92",         // Indigo

            // Happiness categories (5-level scale)
            very_happy: "#2E7D32",    // Dark Green
            happy: "#66BB6A",         // Light Green
            fine: "#FBC02D",          // Yellow
            unhappy: "#F57C00",       // Orange
            very_unhappy: "#D32F2F",  // Red
            // Topic colors
            "Business": "#1F77B4",        // Blue
            "Technology": "#FF7F0E",      // Orange
            "Health": "#2CA02C",          // Green
            "Politics": "#D62728",        // Red
            "Sports": "#9467BD",          // Purple
            "Entertainment": "#8C564B",   // Brown
            "Science": "#E377C2",         // Pink
            "Education": "#7F7F7F",       // Gray
            "Finance": "#BCBD22",         // Yellow-green
            "Travel": "#17BECF",          // Cyan
            "Food": "#FFB6C1",            // Light pink
            "Lifestyle": "#98D8C8"        // Mint
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
            disgust: "#DE8F05",       // Dark Orange
            negative: "#F0E442",      // Yellow

            // Emotion Detection Advanced - 28 emotions (optimized for protanopia - avoiding red-green)
            love: "#CC78BC",          // Purple
            amusement: "#F0E442",     // Yellow
            excitement: "#E69F00",    // Orange
            gratitude: "#56B4E9",     // Light Blue
            admiration: "#009E73",    // Blue-green
            approval: "#0173B2",      // Blue
            caring: "#D55E00",        // Dark Orange
            optimism: "#F0E442",      // Yellow
            pride: "#CC78BC",         // Purple
            relief: "#56B4E9",        // Light Blue
            desire: "#E08214",        // Orange
            realization: "#B35806",   // Brown
            curiosity: "#29B09D",     // Teal
            confusion: "#8F2D56",     // Dark Purple
            nervousness: "#AAAAAA",   // Gray
            embarrassment: "#CA9161", // Tan
            annoyance: "#DE8F05",     // Orange
            disappointment: "#B35806",// Brown
            disapproval: "#8F2D56",   // Dark Purple
            remorse: "#5F3D8F",       // Deep Purple
            grief: "#3A1F5F",         // Indigo

            // Happiness categories (5-level scale)
            very_happy: "#0173B2",    // Blue
            happy: "#29B09D",         // Teal
            fine: "#E1BE6A",          // Light Yellow
            unhappy: "#F0E442",       // Yellow
            very_unhappy: "#DE8F05",  // Dark Orange
            // Topic colors
            "Business": "#0173B2",
            "Technology": "#29B09D",
            "Health": "#CC78BC",
            "Politics": "#F0E442",
            "Sports": "#DE8F05",
            "Entertainment": "#999999",
            "Science": "#56B4E9",
            "Education": "#E1BE6A",
            "Finance": "#B35806",
            "Travel": "#005F73",
            "Food": "#CA9161",
            "Lifestyle": "#AE2012"
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
            disgust: "#8F2D56",       // Purple-Red
            negative: "#F0E442",      // Yellow

            // Emotion Detection Advanced - 28 emotions (optimized for deuteranopia - avoiding green)
            love: "#CC78BC",          // Purple
            amusement: "#F0E442",     // Yellow
            excitement: "#E69F00",    // Orange
            gratitude: "#56B4E9",     // Light Blue
            admiration: "#0173B2",    // Blue
            approval: "#457B9D",      // Dark Blue
            caring: "#D55E00",        // Dark Orange
            optimism: "#F0E442",      // Yellow
            pride: "#CC78BC",         // Purple
            relief: "#56B4E9",        // Light Blue
            desire: "#E08214",        // Orange
            realization: "#B35806",   // Brown
            curiosity: "#2A9D8F",     // Teal
            confusion: "#8F2D56",     // Purple-Red
            nervousness: "#AAAAAA",   // Gray
            embarrassment: "#E76F51", // Coral
            annoyance: "#E69F00",     // Orange
            disappointment: "#B35806",// Brown
            disapproval: "#8F2D56",   // Purple-Red
            remorse: "#6A4C93",       // Purple
            grief: "#3A1F5F",         // Indigo

            // Happiness categories (5-level scale)
            very_happy: "#0173B2",    // Blue
            happy: "#D55E00",         // Orange
            fine: "#E1BE6A",          // Light Yellow
            unhappy: "#F0E442",       // Yellow
            very_unhappy: "#8F2D56",  // Purple-Red
            // Topic colors
            "Business": "#0173B2",
            "Technology": "#D55E00",
            "Health": "#CC78BC",
            "Politics": "#F0E442",
            "Sports": "#E08214",
            "Entertainment": "#999999",
            "Science": "#56B4E9",
            "Education": "#B35806",
            "Finance": "#8F2D56",
            "Travel": "#457B9D",
            "Food": "#E76F51",
            "Lifestyle": "#2A9D8F"
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
            disgust: "#CC79A7",       // Pink
            negative: "#D55E00",      // Red-orange

            // Emotion Detection Advanced - 28 emotions (optimized for tritanopia - use red/green, avoid blue/yellow)
            love: "#CC79A7",          // Pink
            amusement: "#E69F00",     // Orange
            excitement: "#D55E00",    // Red-orange
            gratitude: "#56B4E9",     // Light Blue
            admiration: "#0173B2",    // Blue
            approval: "#40B0D0",      // Cyan
            caring: "#A6761D",        // Brown
            optimism: "#E69F00",      // Orange
            pride: "#CC79A7",         // Pink
            relief: "#56B4E9",        // Light Blue
            desire: "#BA3C3C",        // Red
            realization: "#999999",   // Gray
            curiosity: "#40B0D0",     // Cyan
            confusion: "#A6761D",     // Brown
            nervousness: "#6C757D",   // Dark Gray
            embarrassment: "#E69F00", // Orange
            annoyance: "#D55E00",     // Red-orange
            disappointment: "#A6761D",// Brown
            disapproval: "#BA3C3C",   // Red
            remorse: "#8B4789",       // Purple
            grief: "#5E3A6E",         // Dark Purple

            // Happiness categories (5-level scale)
            very_happy: "#0173B2",    // Blue
            happy: "#56B4E9",         // Light Blue
            fine: "#E69F00",          // Orange
            unhappy: "#D55E00",       // Red-orange
            very_unhappy: "#CC79A7",  // Pink
            // Topic colors
            "Business": "#0173B2",
            "Technology": "#E69F00",
            "Health": "#56B4E9",
            "Politics": "#D55E00",
            "Sports": "#CC79A7",
            "Entertainment": "#999999",
            "Science": "#F0E442",
            "Education": "#A6761D",
            "Finance": "#E1BE6A",
            "Travel": "#40B0D0",
            "Food": "#BA3C3C",
            "Lifestyle": "#6C757D"
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
            disgust: "#999999",       // Medium-light gray
            negative: "#CCCCCC",

            // Emotion Detection Advanced - 28 emotions (distinct grayscale values)
            love: "#1A1A1A",          // Very dark gray
            amusement: "#242424",
            excitement: "#2E2E2E",
            gratitude: "#383838",
            admiration: "#424242",
            approval: "#4C4C4C",
            caring: "#565656",
            optimism: "#606060",
            pride: "#6A6A6A",
            relief: "#747474",
            desire: "#7E7E7E",
            realization: "#888888",   // Medium gray
            curiosity: "#929292",
            confusion: "#9C9C9C",
            nervousness: "#A6A6A6",
            embarrassment: "#B0B0B0",
            annoyance: "#BABABA",
            disappointment: "#C4C4C4",
            disapproval: "#CECECE",
            remorse: "#D8D8D8",
            grief: "#E2E2E2",         // Very light gray

            // Happiness categories (5-level scale - grayscale)
            very_happy: "#2A2A2A",    // Very dark gray
            happy: "#555555",         // Dark gray
            fine: "#888888",          // Medium gray
            unhappy: "#BBBBBB",       // Light gray
            very_unhappy: "#EEEEEE",  // Very light gray
            // Topic colors (grayscale variants)
            "Business": "#1F1F1F",
            "Technology": "#2D2D2D",
            "Health": "#3A3A3A",
            "Politics": "#474747",
            "Sports": "#545454",
            "Entertainment": "#616161",
            "Science": "#6E6E6E",
            "Education": "#7B7B7B",
            "Finance": "#888888",
            "Travel": "#959595",
            "Food": "#A2A2A2",
            "Lifestyle": "#AFAFAF"
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
     * Get color for a word based on emotion, sentiment, or topic
     * @param {Object} wordData - Word object with emotion/sentiment/topic properties
     * @param {number} topicIndex - Index of topic in categories array
     * @returns {string} Hex color code
     */
    getWordColor: function(wordData, topicIndex) {
        const palette = this.colorPalettes[this.currentPalette];

        // Check if this is Emotion Detection Advanced data (28 emotions)
        const goemotions = [
            'joy', 'love', 'amusement', 'excitement', 'gratitude', 'admiration',
            'approval', 'caring', 'optimism', 'pride', 'relief', 'desire',
            'neutral', 'realization', 'curiosity', 'surprise',
            'confusion', 'nervousness', 'embarrassment', 'annoyance',
            'disappointment', 'disapproval', 'remorse', 'grief',
            'sadness', 'fear', 'disgust', 'anger'
        ];
        if (wordData.topic && goemotions.includes(wordData.topic)) {
            return palette[wordData.topic] || palette.neutral;
        }

        // Check if this is emotion-based data (6 emotions - topic field contains an emotion)
        const emotions = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'disgust', 'anger'];
        if (wordData.topic && emotions.includes(wordData.topic)) {
            const emotion = wordData.topic;
            return palette[emotion] || palette.neutral;
        }

        // Check if this is happiness-based data (topic field contains a happiness category)
        const happiness_categories = ['very_happy', 'happy', 'fine', 'unhappy', 'very_unhappy'];
        if (wordData.topic && happiness_categories.includes(wordData.topic)) {
            const happiness = wordData.topic;
            return palette[happiness] || palette.neutral;
        }

        // Check if this is topic-based data (topic field indicates the category)
        if (wordData.topic) {
            const topic = wordData.topic;
            // Try to get color directly from palette using topic name
            if (palette[topic]) {
                return palette[topic];
            }
        }

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
        const emotions = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'disgust', 'anger'];

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
