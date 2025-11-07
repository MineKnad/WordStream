# WordStream Enhancement Project - Implementation Plan

## Executive Summary
Build an enhanced WordStream visualization system with **sophisticated sentiment analysis** and **user document upload capability** as primary features. The original proposal was too basic; feedback emphasizes depth over breadth and creativity in sentiment representation.

---

## Phase 1: Foundation & Sentiment Analysis (Critical Focus)

### 1.1 Advanced Sentiment Analysis System
**Why this matters:** The red/blue sentiment approach was criticized as too basic and confusing. We need a more nuanced, creative approach.

**Options to evaluate:**
- [ ] **Emotion Detection Model** (Hugging Face transformers)
  - Map text to 6+ emotion dimensions (joy, fear, anger, sadness, surprise, disgust)
  - More expressive than binary good/bad
  - Can visualize as multi-dimensional color space or emotion intensity

- [ ] **Sentiment Score + Context**
  - Use a more sophisticated model (e.g., RoBERTa, BERT fine-tuned on domain data)
  - Generate per-word sentiment, not just per-document
  - Track sentiment trajectory for individual words (e.g., how "war" sentiment evolved)

- [ ] **Language Model Approach** (as suggested in feedback)
  - Use LLMs to extract sentiment/emotion nuance directly
  - Could generate semantic labels ("hopeful," "contentious," "celebratory")
  - More interpretable than raw scores

**Deliverable:** Python preprocessing pipeline that:
- Processes text with selected model
- Outputs per-year, per-word sentiment metadata
- Generates individual word sentiment trajectories
- Creates JSON with rich sentiment data

---

## Phase 2: User Document Upload System

### 2.1 Client-Side Upload & Processing
**Requirement:** Allow users to upload documents (CSV, TXT, JSON) to generate WordStreams on the fly.

- [ ] Build file upload UI component
- [ ] Validate file format and size constraints
- [ ] Parse document structure (extract text, dates, categories)
- [ ] Call preprocessing backend or run in-browser processing

### 2.2 Backend Processing
- [ ] Create Python API endpoint for document processing
- [ ] Implement text cleaning, tokenization, normalization
- [ ] Apply sentiment analysis to user documents
- [ ] Return JSON compatible with WordStream renderer
- [ ] Handle error cases gracefully

**Deliverable:** Users can upload their own datasets and see WordStreams within seconds.

---

## Phase 3: Core Features (From Original Proposal)

### 3.1 Enhanced WordStream Visualization
- [ ] **Sentiment-Enhanced Rendering**
  - Instead of crude red/blue overlay, use:
    - Hue variations for emotion type (e.g., warm for joy, cool for sadness)
    - Opacity/saturation for sentiment strength
    - Animated transitions when sentiment changes

- [ ] **Individual Word Sentiment Panel**
  - Select a word in the stream → shows sentiment evolution chart
  - Line plot: year on x-axis, sentiment on y-axis
  - Highlights how perception of a topic changed over time

- [ ] **Year Slider + Autoplay**
  - Smooth animation with configurable speed
  - Responsive frame pacing
  - Play/pause controls

- [ ] **Most-Important Word Badge**
  - Per-year badge showing strongest relative increase
  - Clickable to jump to that year in slider
  - Could also show most sentiment-charged word per year

### 3.2 Dataset Management
- [ ] **Dataset Switcher** (initial datasets)
  - VIS publication metadata
  - Rotten Tomatoes reviews
  - Reddit data (or alternative if not available)
  - Curated datasets + user uploads

- [ ] **A/B Comparison View**
  - Side-by-side WordStreams for different time ranges
  - Synchronized interactions (hover effects, selections)
  - Clearly highlight differences in theme evolution

### 3.3 Quality of Life Features
- [ ] **Color-Blind Palette Support**
  - Test with multiple color-blindness types (protanopia, deuteranopia, tritanopia)
  - Preserve sentiment meaning across all palettes
  - Toggle in settings

- [ ] **PNG Export**
  - One-click export of current view state
  - Includes legend, timestamp, dataset info
  - Canvas API for high-quality rendering

---

## Phase 4: Polish & Performance

