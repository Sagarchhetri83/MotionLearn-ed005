# Motion Math Module - Morpheus Edition

## Overview
The Motion Math Module is a complete gesture-based mathematics learning game for MotionLearn. It features 5 progressive levels with different puzzle types, all controlled by hand gestures using MediaPipe Hands.

## Features

### 🎮 5 Unique Levels
1. **Level 1 - Basic Addition**: Single digit addition (e.g., 3 + 2)
2. **Level 2 - Subtraction Challenge**: Single & double digit subtraction (e.g., 12 – 5)
3. **Level 3 - Multiplication Sprint**: Timed multiplication (e.g., 4 × 3) with 5-second timer
4. **Level 4 - Missing Number Puzzle**: Find the missing number (e.g., 5 + __ = 9)
5. **Level 5 - Logic Pattern Puzzle**: Complete number patterns (e.g., 2, 4, 6, __)

### ✋ Gesture Control
- **Index Finger Cursor**: Your index finger tip controls the on-screen cursor
- **Hover Selection**: Hover over an answer bubble for 2 seconds to select it
- **Visual Feedback**: 
  - Progress ring shows hover time
  - Bubbles scale up when hovered
  - Green checkmark for correct answers
  - Red shake animation for wrong answers

### 📊 Progress Tracking
- **5 Questions Per Level**: Each level contains exactly 5 questions
- **Progressive Unlocking**: Complete a level to unlock the next
- **Progress Bar**: Visual feedback showing completion percentage
- **Overall Progress**: Tracks completion across all 5 levels (25 questions total)

### 🏆 Scoring System
- **+10 XP per Correct Answer**
- **0 XP for Wrong Answers**
- **Combo System**: Build streaks for multiple correct answers
- **Accuracy Tracking**: Percentage of correct vs wrong answers
- **Max Combo**: Tracks your best streak

### 🎯 Game Flow
1. Click "Start" to begin
2. Camera activates with MediaPipe hand tracking
3. Question appears with 3 answer bubbles
4. Hover index finger over correct answer for 2 seconds
5. Get instant feedback (success/error animation)
6. 5 questions per level
7. Level completion animation when done
8. Game completion celebration after Level 5

## Architecture

### Core Classes

#### `MotionMathGame`
Main game controller that manages the entire game loop.

**Key Methods:**
- `init()` - Initialize game to Level 1
- `start()` - Start game and question generation
- `pause()` / `resume()` - Pause/resume gameplay
- `stop()` - Stop game completely
- `reset()` - Reset to Level 1, clear all progress
- `loadLevel(level)` - Load a specific level
- `update(deltaTime)` - Update game state every frame
- `render()` - Render game graphics to canvas
- `updateHands(landmarks)` - Receive MediaPipe hand data

**Callbacks:**
- `onScoreUpdate(stats)` - Fired when score changes
- `onProgressUpdate(progress)` - Fired when progress updates
- `onLevelChange(level)` - Fired when level changes
- `onHistoryUpdate(item)` - Fired when question is answered
- `onLevelComplete(level)` - Fired when level is completed
- `onGameComplete(stats)` - Fired when all 5 levels done

#### `StemQuestionEngine`
Generates math questions for each level type.

**Key Methods:**
- `generateAddition()` - Level 1 questions
- `generateSubtraction()` - Level 2 questions
- `generateMultiplication()` - Level 3 questions
- `generateMissingNumber()` - Level 4 questions
- `generatePattern()` - Level 5 questions
- `generateQuestionForLevel(level)` - Auto-select based on level
- `getHistory(limit)` - Get recent questions

**Question Object:**
```javascript
{
  question: "5 + 3",
  correctAnswer: 8,
  options: [8, 7, 10], // Shuffled, includes correct answer
  type: "addition",
  level: 1,
  timeLimit: 5000 // Optional, for Level 3
}
```

#### `ProgressManager`
Tracks level completion and progress.

**Key Methods:**
- `getLevelProgress(level)` - Get % complete for a level (0-100)
- `getOverallProgress()` - Get % complete for all levels
- `completeQuestion(level)` - Mark question as complete
- `completeLevel(level)` - Mark level as complete, unlock next
- `isLevelUnlocked(level)` - Check if level is unlocked
- `isLevelCompleted(level)` - Check if level is 100% complete
- `getQuestionsRemaining(level)` - Questions left in level
- `reset()` - Reset all progress

#### `ScoreManager`
Tracks XP, accuracy, and combo.

**Key Methods:**
- `addCorrect()` - Add points for correct answer
- `addWrong()` - Handle wrong answer (resets combo)
- `getScore()` - Current XP score
- `getAccuracy()` - Accuracy percentage
- `getCombo()` - Current combo count
- `getMaxCombo()` - Best combo achieved
- `getStats()` - Get all stats as object
- `reset()` - Reset all scores

