#!/usr/bin/env python3
"""
Generate 3 large sample datasets for WordStream visualization
Each dataset covers 2000-2025 with different themes and data types
Target size: ~50MB each
"""

import json
import random
import datetime
from collections import defaultdict

# Seed for reproducibility
random.seed(42)

def generate_date_range(start_year=2000, end_year=2025, freq='Q'):
    """Generate quarterly date strings from start_year to end_year"""
    dates = []
    for year in range(start_year, end_year + 1):
        if freq == 'Q':
            for quarter in range(1, 5):
                dates.append(f"{year}-Q{quarter}")
        elif freq == 'M':
            for month in range(1, 13):
                dates.append(f"{year}-{month:02d}")
    return dates


# ============ DATASET 1: Technology Evolution with Emotions ============

TECH_TERMS = {
    # Early 2000s
    'early': [
        "dial-up internet", "MP3 players", "DVD technology", "Windows XP", "Napster",
        "peer-to-peer sharing", "flip phones", "AOL Instant Messenger", "Palm Pilot",
        "broadband adoption", "dot-com bubble", "Y2K solutions", "USB flash drives",
        "WiFi networks", "blogging platforms", "digital cameras", "Java applications",
        "search engines", "online auctions", "web portals", "Flash animations",
        "instant messaging", "email spam", "firewall security", "antivirus software"
    ],
    # Mid 2000s
    'mid': [
        "social networking", "YouTube videos", "smartphones", "Web 2.0", "AJAX technology",
        "Firefox browser", "iPod revolution", "iTunes Music Store", "Wikipedia editing",
        "Google Maps", "Gmail service", "podcasting", "RSS feeds", "blog monetization",
        "MySpace profiles", "Facebook platform", "Twitter microblogging", "iPhone launch",
        "Android OS", "App Store", "cloud storage", "virtual worlds", "Second Life",
        "online gaming", "streaming video", "HD displays", "Blu-ray discs"
    ],
    # Late 2000s - Early 2010s
    'transition': [
        "tablet computers", "iPad revolution", "Instagram photos", "mobile apps",
        "responsive design", "HTML5 standards", "Chrome browser", "cloud computing",
        "SaaS platforms", "GitHub repositories", "Stack Overflow", "hackathons",
        "startup culture", "venture capital", "cryptocurrency", "Bitcoin mining",
        "blockchain technology", "3D printing", "maker movement", "Internet of Things",
        "smart home devices", "wearable technology", "fitness trackers", "Snapchat stories"
    ],
    # Mid 2010s
    'modern': [
        "machine learning", "deep learning", "neural networks", "artificial intelligence",
        "voice assistants", "Alexa devices", "Google Home", "Siri integration",
        "autonomous vehicles", "Tesla autopilot", "ride-sharing", "Uber platform",
        "Airbnb hosting", "gig economy", "remote work", "video conferencing",
        "4K streaming", "Netflix originals", "cord cutting", "podcast boom",
        "influencer marketing", "TikTok videos", "augmented reality", "virtual reality",
        "AR filters", "VR headsets", "smartwatches", "wireless earbuds"
    ],
    # Late 2010s - 2020s
    'recent': [
        "5G networks", "edge computing", "quantum computing", "GPT models",
        "large language models", "ChatGPT AI", "generative AI", "AI art",
        "DALL-E images", "Midjourney", "stable diffusion", "prompt engineering",
        "AI ethics", "model training", "transformer architecture", "attention mechanisms",
        "fine-tuning", "zero-shot learning", "reinforcement learning", "AGI research",
        "AI regulation", "deepfakes", "synthetic media", "content moderation",
        "Web3 concepts", "NFT marketplaces", "metaverse platforms", "decentralized apps",
        "smart contracts", "DeFi protocols", "crypto wallets", "digital identity"
    ]
}

EMOTIONS = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'disgust', 'anger']

