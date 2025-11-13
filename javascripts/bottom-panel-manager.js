/**
 * Bottom Panel Manager
 * Creates and manages a fixed bottom panel for new feature controls
 * Keeps original Control Panel untouched
 */

const BottomPanelManager = {

    /**
     * Initialize the bottom panel
     */
    init: function() {
        this.createBottomPanel();
        console.log('✓ Bottom Panel Manager initialized');
    },

    /**
     * Create the fixed bottom panel
     */
    createBottomPanel: function() {
        // Check if panel already exists
        if (document.getElementById('newFeaturesPanel')) {
            return;
        }

        const panelHTML = `
            <div id="newFeaturesPanel">
                <!-- Features will be added here by individual modules -->
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);
    },

    /**
     * Add a feature section to the bottom panel
     * @param {string} title - Feature title (with emoji)
     * @param {string} content - HTML content for the feature
     * @param {string} featureId - Unique ID for this section
     */
    addFeatureSection: function(title, content, featureId) {
        const panel = document.getElementById('newFeaturesPanel');
        if (!panel) {
            console.error('Bottom panel not found');
            return;
        }

        // Check if section already exists
        if (document.getElementById(featureId)) {
            return;
        }

        const sectionHTML = `
            <div id="${featureId}" class="feature-section">
                <div class="feature-title">${title}</div>
                ${content}
            </div>
        `;

        panel.insertAdjacentHTML('beforeend', sectionHTML);
    },

    /**
     * Get the bottom panel element
     */
    getPanel: function() {
        return document.getElementById('newFeaturesPanel');
    },

    /**
     * Check if panel exists
     */
    panelExists: function() {
        return document.getElementById('newFeaturesPanel') !== null;
    }
};

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    BottomPanelManager.init();
});
