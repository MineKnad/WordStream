"""
Flask API Server for WordStream
Handles file uploads, preprocessing, and serving datasets
"""

import os
import json
import tempfile
from pathlib import Path
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
import traceback
import queue
import threading

from preprocess import DataPreprocessor

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'csv', 'tsv', 'json', 'txt', 'xlsx'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
CORS(app)

# Cache for preprocessors
preprocessor_cache = {}


def get_preprocessor(sentiment_model: str = "emotion") -> DataPreprocessor:
    """Get or create preprocessor instance"""
    if sentiment_model not in preprocessor_cache:
        preprocessor_cache[sentiment_model] = DataPreprocessor(
            sentiment_model=sentiment_model
        )
    return preprocessor_cache[sentiment_model]


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "WordStream Preprocessor API"
    })


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload and process a dataset file.

    Expected form data:
    - file: file to upload
    - sentiment_model: "emotion", "sentiment", "topic", or "happiness" (optional, default: "emotion")
    - date_column: name of date column
    - text_column: name of text column

    Returns:
        JSON with processed data
    """
    try:
        # Validate file exists
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # Get parameters
        sentiment_model = request.form.get('sentiment_model', 'emotion')
        date_column = request.form.get('date_column', 'date')
        text_column = request.form.get('text_column', 'text')

        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"upload_{datetime.now().timestamp()}_{filename}")
        file.save(temp_path)

        try:
            # Get preprocessor
            processor = get_preprocessor(sentiment_model)

            # Process file
            result = processor.process_dataset(
                temp_path,
                date_column=date_column,
                text_column=text_column,
                output_format=sentiment_model
            )

            # Save result to data directory instead of sending in response
            # This prevents timeout/memory issues with large datasets
            data_dir = Path(__file__).parent.parent / 'data'
            data_dir.mkdir(exist_ok=True)

            # Generate output filename based on original name
            original_name = Path(filename).stem
            output_filename = f"{original_name}_processed_{sentiment_model}.json"
            output_path = data_dir / output_filename

            # Save to file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            file_size_mb = output_path.stat().st_size / (1024 * 1024)

            print(f"✓ Saved processed dataset to {output_path} ({file_size_mb:.2f} MB)")

            return jsonify({
                "success": True,
                "filename": output_filename,
                "filepath": f"data/{output_filename}",
                "metadata": result['metadata'],
                "file_size_mb": round(file_size_mb, 2),
                "message": f"Successfully processed {result['metadata']['total_documents']} documents. File saved to data/{output_filename}"
            })

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        print(f"Error in /api/upload: {e}")
        print(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "message": "Error processing file"
        }), 500


@app.route('/api/upload-stream', methods=['POST'])
def upload_file_stream():
    """
    Upload and process a dataset file with real-time progress updates via SSE.

    Returns Server-Sent Events stream with progress updates.
    """
    def generate():
        temp_path = None
        try:
            # Validate file exists
            if 'file' not in request.files:
                yield f"data: {json.dumps({'error': 'No file provided'})}\n\n"
                return

            file = request.files['file']
            if file.filename == '':
                yield f"data: {json.dumps({'error': 'No file selected'})}\n\n"
                return

            if not allowed_file(file.filename):
                yield f"data: {json.dumps({'error': f'File type not allowed'})}\n\n"
                return

            # Get parameters
            sentiment_model = request.form.get('sentiment_model', 'emotion')
            date_column = request.form.get('date_column', 'date')
            text_column = request.form.get('text_column', 'text')

            # Save uploaded file temporarily
            filename = secure_filename(file.filename)
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"upload_{datetime.now().timestamp()}_{filename}")
            file.save(temp_path)

            # Send initial progress
            yield f"data: {json.dumps({'type': 'progress', 'current': 0, 'total': 100, 'message': 'File uploaded, starting processing...'})}\n\n"

            # Get preprocessor
            processor = get_preprocessor(sentiment_model)

            # Progress callback
            def progress_callback(current, total, message):
                # Calculate percentage (30-90% of total progress for processing)
                percent = 30 + int((current / total) * 60)
                progress_data = {
                    'type': 'progress',
                    'current': current,
                    'total': total,
                    'percent': percent,
                    'message': message
                }
                return f"data: {json.dumps(progress_data)}\n\n"

            # Create a queue for progress updates
            progress_queue = queue.Queue()

            def queued_progress_callback(current, total, message):
                progress_queue.put(progress_callback(current, total, message))

            # Process file in a separate thread
            result_container = {}
            error_container = {}

            def process_file():
                try:
                    result = processor.process_dataset(
                        temp_path,
                        date_column=date_column,
                        text_column=text_column,
                        output_format=sentiment_model,
                        progress_callback=queued_progress_callback
                    )
                    result_container['data'] = result
                except Exception as e:
                    error_container['error'] = str(e)
                    error_container['traceback'] = traceback.format_exc()

            # Start processing thread
            process_thread = threading.Thread(target=process_file)
            process_thread.start()

            # Yield progress updates as they come
            while process_thread.is_alive() or not progress_queue.empty():
                try:
                    # Get progress update with timeout
                    progress_msg = progress_queue.get(timeout=0.5)
                    yield progress_msg
                except queue.Empty:
                    # Send keepalive
                    yield f": keepalive\n\n"

            # Wait for thread to complete
            process_thread.join()

            # Check for errors
            if error_container:
                yield f"data: {json.dumps({'type': 'error', 'error': error_container['error']})}\n\n"
                return

            result = result_container['data']

            # Send progress: saving file
            yield f"data: {json.dumps({'type': 'progress', 'percent': 90, 'message': 'Saving processed data...'})}\n\n"

            # Save result to data directory
            data_dir = Path(__file__).parent.parent / 'data'
            data_dir.mkdir(exist_ok=True)

            original_name = Path(filename).stem
            output_filename = f"{original_name}_processed_{sentiment_model}.json"
            output_path = data_dir / output_filename

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            file_size_mb = output_path.stat().st_size / (1024 * 1024)

            print(f"✓ Saved processed dataset to {output_path} ({file_size_mb:.2f} MB)")

            # Send completion
            completion_data = {
                'type': 'complete',
                'percent': 100,
                'filename': output_filename,
                'filepath': f"data/{output_filename}",
                'metadata': result['metadata'],
                'file_size_mb': round(file_size_mb, 2),
                'message': f"Successfully processed {result['metadata']['total_documents']} documents"
            }
            yield f"data: {json.dumps(completion_data)}\n\n"

        except Exception as e:
            print(f"Error in /api/upload-stream: {e}")
            print(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        finally:
            # Clean up temp file
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)

    return Response(stream_with_context(generate()), content_type='text/event-stream')


@app.route('/api/preprocess', methods=['POST'])
def preprocess_dataset():
    """
    Preprocess a dataset with custom parameters.

    Expected JSON:
    {
        "file_path": "path/to/file",
        "date_column": "date",
        "text_column": "text",
        "sentiment_model": "emotion" or "sentiment" or "topic" or "happiness"
    }
    """
    try:
        data = request.get_json()

        if 'file_path' not in data:
            return jsonify({"error": "Missing file_path"}), 400

        file_path = data['file_path']
        if not os.path.exists(file_path):
            return jsonify({"error": f"File not found: {file_path}"}), 404

        # Get parameters
        date_column = data.get('date_column', 'date')
        text_column = data.get('text_column', 'text')
        sentiment_model = data.get('sentiment_model', 'emotion')

        # Process
        processor = get_preprocessor(sentiment_model)
        result = processor.process_dataset(
            file_path,
            date_column=date_column,
            text_column=text_column,
            output_format=sentiment_model
        )

        return jsonify({
            "success": True,
            "data": result,
            "message": f"Successfully processed {result['metadata']['total_documents']} documents"
        })

    except Exception as e:
        print(f"Error in /api/preprocess: {e}")
        print(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "message": "Error processing dataset"
        }), 500


@app.route('/api/analyze-text', methods=['POST'])
def analyze_text():
    """
    Analyze sentiment or topic of a single text.

    Expected JSON:
    {
        "text": "text to analyze",
        "sentiment_model": "emotion", "sentiment", "topic", or "happiness"
    }
    """
    try:
        data = request.get_json()

        if 'text' not in data:
            return jsonify({"error": "Missing text field"}), 400

        text = data['text']
        sentiment_model = data.get('sentiment_model', 'emotion')

        processor = get_preprocessor(sentiment_model)

        # Handle topic detection vs sentiment analysis
        if sentiment_model == "topic":
            result = processor.topic_detector.detect_topic(text)
        elif processor.sentiment_analyzer:
            result = processor.sentiment_analyzer.analyze_text(text)
        else:
            return jsonify({"error": "Analyzer not available"}), 400

        return jsonify({
            "success": True,
            "analysis": result
        })

    except Exception as e:
        print(f"Error in /api/analyze-text: {e}")
        return jsonify({
            "error": str(e),
            "message": "Error analyzing text"
        }), 500


@app.route('/data/<path:filename>', methods=['GET'])
def serve_data_file(filename):
    """
    Serve static files from the data directory.
    This allows the frontend to load dataset JSON files directly.
    """
    try:
        data_dir = Path(__file__).parent.parent / 'data'
        file_path = data_dir / filename

        # Security check: ensure the file is within data directory
        if not file_path.resolve().is_relative_to(data_dir.resolve()):
            return jsonify({
                "error": "Access denied",
                "message": "File must be in data directory"
            }), 403

        # Check if file exists
        if not file_path.exists():
            return jsonify({
                "error": "File not found",
                "message": f"Dataset file '{filename}' not found"
            }), 404

        # Serve the file
        return send_file(
            file_path,
            mimetype='application/json',
            as_attachment=False,
            download_name=filename
        )

    except Exception as e:
        print(f"Error serving data file {filename}: {e}")
        return jsonify({
            "error": str(e),
            "message": "Error serving file"
        }), 500


@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    """
    List available preprocessed datasets from the data directory.
    """
    try:
        data_dir = Path(__file__).parent.parent / 'data'
        datasets = []

        if data_dir.exists():
            # Scan for JSON files in data directory
            for json_file in data_dir.glob('*.json'):
                try:
                    # Get file info
                    file_size = json_file.stat().st_size / (1024 * 1024)  # MB
                    file_name = json_file.stem  # Filename without extension

                    # Try to read metadata if available
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        metadata = data.get('metadata', {})

                    datasets.append({
                        "name": file_name,
                        "file": json_file.name,
                        "filepath": f"data/{json_file.name}",
                        "description": metadata.get('dataset_name', file_name),
                        "total_documents": metadata.get('total_documents', 'Unknown'),
                        "total_periods": metadata.get('total_periods', 'Unknown'),
                        "sentiment_model": metadata.get('sentiment_model', 'Unknown'),
                        "file_size_mb": round(file_size, 2),
                        "metadata": metadata
                    })
                except Exception as e:
                    print(f"Error reading dataset {json_file.name}: {e}")
                    # Still add it to the list with basic info
                    datasets.append({
                        "name": json_file.stem,
                        "file": json_file.name,
                        "filepath": f"data/{json_file.name}",
                        "description": "Dataset",
                        "file_size_mb": round(json_file.stat().st_size / (1024 * 1024), 2)
                    })

        return jsonify({
            "success": True,
            "datasets": datasets,
            "count": len(datasets)
        })

    except Exception as e:
        print(f"Error in /api/datasets: {e}")
        return jsonify({
            "error": str(e),
            "message": "Error listing datasets"
        }), 500


@app.route('/api/models', methods=['GET'])
def list_models():
    """List available sentiment analysis models"""
    models = [
        {
            "id": "emotion",
            "name": "Emotion Detection",
            "description": "Maps to 6 emotions (joy, sadness, anger, fear, surprise, disgust)",
            "output_types": ["emotion", "sentiment_score"]
        },
        {
            "id": "sentiment",
            "name": "Sentiment Analysis",
            "description": "Classifies text as positive, negative, or neutral",
            "output_types": ["sentiment", "confidence"]
        },
        {
            "id": "happiness",
            "name": "Happiness Score",
            "description": "Scores text on happiness scale (0-100)",
            "output_types": ["happiness_score"]
        }
    ]

    return jsonify({
        "success": True,
        "models": models
    })


@app.route('/api/status', methods=['GET'])
def status():
    """Get API status and configuration"""
    return jsonify({
        "status": "ready",
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
        "allowed_formats": list(ALLOWED_EXTENSIONS),
        "available_models": ["emotion", "sentiment", "happiness"],
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/convert', methods=['POST'])
def convert_format():
    """
    Convert between data formats.
    Useful for preprocessing existing datasets into WordStream format.
    """
    try:
        data = request.get_json()

        if 'data' not in data or 'from_format' not in data or 'to_format' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        # Implementation would go here
        return jsonify({
            "success": False,
            "message": "Conversion not yet implemented"
        }), 501

    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Error converting data"
        }), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        "error": "File too large",
        "max_size_mb": MAX_FILE_SIZE / (1024 * 1024)
    }), 413


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "error": "Endpoint not found",
        "message": "Check the API documentation"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        "error": "Internal server error",
        "message": str(error)
    }), 500


if __name__ == '__main__':
    print("Starting WordStream API Server...")
    print(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"Max file size: {MAX_FILE_SIZE / (1024*1024):.1f} MB")

    # Run development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False
    )
