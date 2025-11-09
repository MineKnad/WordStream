/**
 * Word Sentiment Trajectory Panel
 * Shows sentiment evolution of individual words over time
 */

const SentimentTrajectory = {

    currentWord: null,
    trajectoryData: [],

    /**
     * Initialize trajectory panel
     */
    init: function() {
        this.createTrajectoryPanel();
        console.log('✓ Sentiment Trajectory module initialized');
    },

    /**
     * Create trajectory panel HTML
     */
    createTrajectoryPanel: function() {
        const panelHTML = `
            <div id="trajectoryPanel" class="trajectory-panel" style="display: none;">
                <div class="trajectory-header">
                    <h3 id="trajectoryTitle">Word Sentiment Evolution</h3>
                    <button class="trajectory-close" onclick="SentimentTrajectory.close()">&times;</button>
                </div>

                <div class="trajectory-content">
                    <div id="trajectoryChart" style="width: 100%; height: 300px;"></div>

                    <div class="trajectory-stats">
                        <div class="stat">
                            <strong>Overall Sentiment:</strong>
                            <span id="overallSentiment">—</span>
                        </div>
                        <div class="stat">
                            <strong>Trend:</strong>
                            <span id="sentimentTrend">—</span>
                        </div>
                        <div class="stat">
                            <strong>Frequency Change:</strong>
                            <span id="frequencyChange">—</span>
                        </div>
                    </div>

                    <div class="trajectory-insights">
                        <strong>Insights:</strong>
                        <ul id="trajectoryInsights"></ul>
                    </div>
                </div>
            </div>
        `;

        if (!document.getElementById('trajectoryPanel')) {
            document.body.insertAdjacentHTML('beforeend', panelHTML);
        }
    },

    /**
     * Open trajectory panel for a word
     * @param {string} wordText - The word to analyze
     * @param {Array} data - WordStream data
     */
    openForWord: function(wordText, data) {
        this.currentWord = wordText;

        // Extract trajectory data for this word across all time periods
        this.trajectoryData = [];

        data.forEach(period => {
            let sentimentSum = 0;
            let count = 0;
            let frequency = 0;

            // Search in all categories for this word
            if (period.words) {
                Object.keys(period.words).forEach(category => {
                    const categoryWords = period.words[category];
                    const found = categoryWords.find(w => w.text === wordText);

                    if (found) {
                        sentimentSum += parseFloat(found.sentiment || 0);
                        frequency = found.frequency || 0;
                        count++;
                    }
                });
            }

            if (count > 0) {
                this.trajectoryData.push({
                    period: period.period || period.date,
                    sentiment: sentimentSum / count,
                    frequency: frequency,
                    count: count
                });
            }
        });

        if (this.trajectoryData.length === 0) {
            alert(`No sentiment data found for word: "${wordText}"`);
            return;
        }

        // Update panel with data
        this.updatePanel();

        // Show panel
        document.getElementById('trajectoryPanel').style.display = 'block';
    },

    /**
     * Update trajectory panel with current data
     */
    updatePanel: function() {
        // Update title
        document.getElementById('trajectoryTitle').textContent = `"${this.currentWord}" - Sentiment Evolution`;

        // Update stats
        this.updateStats();

        // Draw chart
        this.drawChart();

        // Generate insights
        this.generateInsights();
    },

    /**
     * Update statistics
     */
    updateStats: function() {
        if (this.trajectoryData.length === 0) return;

        // Overall sentiment
        const avgSentiment = this.trajectoryData.reduce((sum, d) => sum + d.sentiment, 0) / this.trajectoryData.length;
        document.getElementById('overallSentiment').textContent = this.formatSentiment(avgSentiment);

        // Trend (compare first half to second half)
        const midpoint = Math.floor(this.trajectoryData.length / 2);
        const firstHalf = this.trajectoryData.slice(0, midpoint);
        const secondHalf = this.trajectoryData.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, d) => sum + d.sentiment, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.sentiment, 0) / secondHalf.length;
        const trend = secondAvg - firstAvg;

        let trendText = '';
        if (Math.abs(trend) < 0.1) {
            trendText = '➡️ Stable';
        } else if (trend > 0) {
            trendText = `📈 More positive (${(trend * 100).toFixed(1)}%)`;
        } else {
            trendText = `📉 More negative (${(trend * 100).toFixed(1)}%)`;
        }

        document.getElementById('sentimentTrend').textContent = trendText;

        // Frequency change
        const firstFreq = firstHalf.reduce((sum, d) => sum + d.frequency, 0);
        const secondFreq = secondHalf.reduce((sum, d) => sum + d.frequency, 0);
        const freqChange = ((secondFreq - firstFreq) / firstFreq) * 100;

        let freqText = '';
        if (freqChange > 0) {
            freqText = `📈 +${freqChange.toFixed(1)}% mentions`;
        } else if (freqChange < 0) {
            freqText = `📉 ${freqChange.toFixed(1)}% mentions`;
        } else {
            freqText = `➡️ Stable`;
        }

        document.getElementById('frequencyChange').textContent = freqText;
    },

    /**
     * Draw sentiment trajectory chart
     */
    drawChart: function() {
        const container = document.getElementById('trajectoryChart');
        container.innerHTML = '';  // Clear

        if (this.trajectoryData.length === 0) return;

        // Simple SVG chart
        const width = container.offsetWidth;
        const height = 300;
        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height);

        // Create scales
        const xScale = d3.scale.ordinal()
            .domain(this.trajectoryData.map(d => d.period))
            .rangeBands([0, innerWidth]);

        const yScale = d3.scale.linear()
            .domain([-1, 1])
            .range([innerHeight, 0]);

        const freqScale = d3.scale.linear()
            .domain([0, d3.max(this.trajectoryData, d => d.frequency)])
            .range([5, 15]);  // Circle radius

        // Group
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Y-axis (0 line)
        g.append('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0))
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '4');

        // Line path
        const line = d3.svg.line()
            .x(d => xScale(d.period) + xScale.rangeBand() / 2)
            .y(d => yScale(d.sentiment));

        g.append('path')
            .attr('d', line(this.trajectoryData))
            .attr('fill', 'none')
            .attr('stroke', '#4285F4')
            .attr('stroke-width', 2);

        // Data points (circles sized by frequency)
        g.selectAll('.data-point')
            .data(this.trajectoryData)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', d => xScale(d.period) + xScale.rangeBand() / 2)
            .attr('cy', d => yScale(d.sentiment))
            .attr('r', d => freqScale(d.frequency))
            .attr('fill', d => {
                if (d.sentiment > 0.3) return '#2E7D32';  // Green
                if (d.sentiment < -0.3) return '#F57C00'; // Orange
                return '#757575';  // Gray
            })
            .attr('opacity', 0.7)
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        // X-axis labels
        g.selectAll('.x-label')
            .data(this.trajectoryData)
            .enter()
            .append('text')
            .attr('class', 'x-label')
            .attr('x', d => xScale(d.period) + xScale.rangeBand() / 2)
            .attr('y', innerHeight + 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(d => d.period);

        // Y-axis labels
        const yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .ticks(5)
            .tickFormat(d => {
                if (d > 0) return `+${d}`;
                if (d < 0) return d;
                return 'neutral';
            });

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Y-axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (innerHeight / 2))
            .attr('dy', '1em')
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text('Sentiment');

        // Legend for circle size
        g.append('text')
            .attr('x', innerWidth - 80)
            .attr('y', -5)
            .attr('font-size', '11px')
            .attr('fill', '#999')
            .text('● size = frequency');
    },

    /**
     * Generate insights about the word's sentiment
     */
    generateInsights: function() {
        const insights = [];

        if (this.trajectoryData.length < 2) {
            document.getElementById('trajectoryInsights').innerHTML = '<li>Insufficient data for insights</li>';
            return;
        }

        // Find peak sentiment
        const maxSentiment = d3.max(this.trajectoryData, d => d.sentiment);
        const minSentiment = d3.min(this.trajectoryData, d => d.sentiment);
        const maxPeriod = this.trajectoryData.find(d => d.sentiment === maxSentiment);
        const minPeriod = this.trajectoryData.find(d => d.sentiment === minSentiment);

        if (maxSentiment > 0.3) {
            insights.push(`Most positive in <strong>${maxPeriod.period}</strong> (sentiment: ${(maxSentiment * 100).toFixed(0)}%)`);
        }

        if (minSentiment < -0.3) {
            insights.push(`Most negative in <strong>${minPeriod.period}</strong> (sentiment: ${(minSentiment * 100).toFixed(0)}%)`);
        }

        // Volatility
        const sentiments = this.trajectoryData.map(d => d.sentiment);
        const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - (sum / sentiments.length), 2), 0) / sentiments.length;
        const volatility = Math.sqrt(variance);

        if (volatility > 0.3) {
            insights.push(`⚠️ High sentiment volatility - perception changes frequently`);
        } else {
            insights.push(`✓ Consistent sentiment - stable perception over time`);
        }

        // Peak frequency
        const maxFreq = d3.max(this.trajectoryData, d => d.frequency);
        const maxFreqPeriod = this.trajectoryData.find(d => d.frequency === maxFreq);

        insights.push(`Peak mentions in <strong>${maxFreqPeriod.period}</strong> (${maxFreq} times)`);

        // Update DOM
        const insightsList = document.getElementById('trajectoryInsights');
        insightsList.innerHTML = '';
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.innerHTML = insight;
            insightsList.appendChild(li);
        });
    },

    /**
     * Format sentiment value for display
     */
    formatSentiment: function(sentiment) {
        if (sentiment > 0.3) {
            return `😊 Positive (${(sentiment * 100).toFixed(0)}%)`;
        } else if (sentiment < -0.3) {
            return `😞 Negative (${(sentiment * 100).toFixed(0)}%)`;
        } else {
            return `😐 Neutral`;
        }
    },

    /**
     * Close trajectory panel
     */
    close: function() {
        document.getElementById('trajectoryPanel').style.display = 'none';
    }
};

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    SentimentTrajectory.init();
});
