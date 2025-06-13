# LinguaQuiz Learning Algorithm Documentation

## Overview

LinguaQuiz implements a **level-based mastery system** rather than a traditional time-based spaced repetition algorithm. The system focuses on immediate mastery through repeated practice, tracking word knowledge in both translation directions.

## Core Algorithm Components

### 1. Level System

The algorithm uses 6 levels to track word mastery:

- **LEVEL_0**: New/unlearned words (initial state)
- **LEVEL_1**: Focus pool - actively learning words (max 20 words)
- **LEVEL_2**: Translation mastered in one direction
- **LEVEL_3**: Translation mastered in both directions
- **LEVEL_4**: Usage examples mastered in one direction
- **LEVEL_5**: Usage examples mastered in both directions (complete mastery)

### 2. Progression Rules

#### Advancement Criteria
- **3 consecutive correct answers** → advance to next level
- Tracked per session and direction
- No time component - purely performance-based

#### Degradation Criteria
- **3 mistakes in last 10 attempts** → degrade one level
- Prevents words from staying at higher levels if not truly mastered
- Ensures continuous reinforcement of difficult words

### 3. Word Selection Algorithm

The system intelligently selects which word to present next based on:

#### Queue-Based Word Selection

Every level (LEVEL_0 through LEVEL_5) maintains its own queue of words. The system uses these queues for deterministic word selection:

##### Queue Management Rules
- **Level transitions**: When a word moves to any level (advancement or degradation), it's added to the end of that level's queue
- **Incorrect answer**: Word moves to position P (default: 6) in the current level's queue
- **Correct answer**: Word moves to position P × T in the current level's queue, where:
  - P = base position parameter (default: 6)
  - T = number of consecutive correct answers at current level
  - Example: 1st correct → position 6, 2nd correct → position 12, 3rd correct → position 18

##### Direction-Based Queues
- **Normal direction (source → target)**:
  - Translation mode: LEVEL_1 → LEVEL_2
  - Usage examples mode: LEVEL_3 → LEVEL_4
  
- **Reverse direction (target → source)**:
  - Translation mode: LEVEL_2 → LEVEL_3
  - Usage examples mode: LEVEL_4 → LEVEL_5
  
The system automatically selects the appropriate queue based on the current learning mode and direction, falling back to the next available queue if the primary is empty.

##### Word Selection Process
1. Select appropriate queue based on direction and level
2. Take the first word from the queue
3. No randomization - purely deterministic queue order
4. No exclusion of recently asked words (queue position handles spacing)

### 4. Focus Pool Management

The system maintains a limited focus pool (LEVEL_1) to prevent cognitive overload:

- **Maximum 20 words** in LEVEL_1 at any time
- **Automatic replenishment** when words advance to LEVEL_2
- **Random selection** of new words from LEVEL_0

### 5. Direction Switching and Mode Progression

The algorithm supports bidirectional learning:

- **Manual toggle** available to user
- **Automatic switching** when LEVEL_2 becomes empty in reverse direction
- Ensures balanced practice in both translation directions

#### Learning Progression Path
1. **LEVEL_0 → LEVEL_1**: Word enters focus pool for active learning
2. **LEVEL_1 → LEVEL_2**: Translation mastered in normal direction (source → target)
3. **LEVEL_2 → LEVEL_3**: Translation mastered in reverse direction (target → source)
4. **LEVEL_3 → LEVEL_4**: Usage examples mastered in normal direction
5. **LEVEL_4 → LEVEL_5**: Usage examples mastered in reverse direction (complete mastery)

## Algorithm Flow

```
1. Start Quiz Session
   ↓
2. Check Focus Pool (LEVEL_1)
   - If < 20 words → Move words from front of LEVEL_0 queue to end of LEVEL_1 queue
   ↓
3. Select Next Word
   - Choose appropriate queue based on mode and direction:
     * Translation mode: Follow direction-based queue priority
     * Usage examples mode: LEVEL_4 or LEVEL_5 based on direction
   - Take first word from the queue
   ↓
4. User Answers
   ↓
5. Update Queue Position
   - Correct: Move word to position P × T (T = consecutive correct answers)
   - Incorrect: Move word to position P (default: 6)
   ↓
6. Check Progression Rules
   - If 3 consecutive correct → Move to end of next level's queue
   - If 3/10 recent incorrect → Move to end of previous level's queue
   ↓
7. Update Focus Pool if needed
   ↓
8. Repeat from step 3
```

## Advantages of This Approach

1. **Immediate Feedback Loop**: No waiting for scheduled reviews
2. **Adaptive Difficulty**: Automatically adjusts to user performance
3. **Focused Learning**: Limited active vocabulary prevents overwhelm
4. **Bidirectional Mastery**: Ensures true understanding in both directions
5. **Deterministic Spacing**: Queue-based system provides predictable spacing between repetitions
6. **Progressive Intervals**: Correct answers push words further back (6th, 12th, 18th position)
7. **Error Recovery**: Incorrect answers bring words back to early positions for reinforcement

## Differences from Traditional SRS

| Feature | LinguaQuiz | Traditional SRS (e.g., Anki) |
|---------|------------|------------------------------|
| Scheduling | Performance-based | Time-based intervals |
| Review Timing | Immediate | Scheduled (hours/days/months) |
| Focus | Mastery through repetition | Long-term retention |
| Word Selection | Level & error priority | Due date priority |
| Session Length | Unlimited | Fixed daily reviews |

## Future Enhancement Possibilities

To implement true spaced repetition, the system would need:

1. **Time-based scheduling**: Add `next_review_date` field
2. **Interval calculation**: Implement SM-2 or similar algorithm
3. **Ease factor**: Track individual word difficulty
4. **Review history**: Long-term performance tracking
5. **Forgetting curve modeling**: Optimize review timing

The current system provides excellent immediate learning outcomes while maintaining simplicity and user engagement through continuous practice.