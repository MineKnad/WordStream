#!/usr/bin/env python3
"""
Generate 3 large sample datasets for WordStream visualization
Each dataset covers 2000-2025 with RAW INPUT format (date + text)
The preprocessing API will analyze the text and create the visualization data
Target size: ~50MB each
"""

import json
import random
import datetime
from collections import defaultdict

# Seed for reproducibility
random.seed(42)

def generate_dates(start_year=2000, end_year=2025, docs_per_quarter=200):
    """Generate dates with multiple documents per quarter"""
    dates = []
    for year in range(start_year, end_year + 1):
        for quarter in range(1, 5):
            # Generate dates within this quarter
            quarter_start_month = (quarter - 1) * 3 + 1
            for _ in range(docs_per_quarter):
                month = quarter_start_month + random.randint(0, 2)
                day = random.randint(1, 28)  # Safe for all months
                dates.append(f"{year}-{month:02d}-{day:02d}")
    return dates


# ============ DATASET 1: Technology Evolution ============

TECH_TERMS = {
    # Early 2000s
    'early': [
        ("dial-up internet", "neutral"), ("MP3 players", "joy"), ("DVD technology", "joy"),
        ("Windows XP", "joy"), ("Napster shutdown", "sadness"), ("peer-to-peer sharing", "surprise"),
        ("flip phones", "neutral"), ("AOL Instant Messenger", "joy"), ("Palm Pilot", "neutral"),
        ("broadband adoption", "joy"), ("dot-com bubble burst", "fear"), ("Y2K fears", "fear"),
        ("USB flash drives", "joy"), ("WiFi networks", "surprise"), ("blogging platforms", "joy"),
        ("digital cameras", "joy"), ("Java vulnerabilities", "fear"), ("search engines", "neutral"),
        ("online auctions", "neutral"), ("Flash animations", "joy"), ("spam emails", "disgust"),
        ("instant messaging", "joy"), ("email viruses", "fear"), ("firewall security", "neutral"),
        ("antivirus software", "neutral")
    ],
    # Mid 2000s
    'mid': [
        ("social networking revolution", "joy"), ("YouTube videos", "joy"), ("first iPhone", "surprise"),
        ("Web 2.0", "joy"), ("AJAX technology", "neutral"), ("Firefox browser", "joy"),
        ("iPod revolution", "joy"), ("iTunes Music Store", "joy"), ("Wikipedia growth", "neutral"),
        ("Google Maps launch", "surprise"), ("Gmail invitation", "joy"), ("podcasting boom", "neutral"),
        ("RSS feeds", "neutral"), ("blog monetization", "neutral"), ("MySpace popularity", "joy"),
        ("Facebook expansion", "joy"), ("Twitter launch", "surprise"), ("iPhone announcement", "joy"),
        ("Android OS release", "neutral"), ("App Store opening", "joy"), ("cloud storage", "surprise"),
        ("Second Life hype", "neutral"), ("online gaming", "joy"), ("streaming video", "joy"),
        ("HD displays", "joy"), ("Blu-ray wins", "neutral")
    ],
    # Late 2000s - Early 2010s
    'transition': [
        ("tablet computers", "joy"), ("iPad launch", "surprise"), ("Instagram launch", "joy"),
        ("mobile apps explosion", "joy"), ("responsive web design", "neutral"), ("HTML5 adoption", "neutral"),
        ("Chrome browser dominance", "neutral"), ("cloud computing growth", "neutral"),
        ("SaaS platforms", "neutral"), ("GitHub popularity", "joy"), ("Stack Overflow community", "joy"),
        ("hackathon culture", "joy"), ("startup boom", "joy"), ("venture capital", "neutral"),
        ("Bitcoin emergence", "surprise"), ("cryptocurrency mining", "neutral"),
        ("blockchain hype", "surprise"), ("3D printing", "surprise"), ("maker movement", "joy"),
        ("Internet of Things", "neutral"), ("smart home devices", "neutral"), ("Fitbit trackers", "joy"),
        ("wearable tech", "neutral"), ("Snapchat stories", "joy")
    ],
    # Mid 2010s
    'modern': [
        ("machine learning breakthroughs", "joy"), ("deep learning advances", "surprise"),
        ("neural networks", "neutral"), ("AI assistants", "joy"), ("Alexa devices", "joy"),
        ("Google Home", "neutral"), ("Siri improvements", "neutral"), ("autonomous vehicles", "surprise"),
        ("Tesla Autopilot", "surprise"), ("Uber disruption", "neutral"), ("ride-sharing", "neutral"),
        ("Airbnb growth", "neutral"), ("gig economy", "neutral"), ("remote work", "joy"),
        ("Zoom meetings", "neutral"), ("4K streaming", "joy"), ("Netflix dominance", "neutral"),
        ("cord cutting", "neutral"), ("podcast boom", "joy"), ("influencer culture", "neutral"),
        ("TikTok rise", "surprise"), ("augmented reality", "surprise"), ("Pokémon GO", "joy"),
        ("VR headsets", "neutral"), ("Apple Watch", "joy"), ("AirPods", "joy")
    ],
    # Late 2010s - 2020s
    'recent': [
        ("5G networks", "joy"), ("edge computing", "neutral"), ("quantum computing", "surprise"),
        ("GPT models", "surprise"), ("large language models", "surprise"), ("ChatGPT launch", "surprise"),
        ("generative AI boom", "joy"), ("AI art", "surprise"), ("DALL-E images", "surprise"),
        ("Midjourney art", "joy"), ("Stable Diffusion", "neutral"), ("prompt engineering", "neutral"),
        ("AI ethics concerns", "fear"), ("AI regulation", "neutral"), ("transformer models", "neutral"),
        ("attention mechanisms", "neutral"), ("fine-tuning techniques", "neutral"),
        ("zero-shot learning", "neutral"), ("AGI debates", "fear"), ("AI safety", "fear"),
        ("deepfake concerns", "disgust"), ("synthetic media", "fear"), ("content moderation", "neutral"),
        ("Web3 hype", "neutral"), ("NFT bubble", "anger"), ("metaverse promises", "neutral"),
        ("crypto crash", "sadness"), ("DeFi risks", "fear"), ("digital wallets", "neutral")
    ]
}

