# WordStream Preprocessing Pipeline

Advanced Python backend for sentiment analysis and data preprocessing for the WordStream visualization system.

## Features

- **Multiple Sentiment Analysis Approaches**
  - Emotion Detection (6 emotions: joy, sadness, anger, fear, surprise, disgust)
  - Advanced Sentiment Analysis (positive, negative, neutral)
  - Happiness Scoring (0-100 scale)

- **Flexible Data Input**
  - CSV, TSV, JSON, TXT files
  - Customizable column mapping
  - Automatic date parsing

- **Text Processing Pipeline**
  - Automatic cleaning and normalization
  - Stop word removal
  - Word extraction with configurable filters
  - Frequency counting

- **Advanced Metrics**
  - Sudden attention calculation
  - Per-word sentiment tracking
  - Emotion distribution analysis

- **REST API**
  - File upload endpoint
  - Batch processing
  - Single text analysis
  - Dataset management

## Installation

```bash
cd preprocess
pip install -r requirements.txt
```

## Quick Start

### 1. Using the Python Preprocessor Directly

```python
from preprocess import DataPreprocessor

# Initialize with emotion detection
processor = DataPreprocessor(sentiment_model="emotion")

# Process a CSV file
result = processor.process_dataset(
    "data.csv",
    date_column="date",
    text_column="text",
    category_column="category"
)

# Save to JSON
processor.save_json(result, "output.json")
```

### 2. Analyze Individual Text

```python
from sentiment_analyzer import SentimentAnalyzer

analyzer = SentimentAnalyzer(model_type="emotion")
result = analyzer.analyze_text("I absolutely love this! It's amazing!")

print(f"Sentiment: {result['sentiment_score']}")  # 1.0
print(f"Emotion: {result['emotion']}")             # joy
print(f"Confidence: {result['confidence']}")       # 0.95
```

### 3. Start REST API Server

```bash
python api_server.py
```

Server starts on `http://localhost:5000`

## API Endpoints

### POST `/api/upload`

Upload and process a file.

**Form Data:**
- `file` (required): File to upload (CSV, TSV, JSON, TXT)
- `date_column` (optional): Name of date column (default: "date")
- `text_column` (optional): Name of text column (default: "text")
- `category_column` (optional): Name of category column
- `sentiment_model` (optional): "emotion" or "sentiment" (default: "emotion")

**Example:**
```bash
curl -X POST \
  -F "file=@data.csv" \
  -F "date_column=publication_date" \
  -F "text_column=review_text" \
  -F "sentiment_model=emotion" \
  http://localhost:5000/api/upload
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "dataset_name": "data",
      "total_documents": 1000,
      "total_periods": 24,
      "created": "2024-01-15T10:30:00"
    },
    "data": [
      {
        "period": "2023-01",
        "words": {
          "general": [
            {
              "text": "amazing",
              "frequency": 45,
              "sudden": 2.3,
              "sentiment": 0.85,
              "emotion": "joy",
              "color": "#2E7D32"
            }
          ]
        }
      }
    ]
  }
}
```

### GET `/api/datasets`

List available preprocessed datasets.

### GET `/api/models`

List available sentiment analysis models.

### POST `/api/analyze-text`

Analyze sentiment of a single text.

**JSON Body:**
```json
{
  "text": "This is an amazing product!",
  "sentiment_model": "emotion"
}
```

### GET `/api/status`

Check API status and configuration.

## Data Format

### Input Format

**CSV/TSV:**
```
date,text,category
2023-01-15,"This is amazing!",positive
2023-01-16,"I hate this.",negative
```

**JSON:**
```json
[
  {
    "date": "2023-01-15",
    "text": "This is amazing!",
    "category": "positive"
  }
]
```

**TXT:**
```
2023-01-15|This is amazing!|positive
2023-01-16|I hate this.|negative
```

### Output Format

The preprocessor outputs JSON compatible with WordStream frontend:

