"""
Test script to check what emotions the model outputs
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from sentiment_analyzer import SentimentAnalyzer

# Test texts for each emotion
test_texts = {
    "joy": "I am absolutely delighted! This is wonderful and amazing!",
    "sadness": "I feel so sad and melancholy. This breaks my heart completely.",
    "fear": "I'm terrified! This is completely frightening! I'm petrified!",
    "anger": "I'm furious about this! This makes me absolutely livid!",
    "surprise": "What an astonishing development! I never expected this!",
    "neutral": "This is just a normal day. Nothing special here.",
    "disgust": "This is absolutely despicable! I find this utterly revolting!",
}

analyzer = SentimentAnalyzer(model_type="emotion")

print("=" * 60)
print("EMOTION DETECTION TEST")
print("=" * 60)

for expected_emotion, text in test_texts.items():
    result = analyzer.analyze_text(text)
    print(f"\nExpected: {expected_emotion}")
    print(f"Text: {text}")
    print(f"Detected Emotion: {result['emotion']}")
    print(f"Sentiment Score: {result['sentiment_score']:.2f}")
    print(f"Distribution: {result['emotion_distribution']}")
    print("-" * 60)