def get_tech_terms_for_year(year):
    """Get relevant tech terms based on year"""
    if 2000 <= year <= 2004:
        return TECH_TERMS['early']
    elif 2005 <= year <= 2008:
        return TECH_TERMS['early'] + TECH_TERMS['mid']
    elif 2009 <= year <= 2012:
        return TECH_TERMS['mid'] + TECH_TERMS['transition']
    elif 2013 <= year <= 2016:
        return TECH_TERMS['transition'] + TECH_TERMS['modern']
    elif 2017 <= year <= 2020:
        return TECH_TERMS['modern'] + TECH_TERMS['recent']
    else:  # 2021-2025
        return TECH_TERMS['recent'] + TECH_TERMS['modern']

def generate_tech_sentence(term, emotion):
    """Generate a sentence about a tech topic with emotional tone"""
    positive_templates = [
        "The {} is absolutely amazing and transformative",
        "I'm thrilled about the recent advances in {}",
        "The {} has exceeded all expectations",
        "Everyone is excited about {}",
        "The innovation in {} is remarkable",
        "We're seeing incredible progress with {}",
        "{} is changing everything for the better",
        "The potential of {} is extraordinary"
    ]

    negative_templates = [
        "The {} situation is concerning and problematic",
        "I'm worried about the implications of {}",
        "The {} has caused significant issues",
        "There are serious problems with {}",
        "The {} is disappointing and frustrating",
        "We need to address the {} crisis immediately",
        "{} is creating more harm than good",
        "The failure of {} is evident"
    ]

    neutral_templates = [
        "The {} continues to develop steadily",
        "Analysis shows {} is progressing as expected",
        "Implementation of {} is ongoing",
        "The {} market is expanding",
        "Companies are adopting {}",
        "{} is becoming more prevalent",
        "Research into {} continues",
        "The {} sector shows consistent growth"
    ]

    surprise_templates = [
        "The unexpected breakthrough in {} is stunning",
        "Nobody predicted the {} revolution",
        "The {} announcement shocked the industry",
        "Surprising developments in {} emerged today",
        "The sudden impact of {} is remarkable",
        "{} appeared out of nowhere",
        "The {} phenomenon took everyone by surprise",
        "Unexpected turns in {} development"
    ]

    fear_templates = [
        "The {} poses serious security risks",
        "Growing concerns about {} safety",
        "The dangers of {} are becoming apparent",
        "Experts warn about {} vulnerabilities",
        "The {} threat is escalating",
        "Security flaws in {} discovered",
        "The {} risk cannot be ignored",
        "Alarming issues with {} emerging"
    ]

    if emotion == 'joy':
        template = random.choice(positive_templates)
    elif emotion in ['sadness', 'anger', 'disgust']:
        template = random.choice(negative_templates)
    elif emotion == 'surprise':
        template = random.choice(surprise_templates)
    elif emotion == 'fear':
        template = random.choice(fear_templates)
    else:  # neutral
        template = random.choice(neutral_templates)

    return template.format(term)