## Integration

### In HTML
```html
<!-- Make sure script is type="module" -->
<script type="module" src="learning-game.js"></script>
```

### In JavaScript
```javascript
import { MotionMathGame } from '../src/games/modules/MotionMathGame.js';

// Initialize with canvas context and callbacks
const motionMathGame = new MotionMathGame(canvasCtx, {
  onScoreUpdate: (stats) => {
    console.log('Score:', stats.score);
  },
  onProgressUpdate: (progress) => {
    console.log('Progress:', progress.levelProgress + '%');
  },
  onLevelComplete: (level) => {
    console.log('Level', level, 'complete!');
  }
});

// Initialize and start
motionMathGame.init();
motionMathGame.start();

// In MediaPipe results handler
function onHandsResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    motionMathGame.updateHands(results.multiHandLandmarks[0]);
  }
}

// In game loop
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  motionMathGame.update(deltaTime);
  motionMathGame.render();
  
  requestAnimationFrame(gameLoop);
}
```

## File Structure

```
Frontend/
├── src/
│   └── games/
│       ├── modules/
│       │   └── MotionMathGame.js      # Main game class
│       └── utils/
│           ├── StemQuestionEngine.js  # Question generator
│           ├── ProgressManager.js     # Progress tracking
│           └── ScoreManager.js        # Score & stats
└── public/
    ├── learning-game.html             # UI structure
    ├── learning-game.css              # Styling
    └── learning-game.js               # Integration layer
```

## UI Elements

### Left Sidebar
- **Score Box**: Displays current XP
- **History Box**: Shows last 5 answered questions
- **Tip Box**: Helpful hints and feedback
- **Controls**: Start/Restart buttons

### Center Area
- **Camera Feed**: Shows live video (hidden when game running)
- **Game Canvas**: Renders questions, answers, animations
- **Hand Cursor**: Visual indicator of finger position

### Right Sidebar
- **Level Indicator**: Shows current level (1-5)
- **Progress Bar**: Shows level completion (0-100%)
- **Level Buttons**: Click to select levels (1-5 only)
- **Toggle Camera**: Start/stop camera

## Animations

### Answer Feedback
- **Correct**: Green checkmark with scale-up animation
- **Wrong**: Red X with shake animation
- **Selection**: Progress ring fills around bubble during hover

### Level Events
- **Level Complete**: Fullscreen overlay with "Level X Complete! 100%"
- **Game Complete**: Celebration overlay with final stats

### Hover Effects
- Answer bubbles scale up (1.0 → 1.2) during hover
- Progress ring draws around bubble (0° → 360°)
- Selected bubble turns green (correct) or red (wrong)

## Configuration

### Timing
- **Hover Duration**: 2000ms (2 seconds to select)
- **Level 3 Timer**: 5000ms (5 seconds per question)
- **Animation Duration**: 1000ms (success/error feedback)
- **Level Complete Duration**: 3000ms
- **Game Complete Duration**: 5000ms

### Scoring
- **Points Per Correct**: 10 XP
- **Points Per Wrong**: 0 XP
- **Combo Multiplier**: Future feature

### Visual
- **Bubble Radius**: 60px
- **Bubble Spacing**: 200px
- **Cursor Radius**: 15px
- **Canvas Size**: 1280x720

## Best Practices

1. **Always check if game is initialized** before calling methods
2. **Pass deltaTime to update()** for smooth animations
3. **Call render() after update()** in game loop
4. **Clear canvas before game renders** (game handles its own rendering)
5. **Don't draw hand landmarks** when game is running (game shows cursor)
6. **Handle callbacks** to update UI (score, progress, history)

## Demo Mode

Press these keys for testing:
- **D**: Toggle demo mode
- **C**: Complete current level
- **P**: Add 5 points
- **H**: Test hand detection

## ED005 Hackathon Alignment

✅ **Gamified Learning**: Gesture-based interaction makes math fun  
✅ **Progressive Difficulty**: 5 levels from simple to complex  
✅ **Puzzle-Based**: Different puzzle types per level  
✅ **Visual Feedback**: Animations and progress tracking  
✅ **Rewards System**: XP, combos, achievements  
✅ **Motion Interaction**: Uses MediaPipe for hand tracking  
✅ **Structured**: Modular, clean, well-documented code  

## Future Enhancements

- Sound effects for feedback
- Confetti animation on 100% completion
- Combo multiplier (2x, 3x for streaks)
- Difficulty adjustment within levels
- Achievements system
- Leaderboard integration
- 1v1 Challenge mode with timers
- More question types (division, fractions, word problems)

---

**Built for MotionLearn - ED005 Hackathon**  
**Motion-Based STEM Learning Platform**
