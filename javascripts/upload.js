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
                                <label for="sentimentModelSelect" style="position: relative;">
                                    Analysis Model:
                                    <span class="help-icon" id="analysisModelHelp">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                                            <text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">?</text>
                                        </svg>
                                    </span>

                                    <!-- Tooltip for Analysis Models -->
                                    <div id="analysisModelTooltip" class="model-tooltip" style="display:none;">
                                        <div class="tooltip-header">Analysis Models Explained</div>
                                        <div class="tooltip-content">
                                            <div class="model-explanation">
                                                <strong>Emotion Detection</strong> (recommended)
                                                <p>Identifies 6 core emotions in your text: joy, sadness, anger, fear, surprise, and disgust. Best for understanding emotional content.</p>
                                            </div>
                                            <div class="model-explanation">
                                                <strong>Sentiment Analysis</strong>
                                                <p>Classifies text as positive, negative, or neutral. Simpler than emotion detection, good for overall mood tracking.</p>
                                            </div>
                                            <div class="model-explanation">
                                                <strong>Topic Detection</strong>
                                                <p>Categorizes text into 12 topics: Business, Technology, Health, Politics, Sports, Entertainment, Science, Education, Finance, Travel, Food, and Lifestyle.</p>
                                            </div>
                                            <div class="model-explanation">
                                                <strong>Happiness Score</strong>
                                                <p>Rates text on a 5-level happiness scale from very happy to very unhappy. Great for well-being analysis.</p>
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <select id="sentimentModelSelect" class="form-control">
                                    <option value="emotion">Emotion Detection (recommended)</option>
                                    <option value="sentiment">Sentiment Analysis</option>
                                    <option value="topic">Topic Detection</option>
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

        // Help icon tooltip - attach after modal is in DOM
        setTimeout(() => {
            const helpIcon = document.getElementById('analysisModelHelp');
            const tooltip = document.getElementById('analysisModelTooltip');

            console.log('Attaching tooltip listeners:', { helpIcon, tooltip });

            if (helpIcon && tooltip) {
                console.log('✓ Tooltip elements found, attaching events');

                // Show tooltip on hover
                helpIcon.addEventListener('mouseenter', () => {
                    console.log('Help icon hovered');
                    this.showTooltip(tooltip, helpIcon);
                });

                // Show tooltip on click (for mobile/accessibility)
                helpIcon.addEventListener('click', (e) => {
                    console.log('Help icon clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showTooltip(tooltip, helpIcon);
                });

                // Hide tooltip when mouse leaves the help icon
                helpIcon.addEventListener('mouseleave', () => {
                    console.log('Mouse left help icon');
                    // Delay hiding to allow moving mouse to tooltip
                    setTimeout(() => {
                        if (!tooltip.matches(':hover') && !helpIcon.matches(':hover')) {
                            this.hideTooltip(tooltip);
                        }
                    }, 100);
                });

                // Hide tooltip when mouse leaves the tooltip itself
                tooltip.addEventListener('mouseleave', () => {
                    console.log('Mouse left tooltip');
                    setTimeout(() => {
                        if (!tooltip.matches(':hover') && !helpIcon.matches(':hover')) {
                            this.hideTooltip(tooltip);
                        }
                    }, 100);
                });

                // Keep tooltip visible when hovering over it
                tooltip.addEventListener('mouseenter', () => {
                    console.log('Mouse entered tooltip');
                    tooltip.style.display = 'block';
                });

                console.log('✓ All tooltip event listeners attached');
            } else {
                console.error('✗ Tooltip elements not found:', { helpIcon, tooltip });
            }
        }, 100);
    },

    /**
     * Show tooltip with proper positioning
     */
    showTooltip: function(tooltip, trigger) {
        if (tooltip) {
            tooltip.style.display = 'block';
            console.log('Tooltip shown:', tooltip);
        } else {
            console.error('Tooltip element not found');
        }
    },

    /**
     * Hide tooltip
     */
    hideTooltip: function(tooltip) {
        tooltip.style.display = 'none';
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
     * VERSION: 2024-12-24-v2 (Full JSON read)
     */
    previewFileColumns: function(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                console.log('[UPLOAD v2024-12-24-v2] Processing file:', file.name, 'Size:', file.size, 'bytes');
                const content = e.target.result;
                console.log('[UPLOAD] Content loaded, length:', content.length, 'bytes');
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

        // Read only first part for performance (CSV/TSV)
        // For JSON files, read the entire file to avoid parsing errors from truncation
        if (file.name.endsWith('.json')) {
            console.log('[UPLOAD] Reading ENTIRE JSON file (no slicing)');
            reader.readAsText(file);  // Read entire JSON file
        } else {
            console.log('[UPLOAD] Reading first 10KB for preview (CSV/TSV)');
            reader.readAsText(file.slice(0, 10000));  // Only preview for CSV/TSV
        }
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
     * Update progress bar
     */
    updateProgress: function(percent, message) {
        const progressFill = document.getElementById('progressFill');
        const statusText = document.getElementById('statusText');

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (statusText && message) {
            statusText.textContent = message;
            statusText.style.color = '#4CAF50';
        }
    },

    /**
     * Simulate processing progress (when server is working)
     */
    simulateProcessingProgress: function(startPercent, endPercent, duration, statusMessage) {
        return new Promise((resolve) => {
            const steps = 20;
            const stepDuration = duration / steps;
            const percentPerStep = (endPercent - startPercent) / steps;
            let currentPercent = startPercent;
            let step = 0;

            const interval = setInterval(() => {
                step++;
                currentPercent += percentPerStep;

                if (step >= steps) {
                    clearInterval(interval);
                    this.updateProgress(endPercent, statusMessage);
                    resolve();
                } else {
                    this.updateProgress(currentPercent, statusMessage);
                }
            }, stepDuration);
        });
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
        this.updateProgress(0, 'Preparing upload...');

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('date_column', dateColumn);
            formData.append('text_column', textColumn);
            formData.append('sentiment_model', sentimentModel);

            // Upload with real-time progress tracking
            const result = await this.uploadWithStreamingProgress(formData, file.size);

            // Success!
            console.log('✓ Dataset processed successfully', result);

            // Check if data is included in response or saved to file
            if (result.filepath) {
                // Large dataset saved to file - need to load it
                console.log('Loading saved file from:', result.filepath);
                this.updateProgress(95, `✓ Processed ${result.metadata.total_documents} documents! Loading...`);

                // Load the saved file
                const fileData = await fetch(result.filepath)
                    .then(res => {
                        console.log('Fetch response status:', res.status, res.ok);
                        if (!res.ok) throw new Error(`Failed to load processed file: ${result.filepath}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log('File loaded successfully, data structure:', {
                            hasMetadata: !!data.metadata,
                            hasData: !!data.data,
                            dataLength: data.data?.length
                        });
                        return data;
                    });

                this.updateProgress(100, `✓ Loaded ${result.metadata.total_documents} documents!`);

                console.log('Storing dataset with filename:', result.filename);
                // Store dataset
                this.storeDataset(fileData, result.filename);
                console.log('Dataset stored successfully');
            } else {
                // Small dataset returned in response
                this.updateProgress(100, `✓ Processed ${result.data.metadata.total_documents} documents!`);

                // Store dataset
                this.storeDataset(result.data, file.name);
            }

            // Close after delay
            setTimeout(() => this.closeModal(), 2000);

        } catch (error) {
            console.error('Upload error:', error);
            document.getElementById('statusText').textContent = `✗ Error: ${error.message}`;
            document.getElementById('statusText').style.color = '#d32f2f';

            setTimeout(() => {
                document.getElementById('columnMappingSection').style.display = 'block';
                document.getElementById('uploadActions').style.display = 'flex';
                document.getElementById('processingStatus').style.display = 'none';
                document.getElementById('progressFill').style.width = '0%';
            }, 3000);

        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Upload file with progress tracking
     */
    uploadWithProgress: function(formData, fileSize) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress (file transfer)
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    // Upload is 0-30% of total progress
                    const uploadPercent = (e.loaded / e.total) * 30;
                    this.updateProgress(uploadPercent, `Uploading file... ${Math.round(uploadPercent)}%`);
                }
            });

            // When upload completes, show processing status
            xhr.upload.addEventListener('load', async () => {
                this.updateProgress(30, 'Upload complete, starting analysis...');

                // Show processing status and stay there
                // Don't simulate fast progress - let the server response update it
                setTimeout(() => this.updateProgress(40, 'Processing documents...'), 500);

                // Keep showing processing status with slow incremental updates
                // This gives visual feedback that something is happening without claiming to be done
                setTimeout(() => this.updateProgress(50, 'Analyzing sentiment and emotions...'), 2000);
                setTimeout(() => this.updateProgress(60, 'Processing documents... (this may take several minutes for large datasets)'), 5000);

                // Stay at 60% - don't go higher until we get server response
                // The actual completion will be handled when xhr.load fires
            });

            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Invalid response from server'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || 'Upload failed'));
                    } catch (e) {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            });

            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload cancelled'));
            });

            // Send request
            xhr.open('POST', `${this.apiBaseUrl}/api/upload`);
            xhr.send(formData);
        });
    },

    /**
     * Upload file with real-time streaming progress via SSE
     */
    uploadWithStreamingProgress: async function(formData, fileSize) {
        return new Promise(async (resolve, reject) => {
            try {
                // Use fetch to stream response
                const response = await fetch(`${this.apiBaseUrl}/api/upload-stream`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Upload failed with status ${response.status}`);
                }

                if (!response.body) {
                    throw new Error('ReadableStream not supported');
                }

                // Read stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const {done, value} = await reader.read();

                    if (done) break;

                    // Decode chunk and add to buffer
                    buffer += decoder.decode(value, {stream: true});

                    // Process complete SSE messages
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep incomplete message in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));

                                if (data.type === 'progress') {
                                    // Update progress bar with real progress
                                    const percent = data.percent || Math.round((data.current / data.total) * 100);
                                    console.log(`Progress update: ${percent}% - ${data.message}`, data);
                                    this.updateProgress(percent, data.message);
                                } else if (data.type === 'complete') {
                                    // Processing complete
                                    resolve(data);
                                    return;
                                } else if (data.type === 'error') {
                                    reject(new Error(data.error));
                                    return;
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, line);
                            }
                        }
                    }
                }

            } catch (error) {
                reject(error);
            }
        });
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

        // Don't store full dataset in sessionStorage (too large, causes quota errors)
        // Instead, just store metadata and reference to the file
        try {
            const metadata = {
                name: datasetName,
                filepath: `data/${filename}`,
                uploaded: true,
                timestamp: new Date().toISOString(),
                metadata: data.metadata
            };
            sessionStorage.setItem(`dataset_${datasetName}`, JSON.stringify(metadata));
            console.log(`✓ Dataset metadata stored: ${datasetName}`);
        } catch (e) {
            console.warn('Could not store in sessionStorage (quota exceeded):', e);
            console.log('Dataset is saved to file and can be loaded from dropdown');
        }

        console.log('SessionStorage keys:', Object.keys(sessionStorage));

        // Also notify the main app to reload dataset dropdown
        console.log('window.reloadDatasets exists?', typeof window.reloadDatasets === 'function');
        if (typeof window.reloadDatasets === 'function') {
            console.log('Calling window.reloadDatasets()');
            window.reloadDatasets();
        } else {
            console.warn('window.reloadDatasets is not defined');
        }

        // Auto-select and display the uploaded dataset
        const select = document.getElementById('datasetsSelect');
        console.log('datasetsSelect element:', select);
        if (select) {
            console.log('Current select value:', select.value);
            console.log('Setting select value to:', datasetName);
            select.value = datasetName;
            console.log(`✓ Selected uploaded dataset: ${datasetName}`);
            console.log('Updated select value:', select.value);

            // Trigger the change event to load the visualization
            console.log('window.loadNewData exists?', typeof window.loadNewData === 'function');
            if (typeof window.loadNewData === 'function') {
                console.log('Calling window.loadNewData()');
                window.loadNewData.call(select, new Event('change'));
            } else {
                console.warn('window.loadNewData is not defined');
            }
        } else {
            console.error('datasetsSelect element not found!');
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

        // Reset progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = 'Processing...';
            statusText.style.color = '#4CAF50';
        }

        // Hide tooltip
        const tooltip = document.getElementById('analysisModelTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
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
