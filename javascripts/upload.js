/**
 * File Upload and Processing Module for WordStream
 * Allows users to upload their own datasets for visualization
 */

const UploadManager = {
    apiBaseUrl: 'http://localhost:5000',
    isProcessing: false,

    /**
     * Initialize upload UI
     */
    init: function() {
        this.createUploadModal();
        this.attachEventListeners();
        this.addClearDatasetsButton();
        console.log('✓ Upload Manager initialized');
    },

    /**
     * Create upload modal HTML
     */
    createUploadModal: function() {
        const modalHTML = `
            <div id="uploadModal" class="upload-modal" style="display:none;">
                <div class="upload-modal-content">
                    <span class="upload-modal-close">&times;</span>
                    <h2>Upload Your Own Dataset</h2>

                    <div class="upload-container">
                        <!-- File Upload Area -->
                        <div class="upload-drag-drop" id="dragDropArea">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p><strong>Drag & drop your file here</strong><br>or click to browse</p>
                            <p style="font-size: 12px; color: #999;">
                                Supported: CSV, TSV, JSON, TXT (max 50MB)
                            </p>
                            <input type="file" id="fileInput" style="display:none;" accept=".csv,.tsv,.json,.txt,.xlsx">
                        </div>

                        <!-- Column Mapping -->
                        <div id="columnMappingSection" style="display:none; margin-top: 20px;">
                            <h3>Map Your Columns</h3>
                            <div class="form-group">
                                <label for="dateColumnSelect">Date Column:</label>
                                <select id="dateColumnSelect" class="form-control">
                                    <option value="">Select date column</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="textColumnSelect">Text Column:</label>
                                <select id="textColumnSelect" class="form-control">
                                    <option value="">Select text column</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="sentimentModelSelect">Sentiment Model:</label>
                                <select id="sentimentModelSelect" class="form-control">
                                    <option value="emotion">Emotion Detection (recommended)</option>
                                    <option value="sentiment">Sentiment Analysis</option>
                                    <option value="happiness">Happiness Score</option>
                                </select>
                            </div>
                        </div>

                        <!-- Status/Progress -->
                        <div id="processingStatus" style="display:none; margin-top: 20px;">
                            <div class="progress-bar">
                                <div id="progressFill" class="progress-fill"></div>
                            </div>
                            <p id="statusText" style="text-align: center; margin-top: 10px;">Processing...</p>
                        </div>

                        <!-- Buttons -->
                        <div class="upload-actions" style="display:none;" id="uploadActions">
                            <button id="processButton" class="btn btn-primary">
                                Process Dataset
                            </button>
                            <button id="cancelUploadButton" class="btn btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body if not exists
        if (!document.getElementById('uploadModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
        const modal = document.getElementById('uploadModal');
        const dragDropArea = document.getElementById('dragDropArea');
        const fileInput = document.getElementById('fileInput');
        const closeBtn = document.querySelector('.upload-modal-close');
        const processBtn = document.getElementById('processButton');
        const cancelBtn = document.getElementById('cancelUploadButton');

        // Open modal when clicking drag-drop area
        dragDropArea.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelected(e));

        // Drag and drop
        dragDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragDropArea.style.borderColor = '#4CAF50';
            dragDropArea.style.backgroundColor = '#f0f8f0';
        });

        dragDropArea.addEventListener('dragleave', () => {
            dragDropArea.style.borderColor = '#ddd';
            dragDropArea.style.backgroundColor = '#fafafa';
        });

        dragDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dragDropArea.style.borderColor = '#ddd';
            dragDropArea.style.backgroundColor = '#fafafa';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.handleFileSelected({ target: { files: files } });
            }
        });

        // Close modal
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        // Buttons
        if (processBtn) processBtn.addEventListener('click', () => this.processDataset());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
    },

    /**
     * Handle file selection
     */
    handleFileSelected: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // Validate file size
        if (file.size > 50 * 1024 * 1024) {
            alert('File is too large (max 50MB)');
            return;
        }

        // Read file to get column names
        this.previewFileColumns(file);
    },

    /**
     * Preview file and extract column names
     */
    previewFileColumns: function(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let columns = [];

                if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
                    const separator = file.name.endsWith('.tsv') ? '\t' : ',';
                    const lines = content.split('\n');
                    const headerLine = lines[0];
                    columns = headerLine.split(separator).map(col => col.trim().replace(/^"|"$/g, ''));
                } else if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    if (Array.isArray(data) && data.length > 0) {
                        columns = Object.keys(data[0]);
                    }
                } else if (file.name.endsWith('.txt')) {
                    // Assume pipe-separated: date|text|category
                    columns = ['date', 'text', 'category'];
                }

                this.populateColumnSelectors(columns);
                document.getElementById('columnMappingSection').style.display = 'block';
                document.getElementById('uploadActions').style.display = 'flex';

            } catch (error) {
                alert(`Error reading file: ${error.message}`);
                console.error(error);
            }
        };

        // Read only first part for performance
        reader.readAsText(file.slice(0, 10000));
    },

    /**
     * Populate column selectors
     */
    populateColumnSelectors: function(columns) {
        const dateSelect = document.getElementById('dateColumnSelect');
        const textSelect = document.getElementById('textColumnSelect');

        // Clear previous options
        [dateSelect, textSelect].forEach(select => {
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = firstOption.outerHTML;
        });

        // Add column options
        columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;

            dateSelect.appendChild(option.cloneNode(true));
            textSelect.appendChild(option.cloneNode(true));
        });

        // Auto-select common column names
        this.autoSelectColumns(columns, dateSelect, textSelect);
    },

    /**
     * Auto-select columns based on common naming patterns
     */
    autoSelectColumns: function(columns, dateSelect, textSelect) {
        // Date column detection
        const datePatterns = ['date', 'time', 'timestamp', 'published', 'created', 'year', 'month'];
        for (let col of columns) {
            if (datePatterns.some(p => col.toLowerCase().includes(p))) {
                dateSelect.value = col;
                break;
            }
        }

        // Text column detection
        const textPatterns = ['text', 'content', 'message', 'body', 'comment', 'review', 'description', 'title'];
        for (let col of columns) {
            if (textPatterns.some(p => col.toLowerCase().includes(p))) {
                textSelect.value = col;
                break;
            }
        }
    },

    /**
     * Process and upload dataset
     */
    async processDataset() {
        if (this.isProcessing) return;

        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        const dateColumn = document.getElementById('dateColumnSelect').value;
        const textColumn = document.getElementById('textColumnSelect').value;
        const sentimentModel = document.getElementById('sentimentModelSelect').value;

        if (!dateColumn || !textColumn) {
            alert('Please select date and text columns');
            return;
        }

        this.isProcessing = true;

        // Show progress
        document.getElementById('columnMappingSection').style.display = 'none';
        document.getElementById('uploadActions').style.display = 'none';
        document.getElementById('processingStatus').style.display = 'block';
        document.getElementById('statusText').textContent = 'Uploading file...';

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('date_column', dateColumn);
            formData.append('text_column', textColumn);
            formData.append('sentiment_model', sentimentModel);

            // Upload
            const response = await fetch(`${this.apiBaseUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await response.json();

            // Success!
            console.log('✓ Dataset processed successfully', result);

            document.getElementById('statusText').textContent =
                `✓ Processed ${result.data.metadata.total_documents} documents!`;

            // Store dataset
            this.storeDataset(result.data, file.name);

            // Close after delay
            setTimeout(() => this.closeModal(), 2000);

        } catch (error) {
            console.error('Upload error:', error);
            document.getElementById('statusText').textContent =
                `✗ Error: ${error.message}`;
            document.getElementById('statusText').style.color = '#d32f2f';

            setTimeout(() => {
                document.getElementById('columnMappingSection').style.display = 'block';
                document.getElementById('uploadActions').style.display = 'flex';
                document.getElementById('processingStatus').style.display = 'none';
            }, 3000);

        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Store dataset in local storage and make available
     */
    storeDataset: function(data, filename) {
        // Store in sessionStorage for current session
        const datasetName = filename.split('.')[0];

        // Debug logging
        console.log('storeDataset - Data structure:', {
            hasData: !!data.data,
            dataLength: data.data?.length,
            firstItemKeys: data.data?.[0] ? Object.keys(data.data[0]) : 'no first item',
            firstItem: data.data?.[0]
        });

        sessionStorage.setItem(`dataset_${datasetName}`, JSON.stringify(data));

        console.log(`✓ Dataset stored: ${datasetName}`);

        // Also notify the main app to reload dataset dropdown
        if (typeof window.reloadDatasets === 'function') {
            window.reloadDatasets();
        }

        // Auto-select and display the uploaded dataset
        const select = document.getElementById('datasetsSelect');
        if (select) {
            select.value = datasetName;
            console.log(`✓ Selected uploaded dataset: ${datasetName}`);

            // Trigger the change event to load the visualization
            if (typeof window.loadNewData === 'function') {
                window.loadNewData.call(select, new Event('change'));
            }
        }

        // Trigger event for other listeners
        window.dispatchEvent(new CustomEvent('datasetUploaded', {
            detail: { name: datasetName, data: data }
        }));
    },

    /**
     * Open upload modal
     */
    openModal: function() {
        document.getElementById('uploadModal').style.display = 'block';
    },

    /**
     * Close upload modal
     */
    closeModal: function() {
        document.getElementById('uploadModal').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('columnMappingSection').style.display = 'none';
        document.getElementById('processingStatus').style.display = 'none';
        document.getElementById('uploadActions').style.display = 'none';
    },

    /**
     * Add clear datasets button to bottom panel
     */
    addClearDatasetsButton: function() {
        // Delay to ensure BottomPanelManager is initialized
        setTimeout(() => {
            if (!BottomPanelManager.panelExists()) {
                console.warn('Bottom panel not ready, retrying...');
                setTimeout(() => this.addClearDatasetsButton(), 100);
                return;
            }

            const buttonHTML = `
                <button id="clearDatasetsBtn" style="padding: 8px 16px; background-color: #d32f2f; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer; font-weight: 500; width: 100%; margin-bottom: 8px;">
                    🗑️ Clear All Datasets
                </button>
                <button id="uploadDatasetsBtn" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer; font-weight: 500; width: 100%;">
                    📤 Upload Dataset
                </button>
            `;

            BottomPanelManager.addFeatureSection('📋 Dataset Management', buttonHTML, 'dataset-management-feature');

            // Attach click handlers
            setTimeout(() => {
                const clearBtn = document.getElementById('clearDatasetsBtn');
                const uploadBtn = document.getElementById('uploadDatasetsBtn');

                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        if (confirm('Are you sure you want to delete all uploaded datasets?')) {
                            if (typeof window.clearAllDatasets === 'function') {
                                window.clearAllDatasets();
                                alert('All uploaded datasets have been cleared.');
                            }
                        }
                    });
                    console.log('✓ Clear datasets button attached');
                }

                if (uploadBtn) {
                    uploadBtn.addEventListener('click', () => {
                        this.openModal();
                    });
                    console.log('✓ Upload datasets button attached');
                }
            }, 100);
        }, 100);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UploadManager.init();
});
