/**
 * Enhanced Timeline Slider with Autoplay
 * Adds smooth animation through time periods with playback controls
 */

const TimelineSlider = {

    isPlaying: false,
    playbackSpeed: 1000,  // milliseconds between frames
    animationFrameId: null,
    currentIndex: 0,
    periods: [],

    /**
     * Initialize timeline slider
     * @param {Array} timelineData - Array of time period labels
     */
    init: function(timelineData) {
        this.periods = timelineData;
        this.createPlayerControls();
        this.attachEventListeners();
        console.log('✓ Timeline Slider initialized with', timelineData.length, 'periods');
    },

    /**
     * Create playback control UI
     */
    createPlayerControls: function() {
        if (!BottomPanelManager.panelExists()) {
            console.warn('Bottom panel not ready, retrying...');
            setTimeout(() => this.createPlayerControls(), 100);
            return;
        }

        const controlsHTML = `
            <div id="timelineControls" class="timeline-controls">
                <div class="player-buttons">
                    <button id="playButton" class="player-btn play-btn" title="Play animation">
                        <span class="play-icon">▶</span>
                    </button>
                    <button id="pauseButton" class="player-btn pause-btn" title="Pause animation" style="display:none;">
                        <span class="pause-icon">⏸</span>
                    </button>
                    <button id="resetButton" class="player-btn reset-btn" title="Reset to start">
                        <span class="reset-icon">⏮</span>
                    </button>
                </div>

                <div class="speed-control">
                    <label for="speedSlider">Speed:</label>
                    <input type="range" id="speedSlider" min="0.5" max="3" step="0.5" value="1" title="Playback speed">
                    <span id="speedLabel">1x</span>
                </div>

                <div class="current-period">
                    <span id="currentPeriodLabel">—</span>
                </div>
            </div>
        `;

        BottomPanelManager.addFeatureSection('⏯️ Timeline Animation', controlsHTML, 'timeline-feature');
    },

    /**
     * Attach event listeners to controls
     */
    attachEventListeners: function() {
        const playBtn = document.getElementById('playButton');
        const pauseBtn = document.getElementById('pauseButton');
        const resetBtn = document.getElementById('resetButton');
        const speedSlider = document.getElementById('speedSlider');

        if (playBtn) playBtn.addEventListener('click', () => this.play());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

        if (speedSlider) {
            speedSlider.addEventListener('change', (e) => {
                this.playbackSpeed = 2000 / parseFloat(e.target.value);
                document.getElementById('speedLabel').textContent = e.target.value + 'x';
            });
        }

        // Listen for document visibility changes (pause when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                this.pause();
            }
        });
    },

    /**
     * Start autoplay animation
     */
    play: function() {
        if (this.isPlaying) return;

        this.isPlaying = true;

        // Update button visibility
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'inline-block';

        this.animateNext();
    },

    /**
     * Pause animation
     */
    pause: function() {
        this.isPlaying = false;

        // Update button visibility
        document.getElementById('playButton').style.display = 'inline-block';
        document.getElementById('pauseButton').style.display = 'none';

        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId);
        }
    },

    /**
     * Reset to beginning
     */
    reset: function() {
        this.pause();
        this.currentIndex = 0;
        this.updatePeriod(0);
    },

    /**
     * Animate to next frame
     */
    animateNext: function() {
        if (!this.isPlaying) return;

        // Move to next period
        this.currentIndex++;

        if (this.currentIndex >= this.periods.length) {
            // Loop back to beginning
            this.currentIndex = 0;
        }

        // Update visualization
        this.updatePeriod(this.currentIndex);

        // Schedule next frame
        this.animationFrameId = setTimeout(() => this.animateNext(), this.playbackSpeed);
    },

    /**
     * Update visualization for a specific period
     */
    updatePeriod: function(index) {
        if (index < 0 || index >= this.periods.length) return;

        this.currentIndex = index;

        // Update label
        const label = document.getElementById('currentPeriodLabel');
        if (label) {
            label.textContent = this.periods[index];
        }

        // Trigger data update/visualization refresh
        // This would call the existing draw() function with data for this period
        if (typeof window.updateVisualizationForPeriod === 'function') {
            window.updateVisualizationForPeriod(index);
        }

        // Dispatch event for other listeners
        window.dispatchEvent(new CustomEvent('periodChanged', {
            detail: { index: index, period: this.periods[index] }
        }));
    },

    /**
     * Jump to specific period
     */
    jumpToPeriod: function(periodLabel) {
        const index = this.periods.indexOf(periodLabel);
        if (index !== -1) {
            this.pause();
            this.updatePeriod(index);
        }
    },

    /**
     * Get current playback state
     */
    getState: function() {
        return {
            isPlaying: this.isPlaying,
            currentIndex: this.currentIndex,
            currentPeriod: this.periods[this.currentIndex],
            totalPeriods: this.periods.length,
            playbackSpeed: this.playbackSpeed
        };
    }
};
