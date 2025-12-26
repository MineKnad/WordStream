"""
Advanced Sentiment Analysis Module for WordStream
Supports multiple sentiment/emotion analysis approaches:
1. Emotion Detection (6 emotions: joy, sadness, anger, fear, surprise, disgust)
2. Advanced Sentiment (positive, neutral, negative with fine-grained scores)
3. Contextual Sentiment (via transformer models)
"""

import torch
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, List, Tuple, Optional
import warnings

warnings.filterwarnings("ignore")

class SentimentAnalyzer:
    """Multi-model sentiment and emotion analysis"""

    def __init__(self, model_type: str = "emotion"):
        """
        Initialize sentiment analyzer.

        Args:
            model_type: "emotion" (6 emotions), "goemotions" (Emotion Detection Advanced - 28 emotions),
                       "sentiment" (pos/neu/neg), or "advanced" (fine-grained)
        """
        self.model_type = model_type
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialize_models()

    def _initialize_models(self):
        """Load appropriate transformer models"""
        try:
            if self.model_type == "emotion" or self.model_type == "sentiment":
                # Both emotion detection and sentiment analysis use emotion model
                self.model = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    device=0 if self.device == "cuda" else -1
                )
                self.emotion_labels = {
                    "sadness": -1.0,
                    "fear": -0.75,
                    "disgust": -0.6,
                    "anger": -0.5,
                    "neutral": 0.0,
                    "surprise": 0.25,
                    "joy": 1.0
                }

            elif self.model_type == "goemotions":
                # Emotion Detection Advanced - 28-emotion model (based on GoEmotions dataset)
                self.model = pipeline(
                    "text-classification",
                    model="SamLowe/roberta-base-go_emotions",
                    device=0 if self.device == "cuda" else -1,
                    top_k=None  # Return all 28 emotions
                )
                # Map 28 emotions to sentiment scores (-1 to +1)
                self.emotion_labels = {
                    # Strong positive (0.8 to 1.0)
                    "joy": 1.0,
                    "love": 0.95,
                    "amusement": 0.9,
                    "excitement": 0.9,
                    "gratitude": 0.85,
                    "admiration": 0.8,
                    # Moderate positive (0.4 to 0.7)
                    "approval": 0.6,
                    "caring": 0.6,
                    "optimism": 0.7,
                    "pride": 0.7,
                    "relief": 0.5,
                    "desire": 0.4,
                    # Neutral to slightly positive (0 to 0.3)
                    "neutral": 0.0,
                    "realization": 0.1,
                    "curiosity": 0.2,
                    "surprise": 0.25,
                    # Slightly negative (-0.5 to -0.1)
                    "confusion": -0.3,
                    "nervousness": -0.4,
                    "embarrassment": -0.4,
                    "annoyance": -0.5,
                    # Moderate negative (-0.8 to -0.6)
                    "disappointment": -0.6,
                    "disapproval": -0.6,
                    "remorse": -0.7,
                    "grief": -0.8,
                    # Strong negative (-1.0 to -0.8)
                    "sadness": -1.0,
                    "fear": -0.9,
                    "disgust": -0.85,
                    "anger": -0.9
                }

            else:  # "advanced"
                # Fine-grained sentiment (5 classes)
                self.model = pipeline(
                    "text-classification",
                    model="michellejieli/emotion_text_classifier",
                    device=0 if self.device == "cuda" else -1
                )

            print(f"✓ Loaded {self.model_type} analyzer on {self.device}")

        except Exception as e:
            print(f"Warning: Could not load model {self.model_type}: {e}")
            # Fallback to basic sentiment
            self.model = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=0 if self.device == "cuda" else -1
            )
            print(f"✓ Loaded fallback sentiment analyzer on {self.device}")

    def analyze_text(self, text: str) -> Dict:
        """
        Analyze sentiment/emotion of a text.

        Returns:
            Dict with sentiment scores:
            {
                "sentiment_score": float [-1.0, 1.0],  # -1=negative, 0=neutral, +1=positive
                "emotion": str,  # dominant emotion
                "emotion_distribution": {emotion: score},  # all emotions
                "confidence": float  # [0, 1]
            }
        """
        if not text or len(text.strip()) < 3:
            return {
                "sentiment_score": 0.0,
                "emotion": "neutral",
                "emotion_distribution": {"neutral": 1.0},
                "confidence": 0.5
            }

        try:
            # Truncate very long texts to avoid memory issues
            text = text[:512] if len(text) > 512 else text

            results = self.model(text, top_k=None if self.model_type in ["emotion", "sentiment", "goemotions"] else 1)

            if self.model_type in ["emotion", "sentiment", "goemotions"]:
                # Results: [{"label": emotion, "score": confidence}]
                emotion_dist = {r["label"]: r["score"] for r in results}
                dominant_emotion = max(emotion_dist, key=emotion_dist.get)

                # Map emotion to sentiment score
                sentiment_score = sum(
                    self.emotion_labels.get(emotion, 0) * score
                    for emotion, score in emotion_dist.items()
                )

                return {
                    "sentiment_score": float(sentiment_score),
                    "emotion": dominant_emotion,
                    "emotion_distribution": emotion_dist,
                    "confidence": float(emotion_dist[dominant_emotion])
                }

            else:
                # Standard sentiment analysis
                label = results[0]["label"].lower()
                score = results[0]["score"]

                # Normalize to [-1, 1] range
                if "positive" in label or "POSITIVE" in label:
                    sentiment_score = score
                    emotion = "positive"
                elif "negative" in label or "NEGATIVE" in label:
                    sentiment_score = -score
                    emotion = "negative"
                else:
                    sentiment_score = 0.0
                    emotion = "neutral"

                return {
                    "sentiment_score": float(sentiment_score),
                    "emotion": emotion,
                    "emotion_distribution": {emotion: score},
                    "confidence": float(score)
                }

        except Exception as e:
            print(f"Error analyzing text: {e}")
            return {
                "sentiment_score": 0.0,
                "emotion": "neutral",
                "emotion_distribution": {"neutral": 1.0},
                "confidence": 0.5
            }

    def batch_analyze(self, texts: List[str], batch_size: int = 32) -> List[Dict]:
        """
        Analyze multiple texts efficiently using batching.

        Args:
            texts: List of text strings to analyze
            batch_size: Number of texts to process in each batch (default: 32)

        Returns:
            List of analysis dictionaries in same format as analyze_text()
        """
        if not texts:
            return []

        all_results = []

        # Process in batches for optimal GPU/CPU utilization
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]

            # Truncate and preprocess batch
            processed_batch = []
            empty_indices = []

            for idx, text in enumerate(batch_texts):
                if not text or len(text.strip()) < 3:
                    empty_indices.append(idx)
                    processed_batch.append("")  # Placeholder
                else:
                    # Truncate to avoid memory issues
                    processed_batch.append(text[:512] if len(text) > 512 else text)

            try:
                # Call model with batch - transformers pipeline handles batching natively
                if self.model_type in ["emotion", "sentiment", "goemotions"]:
                    # top_k=None returns all emotion scores
                    batch_results = self.model(processed_batch, top_k=None)
                else:
                    # Standard sentiment returns single prediction
                    batch_results = self.model(processed_batch)

                # Process results for each text in batch
                for idx, result in enumerate(batch_results):
                    # Handle empty texts
                    if idx in empty_indices:
                        all_results.append({
                            "sentiment_score": 0.0,
                            "emotion": "neutral",
                            "emotion_distribution": {"neutral": 1.0},
                            "confidence": 0.5
                        })
                        continue

                    # Process based on model type
                    if self.model_type in ["emotion", "sentiment", "goemotions"]:
                        # Results: [{"label": emotion, "score": confidence}]
                        emotion_dist = {r["label"]: r["score"] for r in result}
                        dominant_emotion = max(emotion_dist, key=emotion_dist.get)

                        # Map emotion to sentiment score
                        sentiment_score = sum(
                            self.emotion_labels.get(emotion, 0) * score
                            for emotion, score in emotion_dist.items()
                        )

                        all_results.append({
                            "sentiment_score": float(sentiment_score),
                            "emotion": dominant_emotion,
                            "emotion_distribution": emotion_dist,
                            "confidence": float(emotion_dist[dominant_emotion])
                        })
                    else:
                        # Standard sentiment analysis
                        label = result["label"].lower()
                        score = result["score"]

                        # Normalize to [-1, 1] range
                        if "positive" in label or "POSITIVE" in label:
                            sentiment_score = score
                            emotion = "positive"
                        elif "negative" in label or "NEGATIVE" in label:
                            sentiment_score = -score
                            emotion = "negative"
                        else:
                            sentiment_score = 0.0
                            emotion = "neutral"

                        all_results.append({
                            "sentiment_score": float(sentiment_score),
                            "emotion": emotion,
                            "emotion_distribution": {emotion: score},
                            "confidence": float(score)
                        })

            except Exception as e:
                print(f"Error in batch analysis: {e}")
                # Fallback to neutral for entire batch on error
                for _ in batch_texts:
                    all_results.append({
                        "sentiment_score": 0.0,
                        "emotion": "neutral",
                        "emotion_distribution": {"neutral": 1.0},
                        "confidence": 0.5
                    })

        return all_results

    def get_color_for_sentiment(self, sentiment_score: float, emotion: str = None) -> str:
        """
        Map sentiment to color for visualization.

        Returns:
            Hex color string suitable for blind-friendly palette
        """
        # Color-blind friendly palette:
        # Positive: blues and greens
        # Negative: reds and oranges
        # Neutral: grays

        palette = {
            "joy": "#2E7D32",          # Green
            "positive": "#2E7D32",
            "surprise": "#42A5F5",      # Light Blue
            "neutral": "#757575",       # Gray
            "fear": "#EF5350",          # Red
            "sadness": "#1565C0",       # Dark Blue
            "anger": "#F57C00",         # Orange
            "negative": "#F57C00",
        }

        if emotion and emotion in palette:
            return palette[emotion]

        # Fallback based on sentiment score
        if sentiment_score > 0.3:
            return "#2E7D32"  # Green (positive)
        elif sentiment_score > -0.3:
            return "#757575"  # Gray (neutral)
        else:
            return "#F57C00"  # Orange (negative)