```json
{
  "metadata": {
    "dataset_name": "my_data",
    "total_documents": 1000,
    "total_periods": 24,
    "periods": ["2023-01", "2023-02", ...],
    "categories": ["general"],
    "total_unique_words": 5000,
    "created": "2024-01-15T10:30:00",
    "sentiment_model": "emotion"
  },
  "data": [
    {
      "period": "2023-01",
      "words": {
        "general": [
          {
            "text": "word",
            "frequency": 10,
            "sudden": 2.5,
            "sentiment": 0.7,
            "emotion": "joy",
            "color": "#2E7D32",
            "id": "word_general_2023_01"
          }
        ]
      }
    }
  ]
}
```

## Sentiment Models

### Emotion Detection (Recommended)
- **Model:** `j-hartmann/emotion-english-distilroberta-base`
- **Output:** One of 6 emotions: joy, sadness, anger, fear, surprise, disgust
- **Use Case:** Rich, expressive sentiment visualization
- **Latency:** ~100ms per text on GPU

### Sentiment Analysis
- **Model:** RoBERTa fine-tuned on sentiment classification
- **Output:** positive, negative, or neutral
- **Use Case:** Traditional sentiment polarity
- **Latency:** ~50ms per text on GPU

### Happiness Scoring
- **Model:** Custom combiner of sentiment + word patterns
- **Output:** 0-100 happiness score
- **Use Case:** Simple, intuitive metric
- **Latency:** ~150ms per text

## Color Blind Friendly Palette

All sentiment colors are designed for color-blind accessibility:

```
Positive/Joy:    #2E7D32 (Green)
Surprise:        #42A5F5 (Light Blue)
Neutral:         #757575 (Gray)
Fear/Sadness:    #1565C0 (Dark Blue)
Anger/Negative:  #F57C00 (Orange)
```

## Performance Tips

1. **Batch Processing:** Process multiple documents in one call
2. **GPU Acceleration:** Install CUDA-enabled PyTorch for 10x speedup
3. **Smaller Models:** Use distilled versions for faster inference
4. **Caching:** Models are loaded once and reused

## Troubleshooting

### "Model not found" Error
```bash
python -c "from transformers import AutoModel; AutoModel.from_pretrained('j-hartmann/emotion-english-distilroberta-base')"
```

### CUDA Out of Memory
Use CPU instead:
```python
processor = DataPreprocessor(use_gpu=False)
```

### Slow Processing
- Use a GPU (if available)
- Batch process files
- Reduce text length or filter stopwords more aggressively

## Examples

### Process Blog Posts
```python
processor = DataPreprocessor(sentiment_model="emotion")
result = processor.process_dataset(
    "blog_posts.csv",
    date_column="published_date",
    text_column="content",
    category_column="author"
)
processor.save_json(result, "blog_wordstream.json")
```

### Process Movie Reviews with Happiness Scoring
```python
processor = DataPreprocessor(use_happiness=True)
result = processor.process_dataset(
    "movie_reviews.csv",
    date_column="review_date",
    text_column="review_text",
    category_column="movie_genre"
)
```

### Batch Process All CSVs in Directory
```python
from preprocess import process_batch_datasets

process_batch_datasets(
    input_dir="./raw_data",
    output_dir="./processed_data",
    sentiment_model="emotion"
)
```

## Advanced Usage

### Custom Sentiment Coloring

```python
from sentiment_analyzer import SentimentAnalyzer

analyzer = SentimentAnalyzer(model_type="emotion")
analysis = analyzer.analyze_text("Text here")

# Get color for sentiment
color = analyzer.get_color_for_sentiment(
    analysis["sentiment_score"],
    analysis["emotion"]
)
print(f"Color: {color}")  # e.g., #2E7D32
```

### Integration with Frontend

After preprocessing, copy the JSON file to the frontend:

```bash
cp processed_data.json ../data/custom_dataset.json
```

Then load in WordStream by adding to the dataset dropdown.

## Citation

This preprocessing pipeline enhances the original WordStream visualization from:

> Dang et al. "WordStream: Interactive Visualization for Topic Evolution" (EuroVis 2019)

## License

Same as WordStream project

## Support

For issues, feature requests, or questions, contact the project maintainers.
