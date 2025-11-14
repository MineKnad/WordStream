"""
Data Preprocessing Pipeline for WordStream
Handles loading, cleaning, sentiment analysis, and formatting data for visualization
"""

import pandas as pd
import numpy as np
import json
import re
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict, Counter
from pathlib import Path
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sentiment_analyzer import SentimentAnalyzer, HappinessScorer

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')


class DataPreprocessor:
    """Main preprocessing pipeline for WordStream data"""

    def __init__(self, sentiment_model: str = "emotion", use_happiness: bool = False):
        """
        Initialize preprocessor.

        Args:
            sentiment_model: "emotion" or "sentiment"
            use_happiness: If True, use happiness scoring instead of sentiment
        """
        self.sentiment_analyzer = SentimentAnalyzer(model_type=sentiment_model)
        self.happiness_scorer = HappinessScorer() if use_happiness else None
        self.use_happiness = use_happiness
        self.stopwords = set(stopwords.words('english'))

        # Expand stopwords with custom words
        self.stopwords.update({
            'the', 'a', 'an', 'and', 'or', 'but', 'is', 'was', 'are', 'been',
            'like', 'just', 'can', 'could', 'said', 'would', 'will', 'should',
            'may', 'might', 'must', 'also', 'get', 'got', 'make', 'made',
            'go', 'going', 'come', 'coming', 'new', 'year', 'time', 'day',
            'one', 'two', 'three', 'first', 'second', 'http', 'https', 'www'
        })

    def load_data(self, filepath: str) -> pd.DataFrame:
        """Load data from CSV, TSV, JSON, or TXT"""
        filepath = Path(filepath)

        if filepath.suffix == '.json':
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return pd.DataFrame(data)

        elif filepath.suffix in ['.csv', '.tsv']:
            sep = '\t' if filepath.suffix == '.tsv' else ','
            return pd.read_csv(filepath, sep=sep, encoding='utf-8')

        elif filepath.suffix in ['.txt', '.text']:
            # Simple TXT format: one line per document with metadata
            lines = []
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        parts = line.split('|')
                        lines.append({
                            'date': parts[0] if len(parts) > 0 else datetime.now().isoformat(),
                            'text': parts[1] if len(parts) > 1 else parts[0],
                            'category': parts[2] if len(parts) > 2 else 'general'
                        })
            return pd.DataFrame(lines)

        else:
            raise ValueError(f"Unsupported file format: {filepath.suffix}")

    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not isinstance(text, str):
            return ""

        # Convert to lowercase
        text = text.lower()

        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)

        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^a-zA-Z0-9\s\-.]', '', text)

        # Remove extra whitespace
        text = ' '.join(text.split())

        return text

    def extract_words(self, text: str, min_length: int = 3) -> List[str]:
        """Extract and filter words from text"""
        text = self.clean_text(text)
        tokens = word_tokenize(text)

        # Filter: remove stopwords, short words, and non-alphabetic
        words = [
            word.lower() for word in tokens
            if word.lower() not in self.stopwords
            and len(word) >= min_length
            and word.isalpha()
        ]

        return list(set(words))  # Return unique words

    def parse_date(self, date_str) -> Tuple[int, str]:
        """
        Parse date string to (year, month).
        Returns (year, month_str) or (year, year_str) if monthly data unavailable.
        """
        if pd.isna(date_str):
            return (datetime.now().year, str(datetime.now().year))

        date_str = str(date_str).strip()

        # Try ISO format (YYYY-MM-DD)
        try:
            dt = pd.to_datetime(date_str)
            return (dt.year, f"{dt.year}-{dt.month:02d}")
        except:
            pass

        # Try year only
        try:
            year = int(date_str)
            return (year, str(year))
        except:
            pass

        # Fallback
        return (datetime.now().year, str(datetime.now().year))

    def compute_sudden_attention(
        self,
        words_by_period: Dict[str, Counter]
    ) -> Dict[str, Dict[str, float]]:
        """
        Compute 'sudden attention' metric for each word in each period.

        Sudden attention = (freq_current + 1) / (freq_previous + 1)
        High value = word appeared or spiked suddenly
        """
        periods = sorted(words_by_period.keys())
        sudden_attention = {}

        for i, period in enumerate(periods):
            sudden_attention[period] = {}
            prev_freqs = words_by_period[periods[i-1]] if i > 0 else Counter()

            for word, freq in words_by_period[period].items():
                prev_freq = prev_freqs.get(word, 0)
                sudden = (freq + 1) / (prev_freq + 1)
                sudden_attention[period][word] = sudden

        return sudden_attention

    def process_dataset(
        self,
        filepath: str,
        date_column: str = 'date',
        text_column: str = 'text',
        category_column: Optional[str] = None,
        output_format: str = 'emotion'  # 'emotion', 'sentiment', or 'happiness'
    ) -> Dict:
        """
        Process a complete dataset and return WordStream-ready data.

        Args:
            filepath: Path to input file
            date_column: Name of date column
            text_column: Name of text column
            category_column: Name of category/topic column (optional)
            output_format: Type of sentiment output

        Returns:
            Dictionary with structure:
            {
                "metadata": {...},
                "data": [
                    {
                        "period": "2020",
                        "words": {
                            "category": [
                                {
                                    "text": "word",
                                    "frequency": 10,
                                    "sudden": 2.5,
                                    "sentiment": 0.7,
                                    "emotion": "joy",
                                    "color": "#2E7D32"
                                },
                                ...
                            ]
                        }
                    },
                    ...
                ]
            }
        """
        print(f"Loading {filepath}...")
        df = self.load_data(filepath)

        # Validate columns exist
        if date_column not in df.columns:
            raise ValueError(f"Date column '{date_column}' not found in data")
        if text_column not in df.columns:
            raise ValueError(f"Text column '{text_column}' not found in data")

        # Group data by period and category
        words_by_period = defaultdict(Counter)
        sentiment_by_word_period = defaultdict(lambda: defaultdict(list))
        category_by_word = defaultdict(set)

        print("Processing documents...")
        for idx, row in df.iterrows():
            if idx % 100 == 0:
                print(f"  Processed {idx}/{len(df)} documents")

            text = row[text_column]
            if pd.isna(text):
                continue

            year, period = self.parse_date(row[date_column])
            category = row[category_column] if category_column and category_column in df.columns else "general"

            # Extract words
            words = self.extract_words(text)

            # Sentiment analysis on full text
            if self.use_happiness:
                sentiment_score = self.happiness_scorer.score(text) / 100.0 * 2 - 1  # Scale to [-1, 1]
                emotion = "neutral"
            else:
                analysis = self.sentiment_analyzer.analyze_text(text)
                sentiment_score = analysis["sentiment_score"]
                emotion = analysis["emotion"]

            # Add words
            for word in words:
                words_by_period[period][word] += 1
                sentiment_by_word_period[period][word].append(sentiment_score)
                category_by_word[word].add(category)

        # Compute sudden attention
        print("Computing sudden attention...")
        sudden_attention = self.compute_sudden_attention(words_by_period)

        # Build output structure
        print("Building output structure...")
        periods = sorted(words_by_period.keys())
        output_data = []

        for period in periods:
            period_data = {
                "period": period,
                "words": defaultdict(list)
            }

            for word, freq in words_by_period[period].items():
                # Get word sentiment (average across documents)
                sentiment_scores = sentiment_by_word_period[period][word]
                avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0

                # Get primary category (most common)
                categories = category_by_word[word]
                primary_category = list(categories)[0] if categories else "general"

                # Get word color based on sentiment
                color = self.sentiment_analyzer.get_color_for_sentiment(avg_sentiment)

                word_entry = {
                    "text": word,
                    "frequency": int(freq),
                    "sudden": float(sudden_attention[period][word]),
                    "sentiment": float(avg_sentiment),
                    "emotion": emotion if emotion else "neutral",
                    "color": color,
                    "id": f"{word}_{primary_category}_{period.replace('-', '_')}"
                }

                period_data["words"][primary_category].append(word_entry)

            # Convert defaultdict to regular dict
            period_data["words"] = dict(period_data["words"])
            output_data.append(period_data)

        # Build metadata
        # Flatten category_by_word values (which are sets) into unique categories
        all_categories = set()
        for cat_set in category_by_word.values():
            all_categories.update(cat_set)

        metadata = {
            "dataset_name": Path(filepath).stem,
            "total_documents": len(df),
            "total_periods": len(periods),
            "periods": periods,
            "categories": list(all_categories),
            "total_unique_words": len(words_by_period[periods[-1]]) if periods else 0,
            "created": datetime.now().isoformat(),
            "sentiment_model": "happiness" if self.use_happiness else "emotion"
        }

        return {
            "metadata": metadata,
            "data": output_data
        }

    def save_json(self, data: Dict, output_path: str):
        """Save processed data as JSON"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✓ Saved to {output_path}")


def process_batch_datasets(input_dir: str, output_dir: str, sentiment_model: str = "emotion"):
    """Process multiple datasets from a directory"""
    processor = DataPreprocessor(sentiment_model=sentiment_model)

    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for filepath in input_path.glob("*.*"):
        if filepath.suffix in ['.csv', '.tsv', '.json', '.txt']:
            try:
                output_file = output_path / f"{filepath.stem}_processed.json"
                result = processor.process_dataset(
                    str(filepath),
                    output_format=sentiment_model
                )
                processor.save_json(result, str(output_file))
            except Exception as e:
                print(f"✗ Error processing {filepath}: {e}")


if __name__ == "__main__":
    # Example: Process a single dataset
    processor = DataPreprocessor(sentiment_model="emotion")

    # Create sample CSV for testing
    sample_data = pd.DataFrame({
        'date': ['2023-01-15', '2023-02-20', '2023-03-10'] * 3,
        'text': [
            'This is amazing and wonderful!',
            'I really hate this approach',
            'The results are interesting but not great',
        ] * 3,
        'category': ['positive', 'negative', 'neutral'] * 3
    })

    test_csv = 'test_data.csv'
    sample_data.to_csv(test_csv, index=False)

    # Process it
    result = processor.process_dataset(
        test_csv,
        date_column='date',
        text_column='text',
        category_column='category'
    )

    print("\n=== PROCESSED RESULT ===")
    print(json.dumps(result, indent=2))

    processor.save_json(result, 'test_output.json')

    # Clean up
    os.remove(test_csv)
