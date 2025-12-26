"""
Test Emotion Detection Advanced (28 emotions) model integration
Based on the GoEmotions dataset
"""
from sentiment_analyzer import SentimentAnalyzer

# Test texts designed to trigger specific emotions
test_cases = {
    "joy": "I'm so happy and excited!",
    "love": "I love you so much, you mean everything to me",
    "amusement": "Haha, that joke was hilarious!",
    "anger": "This makes me so angry and furious!",
    "fear": "I'm terrified and scared of what might happen",
    "sadness": "I feel so sad and heartbroken",
    "curiosity": "I wonder how this works? I'm curious to learn more",
    "gratitude": "Thank you so much, I'm so grateful for your help",
    "confusion": "I don't understand this at all, it's very confusing",
    "disgust": "That's absolutely disgusting and revolting",
    "surprise": "Wow! I can't believe this happened!",
    "pride": "I'm so proud of what I accomplished",
    "disappointment": "I'm really disappointed with these results",
    "nervousness": "I'm feeling so nervous and anxious about this",
    "relief": "I'm so relieved that everything worked out"
}

def test_goemotions():
    """Test Emotion Detection Advanced model with various emotions"""
    print("=== Emotion Detection Advanced Model Test ===\n")

    # Initialize analyzer with Emotion Detection Advanced model (GoEmotions)
    analyzer = SentimentAnalyzer(model_type="goemotions")

    print(f"Model loaded successfully on device: {analyzer.device}\n")

    correct = 0
    total = len(test_cases)

    for expected, text in test_cases.items():
        result = analyzer.analyze_text(text)
        detected = result['emotion']
        confidence = result['confidence']
        sentiment = result['sentiment_score']

        # Check if detection matches expectation
        match = "✓" if detected == expected else "✗"
        if detected == expected:
            correct += 1

        print(f"{match} Expected: {expected:15s} | Detected: {detected:15s} | Confidence: {confidence:.2f} | Sentiment: {sentiment:+.2f}")
        print(f"   Text: {text}")

        # Show top 3 emotions
        top_3 = sorted(result['emotion_distribution'].items(), key=lambda x: x[1], reverse=True)[:3]
        print(f"   Top 3: {', '.join([f'{e}={s:.2f}' for e, s in top_3])}")
        print()

    # Print summary
    accuracy = (correct / total) * 100
    print(f"\n=== Summary ===")
    print(f"Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    print(f"Model: Emotion Detection Advanced (28 emotions)")
    print(f"Device: {analyzer.device}")

if __name__ == "__main__":
    test_goemotions()