def get_tech_terms_for_period(date):
    """Get relevant tech terms based on time period"""
    year = int(date.split('-')[0])
    quarter = date.split('-')[1]

    terms = []
    if 2000 <= year <= 2004:
        terms = TECH_TERMS['early']
    elif 2005 <= year <= 2008:
        terms = TECH_TERMS['early'] + TECH_TERMS['mid']
    elif 2009 <= year <= 2012:
        terms = TECH_TERMS['mid'] + TECH_TERMS['transition']
    elif 2013 <= year <= 2016:
        terms = TECH_TERMS['transition'] + TECH_TERMS['modern']
    elif 2017 <= year <= 2020:
        terms = TECH_TERMS['modern'] + TECH_TERMS['recent']
    else:  # 2021-2025
        terms = TECH_TERMS['recent'] + TECH_TERMS['modern']

    return terms

def generate_tech_evolution_dataset():
    """Generate technology evolution dataset with emotions"""
    print("Generating Tech Evolution dataset...")
    dates = generate_date_range(2000, 2025, freq='Q')
    data = []

    for date in dates:
        period_data = {"date": date, "words": {}}
        available_terms = get_tech_terms_for_period(date)

        # Generate words for each emotion
        for emotion in EMOTIONS:
            words = []
            # Significantly more terms for larger dataset (~50MB target)
            if emotion == 'neutral':
                num_iterations = random.randint(400, 600)
            elif emotion in ['joy', 'surprise']:
                num_iterations = random.randint(300, 500)
            else:
                num_iterations = random.randint(150, 300)

            for _ in range(num_iterations):
                # Pick random term
                term = random.choice(available_terms)

                # Add extensive variations to create unique entries
                prefixes = ["", "emerging ", "advanced ", "innovative ", "next-gen ", "legacy ",
                           "modern ", "cutting-edge ", "revolutionary ", "disruptive ", "conventional ",
                           "experimental ", "mainstream ", "enterprise ", "consumer ", "mobile ",
                           "cloud-based ", "open-source ", "proprietary ", "integrated "]

                variations = [
                    term,
                    f"{term} adoption",
                    f"{term} integration",
                    f"{term} development",
                    f"{term} implementation",
                    f"{term} improvements",
                    f"{term} challenges",
                    f"{term} innovation",
                    f"{term} ecosystem",
                    f"{term} platform",
                    f"{term} solutions",
                    f"{term} architecture",
                    f"{term} infrastructure",
                    f"{term} deployment",
                    f"{term} optimization",
                    f"{term} scaling",
                    f"{term} migration",
                    f"{term} transformation",
                    f"{term} strategy",
                    f"{term} roadmap",
                ]

                base_variation = random.choice(variations)
                selected_term = f"{random.choice(prefixes)}{base_variation}".strip()

                frequency = random.randint(1, 50)
                sudden = min(frequency + random.randint(0, 20), 50)

                words.append({
                    "text": selected_term,
                    "sudden": sudden,
                    "topic": emotion,
                    "frequency": frequency,
                    "emotion": emotion
                })

            period_data["words"][emotion] = words

        data.append(period_data)

    return data


# ============ DATASET 2: Social Media Sentiment ============