### 4.1 Performance Optimization
- [ ] Lazy-load datasets
- [ ] Optimize canvas rendering for smooth animation
- [ ] Test with large datasets (thousands of words, 10+ years)
- [ ] Measure frame rates and optimize bottlenecks

### 4.2 UI/UX Refinement
- [ ] Keep interface clean and uncluttered (feedback emphasis)
- [ ] Intuitive tooltips and labels
- [ ] Mobile responsiveness
- [ ] Clear affordances for interactive elements

### 4.3 Documentation
- [ ] Dataset format specification
- [ ] Upload file format guide
- [ ] Sentiment analysis methodology explanation
- [ ] Keyboard shortcuts and help overlay

---

## Technical Architecture

### Offline Pipeline (Python)
```
Input Data (CSV/JSON/text files)
  ↓
Text Preprocessing (cleaning, tokenization, normalization)
  ↓
Sentiment/Emotion Analysis (transformer model or LLM)
  ↓
Word Frequency & Importance Calculation
  ↓
Per-word sentiment trajectory extraction
  ↓
JSON Output (dataset format)
```

### Online (Browser)
```
File Upload
  ↓
Send to Python API or run in-browser processing
  ↓
Receive JSON dataset
  ↓
Render WordStream with sentiment tinting
  ↓
Enable interactions: slider, word selection, A/B mode, export
```

---

## Dataset Strategy

### Initial Datasets
- [ ] **VIS Publication Data** (provided/available)
- [ ] **Rotten Tomatoes** (Kaggle dataset, or alternative)
- [ ] **Reddit** or **News Archive** (or another engaging dataset)

### Find "Cool Dataset"
- [ ] Brainstorm candidates:
  - Movie reviews by decade (sentiment evolution of cinema)
  - Medical research abstracts (how treatment discussions change)
  - Social media crisis topics (real-time sentiment shifts)
  - Product reviews (how perception of tech evolved)
- [ ] Prioritize datasets with:
  - Clear temporal dimension
  - Meaningful sentiment variation
  - Interesting topical narrative

---

## Grading Alignment (40 pts)

| Criterion | Points | How We'll Achieve It |
|-----------|--------|----------------------|
| **Algorithm Quality** | 6 | Advanced sentiment analysis (emotion model or LLM) + sophisticated importance metrics |
| **Visual Result** | 6 | Rich sentiment visualization (not just red/blue) + word trajectory panels |
| **Feature Richness** | 8 | Dataset switcher + user upload + A/B mode + slider + export + color-blind palette |
| **Generalizability** | 6 | Upload system works with any dataset format + sentiment model generalizes across domains |
| **Performance** | 8 | Smooth animations, fast dataset switching, responsive to user input |
| **Creativity** | 6 | Emotion-based sentiment visualization + individual word sentiment evolution + user upload |
| **TOTAL** | 40 | ✓ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Sentiment model accuracy on domain data | Test on each dataset, consider fine-tuning if needed |
| Large dataset performance | Implement progressive rendering, data aggregation |
| Complex file upload handling | Start simple (CSV only), expand gradually |
| Color-blind palette doesn't preserve meaning | Use established color-blind-friendly palettes (colorbrewer2.org) |

---

## Success Criteria

✓ Users can upload documents and see WordStreams instantly
✓ Sentiment analysis is sophisticated and domain-appropriate (not just red/blue)
✓ Individual word sentiment trajectories are clear and insightful
✓ Dataset switcher and A/B comparison work smoothly
✓ Animation is smooth and responsive
✓ Color-blind palette preserves all meaning
✓ Interface is clean and intuitive
✓ Project runs fast on modest hardware

---

## Next Steps

1. **Evaluate sentiment models** - decide between emotion detection, advanced scoring, or LLM approach
2. **Set up preprocessing pipeline** - implement model selection and test on initial datasets
3. **Identify/acquire datasets** - find the "cool dataset" that gives the project narrative
4. **Build upload system** - start with basic file parsing, iterate
5. **Enhance visualization** - implement sentiment tinting and word trajectory panel
6. **Polish & test** - performance, accessibility, UX
