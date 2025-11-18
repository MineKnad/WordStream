/**
 * A/B Comparison View for WordStream
 * Compare two time periods or datasets side-by-side
 */

const ABComparison = {

    isActive: false,
    leftPeriod: null,
    rightPeriod: null,
    allPeriods: [],

    /**
     * Initialize A/B comparison module
     */
    init: function() {
        this.createComparisonUI();
        this.attachEventListeners();
        console.log('✓ A/B Comparison module initialized');
    },

    /**
     * Create A/B comparison interface
     */
    createComparisonUI: function() {
        if (!BottomPanelManager.panelExists()) {
            console.warn('Bottom panel not ready, retrying...');
            setTimeout(() => this.createComparisonUI(), 100);
            return;
        }

        const comparisonHTML = `
            <div id="abComparisonInner">
                <div id="abControls" style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <select id="periodASelect" style="padding: 5px 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;">
                        <option value="">Period A</option>
                    </select>

                    <select id="periodBSelect" style="padding: 5px 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;">
                        <option value="">Period B</option>
                    </select>

                    <button id="applyABButton" style="padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: 600; font-size: 11px;">
                        Compare
                    </button>
                </div>
            </div>
        `;

        BottomPanelManager.addFeatureSection('🔄 A/B Compare', comparisonHTML, 'ab-comparison-feature');
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
        const checkbox = document.getElementById('enableABComparison');
        const controls = document.getElementById('abControls');
        const applyButton = document.getElementById('applyABButton');

        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                controls.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
                    this.deactivateComparison();
                }
            });
        }

        if (applyButton) {
            applyButton.addEventListener('click', () => this.applyComparison());
        }

        // Listen for dataset changes
        const self = this;
        window.addEventListener('dataLoaded', (e) => {
            console.log('✓ dataLoaded event received in A/B Compare');
            console.log('Periods from event:', e.detail?.periods);
            self.updatePeriodSelectors(e.detail?.periods || []);
        });
    },

    /**
     * Update period selectors with available periods
     */
    updatePeriodSelectors: function(periods) {
        console.log('updatePeriodSelectors called with periods:', periods);
        this.allPeriods = periods;

        const selects = [
            document.getElementById('periodASelect'),
            document.getElementById('periodBSelect')
        ];

        selects.forEach((select, index) => {
            if (select) {
                console.log(`Updating select ${index}:`, select.id);
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select period</option>';

                periods.forEach(period => {
                    const option = document.createElement('option');
                    option.value = period;
                    option.textContent = period;
                    select.appendChild(option);
                });

                console.log(`Select ${index} now has ${select.options.length} options`);

                if (currentValue && periods.includes(currentValue)) {
                    select.value = currentValue;
                }
            } else {
                console.warn(`Select ${index} not found in DOM`);
            }
        });

        // Auto-select first two periods if available
        if (periods.length >= 2) {
            const periodASelect = document.getElementById('periodASelect');
            const periodBSelect = document.getElementById('periodBSelect');
            if (periodASelect) periodASelect.value = periods[0];
            if (periodBSelect) periodBSelect.value = periods[1];
            console.log(`✓ Auto-selected periods: "${periods[0]}" vs "${periods[1]}"`);
        }
    },

    /**
     * Apply A/B comparison
     */
    applyComparison: function() {
        const periodA = document.getElementById('periodASelect').value;
        const periodB = document.getElementById('periodBSelect').value;

        if (!periodA || !periodB) {
            alert('Please select both periods');
            return;
        }

        if (periodA === periodB) {
            alert('Please select different periods');
            return;
        }

        this.leftPeriod = periodA;
        this.rightPeriod = periodB;
        this.isActive = true;

        console.log(`✓ A/B Comparison: "${periodA}" vs "${periodB}"`);

        // Get data for each period from the global currentDrawData
        const dataA = this.getPeriodData(periodA);
        const dataB = this.getPeriodData(periodB);

        console.log('Period A data:', dataA);
        console.log('Period B data:', dataB);

        // Create comparison view with data
        this.createComparisonView(dataA, dataB);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('abComparisonApplied', {
            detail: { left: periodA, right: periodB }
        }));
    },

    /**
     * Get data for a specific period
     */
    getPeriodData: function(periodName) {
        if (typeof currentDrawData === 'undefined' || !currentDrawData) {
            console.warn('currentDrawData not available');
            return null;
        }

        // Find the data object for this period
        const periodData = currentDrawData.find(d => d.date === periodName);
        console.log(`Found data for period "${periodName}":`, periodData);
        return periodData;
    },

    /**
     * Create side-by-side comparison view
     */
    createComparisonView: function(dataA, dataB) {
        // Hide original visualization
        const mainSvg = document.getElementById('mainsvg');
        if (mainSvg) {
            mainSvg.style.display = 'none';
        }

        // Create comparison container
        let container = document.getElementById('abComparisonContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'abComparisonContainer';
            document.body.insertBefore(container, mainSvg?.nextSibling);
        }

        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gap = '20px';
        container.style.padding = '20px';
        container.style.marginTop = '60px';
        container.style.marginLeft = '360px';
        container.style.marginRight = '20px';
        container.style.position = 'relative';
        container.innerHTML = `
            <div id="leftPanel" style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">
                    Period A: <strong>${this.leftPeriod}</strong>
                </h3>
                <div id="leftStats" style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;"></div>
            </div>

            <div id="rightPanel" style="border: 2px solid #764ba2; border-radius: 8px; padding: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #764ba2;">
                    Period B: <strong>${this.rightPeriod}</strong>
                </h3>
                <div id="rightStats" style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;"></div>
            </div>
        `;

        // Create exit button above the panels (remove existing one first)
        const existingExitButton = document.getElementById('exitComparisonButton');
        if (existingExitButton) {
            existingExitButton.remove();
        }

        const exitButton = document.createElement('button');
        exitButton.id = 'exitComparisonButton';
        exitButton.textContent = '✕ Exit Comparison';
        exitButton.style.cssText = `
            position: absolute;
            top: -45px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            z-index: 1000;
            font-weight: 600;
        `;
        container.appendChild(exitButton);

        // Populate statistics for both periods
        const leftStatsDiv = document.getElementById('leftStats');
        const rightStatsDiv = document.getElementById('rightStats');

        if (dataA) {
            const statsA = this.generateComparisonStats(dataA);
            if (leftStatsDiv) leftStatsDiv.innerHTML = statsA;
        } else {
            if (leftStatsDiv) leftStatsDiv.innerHTML = '<p>No data available for this period</p>';
        }

        if (dataB) {
            const statsB = this.generateComparisonStats(dataB);
            if (rightStatsDiv) rightStatsDiv.innerHTML = statsB;
        } else {
            if (rightStatsDiv) rightStatsDiv.innerHTML = '<p>No data available for this period</p>';
        }

        // Add exit button listener
        if (exitButton) {
            exitButton.addEventListener('click', () => this.deactivateComparison());
        }

        console.log('✓ A/B Comparison view created with stats');
    },

    /**
     * Generate comparison statistics
     */
    generateComparisonStats: function(periodData) {
        let stats = '';

        if (!periodData || !periodData.words) {
            return '<p>No data available</p>';
        }

        // Count words and frequency
        let totalWords = 0;
        let totalFrequency = 0;
        let avgSentiment = 0;
        let sentimentCount = 0;

        Object.keys(periodData.words).forEach(category => {
            const words = periodData.words[category];
            totalWords += words.length;

            words.forEach(word => {
                totalFrequency += word.frequency || 0;
                if (word.sentiment !== undefined) {
                    avgSentiment += parseFloat(word.sentiment);
                    sentimentCount++;
                }
            });
        });

        if (sentimentCount > 0) {
            avgSentiment /= sentimentCount;
        }

        stats += `<strong>Statistics:</strong><br>`;
        stats += `Total Words: ${totalWords}<br>`;
        stats += `Total Mentions: ${totalFrequency}<br>`;
        stats += `Avg. Sentiment: ${(avgSentiment * 100).toFixed(0)}%<br>`;

        // Top 3 words
        const allWords = [];
        Object.keys(periodData.words).forEach(category => {
            allWords.push(...periodData.words[category]);
        });

        allWords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

        stats += `<br><strong>Top Words:</strong><br>`;
        allWords.slice(0, 3).forEach(word => {
            stats += `• ${word.text} (${word.frequency || 0})<br>`;
        });

        return stats;
    },

    /**
     * Deactivate comparison and show original view
     */
    deactivateComparison: function() {
        this.isActive = false;

        // Show original visualization
        const mainSvg = document.getElementById('mainsvg');
        if (mainSvg) {
            mainSvg.style.display = 'block';
        }

        // Hide comparison container
        const container = document.getElementById('abComparisonContainer');
        if (container) {
            container.style.display = 'none';
        }

        // Remove exit button
        const exitButton = document.getElementById('exitComparisonButton');
        if (exitButton) {
            exitButton.remove();
        }

        console.log('✓ A/B Comparison deactivated');
    },

    /**
     * Get comparison state
     */
    getState: function() {
        return {
            isActive: this.isActive,
            leftPeriod: this.leftPeriod,
            rightPeriod: this.rightPeriod
        };
    }
};

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    ABComparison.init();
});