SOCIAL_MEDIA_TERMS = {
    'platforms': [
        "Friendster", "MySpace", "Facebook", "Twitter", "LinkedIn", "Pinterest",
        "Instagram", "Snapchat", "TikTok", "Reddit", "Tumblr", "Vine",
        "Periscope", "Clubhouse", "Discord", "Twitch", "YouTube", "Vimeo"
    ],
    'activities': [
        "status updates", "photo sharing", "video posting", "live streaming",
        "story publishing", "reel creation", "tweet threading", "hashtag campaigns",
        "viral challenges", "meme culture", "content creation", "influencer marketing",
        "brand partnerships", "user engagement", "community building", "follower growth",
        "algorithm changes", "content moderation", "fake news", "misinformation",
        "cancel culture", "online activism", "digital detox", "screen time",
        "social comparison", "FOMO effects", "mental health", "cyberbullying"
    ],
    'features': [
        "news feed", "timeline", "friend requests", "follower system", "direct messaging",
        "group chats", "video calls", "stories feature", "reels", "shorts",
        "live video", "polls", "reactions", "super likes", "verified badges",
        "monetization", "subscriptions", "tips", "shopping tags", "link in bio",
        "algorithm feed", "chronological feed", "explore page", "trending topics",
        "notifications", "privacy settings", "two-factor auth", "account security"
    ],
    'trends': [
        "selfie culture", "filter effects", "AR lenses", "beauty standards",
        "body positivity", "authenticity", "personal branding", "thought leadership",
        "viral moments", "trending sounds", "dance challenges", "lip sync videos",
        "unboxing videos", "product reviews", "haul videos", "tutorial content",
        "reaction videos", "commentary channels", "podcast clips", "educational content",
        "behind the scenes", "day in life", "vlog content", "travel content",
        "food photography", "fitness journey", "transformation posts", "throwback content"
    ],
    'issues': [
        "privacy concerns", "data breaches", "algorithm bias", "echo chambers",
        "political polarization", "election interference", "content censorship",
        "shadowbanning", "account suspension", "platform moderation", "community guidelines",
        "copyright claims", "fair use", "creator rights", "platform policies",
        "advertising transparency", "data tracking", "user profiling", "targeted ads",
        "attention economy", "addiction design", "infinite scroll", "notification stress",
        "comparison anxiety", "validation seeking", "engagement metrics", "vanity metrics"
    ]
}

SENTIMENT_CATEGORIES = ['Positive', 'Neutral', 'Negative']

def generate_social_media_dataset():
    """Generate social media evolution dataset with sentiment"""
    print("Generating Social Media Sentiment dataset...")
    dates = generate_date_range(2000, 2025, freq='Q')
    data = []

    for date in dates:
        period_data = {"date": date, "words": {}}
        year = int(date.split('-')[0])

        # All term categories
        all_terms = []
        for category in SOCIAL_MEDIA_TERMS.values():
            all_terms.extend(category)

        # Weight changes over time
        if year < 2005:
            # Early days - more neutral/positive
            sentiment_weights = {'Positive': 0.5, 'Neutral': 0.4, 'Negative': 0.1}
        elif year < 2010:
            # Growth phase
            sentiment_weights = {'Positive': 0.6, 'Neutral': 0.3, 'Negative': 0.1}
        elif year < 2015:
            # Maturing
            sentiment_weights = {'Positive': 0.4, 'Neutral': 0.4, 'Negative': 0.2}
        else:
            # Current era - more concerns
            sentiment_weights = {'Positive': 0.3, 'Neutral': 0.4, 'Negative': 0.3}

        for sentiment in SENTIMENT_CATEGORIES:
            words = []
            num_iterations = int(900 * sentiment_weights[sentiment]) + random.randint(250, 400)

            for _ in range(num_iterations):
                term = random.choice(all_terms)

                # Generate extensively varied phrases
                prefixes = ["", "mobile ", "social ", "digital ", "online ", "viral ",
                           "trending ", "popular ", "emerging ", "mainstream ", "niche ",
                           "controversial ", "innovative ", "traditional ", "modern ",
                           "real-time ", "live ", "interactive ", "personalized ", "automated "]

                suffixes = ["", " trends", " patterns", " behavior", " engagement", " metrics",
                           " analytics", " insights", " strategies", " tactics", " campaigns",
                           " content", " features", " tools", " platforms", " networks",
                           " communities", " experiences", " interactions", " connections"]

                full_term = f"{random.choice(prefixes)}{term}{random.choice(suffixes)}".strip()

                frequency = random.randint(1, 60)
                sudden = min(frequency + random.randint(-5, 25), 70)

                # Sentiment scores
                if sentiment == 'Positive':
                    sentiment_score = random.uniform(0.5, 1.0)
                elif sentiment == 'Negative':
                    sentiment_score = random.uniform(-1.0, -0.3)
                else:
                    sentiment_score = random.uniform(-0.2, 0.2)

                words.append({
                    "text": full_term,
                    "sudden": sudden,
                    "topic": sentiment,
                    "frequency": frequency,
                    "sentiment": sentiment_score
                })

            period_data["words"][sentiment] = words

        data.append(period_data)

    return data


