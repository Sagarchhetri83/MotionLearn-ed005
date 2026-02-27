/*
 * MotionLearn AI-Based Hand Gesture Learning Game
 * Uses MediaPipe Hands for real-time hand tracking
 * Blue visualization for hand landmarks
 * 
 * Morpheus Math Motion Module - 5 Levels
 */

// Import Motion Math Game
import { MotionMathGame } from '../src/games/modules/MotionMathGame.js';

// Game State
let currentLevel = 1;
let currentScore = 0;
let completedLevels = new Set();
let isCameraOn = false;
let selectedSubject = '';
let motionMathGame = null;
let lastFrameTime = 0;

// MediaPipe State
let hands = null;
let camera = null;
let canvasCtx = null;
let handLandmarks = null;

// DOM Elements
const cameraFeed = document.getElementById('camera-feed');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const overlayCanvas = document.getElementById('overlay-canvas');
const scoreValue = document.getElementById('score-value');
const levelValue = document.getElementById('level-value');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const historyContent = document.getElementById('history-content');
const tipContent = document.getElementById('tip-content');
const instructionText = document.getElementById('instruction-text');
const levelsGrid = document.getElementById('levels-grid');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const toggleCameraBtn = document.getElementById('toggle-camera-btn');
const endGameBtn = document.getElementById('end-game-btn');

// Hand connections for drawing
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],           // Index
  [0, 9], [9, 10], [10, 11], [11, 12],      // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],    // Ring
  [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
  [5, 9], [9, 13], [13, 17]                 // Palm
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  try {
    selectedSubject = localStorage.getItem('selectedModule') || 'maths';
  } catch (_) {
    selectedSubject = 'maths';
  }

  // Set up canvas
  overlayCanvas.width = 1280;
  overlayCanvas.height = 720;
  canvasCtx = overlayCanvas.getContext('2d');

  updateInstruction();
  generateLevelButtons();
  updateScore(0);
  updateLevel(1);
  updateProgress();
});

// Generate Level Buttons (5 Levels Only)
function generateLevelButtons() {
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = i;
    btn.dataset.level = i;
    
    if (i === 1) btn.classList.add('active');
    
    btn.addEventListener('click', () => selectLevel(i));
    levelsGrid.appendChild(btn);
  }
}

// Update Instructions
function updateInstruction() {
  const instructions = {
    'english': 'Use hand gestures to catch and learn alphabets',
    'maths': 'Choose the correct answer - Motion Math!',
    'technology': 'Learn tech concepts with hand interactions',
    'science': 'Explore science with motion-based learning'
  };
  
  instructionText.textContent = instructions[selectedSubject] || 'Choose the correct answer';
}

// Initialize Motion Math Game
function initializeMotionMathGame() {
  if (!canvasCtx) return;
  
  const gameConfig = {
    onScoreUpdate: (stats) => {
      updateScore(stats.score);
    },
    onProgressUpdate: (progress) => {
      updateProgressBar(progress.levelProgress);
    },
    onLevelChange: (level) => {
      updateLevel(level);
    },
    onHistoryUpdate: (item) => {
      const symbol = item.correct ? '✔' : '✖';
      addHistoryItem(`${item.question} = ${item.answer} ${symbol}`);
    },
    onLevelComplete: (level) => {
      completeLevel(level);
      updateTip(`🎉 Level ${level} Complete!`);
    },
    onGameComplete: (stats) => {
      updateTip(`🏆 100% Complete! Score: ${stats.score}`);
    }
  };
  
  motionMathGame = new MotionMathGame(canvasCtx, gameConfig);
  motionMathGame.init();
}

// MediaPipe Setup
function initializeMediaPipe() {
  canvasCtx = overlayCanvas.getContext('2d');
  
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onHandsResults);
}

// MediaPipe Results Handler
function onHandsResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  // Don't draw camera feed if game is running - let game handle rendering
  if (!motionMathGame || !motionMathGame.isRunning) {
    canvasCtx.drawImage(results.image, 0, 0, overlayCanvas.width, overlayCanvas.height);
  }
  
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (const landmarks of results.multiHandLandmarks) {
      handLandmarks = landmarks;
      
      // Pass landmarks to game
      if (motionMathGame && motionMathGame.isRunning) {
        motionMathGame.updateHands(landmarks);
      }
      
      // Draw hand landmarks only if game is not running
      if (!motionMathGame || !motionMathGame.isRunning) {
        // Draw connections (blue)
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: '#00BFFF',
          lineWidth: 4
        });
        
        // Draw landmarks (blue)
        drawLandmarks(canvasCtx, landmarks, {
          color: '#1E90FF',
          fillColor: '#87CEEB',
          lineWidth: 2,
          radius: 5
        });
      }
    }
  } else {
    handLandmarks = null;
  }
  
  canvasCtx.restore();
}

