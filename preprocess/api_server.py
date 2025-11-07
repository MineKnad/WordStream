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
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import traceback

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
    - sentiment_model: "emotion" or "sentiment" (optional, default: "emotion")
    - date_column: name of date column
    - text_column: name of text column
    - category_column: name of category column (optional)

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
        category_column = request.form.get('category_column', None)

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
                category_column=category_column,
                output_format=sentiment_model
            )

            return jsonify({
                "success": True,
                "data": result,
                "message": f"Successfully processed {result['metadata']['total_documents']} documents"
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


@app.route('/api/preprocess', methods=['POST'])
def preprocess_dataset():
    """
    Preprocess a dataset with custom parameters.

    Expected JSON:
    {
        "file_path": "path/to/file",
        "date_column": "date",
        "text_column": "text",
        "category_column": "category",
        "sentiment_model": "emotion"
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
        category_column = data.get('category_column', None)
        sentiment_model = data.get('sentiment_model', 'emotion')

        # Process
        processor = get_preprocessor(sentiment_model)
        result = processor.process_dataset(
            file_path,
            date_column=date_column,
            text_column=text_column,
            category_column=category_column,
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
    Analyze sentiment of a single text.

    Expected JSON:
    {
        "text": "text to analyze",
        "sentiment_model": "emotion"
    }
    """
    try:
        data = request.get_json()

        if 'text' not in data:
            return jsonify({"error": "Missing text field"}), 400

        text = data['text']
        sentiment_model = data.get('sentiment_model', 'emotion')

        processor = get_preprocessor(sentiment_model)
        result = processor.sentiment_analyzer.analyze_text(text)

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


@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    """
    List available preprocessed datasets.
    Can be extended to list from a data directory.
    """
    datasets = [
        {
            "name": "VIS Publications",
            "file": "vis_papers.json",
            "description": "Visualization research paper metadata",
            "years": "1994-2023",
            "records": 10000
        },
        {
            "name": "Rotten Tomatoes Reviews",
            "file": "rotten_tomatoes.json",
            "description": "Movie and TV reviews with ratings",
            "years": "2000-2023",
            "records": 50000
        },
        {
            "name": "Quantum Computing",
            "file": "quantum.json",
            "description": "Quantum computing research papers",
            "years": "1998-2023",
            "records": 5000
        }
    ]

    return jsonify({
        "success": True,
        "datasets": datasets
    })


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