# ============ DATASET 3: Global Events with Happiness Levels ============

GLOBAL_EVENT_THEMES = {
    'technology': [
        "internet expansion", "smartphone adoption", "social media growth",
        "artificial intelligence", "renewable energy", "electric vehicles",
        "space exploration", "medical breakthroughs", "vaccine development",
        "genome sequencing", "quantum computing", "clean technology"
    ],
    'politics': [
        "democratic elections", "peaceful transitions", "international cooperation",
        "trade agreements", "climate accords", "peace treaties", "diplomatic relations",
        "political tensions", "government protests", "policy reforms", "voting rights",
        "civil movements", "political polarization", "leadership changes"
    ],
    'economics': [
        "economic growth", "market recovery", "job creation", "wage increases",
        "poverty reduction", "financial crisis", "market crashes", "recessions",
        "inflation concerns", "unemployment rates", "wealth inequality", "housing markets",
        "cryptocurrency boom", "digital payments", "gig economy", "remote work"
    ],
    'environment': [
        "climate action", "renewable adoption", "conservation efforts", "wildlife protection",
        "ocean cleanup", "reforestation", "sustainable practices", "green technology",
        "extreme weather", "natural disasters", "wildfires", "flooding events",
        "droughts", "hurricanes", "climate crisis", "environmental activism"
    ],
    'health': [
        "medical advances", "disease cures", "health improvements", "life expectancy",
        "fitness trends", "mental health awareness", "pandemic preparedness",
        "public health", "disease outbreaks", "health crises", "vaccine campaigns",
        "healthcare access", "medical research", "wellness movements"
    ],
    'social': [
        "social progress", "equality movements", "human rights", "education access",
        "cultural exchanges", "artistic achievements", "sports victories", "community building",
        "social justice", "diversity inclusion", "gender equality", "LGBTQ rights",
        "racial justice", "disability rights", "youth activism", "civic engagement"
    ],
    'disasters': [
        "earthquake relief", "tsunami recovery", "hurricane response", "wildfire containment",
        "flood management", "disaster preparedness", "emergency response", "humanitarian aid",
        "refugee crisis", "conflict zones", "terrorism threats", "security concerns",
        "infrastructure collapse", "industrial accidents", "environmental disasters"
    ],
    'achievements': [
        "scientific discoveries", "Olympic games", "World Cup victories", "Nobel prizes",
        "artistic masterpieces", "architectural wonders", "cultural milestones",
        "historic firsts", "space missions", "exploration achievements", "human cooperation",
        "global solidarity", "charitable efforts", "volunteer movements"
    ]
}

HAPPINESS_CATEGORIES = ['very_happy', 'happy', 'fine', 'unhappy', 'very_unhappy']