// Drawing Functions
function drawConnectors(ctx, landmarks, connections, style) {
  ctx.strokeStyle = style.color || '#00BFFF';
  ctx.lineWidth = style.lineWidth || 4;
  
  for (const connection of connections) {
    const start = landmarks[connection[0]];
    const end = landmarks[connection[1]];
    
    ctx.beginPath();
    ctx.moveTo(start.x * overlayCanvas.width, start.y * overlayCanvas.height);
    ctx.lineTo(end.x * overlayCanvas.width, end.y * overlayCanvas.height);
    ctx.stroke();
  }
}

function drawLandmarks(ctx, landmarks, style) {
  for (const landmark of landmarks) {
    const x = landmark.x * overlayCanvas.width;
    const y = landmark.y * overlayCanvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, style.radius || 5, 0, 2 * Math.PI);
    ctx.fillStyle = style.fillColor || '#87CEEB';
    ctx.fill();
    ctx.strokeStyle = style.color || '#1E90FF';
    ctx.lineWidth = style.lineWidth || 2;
    ctx.stroke();
  }
}

// Camera Functions
async function startCamera() {
  try {
    if (!hands) {
      initializeMediaPipe();
      addHistoryItem('Initializing AI...');
    }
    
    // Set up canvas context
    if (!canvasCtx) {
      overlayCanvas.width = 1280;
      overlayCanvas.height = 720;
      canvasCtx = overlayCanvas.getContext('2d');
    }
    
    cameraPlaceholder.classList.add('hidden');
    isCameraOn = true;
    
    camera = new Camera(cameraFeed, {
      onFrame: async () => {
        await hands.send({ image: cameraFeed });
      },
      width: 1280,
      height: 720
    });
    
    overlayCanvas.width = 1280;
    overlayCanvas.height = 720;
    
    await camera.start();
    
    console.log('Camera and MediaPipe started');
    addHistoryItem('Camera ON ✓');
    addHistoryItem('AI tracking ON');
    updateTip('Show your hands!');
  } catch (error) {
    console.error('Camera error:', error);
    alert('Unable to access camera. Please grant camera permissions.');
    cameraPlaceholder.classList.remove('hidden');
    isCameraOn = false;
  }
}

function stopCamera() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }
  
  cameraPlaceholder.classList.remove('hidden');
  isCameraOn = false;
  handLandmarks = null;
  
  addHistoryItem('Camera OFF');
}

function toggleCamera() {
  if (isCameraOn) {
    stopCamera();
    toggleCameraBtn.textContent = 'Start Camera';
  } else {
    startCamera();
    toggleCameraBtn.textContent = 'Stop Camera';
  }
}

// Game Functions
function startGame() {
  if (!isCameraOn) {
    startCamera();
    toggleCameraBtn.textContent = 'Stop Camera';
  }
  
  // Initialize game if not already
  if (!motionMathGame) {
    initializeMotionMathGame();
  }
  
  // Start the math game
  if (motionMathGame) {
    motionMathGame.start();
    addHistoryItem('🎮 Motion Math Started!');
    updateTip('Hover over answers for 2s');
  } else {
    addHistoryItem('Game started!');
    updateTip('Use hands to play');
  }
}

function restartGame() {
  currentScore = 0;
  currentLevel = 1;
  completedLevels.clear();
  
  updateScore(0);
  updateLevel(1);
  updateProgressBar(0);
  clearHistory();
  updateTip('Try your best!');
  
  document.querySelectorAll('.level-btn').forEach((btn, index) => {
    btn.classList.remove('active', 'completed');
    if (index === 0) btn.classList.add('active');
  });
  
  // Reset math game
  if (motionMathGame) {
    motionMathGame.reset();
  }
  
  addHistoryItem('Game restarted');
}

function selectLevel(level) {
  // In math game, levels unlock progressively
  if (motionMathGame) {
    const success = motionMathGame.loadLevel(level);
    if (success) {
      currentLevel = level;
      updateLevel(level);
      
      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.level) === level) {
          btn.classList.add('active');
        }
      });
      
      addHistoryItem(`Level ${level} loaded`);
    } else {
      addHistoryItem(`Level ${level} locked!`);
      updateTip('Complete previous levels first');
    }
  } else {
    // Fallback for non-game mode
    if (level <= currentLevel || completedLevels.has(level - 1)) {
      currentLevel = level;
      updateLevel(level);
      
      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.level) === level) {
          btn.classList.add('active');
        }
      });
      
      addHistoryItem(`Level ${level} selected`);
    }
  }
}