class TopicDetector:
    """
    Zero-shot topic classification.
    Automatically categorizes text into predefined topics.
    """

    def __init__(self):
        """Initialize zero-shot classification model"""
        try:
            self.model = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=0 if torch.cuda.is_available() else -1
            )
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"✓ Loaded Topic Detector on {self.device}")
        except Exception as e:
            print(f"Warning: Could not load topic model: {e}")
            self.model = None

    # Predefined topics for classification
    TOPICS = [
        "Business", "Technology", "Health", "Politics",
        "Sports", "Entertainment", "Science", "Education",
        "Finance", "Travel", "Food", "Lifestyle"
    ]

    def detect_topic(self, text: str) -> Dict:
        """
        Detect the primary topic of a text.

        Returns:
            Dict with topic information:
            {
                "topic": str,  # primary topic
                "topics_scores": {topic: score},  # all topics with scores
                "confidence": float  # [0, 1]
            }
        """
        if not text or len(text.strip()) < 3:
            return {
                "topic": "Uncategorized",
                "topics_scores": {"Uncategorized": 1.0},
                "confidence": 0.5
            }

        if self.model is None:
            return {
                "topic": "Uncategorized",
                "topics_scores": {"Uncategorized": 1.0},
                "confidence": 0.5
            }

        try:
            # Truncate very long texts
            text = text[:512] if len(text) > 512 else text

            result = self.model(text, self.TOPICS, multi_class=False)

            # result has: labels (sorted by score) and scores
            topics_scores = {label: score for label, score in zip(result["labels"], result["scores"])}
            primary_topic = result["labels"][0]
            confidence = result["scores"][0]

            return {
                "topic": primary_topic,
                "topics_scores": topics_scores,
                "confidence": float(confidence)
            }

        except Exception as e:
            print(f"Error detecting topic: {e}")
            return {
                "topic": "Uncategorized",
                "topics_scores": {"Uncategorized": 1.0},
                "confidence": 0.5
            }

    def get_color_for_topic(self, topic: str) -> str:
        """
        Map topic to color for visualization.

        Returns:
            Hex color string
        """
        topic_colors = {
            "Business": "#1F77B4",        # Blue
            "Technology": "#FF7F0E",      # Orange
            "Health": "#2CA02C",          # Green
            "Politics": "#D62728",        # Red
            "Sports": "#9467BD",          # Purple
            "Entertainment": "#8C564B",   # Brown
            "Science": "#E377C2",         # Pink
            "Education": "#7F7F7F",       # Gray
            "Finance": "#BCBD22",         # Yellow-green
            "Travel": "#17BECF",          # Cyan
            "Food": "#FFB6C1",            # Light pink
            "Lifestyle": "#98D8C8",       # Mint
            "Uncategorized": "#757575"    # Gray
        }
        return topic_colors.get(topic, "#757575")


