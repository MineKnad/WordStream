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
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import cpu_count
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sentiment_analyzer import SentimentAnalyzer, HappinessScorer, TopicDetector

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')


# Global stopwords set for multiprocessing workers
STOPWORDS = set(stopwords.words('english'))
STOPWORDS.update({
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'was', 'are', 'been',
    'like', 'just', 'can', 'could', 'said', 'would', 'will', 'should',
    'may', 'might', 'must', 'also', 'get', 'got', 'make', 'made',
    'go', 'going', 'come', 'coming', 'new', 'year', 'time', 'day',
    'one', 'two', 'three', 'first', 'second', 'http', 'https', 'www'
})


def _extract_words_worker(text: str, min_length: int = 3) -> List[str]:
    """
    Worker function for parallel word extraction.
    Must be at module level for multiprocessing.
    """
    if not isinstance(text, str):
        return []

    # Clean text
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-zA-Z0-9\s\-.]', '', text)
    text = ' '.join(text.split())

    # Tokenize
    tokens = word_tokenize(text)

    # Filter
    words = [
        word.lower() for word in tokens
        if word.lower() not in STOPWORDS
        and len(word) >= min_length
        and word.isalpha()
    ]

    return list(set(words))  # Return unique words


class DataPreprocessor:
    """Main preprocessing pipeline for WordStream data"""

    def __init__(self, sentiment_model: str = "emotion", use_happiness: bool = False):
        """
        Initialize preprocessor.

        Args:
            sentiment_model: "emotion", "sentiment", "topic", or "happiness"
            use_happiness: If True, use happiness scoring instead of sentiment
        """
        self.model_type = sentiment_model

        # Auto-enable happiness if model_type is "happiness"
        if sentiment_model == "happiness":
            use_happiness = True

        self.sentiment_analyzer = SentimentAnalyzer(model_type=sentiment_model) if sentiment_model not in ["topic", "happiness"] else None
        self.topic_detector = TopicDetector() if sentiment_model == "topic" else None
        self.happiness_scorer = HappinessScorer() if use_happiness or sentiment_model == "happiness" else None
        self.use_happiness = use_happiness or sentiment_model == "happiness"
        self.use_topics = sentiment_model == "topic"
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

    def get_happiness_color(self, happiness_category: str) -> str:
        """
        Get color for happiness category.

        Args:
            happiness_category: One of "very_happy", "happy", "fine", "unhappy", "very_unhappy"

        Returns:
            Hex color string
        """
        happiness_colors = {
            "very_happy": "#2E7D32",      # Dark Green
            "happy": "#66BB6A",           # Light Green
            "fine": "#FBC02D",            # Yellow
            "unhappy": "#F57C00",         # Orange
            "very_unhappy": "#D32F2F"     # Red
        }
        return happiness_colors.get(happiness_category, "#757575")  # Default to gray

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
        output_format: str = 'emotion',  # 'emotion', 'sentiment', or 'happiness'
        progress_callback: callable = None
    ) -> Dict:
        """
        Process a complete dataset and return WordStream-ready data.

        Args:
            filepath: Path to input file
            date_column: Name of date column
            text_column: Name of text column
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
        topic_by_word_period = defaultdict(lambda: defaultdict(list))
        emotion_by_word_period = defaultdict(lambda: defaultdict(list))
        happiness_by_word_period = defaultdict(lambda: defaultdict(list))

        print(f"Processing documents with model type: {self.model_type}...")
        emotion_counts = defaultdict(int)
        happiness_counts = defaultdict(int)

        total_docs = len(df)
        batch_size = 32  # Process 32 documents at a time for optimal performance

        # Pre-extract all texts and periods for batching
        print("Preparing batch data...")
        batch_data = []
        for idx, row in df.iterrows():
            text = row[text_column]
            if pd.isna(text):
                continue
            year, period = self.parse_date(row[date_column])
            batch_data.append((idx, text, period))

        # Initialize thread pool for parallel word extraction (works on Windows!)
        num_workers = max(2, cpu_count() - 1)  # Leave 1 core free for system
        print(f"Using {num_workers} threads for parallel word extraction...")

        # Use context manager for automatic cleanup
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            # Process in batches
            for batch_start in range(0, len(batch_data), batch_size):
                batch_end = min(batch_start + batch_size, len(batch_data))
                batch = batch_data[batch_start:batch_end]

                if batch_start % (batch_size * 10) == 0:  # Report every 10 batches
                    print(f"  Processed {batch_start}/{len(batch_data)} documents")
                    if progress_callback:
                        progress_callback(batch_start, len(batch_data), f"Processing documents... {batch_start}/{len(batch_data)}")

                # Extract texts for this batch
                batch_texts = [item[1] for item in batch]
                batch_periods = [item[2] for item in batch]
                batch_indices = [item[0] for item in batch]

                # Batch sentiment analysis (GPU/CPU optimized)
                if self.use_topics:
                    # Topic detection doesn't support batching efficiently, fall back to one-by-one
                    batch_results = []
                    for text in batch_texts:
                        topic_result = self.topic_detector.detect_topic(text)
                        batch_results.append({
                            "sentiment_score": 0.0,
                            "emotion": "neutral",
                            "primary_topic": topic_result["topic"]
                        })
                elif self.use_happiness:
                    # Happiness scoring uses sentiment analyzer internally, process one-by-one for now
                    batch_results = []
                    for text in batch_texts:
                        happiness_category = self.happiness_scorer.categorize(text)
                        sentiment_score = self.happiness_scorer.score(text) / 100.0 * 2 - 1
                        batch_results.append({
                            "sentiment_score": sentiment_score,
                            "emotion": happiness_category,
                            "primary_topic": None
                        })
                        happiness_counts[happiness_category] += 1
                else:
                    # BATCH SENTIMENT/EMOTION ANALYSIS - 20x faster!
                    analysis_results = self.sentiment_analyzer.batch_analyze(batch_texts, batch_size=batch_size)
                    batch_results = []
                    for analysis in analysis_results:
                        batch_results.append({
                            "sentiment_score": analysis["sentiment_score"],
                            "emotion": analysis["emotion"],
                            "primary_topic": None
                        })
                        if self.model_type == "emotion":
                            emotion_counts[analysis["emotion"]] += 1

                # Extract words for each text in batch using threading (works on Windows!)
                batch_words = list(executor.map(_extract_words_worker, batch_texts))

                # Store results for each document in batch
                for i, (idx, text, period) in enumerate(batch):
                    words = batch_words[i]
                    result = batch_results[i]
                    sentiment_score = result["sentiment_score"]
                    emotion = result["emotion"]
                    primary_topic = result.get("primary_topic")

                    # Add words
                    for word in words:
                        words_by_period[period][word] += 1
                        sentiment_by_word_period[period][word].append(sentiment_score)
                        if self.use_topics:
                            topic_by_word_period[period][word].append(primary_topic)
                        elif self.use_happiness:
                            happiness_by_word_period[period][word].append(emotion)
                        else:
                            # For emotion/sentiment models, store emotion for grouping
                            emotion_by_word_period[period][word].append(emotion)

        # Thread pool automatically cleaned up by context manager
        print("✓ Batch processing complete")

        # Log emotion distribution if emotion model
        if self.model_type == "emotion" and emotion_counts:
            print("\nEmotion Distribution in Dataset:")
            for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {emotion}: {count}")
            print()

        # Log happiness distribution if happiness model
        if self.use_happiness and happiness_counts:
            print("\nHappiness Distribution in Dataset:")
            for happiness, count in sorted(happiness_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {happiness}: {count}")
            print()

        # Compute sudden attention
        print("Computing sudden attention...")
        if progress_callback:
            progress_callback(total_docs, total_docs, "Computing sudden attention...")
        sudden_attention = self.compute_sudden_attention(words_by_period)

        # Build output structure
        print("Building output structure...")
        if progress_callback:
            progress_callback(total_docs, total_docs, "Building output structure...")
        periods = sorted(words_by_period.keys())
        output_data = []

        for period in periods:
            period_data = {
                "date": period,
                "words": defaultdict(list)
            }

            for word, freq in words_by_period[period].items():
                if self.use_topics:
                    # Get primary topic for this word
                    word_topics = topic_by_word_period[period][word]
                    # Count most common topic
                    from collections import Counter as CollCounter
                    topic_counter = CollCounter(word_topics)
                    primary_topic = topic_counter.most_common(1)[0][0] if topic_counter else "Uncategorized"

                    avg_sentiment = 0.0
                    color = self.topic_detector.get_color_for_topic(primary_topic)
                    grouping_category = primary_topic
                elif self.use_happiness:
                    # For happiness model: group by happiness category
                    word_happiness = happiness_by_word_period[period][word]
                    from collections import Counter as CollCounter
                    happiness_counter = CollCounter(word_happiness)
                    primary_happiness = happiness_counter.most_common(1)[0][0] if happiness_counter else "fine"

                    # Get word sentiment for averaging and coloring
                    sentiment_scores = sentiment_by_word_period[period][word]
                    avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0

                    # Get color based on happiness category
                    color = self.get_happiness_color(primary_happiness)
                    grouping_category = primary_happiness
                elif self.model_type == "emotion":
                    # For emotion model: group by individual emotion
                    word_emotions = emotion_by_word_period[period][word]
                    from collections import Counter as CollCounter
                    emotion_counter = CollCounter(word_emotions)
                    primary_emotion = emotion_counter.most_common(1)[0][0] if emotion_counter else "neutral"

                    # Get word sentiment for averaging
                    sentiment_scores = sentiment_by_word_period[period][word]
                    avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0

                    # Get color based on emotion
                    color = self.sentiment_analyzer.get_color_for_sentiment(avg_sentiment, primary_emotion)
                    grouping_category = primary_emotion
                else:
                    # For sentiment model: group by sentiment category (Positive/Negative/Neutral)
                    # Get word sentiment (average across documents)
                    sentiment_scores = sentiment_by_word_period[period][word]
                    avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 0.0
                    primary_emotion = "neutral"

                    # Get word color based on sentiment
                    color = self.sentiment_analyzer.get_color_for_sentiment(avg_sentiment)

                    # Determine sentiment-based category for visualization grouping
                    if avg_sentiment > 0.3:
                        grouping_category = "Positive"
                    elif avg_sentiment < -0.3:
                        grouping_category = "Negative"
                    else:
                        grouping_category = "Neutral"

                word_entry = {
                    "text": word,
                    "frequency": int(freq),
                    "sudden": float(sudden_attention[period][word]),
                    "sentiment": float(avg_sentiment),
                    "emotion": emotion if emotion else "neutral",
                    "color": color,
                    "topic": grouping_category,
                    "id": f"{word}_{period.replace('-', '_')}"
                }

                # Group by topic (either detected topic or sentiment topic)
                period_data["words"][grouping_category].append(word_entry)

            # Convert defaultdict to regular dict and sort by category order
            words_dict = dict(period_data["words"])

            # Sort categories in the correct order based on model type
            if self.use_happiness:
                # Sort happiness categories from happiest to saddest
                happiness_order = ["very_happy", "happy", "fine", "unhappy", "very_unhappy"]
                sorted_words = {cat: words_dict[cat] for cat in happiness_order if cat in words_dict}
                period_data["words"] = sorted_words
            elif self.model_type == "emotion":
                # Sort emotions in a logical order
                emotion_order = ["joy", "surprise", "neutral", "fear", "sadness", "disgust", "anger"]
                sorted_words = {cat: words_dict[cat] for cat in emotion_order if cat in words_dict}
                period_data["words"] = sorted_words
            elif self.use_topics:
                # Sort topics by the predefined TOPICS list order
                topic_order = self.topic_detector.TOPICS
                sorted_words = {cat: words_dict[cat] for cat in topic_order if cat in words_dict}
                period_data["words"] = sorted_words
            else:
                # Sentiment model: Positive, Neutral, Negative
                sentiment_order = ["Positive", "Neutral", "Negative"]
                sorted_words = {cat: words_dict[cat] for cat in sentiment_order if cat in words_dict}
                period_data["words"] = sorted_words

            output_data.append(period_data)

        # Build metadata
        if self.use_topics:
            categories = self.topic_detector.TOPICS
            model_name = "topic"
        elif self.use_happiness:
            # For happiness model, use 5 happiness categories
            categories = ["very_happy", "happy", "fine", "unhappy", "very_unhappy"]
            model_name = "happiness"
        elif self.model_type == "emotion":
            # For emotion model, use individual emotions (all 7 from the model)
            categories = ["joy", "surprise", "neutral", "fear", "sadness", "disgust", "anger"]
            model_name = "emotion"
        else:
            # For sentiment model, use sentiment categories
            categories = ["Positive", "Negative", "Neutral"]
            model_name = "sentiment"

        metadata = {
            "dataset_name": Path(filepath).stem,
            "total_documents": len(df),
            "total_periods": len(periods),
            "periods": periods,
            "categories": categories,
            "total_unique_words": len(words_by_period[periods[-1]]) if periods else 0,
            "created": datetime.now().isoformat(),
            "sentiment_model": model_name
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
