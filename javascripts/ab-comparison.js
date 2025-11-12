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
        const menu = document.getElementById('menu');
        if (!menu) return;

        const comparisonHTML = `
            <div id="abComparisonSection" class="control-section">
                <div class="control-section-title">🔄 A/B Comparison</div>
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="enableABComparison">
                    <span style="font-weight: 600; color: #333; font-size: 13px;">Enable Side-by-Side View</span>
                </label>

                <div id="abControls" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <div>
                            <label style="font-size: 11px; font-weight: 600; color: #666; display: block; margin-bottom: 5px;">
                                Period A
                            </label>
                            <select id="periodASelect" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;">
                                <option value="">Select period</option>
                            </select>
                        </div>

                        <div>
                            <label style="font-size: 11px; font-weight: 600; color: #666; display: block; margin-bottom: 5px;">
                                Period B
                            </label>
                            <select id="periodBSelect" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;">
                                <option value="">Select period</option>
                            </select>
                        </div>
                    </div>

                    <button id="applyABButton" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;">
                        Compare
                    </button>

                    <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2; display: none;" id="comparisonInfo">
                        <strong>Note:</strong> Comparison view shows two periods side-by-side for direct comparison
                    </div>
                </div>
            </div>
        `;

        menu.insertAdjacentHTML('beforeend', comparisonHTML);
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
        window.addEventListener('dataLoaded', (e) => {
            this.updatePeriodSelectors(e.detail?.periods || []);
        });
    },

    /**
     * Update period selectors with available periods
     */
    updatePeriodSelectors: function(periods) {
        this.allPeriods = periods;

        const selects = [
            document.getElementById('periodASelect'),
            document.getElementById('periodBSelect')
        ];

        selects.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select period</option>';

                periods.forEach(period => {
                    const option = document.createElement('option');
                    option.value = period;
                    option.textContent = period;
                    select.appendChild(option);
                });

                if (currentValue && periods.includes(currentValue)) {
                    select.value = currentValue;
                }
            }
        });
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

        // Create comparison view
        this.createComparisonView();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('abComparisonApplied', {
            detail: { left: periodA, right: periodB }
        }));
    },

    /**
     * Create side-by-side comparison view
     */
    createComparisonView: function() {
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
        container.innerHTML = `
            <div id="leftPanel" style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">
                    Period A: <strong>${this.leftPeriod}</strong>
                </h3>
                <svg id="leftSVG" width="100%" height="400"></svg>
                <div id="leftStats" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;"></div>
            </div>

            <div id="rightPanel" style="border: 2px solid #764ba2; border-radius: 8px; padding: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #764ba2;">
                    Period B: <strong>${this.rightPeriod}</strong>
                </h3>
                <svg id="rightSVG" width="100%" height="400"></svg>
                <div id="rightStats" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;"></div>
            </div>

            <button id="exitComparisonButton" style="
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                z-index: 1000;
                font-weight: 600;
            ">
                ✕ Exit Comparison
            </button>
        `;

        // Add exit button listener
        const exitButton = document.getElementById('exitComparisonButton');
        if (exitButton) {
            exitButton.addEventListener('click', () => this.deactivateComparison());
        }

        console.log('✓ A/B Comparison view created');
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

        // Uncheck checkbox
        const checkbox = document.getElementById('enableABComparison');
        if (checkbox) {
            checkbox.checked = false;
        }

        const controls = document.getElementById('abControls');
        if (controls) {
            controls.style.display = 'none';
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