class HappinessScorer:
    """
    Alternative to sentiment: score text on a "happiness" scale (0-100).
    Combines sentiment, emotion, and linguistic patterns.
    """

    def __init__(self):
        self.sentiment_analyzer = SentimentAnalyzer(model_type="emotion")
        self.positive_words = {
            "excellent": 100, "fantastic": 100, "amazing": 95, "wonderful": 95,
            "great": 85, "good": 75, "nice": 70, "happy": 90, "love": 90,
            "awesome": 95, "beautiful": 85, "brilliant": 90, "perfect": 95,
        }
        self.negative_words = {
            "terrible": 0, "awful": 5, "horrible": 5, "bad": 20, "sad": 15,
            "angry": 10, "hate": 0, "ugly": 20, "broken": 15, "fail": 15,
            "worst": 0, "disgusting": 5, "wrong": 25,
        }

    def score(self, text: str) -> int:
        """
        Score text on happiness scale [0, 100].

        Returns:
            Happiness score (0=very unhappy, 50=neutral, 100=very happy)
        """
        analysis = self.sentiment_analyzer.analyze_text(text)

        # Base score from sentiment (-1 to +1) → (0 to 100)
        base_score = (analysis["sentiment_score"] + 1) * 50

        # Adjust based on word frequency
        words = text.lower().split()
        for word in words:
            if word in self.positive_words:
                base_score = min(100, base_score + 10)
            elif word in self.negative_words:
                base_score = max(0, base_score - 10)

        # Confidence boost for high-confidence predictions
        confidence_boost = (analysis["confidence"] - 0.5) * 10
        final_score = base_score + confidence_boost

        return max(0, min(100, int(final_score)))

    def categorize(self, text: str) -> str:
        """
        Categorize text into 5 happiness levels.

        Returns:
            One of: "very_unhappy", "unhappy", "fine", "happy", "very_happy"
        """
        happiness_score = self.score(text)

        if happiness_score >= 81:
            return "very_happy"
        elif happiness_score >= 61:
            return "happy"
        elif happiness_score >= 41:
            return "fine"
        elif happiness_score >= 21:
            return "unhappy"
        else:
            return "very_unhappy"


if __name__ == "__main__":
    # Test the analyzers
    analyzer = SentimentAnalyzer(model_type="emotion")

    test_texts = [
        "I love this! It's absolutely amazing and wonderful!",
        "This is terrible and I hate it.",
        "It's okay, nothing special really.",
        "The weather is sunny and beautiful today.",
        "I'm very sad and disappointed with the results."
    ]

    print("\n=== EMOTION ANALYSIS ===")
    for text in test_texts:
        result = analyzer.analyze_text(text)
        print(f"\nText: {text}")
        print(f"  Sentiment: {result['sentiment_score']:.2f}")
        print(f"  Emotion: {result['emotion']}")
        print(f"  Confidence: {result['confidence']:.2f}")

    print("\n=== HAPPINESS SCORING ===")
    happiness = HappinessScorer()
    for text in test_texts:
        score = happiness.score(text)
        print(f"{text}\n  → Happiness: {score}/100")