function completeLevel(level) {
  completedLevels.add(level);
  
  const levelBtn = document.querySelector(`.level-btn[data-level="${level}"]`);
  if (levelBtn) {
    levelBtn.classList.remove('active');
    levelBtn.classList.add('completed');
  }
  
  if (level < 10) {
    currentLevel = level + 1;
    updateLevel(currentLevel);
    
    const nextBtn = document.querySelector(`.level-btn[data-level="${currentLevel}"]`);
    if (nextBtn) nextBtn.classList.add('active');
  }
  
  updateProgress();
  addHistoryItem(`Level ${level} done! ✓`);
}

// Gesture Helper Functions
function getFingerTipPosition(landmarks, fingerIndex) {
  if (!landmarks) return null;
  
  const tipIndices = [4, 8, 12, 16, 20];
  const tip = landmarks[tipIndices[fingerIndex]];
  
  return {
    x: tip.x * overlayCanvas.width,
    y: tip.y * overlayCanvas.height,
    z: tip.z
  };
}

function isPinching(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const thumb = landmarks[4];
  const index = landmarks[8];
  
  const distance = Math.sqrt(
    Math.pow((thumb.x - index.x) * overlayCanvas.width, 2) +
    Math.pow((thumb.y - index.y) * overlayCanvas.height, 2)
  );
  
  return distance < 30;
}

function isNearFinger(x, y, landmarks, fingerIndex = 1) {
  if (!landmarks) return false;
  
  const fingerTip = getFingerTipPosition(landmarks, fingerIndex);
  if (!fingerTip) return false;
  
  const distance = Math.sqrt(
    Math.pow(x - fingerTip.x, 2) +
    Math.pow(y - fingerTip.y, 2)
  );
  
  return distance < 50;
}

// UI Update Functions
function updateScore(points) {
  currentScore += points;
  scoreValue.textContent = `Score: ${currentScore}`;
}

function updateLevel(level) {
  currentLevel = level;
  levelValue.textContent = `Level: ${level}`;
}

function updateProgress() {
  updateProgressBar((completedLevels.size / 5) * 100);
}

function updateProgressBar(percentage) {
  progressFill.style.width = `${percentage}%`;
  
  const completed = Math.round(percentage / 20); // 5 levels = 100%
  progressText.textContent = `${completed}/5 Complete`;
}

function addHistoryItem(text) {
  const item = document.createElement('div');
  item.textContent = text;
  item.style.padding = '5px';
  item.style.borderBottom = '1px solid #ddd';
  historyContent.appendChild(item);
  
  historyContent.scrollTop = historyContent.scrollHeight;
  
  while (historyContent.children.length > 5) {
    historyContent.removeChild(historyContent.firstChild);
  }
}

function clearHistory() {
  historyContent.innerHTML = '';
}

function updateTip(text) {
  tipContent.textContent = text;
}

function endGame() {
  if (motionMathGame) {
    motionMathGame.stop();
  }
  stopCamera();
  
  if (confirm(`Game Ended!\n\nScore: ${currentScore}\nCompleted: ${completedLevels.size}/5\n\nReturn to Dashboard?`)) {
    window.location.href = 'dashboard.html';
  }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
toggleCameraBtn.addEventListener('click', toggleCamera);
endGameBtn.addEventListener('click', endGame);

window.addEventListener('beforeunload', () => {
  stopCamera();
});

// Demo Mode
let demoMode = false;
document.addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') {
    demoMode = !demoMode;
    addHistoryItem(`Demo ${demoMode ? 'ON' : 'OFF'}`);
  }
  
  if ((e.key === 'c' || e.key === 'C') && demoMode) {
    updateScore(10);
    completeLevel(currentLevel);
  }
  
  if ((e.key === 'p' || e.key === 'P') && demoMode) {
    updateScore(5);
    addHistoryItem('Points +5');
  }
  
  if ((e.key === 'h' || e.key === 'H') && handLandmarks) {
    const pinch = isPinching(handLandmarks);
    addHistoryItem(pinch ? '👌 Pinch!' : '✋ Hand OK');
  }
});

// Game Loop
function gameLoop(timestamp) {
  // Calculate delta time
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  if (motionMathGame && motionMathGame.isRunning) {
    // Let the game handle all rendering
    motionMathGame.update(deltaTime);
    motionMathGame.render();
  } else if (isCameraOn && handLandmarks && canvasCtx) {
    // Demo mode - show pinch detection
    if (isPinching(handLandmarks)) {
      const indexTip = getFingerTipPosition(handLandmarks, 1);
      
      if (indexTip) {
        canvasCtx.beginPath();
        canvasCtx.arc(indexTip.x, indexTip.y, 20, 0, 2 * Math.PI);
        canvasCtx.strokeStyle = '#00FF00';
        canvasCtx.lineWidth = 3;
        canvasCtx.stroke();
      }
    }
  }
  
  requestAnimationFrame(gameLoop);
}

// Start game loop
requestAnimationFrame(gameLoop);
