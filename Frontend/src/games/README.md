# MotionLearn Game Modules

## 📁 Folder Structure

```
Frontend/src/games/
├── index.js                    # Main export file
├── BaseGame.js                 # Abstract base class for all games
├── GameManager.js              # Manages game loading and state
├── modules/                    # Specific game implementations
│   ├── AlphabetCatchGame.js   # Catch falling letters (English/Technology)
│   └── MathChallengeGame.js   # Solve math problems (Mathematics)
└── utils/                      # Shared utilities
    └── GestureDetector.js     # Hand gesture detection utilities
```

## 🎮 Available Games

### 1. **AlphabetCatchGame** (English/Technology)
Catch falling letters using hand gestures. Players need to catch the correct letters in alphabetical order.

**Features:**
- Falling letters system
- Target letter indicator
- Hand cursor visualization
- Score system
- Progressive difficulty

**Usage:**
```javascript
import { AlphabetCatchGame } from './games/modules/AlphabetCatchGame.js';

const game = new AlphabetCatchGame(canvasContext, {
  width: 1280,
  height: 720,
  onCorrect: (letter, score) => console.log(`Caught ${letter}!`),
  onWrong: (letter) => console.log(`Wrong letter!`),
  onLevelComplete: (level, score) => console.log(`Level ${level} complete!`)
});

game.start();
game.updateHands(landmarks); // Update with MediaPipe landmarks
```

### 2. **MathChallengeGame** (Mathematics)
Solve math problems by selecting correct answers with hand gestures.

**Features:**
- Random math problems (+, -, ×)
- Multiple choice answers
- Time limit
- Progressive difficulty

## 🛠️ Core Classes

### BaseGame
Abstract base class that all games extend. Provides:
- Basic game loop (update/render)
- Score management
- Level progression
- Hand landmark handling
- Pause/resume functionality

### GameManager
Manages game lifecycle:
- Load and switch games
- Game loop management
- State tracking
- Hand landmark distribution

**Usage:**
```javascript
import { GameManager } from './games/GameManager.js';

const manager = new GameManager();
manager.registerGame('alphabet', AlphabetCatchGame);
manager.registerGame('math', MathChallengeGame);

const game = manager.loadGame('alphabet', canvasContext, config);
manager.updateHands(landmarks); // Pass MediaPipe landmarks
```

### GestureDetector
Utility class for detecting hand gestures:
- `isPinching()` - Thumb + index pinch
- `isPointing()` - Index finger pointing
- `isOpenPalm()` - All fingers extended
- `isClosedFist()` - All fingers closed
- `isThumbsUp()` - Thumbs up gesture
- `isPeaceSign()` - Peace sign (V)
- `detectSwipe()` - Swipe direction detection

## 🔌 Integration with learning-game.html

To integrate these modules into your existing game:

1. **Import the game system:**
```javascript
import { initializeGameSystem, getGameForSubject } from './src/games/index.js';
```

2. **Initialize:**
```javascript
const gameManager = initializeGameSystem(canvasCtx);
```

3. **Load game based on selected subject:**
```javascript
const selectedSubject = localStorage.getItem('selectedModule') || 'english';
const gameName = getGameForSubject(selectedSubject);
const game = gameManager.loadGame(gameName, canvasCtx, {
  onCorrect: (data) => {
    updateScore(10);
    addHistoryItem('Correct!');
  },
  onWrong: () => {
    addHistoryItem('Try again');
  }
});
```

4. **Update hands in MediaPipe callback:**
```javascript
function onHandsResults(results) {
  // ... existing drawing code ...
  
  // Update game with hand data
  gameManager.updateHands(results.multiHandLandmarks[0]);
}
```

## 🎯 Adding New Games

To create a new game module:

1. Create new file in `modules/`
2. Extend `BaseGame` class
3. Implement required methods:
   - `init()` - Initialize game
   - `update(deltaTime)` - Update game state
   - `render()` - Draw game
   - `updateHands(landmarks)` - Handle hand input

Example:
```javascript
import { BaseGame } from '../BaseGame.js';

export class MyNewGame extends BaseGame {
  init() {
    // Setup game
  }
  
  update(deltaTime) {
    // Update logic
  }
  
  render() {
    // Draw game
  }
  
  updateHands(landmarks) {
    this.handLandmarks = landmarks;
  }
}
```

4. Register in `index.js` and `GameManager`

## 📝 Configuration Options

All games accept these config options:
- `width` - Canvas width (default: 1280)
- `height` - Canvas height (default: 720)
- `difficulty` - Initial difficulty (default: 1)
- `onCorrect` - Callback for correct actions
- `onWrong` - Callback for wrong actions
- `onLevelComplete` - Callback for level completion

## 🚀 Future Game Ideas

- **ScienceLabGame** - Experiment simulations with gestures
- **PhysicsGame** - Interactive physics demonstrations
- **TypingGame** - Gesture-based typing practice
- **MemoryGame** - Match pairs using hand selection
- **ShapeRecognitionGame** - Identify and catch shapes
