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
     * Create comparison overlay panel
     */
    createComparisonView: function(dataA, dataB) {
        // Keep original visualization visible

        // Create comparison overlay container
        let container = document.getElementById('abComparisonContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'abComparisonContainer';
            container.className = 'comparison-overlay';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="comparison-header">
                <span class="comparison-title">📊 Period Comparison</span>
                <button id="closeComparisonBtn" class="comparison-close-btn">✕</button>
            </div>
            <div class="comparison-body">
                <div class="comparison-period">
                    <div class="period-label period-a-label">Period A: <strong>${this.leftPeriod}</strong></div>
                    <div id="leftStats" class="period-stats"></div>
                </div>
                <div class="comparison-divider"></div>
                <div class="comparison-period">
                    <div class="period-label period-b-label">Period B: <strong>${this.rightPeriod}</strong></div>
                    <div id="rightStats" class="period-stats"></div>
                </div>
            </div>
        `;

        container.style.display = 'block';

        // Populate statistics for both periods
        const leftStatsDiv = document.getElementById('leftStats');
        const rightStatsDiv = document.getElementById('rightStats');

        if (dataA) {
            const statsA = this.generateComparisonStats(dataA);
            if (leftStatsDiv) leftStatsDiv.innerHTML = statsA;
        } else {
            if (leftStatsDiv) leftStatsDiv.innerHTML = '<p style="color: #999; font-size: 11px;">No data available</p>';
        }

        if (dataB) {
            const statsB = this.generateComparisonStats(dataB);
            if (rightStatsDiv) rightStatsDiv.innerHTML = statsB;
        } else {
            if (rightStatsDiv) rightStatsDiv.innerHTML = '<p style="color: #999; font-size: 11px;">No data available</p>';
        }

        // Add close button listener
        const closeBtn = document.getElementById('closeComparisonBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivateComparison());
        }

        // Make draggable
        this.makeDraggable(container);

        console.log('✓ Comparison overlay panel created');
    },

    /**
     * Make overlay panel draggable
     */
    makeDraggable: function(element) {
        const header = element.querySelector('.comparison-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.style.cursor = 'move';

        header.addEventListener('mousedown', (e) => {
            if (e.target.id === 'closeComparisonBtn') return;

            isDragging = true;
            initialX = e.clientX - element.offsetLeft;
            initialY = e.clientY - element.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                element.style.right = 'auto';
                element.style.bottom = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    },

    /**
     * Generate comparison statistics (compact version)
     */
    generateComparisonStats: function(periodData) {
        let stats = '';

        if (!periodData || !periodData.words) {
            return '<p style="color: #999; font-size: 11px;">No data available</p>';
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

        stats += `<div class="stat-row"><span class="stat-label">Words:</span> <span class="stat-value">${totalWords}</span></div>`;
        stats += `<div class="stat-row"><span class="stat-label">Mentions:</span> <span class="stat-value">${totalFrequency}</span></div>`;
        stats += `<div class="stat-row"><span class="stat-label">Sentiment:</span> <span class="stat-value">${(avgSentiment * 100).toFixed(0)}%</span></div>`;

        // Top 3 words
        const allWords = [];
        Object.keys(periodData.words).forEach(category => {
            allWords.push(...periodData.words[category]);
        });

        allWords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

        stats += `<div class="stat-row top-words-label"><strong>Top Words:</strong></div>`;
        allWords.slice(0, 3).forEach((word, index) => {
            stats += `<div class="stat-row top-word">${index + 1}. ${word.text} <span class="word-freq">(${word.frequency || 0})</span></div>`;
        });

        return stats;
    },

    /**
     * Deactivate comparison and hide overlay
     */
    deactivateComparison: function() {
        this.isActive = false;

        // Hide comparison overlay
        const container = document.getElementById('abComparisonContainer');
        if (container) {
            container.style.display = 'none';
        }

        console.log('✓ Comparison overlay closed');
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