def generate_global_events_dataset():
    """Generate global events dataset with happiness levels"""
    print("Generating Global Events dataset...")
    dates = generate_date_range(2000, 2025, freq='Q')
    data = []

    # Define major historical events that affect happiness distribution
    major_events = {
        '2001-Q3': 'very_unhappy',  # 9/11
        '2008-Q4': 'very_unhappy',  # Financial crisis
        '2011-Q1': 'very_unhappy',  # Japan tsunami
        '2020-Q1': 'very_unhappy',  # COVID-19
        '2021-Q3': 'unhappy',       # COVID continues
        '2022-Q1': 'unhappy',       # Ukraine conflict
    }

    for date in dates:
        period_data = {"date": date, "words": {}}
        year = int(date.split('-')[0])

        # Collect all terms
        all_terms = []
        for category in GLOBAL_EVENT_THEMES.values():
            all_terms.extend(category)

        # Base happiness distribution (can be modified by major events)
        base_distribution = {
            'very_happy': 0.15,
            'happy': 0.30,
            'fine': 0.35,
            'unhappy': 0.15,
            'very_unhappy': 0.05
        }

        # Adjust for major events
        if date in major_events:
            event_mood = major_events[date]
            if event_mood == 'very_unhappy':
                distribution = {
                    'very_happy': 0.05,
                    'happy': 0.10,
                    'fine': 0.25,
                    'unhappy': 0.35,
                    'very_unhappy': 0.25
                }
            else:  # unhappy
                distribution = {
                    'very_happy': 0.08,
                    'happy': 0.15,
                    'fine': 0.30,
                    'unhappy': 0.30,
                    'very_unhappy': 0.17
                }
        else:
            distribution = base_distribution

        for happiness in HAPPINESS_CATEGORIES:
            words = []
            num_iterations = int(600 * distribution[happiness]) + random.randint(100, 250)

            for _ in range(num_iterations):
                term = random.choice(all_terms)

                # Add extensive descriptive context
                contexts = [
                    "", "global ", "international ", "national ", "local ",
                    "regional ", "community ", "societal ", "cultural ", "economic ",
                    "political ", "environmental ", "technological ", "scientific ",
                    "humanitarian ", "collaborative ", "grassroots ", "institutional ",
                    "transformative ", "sustainable "
                ]
                modifiers = [
                    "", " initiatives", " developments", " progress", " challenges",
                    " movements", " efforts", " impacts", " changes", " trends",
                    " programs", " policies", " reforms", " innovations", " breakthroughs",
                    " achievements", " milestones", " advances", " improvements", " solutions"
                ]

                full_term = f"{random.choice(contexts)}{term}{random.choice(modifiers)}".strip()

                frequency = random.randint(1, 70)
                sudden = min(frequency + random.randint(-10, 30), 80)

                # Happiness score mapping
                happiness_scores = {
                    'very_happy': random.uniform(0.8, 1.0),
                    'happy': random.uniform(0.4, 0.8),
                    'fine': random.uniform(-0.2, 0.4),
                    'unhappy': random.uniform(-0.7, -0.3),
                    'very_unhappy': random.uniform(-1.0, -0.7)
                }

                words.append({
                    "text": full_term,
                    "sudden": sudden,
                    "topic": happiness,
                    "frequency": frequency,
                    "happiness": happiness,
                    "happiness_score": happiness_scores[happiness]
                })

            period_data["words"][happiness] = words

        data.append(period_data)

    return data


def save_dataset(data, filename):
    """Save dataset to JSON file"""
    print(f"Saving {filename}...")
    with open(f"data/{filename}", 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Print file size
    import os
    size_mb = os.path.getsize(f"data/{filename}") / (1024 * 1024)
    print(f"  [OK] Saved {filename} ({size_mb:.2f} MB)")


def main():
    """Generate all three datasets"""
    print("=" * 60)
    print("WordStream Dataset Generator")
    print("Generating 3 large datasets (2000-2025)")
    print("=" * 60)
    print()

    # Dataset 1: Tech Evolution with Emotions
    tech_data = generate_tech_evolution_dataset()
    save_dataset(tech_data, "TechEvolution2000-2025.json")
    print()

    # Dataset 2: Social Media with Sentiment
    social_data = generate_social_media_dataset()
    save_dataset(social_data, "SocialMediaSentiment2000-2025.json")
    print()

    # Dataset 3: Global Events with Happiness
    events_data = generate_global_events_dataset()
    save_dataset(events_data, "GlobalEvents2000-2025.json")
    print()

    print("=" * 60)
    print("[SUCCESS] All datasets generated successfully!")
    print("=" * 60)
    print()
    print("Datasets created:")
    print("  1. TechEvolution2000-2025.json      - Technology trends with emotions")
    print("  2. SocialMediaSentiment2000-2025.json - Social media with sentiment")
    print("  3. GlobalEvents2000-2025.json       - World events with happiness levels")
    print()
    print("Each dataset covers 100+ quarterly periods from 2000 to 2025")
    print("You can now load these datasets in the WordStream visualization!")


if __name__ == "__main__":
    main()