def generate_tech_evolution_dataset():
    """Generate technology evolution dataset with raw text"""
    print("Generating Tech Evolution dataset...")
    dates = generate_dates(2000, 2025, docs_per_quarter=250)
    data = []

    for date in dates:
        year = int(date.split('-')[0])
        available_terms = get_tech_terms_for_year(year)

        # Pick a random term and its associated emotion
        term, emotion = random.choice(available_terms)
        text = generate_tech_sentence(term, emotion)

        data.append({
            "date": date,
            "text": text
        })

    return data


# ============ DATASET 2: Social Media Sentiment ============

SOCIAL_TOPICS = [
    ("Facebook privacy changes", "negative"), ("Instagram new features", "positive"),
    ("Twitter controversies", "negative"), ("TikTok viral trends", "positive"),
    ("social media addiction", "negative"), ("influencer marketing", "neutral"),
    ("content creator economy", "positive"), ("platform algorithm changes", "negative"),
    ("online harassment", "negative"), ("community building", "positive"),
    ("fake news spread", "negative"), ("user engagement growth", "positive"),
    ("data breach incidents", "negative"), ("new messaging features", "positive"),
    ("account verification", "neutral"), ("sponsored content", "neutral"),
    ("cancel culture", "negative"), ("viral challenges", "positive"),
    ("mental health impacts", "negative"), ("creative expression", "positive"),
    ("misinformation campaigns", "negative"), ("brand partnerships", "neutral"),
    ("platform moderation", "neutral"), ("user privacy concerns", "negative"),
    ("live streaming features", "positive"), ("digital detox movement", "neutral"),
    ("screen time concerns", "negative"), ("online communities", "positive"),
    ("cyberbullying incidents", "negative"), ("content monetization", "positive"),
    ("algorithm manipulation", "negative"), ("social activism", "positive"),
    ("echo chambers", "negative"), ("global connectivity", "positive"),
    ("attention economy", "negative"), ("creative collaborations", "positive"),
    ("political polarization", "negative"), ("educational content", "positive"),
    ("surveillance concerns", "negative"), ("entertainment value", "positive"),
    ("toxic behavior", "negative"), ("positive movements", "positive")
]

def generate_social_sentence(topic, sentiment):
    """Generate a sentence about social media with sentiment"""
    if sentiment == "positive":
        templates = [
            "The {} brings wonderful opportunities for connection",
            "I absolutely love the {} and its impact",
            "The {} is creating amazing experiences",
            "People are thrilled about {}",
            "The {} enhances our digital lives beautifully",
            "{} is making a positive difference",
            "The benefits of {} are incredible",
            "We're seeing great results from {}"
        ]
    elif sentiment == "negative":
        templates = [
            "The {} is extremely problematic and harmful",
            "I'm deeply concerned about {}",
            "The {} creates serious issues for users",
            "The negative impact of {} is undeniable",
            "We must address the {} problem urgently",
            "{} is damaging our social fabric",
            "The dangers of {} are increasingly clear",
            "The {} situation is getting worse"
        ]
    else:  # neutral
        templates = [
            "The {} continues to evolve and change",
            "Analysis of {} shows mixed results",
            "Users are adapting to {}",
            "The {} landscape is shifting",
            "Platforms are implementing {}",
            "{} remains a topic of discussion",
            "Researchers study {} patterns",
            "The {} trend continues to develop"
        ]

    return random.choice(templates).format(topic)

def generate_social_media_dataset():
    """Generate social media dataset with raw text"""
    print("Generating Social Media Sentiment dataset...")
    dates = generate_dates(2000, 2025, docs_per_quarter=250)
    data = []

    for date in dates:
        topic, sentiment = random.choice(SOCIAL_TOPICS)
        text = generate_social_sentence(topic, sentiment)

        data.append({
            "date": date,
            "text": text
        })

    return data


# ============ DATASET 3: Global Events ============

