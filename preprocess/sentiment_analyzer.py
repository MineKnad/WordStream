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
            model_type: "emotion" (6 emotions), "sentiment" (pos/neu/neg), or "advanced" (fine-grained)
        """
        self.model_type = model_type
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialize_models()

    def _initialize_models(self):
        """Load appropriate transformer models"""
        try:
            if self.model_type == "emotion":
                # Emotion detection model: maps to 6 emotions
                self.model = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    device=0 if self.device == "cuda" else -1
                )
                self.emotion_labels = {
                    "sadness": -1.0,
                    "fear": -0.75,
                    "anger": -0.5,
                    "neutral": 0.0,
                    "surprise": 0.25,
                    "joy": 1.0
                }

            elif self.model_type == "sentiment":
                # Advanced sentiment: pos/neu/neg with confidence scores
                self.model = pipeline(
                    "text-classification",
                    model="roberta-large-mnli",
                    device=0 if self.device == "cuda" else -1
                )

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

            results = self.model(text, top_k=None if self.model_type == "emotion" else 1)

            if self.model_type == "emotion":
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

    def batch_analyze(self, texts: List[str]) -> List[Dict]:
        """Analyze multiple texts efficiently"""
        return [self.analyze_text(text) for text in texts]

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