GLOBAL_EVENTS = [
    ("climate change action", "positive"), ("natural disasters", "negative"),
    ("medical breakthroughs", "positive"), ("pandemic outbreaks", "negative"),
    ("peace agreements", "positive"), ("armed conflicts", "negative"),
    ("economic growth", "positive"), ("financial crises", "negative"),
    ("technological innovation", "positive"), ("cybersecurity threats", "negative"),
    ("humanitarian aid", "positive"), ("refugee crises", "negative"),
    ("democratic movements", "positive"), ("political unrest", "negative"),
    ("scientific discoveries", "positive"), ("environmental disasters", "negative"),
    ("cultural achievements", "positive"), ("human rights violations", "negative"),
    ("space exploration", "positive"), ("terrorist attacks", "negative"),
    ("poverty reduction", "positive"), ("economic inequality", "negative"),
    ("clean energy adoption", "positive"), ("pollution crises", "negative"),
    ("educational progress", "positive"), ("literacy challenges", "negative"),
    ("healthcare improvements", "positive"), ("disease outbreaks", "negative"),
    ("international cooperation", "positive"), ("diplomatic tensions", "negative"),
    ("wildlife conservation", "positive"), ("species extinction", "negative"),
    ("social justice victories", "positive"), ("discrimination incidents", "negative"),
    ("Olympic achievements", "positive"), ("doping scandals", "negative"),
    ("artistic masterpieces", "positive"), ("cultural destruction", "negative"),
    ("vaccine development", "positive"), ("health crises", "negative"),
    ("renewable energy", "positive"), ("fossil fuel dependence", "negative"),
    ("poverty alleviation", "positive"), ("famine situations", "negative"),
    ("peace movements", "positive"), ("military escalations", "negative"),
    ("educational access", "positive"), ("inequality gaps", "negative"),
    ("community resilience", "positive"), ("social breakdown", "negative")
]

def generate_global_sentence(event, sentiment):
    """Generate a sentence about global events"""
    if sentiment == "positive":
        templates = [
            "The recent {} fills us with hope and optimism",
            "We're witnessing remarkable progress in {}",
            "The {} represents a major victory for humanity",
            "People worldwide celebrate the {}",
            "The {} demonstrates our collective strength",
            "{} brings joy and inspiration globally",
            "The success of {} is heartwarming",
            "We're seeing wonderful developments in {}"
        ]
    else:  # negative
        templates = [
            "The tragic {} causes widespread suffering",
            "We're devastated by the {}",
            "The {} brings terrible consequences",
            "Communities struggle with the {} crisis",
            "The {} creates urgent humanitarian needs",
            "{} leads to devastating outcomes",
            "The impact of {} is heartbreaking",
            "We face severe challenges from {}"
        ]

    return random.choice(templates).format(event)

def generate_global_events_dataset():
    """Generate global events dataset with raw text"""
    print("Generating Global Events dataset...")
    dates = generate_dates(2000, 2025, docs_per_quarter=250)
    data = []

    for date in dates:
        event, sentiment = random.choice(GLOBAL_EVENTS)
        text = generate_global_sentence(event, sentiment)

        data.append({
            "date": date,
            "text": text
        })

    return data


def save_dataset(data, filename):
    """Save dataset to JSON file"""
    import os
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(script_dir, filename)

    print(f"Saving {filename}...")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Print file size
    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"  [OK] Saved {filename} ({size_mb:.2f} MB)")


def main():
    """Generate all three datasets"""
    print("=" * 60)
    print("WordStream RAW Dataset Generator")
    print("Generating 3 datasets (2000-2025) in RAW INPUT format")
    print("=" * 60)
    print()

    # Dataset 1: Tech Evolution
    tech_data = generate_tech_evolution_dataset()
    save_dataset(tech_data, "TechEvolution2000-2025.json")
    print(f"  Generated {len(tech_data)} documents")
    print()

    # Dataset 2: Social Media
    social_data = generate_social_media_dataset()
    save_dataset(social_data, "SocialMediaSentiment2000-2025.json")
    print(f"  Generated {len(social_data)} documents")
    print()

    # Dataset 3: Global Events
    events_data = generate_global_events_dataset()
    save_dataset(events_data, "GlobalEvents2000-2025.json")
    print(f"  Generated {len(events_data)} documents")
    print()

    print("=" * 60)
    print("[SUCCESS] All datasets generated successfully!")
    print("=" * 60)
    print()
    print("Datasets created (RAW INPUT format):")
    print("  1. TechEvolution2000-2025.json")
    print("  2. SocialMediaSentiment2000-2025.json")
    print("  3. GlobalEvents2000-2025.json")
    print()
    print("Each dataset contains documents with 'date' and 'text' fields")
    print("Upload these to the WordStream API for preprocessing!")


if __name__ == "__main__":
    main()
