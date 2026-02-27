// Core Game Module logic for EduCatch
// Displays webcam, detects hand with MediaPipe Tasks, draws landmarks,
// and moves a custom cursor to the user's index fingertip.

// Import types and factories from the MediaPipe Tasks Vision ESM bundle
// The <script type="module"> in index.html loads the library on the page,
// so these imports pull from the global module registry (CDN ESM).
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// Part 1: Initialization
const containerEl = document.getElementById("container");
const videoEl = document.getElementById("webcam");
const canvasEl = document.getElementById("output_canvas");
const canvasCtx = canvasEl.getContext("2d");
const uiContainerEl = document.getElementById("ui-container"); // Added for letter parenting
const tipBoxEl = document.getElementById("tipBox");
const loadingEl = document.getElementById("loading");
const scoreEl = document.getElementById("score-display");
const levelDisplayEl = document.getElementById("level-display"); // Re-added declaration
const gameOverScreen = document.getElementById("game-over-screen"); // Re-declared correctly
const finalScoreDisplay = document.getElementById("final-score-display"); // Re-declared correctly
const gameOverMessageEl = document.getElementById("game-over-message"); // Re-declared correctly
const returnToDashboardButton = document.getElementById("returnToDashboardButton"); // Re-declared correctly
const endGameButtonEl = document.getElementById("endGameButton"); // Re-declared correctly
const levelCompleteScreen = document.getElementById("level-complete-screen");
const levelCompleteScore = document.getElementById("level-complete-score");
const nextLevelPreview = document.getElementById("next-level-preview");
const continueToNextLevelBtn = document.getElementById("continueToNextLevel");
const endGameAfterLevelBtn = document.getElementById("endGameAfterLevel");
const levelsGrid = document.getElementById("levels-grid");
const progressFill = document.getElementById("progress-fill");
const completedLevelsSpan = document.getElementById("completed-levels");
const totalLevelsSpan = document.getElementById("total-levels");

let offsetX = 0;   // manual fine-tune horizontal (pixels)
let offsetY = 0;   // manual fine-tune vertical (pixels)

const HIT_FACTOR = 0.65;  // keep scaling
const HIT_PADDING = 25;   // extra px around the letter

let codingHoverState = new Map(); // Tracks { startTime: timestamp, element: DOMElement }

// --- NEW INTERACTION LOGIC FUNCTIONS ---
function interactWithLetters(hands, video) {
  if (!video) {
    return;
  }
  const rect = video.getBoundingClientRect();
  const displayW = rect.width;
  const displayH = rect.height;

  // get all uncaptured letters
  const letters = Array.from(document.querySelectorAll('.letter'))
    .filter(l => !l.classList.contains('captured'));

  // Track letters currently being hovered in this frame
  const currentlyHovered = new Set();

  hands.forEach(hand => {
    // In this project, each hand is an array of NormalizedLandmark with x/y in [0..1]
    if (!hand || hand.length < 9) {
      return;
    }

    // index fingertip landmark
    const lm = hand[8];
    const rawX = Array.isArray(lm) ? lm[0] : (lm.x !== undefined ? lm.x : lm[0]);
    const rawY = Array.isArray(lm) ? lm[1] : (lm.y !== undefined ? lm.y : lm[1]);

    // thumb fingertip landmark for pinch detection
    const thumbLm = hand[4];
    const thumbRawX = Array.isArray(thumbLm) ? thumbLm[0] : (thumbLm.x !== undefined ? thumbLm.x : thumbLm[0]);
    const thumbRawY = Array.isArray(thumbLm) ? thumbLm[1] : (thumbLm.y !== undefined ? thumbLm.y : thumbLm[1]);

    const looksNormalized = (rawX <= 1.01 && rawY <= 1.01);

    // Calculate pinch distance in normalized coordinates (0 to 1)
    const pinchDist = Math.hypot(rawX - thumbRawX, rawY - thumbRawY);
    const isPinching = pinchDist < 0.08; // threshold for "fingers touching"

    // convert to display coords
    let x = looksNormalized ? rawX * displayW : rawX * (displayW / (video.videoWidth || displayW));
    let y = looksNormalized ? rawY * displayH : rawY * (displayH / (video.videoHeight || displayH));

    // mirror horizontally (since webcam feed is flipped)
    x = displayW - x;

    // convert to page coords
    const pageX = rect.left + x;
    const pageY = rect.top + y;

    // check each letter
    letters.forEach(letter => {
      const lr = letter.getBoundingClientRect();
      const centerX = lr.left + lr.width / 2;
      const centerY = lr.top + lr.height / 2;

      // expanded hit area: scale + buffer (more forgiving)
      const dist = Math.hypot(pageX - centerX, pageY - centerY);
      const hitRadius = Math.max(lr.width, lr.height) * 0.8 + 25;

      if (dist <= hitRadius && !letter.classList.contains('captured')) {
        currentlyHovered.add(letter); // Mark as hovered

        // Route collisions based on level type
        const levelType = getCurrentLevelType();
        if (levelType === 'coding') {
          handleCodingHover(letter, isPinching);
        } else {
          // Default instantaneous capture for other modules
          if (levelType === 'multiple_choice') {
            handleMultipleChoiceCapture(letter);
          } else if (levelType === 'color_match') {
            handleColorMatchCapture(letter);
          } else if (levelType === 'actions') {
            handleActionsCapture(letter);
          } else if (levelType === 'opposites') {
            handleOppositesCapture(letter);
          } else if (levelType === 'numbers') {
            handleNumbersCapture(letter);
          } else if (levelType === 'phonics') {
            handlePhonicsCapture(letter);
          } else if (selectedModuleName === 'science') {
            handleScienceAtomTracking(letter, pageX, pageY);
          } else if (typeof captureLetter === 'function') {
            captureLetter(letter);
          } else {
            fallbackCapture(letter);
          }
        }
      }
    });
  });

  // Clean up hover states for letters that are no longer being hovered
  if (getCurrentLevelType() === 'coding') {
    for (const [letter, state] of codingHoverState.entries()) {
      if (!currentlyHovered.has(letter)) {
        // Reset visual state
        letter.style.transform = '';
        letter.style.boxShadow = letter.dataset.command === 'Run' ? '0 4px 6px rgba(0,0,0,0.2)' : '0 4px 6px rgba(0,0,0,0.1)';
        letter.style.filter = '';
        codingHoverState.delete(letter);
      }
    }
  }
}

// fallback if captureLetter() is missing
function fallbackCapture(letter) {
  if (!letter || letter.classList.contains('captured')) {
    return;
  }
  // Directly add a badge to history and remove the original letter immediately
  const box = document.getElementById('dropBox');
  if (box) {
    try {
      const badge = document.createElement('span');
      badge.className = 'history-badge';
      badge.textContent = (letter.innerText || letter.textContent || '').trim();
      box.appendChild(badge);
    } catch (_) { }
  }
  if (letter && letter.parentNode) {
    letter.parentNode.removeChild(letter);
  }
}

function captureLetter(letter) {
  if (letter.classList.contains('captured')) {
    return;
  }
  // Immediately update history with a badge and remove the original letter (no animation)
  const box = document.getElementById('dropBox');
  if (box) {
    try {
      const badge = document.createElement('span');
      badge.className = 'history-badge';
      badge.textContent = (letter.innerText || letter.textContent || '').trim();
      box.appendChild(badge);
    } catch (_) { }
  }
  if (letter && letter.parentNode) {
    letter.parentNode.removeChild(letter);
  }
  // --- Additional game logic (score, speech, next letter) can be added here ---
  // For now, let's just update score and spawn next item directly for a basic capture.
  score += 1;
  updateScore();
  currentItemIndex += 1;
  updateTip();
  setTimeout(spawnNextItem, 250); // Quicker next spawn since no animation
  speak(letter.innerText); // Speak the captured letter

}

let handLandmarker = null;
let lastVideoTime = -1;
let drawingUtils = null;

// --- Curriculum and Module Selection ---
// New Maths curriculum supports different gameplay types per level.
const mathsCurriculum = {
  addition: [
    {
      level: 1,
      name: "Single Digit Addition",
      type: "multiple_choice",
      problems: [
        { question: "1 + 2 =", answers: [3, 4, 2], correctAnswer: 3 },
        { question: "3 + 1 =", answers: [5, 3, 4], correctAnswer: 4 },
        { question: "2 + 2 =", answers: [3, 4, 5], correctAnswer: 4 },
        { question: "4 + 3 =", answers: [6, 7, 8], correctAnswer: 7 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Addition",
      type: "multiple_choice",
      problems: [
        { question: "15 + 7 =", answers: [21, 23, 22], correctAnswer: 22 },
        { question: "28 + 14 =", answers: [42, 40, 43], correctAnswer: 42 },
        { question: "39 + 25 =", answers: [63, 64, 65], correctAnswer: 64 },
        { question: "52 + 18 =", answers: [60, 70, 72], correctAnswer: 70 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Addition",
      type: "multiple_choice",
      problems: [
        { question: "123 + 45 =", answers: [168, 178, 169], correctAnswer: 168 },
        { question: "245 + 112 =", answers: [357, 367, 347], correctAnswer: 357 },
        { question: "301 + 199 =", answers: [490, 500, 499], correctAnswer: 500 },
        { question: "567 + 233 =", answers: [700, 800, 900], correctAnswer: 800 }
      ]
    },
    {
      level: 4,
      name: "Four Digit Addition",
      type: "multiple_choice",
      problems: [
        { question: "1234 + 567 =", answers: [1801, 1701, 1901], correctAnswer: 1801 },
        { question: "2345 + 1234 =", answers: [3579, 3679, 3479], correctAnswer: 3579 },
        { question: "4567 + 1234 =", answers: [5801, 5701, 5800], correctAnswer: 5801 },
        { question: "8765 + 1234 =", answers: [9999, 10000, 9998], correctAnswer: 9999 }
      ]
    },
    {
      level: 5,
      name: "Five Digit Addition",
      type: "multiple_choice",
      problems: [
        { question: "12345 + 6789 =", answers: [19134, 19124, 19144], correctAnswer: 19134 },
        { question: "23456 + 12345 =", answers: [35801, 35791, 35811], correctAnswer: 35801 },
        { question: "56789 + 12345 =", answers: [69134, 69124, 69144], correctAnswer: 69134 },
        { question: "87654 + 12345 =", answers: [99999, 100000, 99998], correctAnswer: 99999 }
      ]
    }
  ],
  multiplication: [
    {
      level: 1,
      name: "Single Digit Multiplication",
      type: "multiple_choice",
      problems: [
        { question: "2 * 3 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "4 * 2 =", answers: [6, 8, 9], correctAnswer: 8 },
        { question: "5 * 3 =", answers: [10, 15, 20], correctAnswer: 15 },
        { question: "6 * 4 =", answers: [20, 24, 28], correctAnswer: 24 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Multiplication",
      type: "multiple_choice",
      problems: [
        { question: "12 * 3 =", answers: [34, 36, 38], correctAnswer: 36 },
        { question: "15 * 5 =", answers: [70, 75, 80], correctAnswer: 75 },
        { question: "20 * 4 =", answers: [60, 80, 100], correctAnswer: 80 },
        { question: "25 * 6 =", answers: [120, 150, 180], correctAnswer: 150 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Multiplication",
      type: "multiple_choice",
      problems: [
        { question: "123 * 2 =", answers: [244, 246, 248], correctAnswer: 246 },
        { question: "210 * 3 =", answers: [630, 633, 636], correctAnswer: 630 },
        { question: "150 * 5 =", answers: [700, 750, 800], correctAnswer: 750 }
      ]
    }
  ],
  subtraction: [
    {
      level: 1,
      name: "Single Digit Subtraction",
      type: "multiple_choice",
      problems: [
        { question: "5 - 2 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "8 - 3 =", answers: [4, 5, 6], correctAnswer: 5 },
        { question: "7 - 4 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "9 - 1 =", answers: [7, 8, 9], correctAnswer: 8 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Subtraction",
      type: "multiple_choice",
      problems: [
        { question: "15 - 7 =", answers: [7, 8, 9], correctAnswer: 8 },
        { question: "28 - 12 =", answers: [15, 16, 17], correctAnswer: 16 },
        { question: "35 - 10 =", answers: [20, 25, 30], correctAnswer: 25 },
        { question: "42 - 18 =", answers: [22, 24, 26], correctAnswer: 24 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Subtraction",
      type: "multiple_choice",
      problems: [
        { question: "123 - 45 =", answers: [78, 88, 98], correctAnswer: 78 },
        { question: "245 - 112 =", answers: [130, 133, 143], correctAnswer: 133 },
        { question: "301 - 199 =", answers: [100, 102, 104], correctAnswer: 102 }
      ]
    }
  ],
  division: [
    {
      level: 1,
      name: "Single Digit Division",
      type: "multiple_choice",
      problems: [
        { question: "6 / 2 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "10 / 5 =", answers: [1, 2, 3], correctAnswer: 2 },
        { question: "9 / 3 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "8 / 4 =", answers: [1, 2, 3], correctAnswer: 2 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Division",
      type: "multiple_choice",
      problems: [
        { question: "24 / 4 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "36 / 6 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "45 / 9 =", answers: [4, 5, 6], correctAnswer: 5 },
        { question: "50 / 10 =", answers: [4, 5, 6], correctAnswer: 5 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Division",
      type: "multiple_choice",
      problems: [
        { question: "120 / 10 =", answers: [10, 12, 14], correctAnswer: 12 },
        { question: "250 / 25 =", answers: [8, 10, 12], correctAnswer: 10 },
        { question: "300 / 3 =", answers: [90, 100, 110], correctAnswer: 100 }
      ]
    }
  ],
  number_recognition: [
    {
      level: 1,
      name: "Numbers 0-9",
      type: "simple_catch",
      items: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    }
  ]
};

// --- Game State ---
let isGameRunning = false;
let score = 0;
// Active letter elements currently on screen. Each entry tracks the DOM node and its character.
let activeLetters = []; // { el: HTMLElement, char: string }
let spawnTimer = null; // no longer used after A–Z mode, kept for safety clears
let lastCaughtLetter = null; // used to validate speech recognition

let currentLevelIndex = 0; // which level we are on
let currentItemIndex = 0;  // which item within the current level we expect next

// --- Science Module: Level Data and State ---
const scienceLevels = [
  {
    level: 1,
    name: "Basic Ionic Compounds",
    totalChallenges: 3,
    challenges: [
      { reactants: ['Na', 'Cl'], product: 'NaCl', hint: 'Sodium + Chlorine = Salt' },
      { reactants: ['K', 'Br'], product: 'KBr', hint: 'Potassium + Bromine' },
      { reactants: ['Ca', 'O'], product: 'CaO', hint: 'Calcium + Oxygen = Lime' },
    ],
  },
  {
    level: 2,
    name: "Water Formation",
    totalChallenges: 3,
    challenges: [
      { reactants: ['H', 'O'], product: 'H₂O', hint: 'Hydrogen + Oxygen = Water' },
      { reactants: ['H', 'Cl'], product: 'HCl', hint: 'Hydrogen + Chlorine = Acid' },
      { reactants: ['H', 'F'], product: 'HF', hint: 'Hydrogen + Fluorine' },
    ],
  },
  {
    level: 3,
    name: "Carbon Compounds",
    totalChallenges: 3,
    challenges: [
      { reactants: ['C', 'H'], product: 'CH₄', hint: 'Carbon + Hydrogen = Methane' },
      { reactants: ['C', 'O'], product: 'CO₂', hint: 'Carbon + Oxygen = Carbon Dioxide' },
      { reactants: ['C', 'S'], product: 'CS₂', hint: 'Carbon + Sulfur' },
    ],
  },
  {
    level: 4,
    name: "Metal Oxides",
    totalChallenges: 3,
    challenges: [
      { reactants: ['Fe', 'O'], product: 'Fe₂O₃', hint: 'Iron + Oxygen = Rust' },
      { reactants: ['Al', 'O'], product: 'Al₂O₃', hint: 'Aluminum + Oxygen' },
      { reactants: ['Cu', 'O'], product: 'CuO', hint: 'Copper + Oxygen' },
    ],
  },
  {
    level: 5,
    name: "Acid-Base Reactions",
    totalChallenges: 3,
    challenges: [
      { reactants: ['NaOH', 'HCl'], product: 'NaCl + H₂O', hint: 'Base + Acid = Salt + Water' },
      { reactants: ['KOH', 'HNO₃'], product: 'KNO₃ + H₂O', hint: 'Potassium Hydroxide + Nitric Acid' },
      { reactants: ['Ca(OH)₂', 'H₂SO₄'], product: 'CaSO₄ + H₂O', hint: 'Lime + Sulfuric Acid' },
    ],
  },
  {
    level: 6,
    name: "Free Reaction Mode",
    totalChallenges: 5,
    challenges: [
      { reactants: ['C', 'O'], product: 'CO₂', hint: 'Carbon Dioxide' },
      { reactants: ['H', 'O'], product: 'H₂O', hint: 'Water' },
      { reactants: ['Na', 'Cl'], product: 'NaCl', hint: 'Salt' },
      { reactants: ['Ca', 'O'], product: 'CaO', hint: 'Lime' },
      { reactants: ['Fe', 'O'], product: 'Fe₂O₃', hint: 'Rust' },
    ],
  },
  {
    level: 7,
    name: "Combustion Reactions",
    totalChallenges: 3,
    challenges: [
      { reactants: ['CH₄', 'O₂'], product: 'CO₂ + H₂O', hint: 'Methane + Oxygen = Combustion' },
      { reactants: ['C₂H₆', 'O₂'], product: 'CO₂ + H₂O', hint: 'Ethane + Oxygen' },
      { reactants: ['C₃H₈', 'O₂'], product: 'CO₂ + H₂O', hint: 'Propane + Oxygen' },
    ],
  },
  {
    level: 8,
    name: "Precipitation Reactions",
    totalChallenges: 3,
    challenges: [
      { reactants: ['AgNO₃', 'NaCl'], product: 'AgCl + NaNO₃', hint: 'Silver Nitrate + Salt' },
      { reactants: ['BaCl₂', 'Na₂SO₄'], product: 'BaSO₄ + NaCl', hint: 'Barium Chloride + Sodium Sulfate' },
      { reactants: ['Pb(NO₃)₂', 'KI'], product: 'PbI₂ + KNO₃', hint: 'Lead Nitrate + Potassium Iodide' },
    ],
  },
  {
    level: 9,
    name: "Complex Reactions",
    totalChallenges: 3,
    challenges: [
      { reactants: ['CaCO₃', 'HCl'], product: 'CaCl₂ + CO₂ + H₂O', hint: 'Limestone + Acid' },
      { reactants: ['Fe₂O₃', 'C'], product: 'Fe + CO₂', hint: 'Iron Oxide + Carbon' },
      { reactants: ['NH₃', 'HCl'], product: 'NH₄Cl', hint: 'Ammonia + Hydrochloric Acid' },
    ],
  },
  {
    level: 10,
    name: "Advanced Chemistry",
    totalChallenges: 3,
    challenges: [
      { reactants: ['H₂SO₄', 'NaOH'], product: 'Na₂SO₄ + H₂O', hint: 'Sulfuric Acid + Sodium Hydroxide' },
      { reactants: ['Ca(OH)₂', 'CO₂'], product: 'CaCO₃ + H₂O', hint: 'Lime Water + Carbon Dioxide' },
      { reactants: ['Mg', 'O₂'], product: 'MgO', hint: 'Magnesium + Oxygen' },
    ],
  }
];

// Science module state
let currentScienceLevelIndex = 0;
let challengesCompleted = 0;
let currentChallenge = null;
let activeAtoms = []; // Track spawned atoms
let beakerContents = []; // Track atoms in beaker

// --- Coding Module: Level Data and State ---
const codingLevels = [
  {
    level: 1,
    name: "Move Right",
    type: "coding",
    grid: [5, 3], // columns, rows
    start: [0, 1], // x, y (0-indexed)
    target: [4, 1],
    blocks: ["Right", "Right", "Right", "Right"], // Exact needed blocks
    hint: "Arrange the blocks to move the character to the star ⭐️"
  },
  {
    level: 2,
    name: "Move Down",
    type: "coding",
    grid: [5, 3],
    start: [2, 0],
    target: [2, 2],
    blocks: ["Down", "Down", "Left", "Right"], // Some extra to trick
    hint: "Move down to reach the star ⭐️"
  },
  {
    level: 3,
    name: "Corner Path",
    type: "coding",
    grid: [5, 3],
    start: [1, 0],
    target: [4, 2],
    blocks: ["Right", "Down", "Right", "Down", "Right"],
    hint: "Move right and down to reach the star ⭐️"
  }
];

// Coding module state
let codingQueue = []; // Currently queued moves list
let isRunningCode = false;
let codingCharacterPosition = [0, 0];

// Create a master registry of all modules and select one for testing.
const gameModules = {
  maths: mathsCurriculum,
  science: scienceLevels,
  coding: codingLevels
};

// Selection can come from localStorage; fallback to maths/addition for demo.
let selectedModuleName = 'maths';
let selectedSubModuleName = 'addition'; // e.g., addition, number_recognition
try {
  const storedModule = localStorage.getItem('selectedModule');
  if (storedModule) {
    // Map high-level module to sub-module defaults when needed
    selectedModuleName = storedModule;
    if (storedModule === 'maths') {
      selectedSubModuleName = 'addition';
    }
  }
  const storedLevel = parseInt(localStorage.getItem('selectedLevel') || '', 10);
  if (!Number.isNaN(storedLevel) && storedLevel > 0) {
    currentLevelIndex = Math.max(0, storedLevel - 1);
  }
} catch (_) { }

function getActiveModuleArray() {
  const selected = gameModules[selectedModuleName];
  if (Array.isArray(selected)) {
    return selected;
  }
  const sub = selected?.[selectedSubModuleName];
  return Array.isArray(sub) ? sub : [];
}

function getCurrentLevel() {
  const activeArray = getActiveModuleArray();
  if (activeArray.length === 0) return {};
  if (currentLevelIndex < 0 || currentLevelIndex >= activeArray.length) {
    currentLevelIndex = 0; // Fallback to first level if out of bounds
  }
  return activeArray[currentLevelIndex];
}

function getCurrentLevelType() {
  // Default English levels are simple catch if `type` is not specified
  return getCurrentLevel().type || 'simple_catch';
}

// --- Science Module: Level Management Functions ---

// Add beaker image to the center of webcam
function addBeakerImage() {
  // Remove existing beaker if any
  const existingBeaker = document.getElementById('science-beaker');
  if (existingBeaker) {
    existingBeaker.remove();
  }

  // Create beaker image element
  const beakerEl = document.createElement("img");
  beakerEl.id = "science-beaker";
  beakerEl.src = "../images/beaker.png";
  beakerEl.alt = "Beaker";

  // Position in center of webcam area
  const areaRect = videoEl.getBoundingClientRect();
  const centerX = areaRect.left + areaRect.width / 2;
  const centerY = areaRect.top + areaRect.height / 2;

  beakerEl.style.position = "fixed";
  beakerEl.style.left = `${centerX - 150}px`; // Center horizontally (300px wide)
  beakerEl.style.top = `${centerY + 50}px`; // Move down from center (300px high)
  beakerEl.style.width = "300px";
  beakerEl.style.height = "300px";
  beakerEl.style.zIndex = "50"; // Behind atoms but above webcam
  beakerEl.style.pointerEvents = "none"; // Don't interfere with hand tracking
  beakerEl.style.userSelect = "none";
  beakerEl.style.objectFit = "contain";

  // Ensure the actual PNG image loads
  beakerEl.onload = function () {
    console.log("Beaker PNG image loaded successfully from:", beakerEl.src);
  };

  beakerEl.onerror = function () {
    console.error("Failed to load beaker.png from:", beakerEl.src);
    console.log("Trying alternative path...");
    // Try alternative path
    beakerEl.src = "/images/beaker.png";
  };

  // Add to container
  (uiContainerEl || containerEl || document.body).appendChild(beakerEl);
}

function startScienceLevel(levelIndex) {
  if (levelIndex >= scienceLevels.length) {
    console.log("All science levels complete!");
    endGame("Congratulations! You've mastered the Science Module!");
    return;
  }

  currentScienceLevelIndex = levelIndex;
  challengesCompleted = 0;
  const levelData = scienceLevels[currentScienceLevelIndex];

  // Update UI
  if (levelDisplayEl) levelDisplayEl.textContent = `Level: ${levelData.level}`;
  updateScienceProgressUI();

  // Add beaker image to the center of webcam
  addBeakerImage();

  // Speak welcome message (removed - no voice message)
  // setTimeout(() => {
  //   speak("Let's do the basic chemical reactions");
  // }, 500);

  // Start the first challenge of the level
  nextScienceChallenge();
}

// Initialize Science module with correct level
function initializeScienceModule() {
  // Use the current science level index that was set by jumpToLevel or advanceToNextLevel
  console.log('initializeScienceModule - currentScienceLevelIndex:', currentScienceLevelIndex);
  console.log('initializeScienceModule - levelData:', scienceLevels[currentScienceLevelIndex]);

  // Validate the level index
  if (currentScienceLevelIndex < 0 || currentScienceLevelIndex >= scienceLevels.length) {
    console.log('Invalid science level index, using level 0');
    currentScienceLevelIndex = 0;
  }

  // Start the level
  startScienceLevel(currentScienceLevelIndex);
}

function nextScienceChallenge() {
  const levelData = scienceLevels[currentScienceLevelIndex];
  console.log('nextScienceChallenge - currentScienceLevelIndex:', currentScienceLevelIndex);
  console.log('nextScienceChallenge - levelData:', levelData);
  console.log('nextScienceChallenge - challengesCompleted:', challengesCompleted);

  currentChallenge = levelData.challenges[challengesCompleted];
  console.log('nextScienceChallenge - currentChallenge:', currentChallenge);
  console.log('nextScienceChallenge - reactants:', currentChallenge.reactants);
  console.log('nextScienceChallenge - product:', currentChallenge.product);

  // Check if this is Level 6 (Free Reaction Mode)
  if (currentScienceLevelIndex === 5) { // Level 6 is at index 5 (0-based)
    // Free reaction mode - spawn random atoms
    spawnFreeReactionAtoms();
  } else {
    // Regular mode - spawn only the atoms needed for the current challenge
    spawnSpecificAtoms(currentChallenge.reactants);
  }

  // Update hint with educational information
  if (currentScienceLevelIndex === 5) { // Level 6 (Free Reaction Mode)
    // Show the simple target word in tip section
    if (tipBoxEl) {
      tipBoxEl.textContent = `Tip: ${currentChallenge.hint}`;
    }
  } else {
    // Regular mode - no green box on start
    // showHintBox(`${currentChallenge.hint} - Combine ${currentChallenge.reactants[0]} and ${currentChallenge.reactants[1]}!`);
  }

  // Speak the challenge (removed - no voice message)
  // setTimeout(() => {
  //   speak(`Challenge ${challengesCompleted + 1}: ${currentChallenge.hint}`);
  // }, 1000);
}

// Science module now uses standard level completion system

function completeScienceChallenge() {
  challengesCompleted++;
  score += 5; // Give points for completing a challenge
  updateScore();
  updateScienceProgressUI();

  // Check if all challenges in this level are completed
  const levelData = scienceLevels[currentScienceLevelIndex];
  if (challengesCompleted >= levelData.totalChallenges) {
    // Level completed! Show level complete popup
    console.log(`Level ${levelData.level} completed!`);

    // Mark current level as completed
    try {
      markLevelComplete(currentLevelIndex);
    } catch (e) {
      console.log('Error marking level complete:', e);
    }

    // Show level complete popup
    showLevelCompletePopup();
    return;
  }

  // Move to the next challenge after a short delay
  setTimeout(nextScienceChallenge, 2000);
}

function updateScienceProgressUI() {
  const levelData = scienceLevels[currentScienceLevelIndex];
  const progressPercent = (challengesCompleted / levelData.totalChallenges) * 100;

  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (completedLevelsSpan) completedLevelsSpan.textContent = challengesCompleted;
  if (totalLevelsSpan) totalLevelsSpan.textContent = levelData.totalChallenges;
}

// Helper function to spawn only specific atoms for a challenge
function spawnSpecificAtoms(atomSymbols) {
  // First, clear any existing atoms
  activeAtoms.forEach(atom => {
    if (atom.el && atom.el.parentNode) atom.el.parentNode.removeChild(atom.el);
  });
  activeAtoms = [];

  // Spawn the specific atoms for the challenge
  atomSymbols.forEach(symbol => {
    spawnAtom(symbol);
  });
}

// Special function for Level 6 - Free Reaction Mode
function spawnFreeReactionAtoms() {
  // First, clear any existing atoms
  activeAtoms.forEach(atom => {
    if (atom.el && atom.el.parentNode) atom.el.parentNode.removeChild(atom.el);
  });
  activeAtoms = [];

  // Get the current challenge to know what symbols to include
  const requiredSymbols = currentChallenge.reactants;

  // All possible chemical symbols for free reaction mode
  const allSymbols = ['C', 'O', 'H', 'N', 'Na', 'Cl', 'Ca', 'Fe', 'Mg', 'S', 'P', 'K', 'Br', 'I', 'F', 'Al', 'Cu', 'Zn', 'Ag', 'Pb'];

  // Always include the required symbols for the current challenge
  const selectedSymbols = [...requiredSymbols];

  // Add 2-3 random distractor symbols
  const numDistractors = 2 + Math.floor(Math.random() * 2); // 2 or 3 distractors
  for (let i = 0; i < numDistractors; i++) {
    let symbol;
    do {
      symbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
    } while (selectedSymbols.includes(symbol));
    selectedSymbols.push(symbol);
  }

  // Predefined positions to avoid overlapping
  const positions = [
    { x: 0.2, y: 0.2 },   // Top-left
    { x: 0.8, y: 0.2 },   // Top-right
    { x: 0.2, y: 0.6 },   // Bottom-left
    { x: 0.8, y: 0.6 },   // Bottom-right
    { x: 0.5, y: 0.4 },   // Center
  ];

  // Shuffle the positions
  const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);

  for (let i = 0; i < selectedSymbols.length; i++) {
    spawnAtomAtPosition(selectedSymbols[i], shuffledPositions[i]);
  }
}

// Spawn atom at specific position (for free reaction mode)
function spawnAtomAtPosition(symbol, position) {
  const el = document.createElement("div");
  el.className = "letter game-item";
  el.innerText = symbol;
  el.dataset.symbol = symbol;

  // Position atom at specific coordinates
  const videoEl = document.querySelector('video');
  if (videoEl) {
    const videoRect = videoEl.getBoundingClientRect();
    const x = videoRect.left + (position.x * videoRect.width);
    const y = videoRect.top + (position.y * videoRect.height);

    el.style.position = "fixed";
    el.style.left = `${x - 30}px`;
    el.style.top = `${y - 30}px`;
    el.style.width = "60px";
    el.style.height = "60px";
    el.style.borderRadius = "50%";
    el.style.background = "linear-gradient(145deg, #4CAF50, #45a049)";
    el.style.color = "white";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontSize = "18px";
    el.style.fontWeight = "bold";
    el.style.cursor = "pointer";
    el.style.zIndex = "100";
    el.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
    el.style.border = "2px solid #2E7D32";
    el.style.userSelect = "none";
    el.style.pointerEvents = "none";

    // Add to DOM
    (uiContainerEl || containerEl || document.body).appendChild(el);

    activeAtoms.push({ el, symbol });
  }
}

// --- Coding Module: Logic ---

function initializeCodingModule() {
  codingQueue = [];
  isRunningCode = false;

  const levelData = getCurrentLevel();
  if (!levelData || !levelData.start || !levelData.grid) {
    console.error("Coding level data is invalid or out of bounds:", levelData);
    return;
  }
  codingCharacterPosition = [...levelData.start];

  if (levelDisplayEl) levelDisplayEl.textContent = `Level: ${levelData.level}`;
  if (tipBoxEl) tipBoxEl.innerHTML = `Tip: ${levelData.hint}`;

  // Clean up any existing elements
  const existingGrid = document.getElementById('coding-grid-container');
  if (existingGrid) existingGrid.remove();

  const existingQueue = document.getElementById('coding-queue-container');
  if (existingQueue) existingQueue.remove();

  // Create UI Grid
  createCodingGrid(levelData);
  createCodingQueue();
  createCodingBlocks(levelData.blocks);

  // Update overall progress UI
  if (totalLevelsSpan) totalLevelsSpan.textContent = codingLevels.length;
  if (completedLevelsSpan) completedLevelsSpan.textContent = currentLevelIndex;
  if (progressFill) progressFill.style.width = `${(currentLevelIndex / codingLevels.length) * 100}%`;
}

function createCodingGrid(levelData) {
  const container = document.createElement('div');
  container.id = 'coding-grid-container';
  container.style.position = 'absolute';
  container.style.top = '15%';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${levelData.grid[0]}, 80px)`;
  container.style.gridGap = '10px';
  container.style.padding = '20px';
  container.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
  container.style.borderRadius = '20px';
  container.style.zIndex = '50';

  const totalCells = levelData.grid[0] * levelData.grid[1];
  for (let i = 0; i < totalCells; i++) {
    const x = i % levelData.grid[0];
    const y = Math.floor(i / levelData.grid[0]);

    const cell = document.createElement('div');
    cell.className = 'coding-cell';
    cell.style.width = '80px';
    cell.style.height = '80px';
    cell.style.backgroundColor = '#f0f4f8';
    cell.style.borderRadius = '15px';
    cell.style.display = 'flex';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.fontSize = '40px';
    cell.id = `cell-${x}-${y}`;

    // Initial placements
    if (x === levelData.start[0] && y === levelData.start[1]) {
      cell.textContent = '🤖'; // Character
      cell.style.backgroundColor = '#4F46E5'; // Highlight start
    } else if (x === levelData.target[0] && y === levelData.target[1]) {
      cell.textContent = '⭐'; // Target
      cell.style.border = '3px solid #FBBF24';
    }

    container.appendChild(cell);
  }

  (uiContainerEl || document.body).appendChild(container);
}

function createCodingQueue() {
  const container = document.createElement('div');
  container.id = 'coding-queue-container';
  container.style.position = 'absolute';
  container.style.bottom = '180px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.width = '80%';
  container.style.height = '80px';
  container.style.border = '2px dashed #8b5cf6';
  container.style.borderRadius = '15px';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.padding = '10px';
  container.style.gap = '10px';
  container.style.overflowX = 'auto';
  container.style.backgroundColor = 'rgba(255,255,255,0.8)';
  container.style.zIndex = '50';

  const placeholder = document.createElement('div');
  placeholder.id = 'coding-queue-placeholder';
  placeholder.textContent = 'Hover hand over blocks below to add them here...';
  placeholder.style.color = '#6b7280';
  placeholder.style.fontFamily = 'monospace';
  placeholder.style.margin = 'auto';

  container.appendChild(placeholder);
  (uiContainerEl || document.body).appendChild(container);
}

function createCodingBlocks(blocks) {
  // Clear any existing mediapipe target letters
  activeLetters.forEach(l => {
    if (l.el && l.el.parentNode) l.el.parentNode.removeChild(l.el);
  });
  activeLetters = [];

  // Create UI buttons at the bottom that MediaPipe will track
  const numBlocks = blocks.length;

  blocks.forEach((block, index) => {
    const el = document.createElement('div');
    el.className = 'letter game-item coding-block'; // 'letter' class makes it trackable by interactWithLetters
    el.dataset.command = block;
    el.textContent = `Move ${block}`;

    // Calculate percentage-based position to fit nicely inside the container
    const fraction = (index + 1) / (numBlocks + 1);

    // Style as pill buttons
    el.style.position = "absolute";
    el.style.left = `calc(${fraction * 100}% - 75px)`; // Center based on approximate 150px width
    el.style.bottom = '80px';
    el.style.padding = '15px 30px';
    el.style.backgroundColor = '#8b5cf6';
    el.style.color = 'white';
    el.style.borderRadius = '30px';
    el.style.fontWeight = 'bold';
    el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    el.style.zIndex = "100";
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '20px';

    (uiContainerEl || document.body).appendChild(el);
    activeLetters.push({ el, char: block });
  });

  // Add the RUN button
  const runBtn = document.createElement('div');
  runBtn.className = 'letter game-item coding-block-run';
  runBtn.dataset.command = 'Run';
  runBtn.textContent = '▶ Run Code';
  runBtn.style.position = "absolute";
  runBtn.style.right = '40px';
  runBtn.style.top = '40px';
  runBtn.style.padding = '15px 40px';
  runBtn.style.background = 'linear-gradient(to right, #ec4899, #8b5cf6)';
  runBtn.style.color = 'white';
  runBtn.style.borderRadius = '30px';
  runBtn.style.fontWeight = 'bold';
  runBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
  runBtn.style.zIndex = "100";
  runBtn.style.fontSize = '24px';

  (uiContainerEl || document.body).appendChild(runBtn);
  activeLetters.push({ el: runBtn, char: 'Run' });
}

// Coding module hover tracking
function handleCodingHover(letter, isPinching) {
  if (isRunningCode || letter.classList.contains('captured')) return;
  const command = letter.dataset.command;
  if (!command) return;

  const now = Date.now();
  const HOVER_DURATION = 600; // ms required to capture a block

  if (isPinching) {
    if (!codingHoverState.has(letter)) {
      // Start tracking hover
      codingHoverState.set(letter, { startTime: now });
      letter.style.transform = 'scale(1.05)';
      letter.style.boxShadow = '0 0 15px 5px rgba(236, 72, 153, 0.4)'; // Pink glow
      letter.style.transition = 'all 0.1s ease';
    } else {
      // Continue tracking
      const state = codingHoverState.get(letter);
      const elapsed = now - state.startTime;
      const progress = Math.min(elapsed / HOVER_DURATION, 1);

      // Animate brightness/brightness as progress increases
      letter.style.filter = `brightness(${1 + progress * 0.5})`;

      if (elapsed >= HOVER_DURATION) {
        // Capture triggered!
        codingHoverState.delete(letter);
        letter.style.filter = '';
        letter.style.transform = 'scale(0.9)';
        setTimeout(() => { if (letter && letter.style) letter.style.transform = ''; }, 150);

        handleCodingCapture(letter);
      }
    }
  } else {
    // Hand is hovering but NOT pinching. We must reset the timer to prevent accidental drift selection
    if (codingHoverState.has(letter)) {
      codingHoverState.delete(letter);
      letter.style.transform = '';
      letter.style.boxShadow = command === 'Run' ? '0 4px 6px rgba(0,0,0,0.2)' : '0 4px 6px rgba(0,0,0,0.1)';
      letter.style.filter = '';
    }
  }
}

// Coding module capture
function handleCodingCapture(letter) {
  if (isRunningCode || letter.classList.contains('captured')) return;

  const command = letter.dataset.command;
  if (!command) return;

  if (command === 'Run') {
    if (codingQueue.length > 0) {
      runCodingCode();
    }
    return;
  }

  // Remove the block from the screen and active letters pool
  if (letter && letter.parentNode) {
    letter.parentNode.removeChild(letter);
  }
  const idx = activeLetters.findIndex(l => l.el === letter);
  if (idx !== -1) {
    activeLetters.splice(idx, 1);
  }

  // Add block to queue
  codingQueue.push(command);

  // Update UI queue
  const queueContainer = document.getElementById('coding-queue-container');
  const placeholder = document.getElementById('coding-queue-placeholder');

  if (placeholder) placeholder.style.display = 'none';

  const blockEl = document.createElement('div');
  blockEl.className = 'coding-queued-block';
  blockEl.textContent = command;
  blockEl.style.padding = '8px 16px';
  blockEl.style.backgroundColor = '#8b5cf6';
  blockEl.style.color = 'white';
  blockEl.style.borderRadius = '10px';
  blockEl.style.fontWeight = 'bold';
  blockEl.style.fontSize = '14px';
  blockEl.style.flexShrink = '0';

  queueContainer.appendChild(blockEl);
  queueContainer.scrollLeft = queueContainer.scrollWidth;

  speak(command); // Read it aloud
  score += 1; // 1 point per block placed
  updateScore();
}

async function runCodingCode() {
  if (isRunningCode || codingQueue.length === 0) return;
  isRunningCode = true;

  const levelData = getCurrentLevel();
  let [cx, cy] = [...codingCharacterPosition];

  // Execute queue step by step
  for (let i = 0; i < codingQueue.length; i++) {
    const cmd = codingQueue[i];

    // Highlight active block
    const queuedBlocks = document.querySelectorAll('.coding-queued-block');
    if (queuedBlocks[i]) queuedBlocks[i].style.backgroundColor = '#ec4899';

    // Calculate new position
    let nx = cx, ny = cy;
    if (cmd === 'Up') ny--;
    else if (cmd === 'Down') ny++;
    else if (cmd === 'Left') nx--;
    else if (cmd === 'Right') nx++;

    // Check bounds
    if (nx >= 0 && nx < levelData.grid[0] && ny >= 0 && ny < levelData.grid[1]) {
      // Clear old cell
      const oldCell = document.getElementById(`cell-${cx}-${cy}`);

      // Keep target star visible if we leave it
      if (oldCell) {
        if (cx === levelData.target[0] && cy === levelData.target[1]) {
          oldCell.textContent = '⭐';
          oldCell.style.backgroundColor = '#f0f4f8';
        } else {
          oldCell.textContent = '';
          oldCell.style.backgroundColor = '#f0f4f8';
        }
      }

      // Update position
      cx = nx;
      cy = ny;

      // Draw new cell
      const newCell = document.getElementById(`cell-${cx}-${cy}`);
      if (newCell) {
        newCell.textContent = '🤖';
        newCell.style.backgroundColor = '#4F46E5';
        newCell.style.transform = 'scale(1.1)';
        setTimeout(() => newCell.style.transform = '', 150);
      }

      codingCharacterPosition = [cx, cy];
      speak(`Move ${cmd}`);
    } else {
      // Wall bump
      speak("Oops, hit a wall");
      break;
    }

    // Wait for step animation
    await new Promise(resolve => setTimeout(resolve, 800));

    // Un-highlight block
    if (queuedBlocks[i]) queuedBlocks[i].style.backgroundColor = '#8b5cf6';
  }

  // Check win condition
  if (codingCharacterPosition[0] === levelData.target[0] && codingCharacterPosition[1] === levelData.target[1]) {
    speak("Level complete!");
    score += 10;
    updateScore();

    setTimeout(() => {
      try { markLevelComplete(currentLevelIndex); } catch (e) { }
      showLevelCompletePopup();
    }, 1000);
  } else {
    // Fail: Reset level after delay
    speak("Try again.");
    setTimeout(() => {
      initializeCodingModule(); // Reset grid and queue
    }, 1500);
  }
}

// Check if beaker has specific atoms
function hasAtoms(symbols) {
  for (const symbol of symbols) {
    if (!beakerContents.includes(symbol)) return false;
  }
  return true;
}

// Spawn a single atom for science module
function spawnAtom(symbol) {
  const el = document.createElement("div");
  el.className = "letter game-item"; // Use same class as English module for MediaPipe
  el.innerText = symbol;
  el.dataset.symbol = symbol;

  // Position atoms in specific non-overlapping locations
  const areaRect = videoEl.getBoundingClientRect();
  const centerX = areaRect.left + areaRect.width / 2;
  const centerY = areaRect.top + areaRect.height / 2;

  let x, y;

  // Position atoms in corners to avoid overlap
  if (activeAtoms.length === 0) {
    // First atom - top left
    x = areaRect.left + 80;
    y = areaRect.top + 80;
  } else if (activeAtoms.length === 1) {
    // Second atom - top right
    x = areaRect.right - 140;
    y = areaRect.top + 80;
  } else {
    // Additional atoms - random but with more spacing
    const margin = 100;
    const minX = areaRect.left + margin;
    const minY = areaRect.top + margin;
    const maxX = areaRect.right - 60 - margin;
    const maxY = areaRect.bottom - 60 - margin;

    // Try to find a non-overlapping position
    let attempts = 0;
    do {
      x = minX + Math.random() * (maxX - minX);
      y = minY + Math.random() * (maxY - minY);
      attempts++;
    } while (attempts < 10 && isOverlapping(x, y, activeAtoms));
  }

  el.style.position = "fixed";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.zIndex = "100";
  el.style.pointerEvents = "none"; // Let MediaPipe handle interaction
  el.style.fontSize = "32px";
  el.style.fontWeight = "bold";
  el.style.color = "#ffffff";
  el.style.textAlign = "center";
  el.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
  el.style.userSelect = "none";
  el.style.cursor = "none";
  el.style.background = "linear-gradient(145deg, #FF6B6B, #4ECDC4)";
  el.style.border = "2px solid #2C3E50";
  el.style.borderRadius = "50%";
  el.style.width = "60px";
  el.style.height = "60px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.transition = "transform 0.2s ease";

  // Store atom reference
  el.dataset.atomId = activeAtoms.length;

  // Debug: Log when atom is spawned
  console.log(`Spawning atom: ${symbol} at (${x}, ${y})`);

  (uiContainerEl || containerEl || document.body).appendChild(el);
  activeAtoms.push({ el, symbol });
}

// Check if a position would overlap with existing atoms
function isOverlapping(x, y, existingAtoms) {
  const minDistance = 120; // Minimum distance between atoms

  for (const atom of existingAtoms) {
    const atomRect = atom.el.getBoundingClientRect();
    const atomX = atomRect.left + atomRect.width / 2;
    const atomY = atomRect.top + atomRect.height / 2;

    const distance = Math.sqrt(Math.pow(x - atomX, 2) + Math.pow(y - atomY, 2));
    if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

// Check if atoms can be combined in beaker
function tryBeakerReaction() {
  if (!currentChallenge || beakerContents.length < 2) return false;

  const s1 = beakerContents[0].symbol;
  const s2 = beakerContents[1].symbol;
  const reactants = currentChallenge.reactants;

  // Check if the two atoms in the beaker match the challenge
  if ((reactants.includes(s1) && reactants.includes(s2))) {
    // SUCCESS! Reaction will be added to history

    // Visual reaction effect on atoms
    beakerContents.forEach(item => {
      item.el.style.background = "linear-gradient(145deg, #FFD700, #FFA500)";
      item.el.style.transform = "scale(1.2)";
      item.el.style.border = "3px solid #FFD700";
    });

    // Play reaction sound
    speak(`Correct! You formed ${currentChallenge.product}. ${currentChallenge.hint}`);

    // Remove used atoms after delay
    setTimeout(() => {
      beakerContents.forEach(item => removeAtom(item.el));
      beakerContents = [];
      completeScienceChallenge();
    }, 2000);

    return true;
  } else {
    // Wrong combination - provide feedback
    speak('Incorrect! Try a different combination.');

    // Visual feedback for wrong combination
    beakerContents.forEach(item => {
      item.el.style.background = "linear-gradient(145deg, #FF6B6B, #FF5252)";
      item.el.style.transform = "scale(0.9)";
      item.el.style.border = "3px solid #FF0000";
    });

    // Reset after delay
    setTimeout(() => {
      beakerContents.forEach(item => {
        item.el.style.background = "linear-gradient(145deg, #4CAF50, #45a049)";
        item.el.style.transform = "scale(1)";
        item.el.style.border = "2px solid #2E7D32";
      });
      beakerContents = [];
    }, 2000);

    return false;
  }
}

// Science module now uses beaker system like English module

// Remove atom from screen
function removeAtom(atomEl) {
  if (atomEl && atomEl.parentNode) {
    atomEl.parentNode.removeChild(atomEl);
  }
}

// Remove beaker image when Science module ends
function removeBeakerImage() {
  const existingBeaker = document.getElementById('science-beaker');
  if (existingBeaker) {
    existingBeaker.remove();
  }
}

// Science atom tracking - make atoms follow finger and check for beaker mixing
function handleScienceAtomTracking(atom, pageX, pageY) {
  if (!atom || !atom.dataset) return;

  const symbol = atom.dataset.symbol;
  if (!symbol) return;

  // Debug: Log when atom is being tracked
  console.log(`Tracking atom: ${symbol} at (${pageX}, ${pageY})`);

  // Mark atom as being tracked
  atom.dataset.isBeingTracked = "true";
  atom.style.transform = "scale(1.2)";
  atom.style.zIndex = "200"; // Bring to front

  // Update atom position to follow finger
  atom.style.left = `${pageX - 30}px`; // Center on fingertip
  atom.style.top = `${pageY - 30}px`;

  // Check if atom is near the beaker
  checkBeakerProximity(atom, pageX, pageY);
}

// Check if atom is close enough to the beaker to be added
function checkBeakerProximity(atom, pageX, pageY) {
  const beakerEl = document.getElementById('science-beaker');
  if (!beakerEl) return;

  const beakerRect = beakerEl.getBoundingClientRect();
  const beakerCenterX = beakerRect.left + beakerRect.width / 2;
  const beakerCenterY = beakerRect.top + beakerRect.height / 2;

  const distance = Math.sqrt(
    Math.pow(pageX - beakerCenterX, 2) +
    Math.pow(pageY - beakerCenterY, 2)
  );

  // If atom is close to beaker (within 100px), add it to beaker
  if (distance < 100) {
    addAtomToBeaker(atom);
  }
}

// Add atom to beaker and show reaction
function addAtomToBeaker(atom) {
  const symbol = atom.dataset.symbol;

  // Check if atom is already in beaker
  if (beakerContents.some(item => item.el === atom)) return;

  // Add atom to beaker (max 2 atoms)
  if (beakerContents.length < 2) {
    beakerContents.push({ el: atom, symbol });

    // Make atom disappear (fade out and remove)
    atom.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    atom.style.opacity = '0';
    atom.style.transform = 'scale(0.1)';

    // Remove atom from DOM after animation
    setTimeout(() => {
      if (atom.parentNode) {
        atom.parentNode.removeChild(atom);
      }
    }, 500);

    // Speak which atom was added with full name
    const elementNames = {
      'Na': 'Sodium',
      'Cl': 'Chlorine',
      'K': 'Potassium',
      'Br': 'Bromine',
      'Ca': 'Calcium',
      'O': 'Oxygen',
      'Mg': 'Magnesium',
      'S': 'Sulfur',
      'H': 'Hydrogen',
      'F': 'Fluorine',
      'I': 'Iodine',
      'C': 'Carbon',
      'Fe': 'Iron',
      'Al': 'Aluminum',
      'Cu': 'Copper',
      'Zn': 'Zinc',
      'Ag': 'Silver',
      'Pb': 'Lead',
      'Ba': 'Barium',
      'NH₃': 'Ammonia',
      'NaOH': 'Sodium Hydroxide',
      'HCl': 'Hydrochloric Acid',
      'H₂SO₄': 'Sulfuric Acid',
      'HNO₃': 'Nitric Acid',
      'Ca(OH)₂': 'Calcium Hydroxide',
      'CuSO₄': 'Copper Sulfate',
      'AgNO₃': 'Silver Nitrate',
      'NaCl': 'Sodium Chloride',
      'BaCl₂': 'Barium Chloride',
      'Na₂SO₄': 'Sodium Sulfate',
      'Pb(NO₃)₂': 'Lead Nitrate',
      'KI': 'Potassium Iodide',
      'CaCO₃': 'Calcium Carbonate',
      'Fe₂O₃': 'Iron Oxide',
      'CH₄': 'Methane',
      'C₂H₆': 'Ethane',
      'C₃H₈': 'Propane',
      'O₂': 'Oxygen Gas'
    };

    const elementName = elementNames[symbol] || symbol;
    speak(`Added ${symbol} to beaker, ${symbol} stands for ${elementName}`);

    // Show reaction equation if we have 2 atoms
    if (beakerContents.length === 2) {
      showReactionEquation();
    }
  } else {
    // Beaker is full, speak feedback
    speak('Beaker is full!');
  }
}

// Show reaction equation at bottom of beaker
function showReactionEquation() {
  if (beakerContents.length < 2) return;

  const s1 = beakerContents[0].symbol;
  const s2 = beakerContents[1].symbol;
  const reactants = currentChallenge.reactants;

  // Check if this is the correct combination
  if (reactants.includes(s1) && reactants.includes(s2)) {
    // SUCCESS! Show green reaction box in center of webcam
    const elementNames = {
      'Na': 'Sodium', 'Cl': 'Chlorine', 'K': 'Potassium', 'Br': 'Bromine', 'Ca': 'Calcium', 'O': 'Oxygen',
      'Mg': 'Magnesium', 'S': 'Sulfur', 'H': 'Hydrogen', 'F': 'Fluorine', 'I': 'Iodine', 'C': 'Carbon',
      'Fe': 'Iron', 'Al': 'Aluminum', 'Cu': 'Copper', 'Zn': 'Zinc', 'Ag': 'Silver', 'Pb': 'Lead',
      'Ba': 'Barium', 'NaCl': 'Sodium Chloride', 'BaCl₂': 'Barium Chloride', 'Na₂SO₄': 'Sodium Sulfate',
      'Pb(NO₃)₂': 'Lead Nitrate', 'KI': 'Potassium Iodide', 'CaCO₃': 'Calcium Carbonate', 'Fe₂O₃': 'Iron Oxide'
    };

    const name1 = elementNames[s1] || s1;
    const name2 = elementNames[s2] || s2;
    const productName = elementNames[currentChallenge.product] || currentChallenge.product;

    // Show green reaction box with full names
    showHintBox(`${name1} + ${name2} → ${productName}`);

    // Add to history with full names (disabled - using centered green box instead)
    // addReactionToHistory(s1, s2, currentChallenge.product);
    speak(`Correct! ${s1} + ${s2} → ${currentChallenge.product}`);

    // Complete challenge after delay (atoms already removed)
    setTimeout(() => {
      beakerContents = [];
      completeScienceChallenge();
    }, 3000);
  } else {
    // Wrong combination - show brief message
    speak('Try a different combination!');

    // Reset after delay (atoms already removed, just clear beaker)
    setTimeout(() => {
      beakerContents = [];
    }, 2000);
  }
}

// Show hint box in center of webcam
function showHintBox(message) {
  // Remove existing hint box
  const existingHint = document.querySelector('.hint-box');
  if (existingHint) {
    existingHint.remove();
  }

  // Create hint box
  const hintBox = document.createElement('div');
  hintBox.className = 'hint-box';
  hintBox.style.cssText = `
    position: fixed;
    left: 50%;
    top: 80px;
    transform: translateX(-50%);
    background: linear-gradient(145deg, #4CAF50, #45a049);
    color: white;
    padding: 15px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    border: 2px solid #2E7D32;
    z-index: 200;
    max-width: 300px;
    word-wrap: break-word;
    animation: fadeIn 0.3s ease-out;
  `;

  hintBox.textContent = message;

  // Add fadeIn animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-50%) scale(0.8); }
      to { opacity: 1; transform: translateX(-50%) scale(1); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateX(-50%) scale(1); }
      to { opacity: 0; transform: translateX(-50%) scale(0.8); }
    }
  `;
  if (!document.querySelector('#hint-animation-style')) {
    style.id = 'hint-animation-style';
    document.head.appendChild(style);
  }

  document.body.appendChild(hintBox);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (hintBox.parentNode) {
      hintBox.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (hintBox.parentNode) {
          hintBox.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Reaction text functions removed - reactions now only appear in History section

// Add reaction to history sidebar
function addReactionToHistory(symbol1, symbol2, product) {
  // Get element names
  const elementNames = {
    'Na': 'Sodium',
    'Cl': 'Chlorine',
    'K': 'Potassium',
    'Br': 'Bromine',
    'Ca': 'Calcium',
    'O': 'Oxygen',
    'Mg': 'Magnesium',
    'S': 'Sulfur',
    'H': 'Hydrogen',
    'F': 'Fluorine',
    'I': 'Iodine',
    'C': 'Carbon',
    'Fe': 'Iron',
    'Al': 'Aluminum',
    'Cu': 'Copper',
    'Zn': 'Zinc',
    'Ag': 'Silver',
    'Pb': 'Lead',
    'Ba': 'Barium',
    'NH₃': 'Ammonia',
    'NaOH': 'Sodium Hydroxide',
    'HCl': 'Hydrochloric Acid',
    'H₂SO₄': 'Sulfuric Acid',
    'HNO₃': 'Nitric Acid',
    'Ca(OH)₂': 'Calcium Hydroxide',
    'CuSO₄': 'Copper Sulfate',
    'AgNO₃': 'Silver Nitrate',
    'NaCl': 'Sodium Chloride',
    'BaCl₂': 'Barium Chloride',
    'Na₂SO₄': 'Sodium Sulfate',
    'Pb(NO₃)₂': 'Lead Nitrate',
    'KI': 'Potassium Iodide',
    'CaCO₃': 'Calcium Carbonate',
    'Fe₂O₃': 'Iron Oxide',
    'CH₄': 'Methane',
    'C₂H₆': 'Ethane',
    'C₃H₈': 'Propane',
    'O₂': 'Oxygen Gas'
  };

  const name1 = elementNames[symbol1] || symbol1;
  const name2 = elementNames[symbol2] || symbol2;
  const productName = elementNames[product] || product;

  // Get atomic numbers
  const atomicNumbers = {
    'Na': '11', 'Cl': '17', 'K': '19', 'Br': '35', 'Ca': '20', 'O': '8',
    'Mg': '12', 'S': '16', 'H': '1', 'F': '9', 'I': '53', 'C': '6',
    'Fe': '26', 'Al': '13', 'Cu': '29', 'Zn': '30', 'Ag': '47', 'Pb': '82',
    'Ba': '56', 'NH₃': '', 'NaOH': '', 'HCl': '', 'H₂SO₄': '', 'HNO₃': '',
    'Ca(OH)₂': '', 'CuSO₄': '', 'AgNO₃': '', 'NaCl': '', 'BaCl₂': '',
    'Na₂SO₄': '', 'Pb(NO₃)₂': '', 'KI': '', 'CaCO₃': '', 'Fe₂O₃': '',
    'CH₄': '', 'C₂H₆': '', 'C₃H₈': '', 'O₂': ''
  };

  const num1 = atomicNumbers[symbol1] || '';
  const num2 = atomicNumbers[symbol2] || '';
  const productNum = atomicNumbers[product] || '';

  // Create history entry
  const historyEntry = document.createElement("div");
  historyEntry.className = "history-badge";
  historyEntry.style.cssText = `
    background: linear-gradient(145deg, #4CAF50, #45a049);
    color: white;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
    border: 2px solid #2E7D32;
    min-width: 220px;
    max-width: 100%;
    animation: slideIn 0.3s ease-out;
  `;

  // Create the reaction text with full names and atomic numbers
  historyEntry.innerHTML = `
    <div style="font-size: 11px; color: white; line-height: 1.1; text-align: center;">
      <div style="margin-bottom: 2px; font-weight: bold;">${name1} + ${name2} → ${productName}</div>
      <div style="font-size: 9px; color: #E8F5E8; opacity: 0.8;">
        ${num1 ? `${symbol1} - ${num1}` : ''} ${num2 ? `+ ${symbol2} - ${num2}` : ''} ${productNum ? `→ ${product} - ${productNum}` : ''}
      </div>
    </div>
  `;

  // Add slideIn animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  if (!document.querySelector('#history-animation-style')) {
    style.id = 'history-animation-style';
    document.head.appendChild(style);
  }

  // Find the history container
  const historyContainer = document.querySelector('.history-container') ||
    document.querySelector('#history-container') ||
    document.querySelector('.drop-box');

  // If we found an existing container, make sure it's positioned properly
  if (historyContainer) {
    historyContainer.style.position = 'fixed';
    historyContainer.style.left = '50%';
    historyContainer.style.top = '20px';
    historyContainer.style.transform = 'translateX(-50%)';
    historyContainer.style.width = '300px';
    historyContainer.style.maxHeight = '150px';
    historyContainer.style.overflowY = 'auto';
    historyContainer.style.zIndex = '100';
    historyContainer.style.background = 'rgba(255, 255, 255, 0.1)';
    historyContainer.style.border = '2px dashed #FFD700';
    historyContainer.style.borderRadius = '10px';
    historyContainer.style.padding = '10px';
  }

  if (historyContainer) {
    // Add to the top of history
    historyContainer.insertBefore(historyEntry, historyContainer.firstChild);

    // Limit history to 5 entries (fits in viewport without scroll)
    const entries = historyContainer.querySelectorAll('.history-badge');
    if (entries.length > 5) {
      historyContainer.removeChild(entries[entries.length - 1]);
    }
  } else {
    // Fallback: create history container if it doesn't exist
    const fallbackContainer = document.createElement("div");
    fallbackContainer.className = "history-container";
    fallbackContainer.style.cssText = `
      position: fixed;
      left: 50%;
      top: 20px;
      transform: translateX(-50%);
      width: 300px;
      max-height: 150px;
      overflow-y: auto;
      z-index: 100;
      background: rgba(255, 255, 255, 0.1);
      border: 2px dashed #FFD700;
      border-radius: 10px;
      padding: 10px;
    `;
    fallbackContainer.appendChild(historyEntry);
    document.body.appendChild(fallbackContainer);
  }
}

// Update tracked atoms to follow hands
function updateTrackedAtoms() {
  if (selectedModuleName !== 'science') return;

  // Get current hand landmarks from the global results
  if (!window.currentHandLandmarks) return;

  // Only use the first (primary) hand to avoid conflicts with multiple hands
  if (window.currentHandLandmarks && window.currentHandLandmarks.length > 0) {
    const primaryHand = window.currentHandLandmarks[0];
    if (primaryHand && primaryHand.length > 8) {
      const indexFinger = primaryHand[8];
      const fingerX = indexFinger.x * videoEl.videoWidth;
      const fingerY = indexFinger.y * videoEl.videoHeight;

      // Convert to screen coordinates
      const videoRect = videoEl.getBoundingClientRect();
      const screenX = videoRect.left + (fingerX / videoEl.videoWidth) * videoRect.width;
      const screenY = videoRect.top + (fingerY / videoEl.videoHeight) * videoRect.height;

      // Check each atom to see if it should be tracked by the primary hand
      activeAtoms.forEach(atom => {
        if (atom.el.dataset.isBeingTracked === "true") {
          const atomRect = atom.el.getBoundingClientRect();
          const atomCenterX = atomRect.left + atomRect.width / 2;
          const atomCenterY = atomRect.top + atomRect.height / 2;

          const distance = Math.sqrt(
            Math.pow(atomCenterX - screenX, 2) +
            Math.pow(atomCenterY - screenY, 2)
          );

          if (distance < 100) {
            // Update atom position to follow the primary hand's finger
            atom.el.style.left = `${screenX - 30}px`;
            atom.el.style.top = `${screenY - 30}px`;

            // Check if atom is near the beaker
            checkBeakerProximity(atom.el, screenX, screenY);
          } else {
            // Hand moved away, stop tracking
            atom.el.dataset.isBeingTracked = "false";
            atom.el.style.transform = "scale(1)";
            atom.el.style.zIndex = "100";
          }
        }
      });
    }
  }
}

/**
 * Initializes the MediaPipe HandLandmarker.
 * - Loads the necessary WASM bundle
 * - Creates the handLandmarker with VIDEO mode and a single hand for efficiency
 */
async function initializeHandLandmarker() {
  // Show loading indicator while model is being prepared
  loadingEl.style.display = "block";

  // Resolve local paths to the WASM assets used by the Tasks library
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  // Create the hand landmarker with options
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      // Pretrained hand landmark model hosted by Google
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    },
    runningMode: "VIDEO",
    numHands: 2 // Re-enabled two-hand tracking
  });

  // Ready to draw
  drawingUtils = new DrawingUtils(canvasCtx);

  // Hide loading indicator once the model is ready
  loadingEl.style.display = "none";
}

// Part 2: Camera and Game Loop
/**
 * Requests access to the webcam and starts the prediction loop.
 */
async function enableWebcam() {
  const constraints = { video: { width: 640, height: 480 } };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoEl.srcObject = stream;
  await videoEl.play();

  // Set canvas dimensions to match the video feed's actual resolution
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  try { canvasEl.style.zIndex = '60'; } catch (_) { }

  requestAnimationFrame(predictWebcam);
}

/**
 * Main loop: runs on each animation frame.
 * - Detects hands in the current video frame
 * - Draws landmarks and connectors
 * - Moves the custom cursor to the index fingertip (landmark #8)
 */
function predictWebcam() {
  const nowInMs = Date.now();
  // Ensure canvas stays above letters
  try { if (canvasEl && canvasEl.style) canvasEl.style.zIndex = '60'; } catch (_) { }
  // Avoid reprocessing the same frame
  if (videoEl.currentTime === lastVideoTime) {
    requestAnimationFrame(predictWebcam);
    return;
  }
  lastVideoTime = videoEl.currentTime;

  // Run detection
  const results = handLandmarker.detectForVideo(videoEl, nowInMs);

  // Clear canvas
  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (results && results.landmarks) {
    // Store landmarks globally for atom tracking
    window.currentHandLandmarks = results.landmarks;

    // Call the new interaction logic
    interactWithLetters(results.landmarks, videoEl);

    // Update tracked atoms for Science module
    updateTrackedAtoms();

    // Draw landmarks and connections for each hand (still using drawingUtils)
    for (const landmarks of results.landmarks) { // Iterate over landmarks for drawing
      drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
        color: "#0ea5e9",
        lineWidth: 2
      });
      drawingUtils.drawLandmarks(landmarks, { color: "#22d3ee", lineWidth: 1 });
    }
  }

  requestAnimationFrame(predictWebcam);
}

// ---- Spawning (Stationary letters) ----
function stopSpawning() {
  if (spawnTimer) {
    clearInterval(spawnTimer);
    spawnTimer = null;
  }
}

function spawnLetter(letterToSpawn) {
  // Create a stationary letter element at a random position inside the VISIBLE webcam area (#webcam), fully within bounds.
  const el = document.createElement("div");
  el.className = "letter game-item"; // Added game-item class
  const char = letterToSpawn;
  el.innerText = letterToSpawn;

  // Determine webcam visible rect (use video element since it matches canvas)
  const areaRect = videoEl.getBoundingClientRect();

  // Append hidden first to measure actual size
  el.style.visibility = "hidden";
  (uiContainerEl || containerEl || document.body).appendChild(el);

  const measuredRect = el.getBoundingClientRect();
  const letterWidth = measuredRect.width || 40;
  const letterHeight = measuredRect.height || 40;

  // Safe margins so letters never clip - increased margins for better containment
  const margin = 60; // Increased margin
  const minX = areaRect.left + margin;
  const minY = areaRect.top + margin;
  const maxX = areaRect.right - letterWidth - margin;
  const maxY = areaRect.bottom - letterHeight - margin;
  const safeWidth = Math.max(0, maxX - minX);
  const safeHeight = Math.max(0, maxY - minY);
  const x = minX + Math.random() * safeWidth;
  const y = minY + Math.random() * safeHeight;

  // Since letters are position: fixed, set absolute page coordinates
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.visibility = "visible";

  // Add box styling for Level 3 (Apple to Zebra)
  const level = getCurrentLevel();
  const currentLevelNum = Number(level?.level);

  if (false) {
    el.style.background = "linear-gradient(145deg, #87CEEB, #4682B4)"; // Light blue gradient background
    el.style.border = "3px solid #4169E1"; // Dark blue border
    el.style.borderRadius = "15px"; // Rounded corners
    el.style.padding = "12px 20px"; // More padding inside the box
    el.style.color = "#1E3A8A"; // Dark blue text
    el.style.textShadow = "1px 1px 2px rgba(255,255,255,0.8)"; // White outline
    el.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)"; // Deeper shadow
    el.style.fontSize = "32px";
    el.style.fontWeight = "800";
    el.style.minWidth = "100px"; // Wider minimum width
    el.style.minHeight = "60px"; // Minimum height for box
    el.style.textAlign = "center";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.lineHeight = "1";
  }

  activeLetters.push({ el, char });
}

// Spawn a letter at a specific screen coordinate (px), ensuring visibility
function spawnLetterAt(letterToSpawn, x, y) {
  const el = document.createElement("div");
  el.className = "letter game-item";
  const char = letterToSpawn;
  el.innerText = letterToSpawn;
  // Append to measure size if needed
  el.style.visibility = "hidden";
  (uiContainerEl || containerEl || document.body).appendChild(el);
  const measuredRect = el.getBoundingClientRect();
  const letterWidth = measuredRect.width || 40;
  const letterHeight = measuredRect.height || 40;
  // Clamp within viewport - increased margins for better containment
  const areaRect = videoEl.getBoundingClientRect();
  const margin = 60; // Increased margin
  const minX = areaRect.left + margin;
  const minY = areaRect.top + margin;
  const maxX = areaRect.right - letterWidth - margin;
  const maxY = areaRect.bottom - letterHeight - margin;
  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));
  el.style.left = `${clampedX}px`;
  el.style.top = `${clampedY}px`;
  el.style.visibility = "visible";

  // Add box styling for Level 3 and Level 5
  const level = getCurrentLevel();
  const currentLevelNum = Number(level?.level);
  const isLevel3 = false;
  const isLevel5 = false;

  // Debug logging
  console.log('Box styling check:', { selectedModuleName, currentLevelNum, isLevel3, isLevel5 });

  if (isLevel3 || isLevel5) {
    el.style.background = "linear-gradient(145deg, #87CEEB, #4682B4)"; // Light blue gradient background
    el.style.border = "3px solid #4169E1"; // Dark blue border
    el.style.borderRadius = "15px"; // Rounded corners
    el.style.padding = "12px 20px"; // More padding inside the box
    el.style.color = "#1E3A8A"; // Dark blue text
    el.style.textShadow = "1px 1px 2px rgba(255,255,255,0.8)"; // White outline
    el.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)"; // Deeper shadow
    el.style.fontSize = "32px";
    el.style.fontWeight = "800";
    el.style.minWidth = "100px"; // Wider minimum width
    el.style.minHeight = "60px"; // Minimum height for box
    el.style.textAlign = "center";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.lineHeight = "1";
  }

  activeLetters.push({ el, char });
}

function updateScore() {
  if (scoreEl) {
    scoreEl.textContent = `Score: ${score}`;
  }
}

function updateTip() {
  try {
    if (!tipBoxEl) {
      return;
    }
    // Show context-aware tip depending on level type
    const level = getCurrentLevel();
    const levelType = getCurrentLevelType();
    if (levelType === 'multiple_choice') {
      const problems = level.problems || [];
      const current = problems[currentItemIndex];
      tipBoxEl.textContent = current ? `${current.question}` : "Level complete";
    } else if (levelType === 'actions') {
      try {
        const problems = level.problems || [];
        const current = problems[currentItemIndex];
        if (current && current.word) {
          const hint = (level.hints && level.hints[current.word]) || 'action';
          tipBoxEl.textContent = `Catch the action word for ${hint}!`;
        } else {
          tipBoxEl.textContent = 'Level complete';
        }
      } catch (_) {
        tipBoxEl.textContent = 'Catch the action word!';
      }
    } else if (levelType === 'opposites') {
      try {
        const problems = level.problems || [];
        const current = problems[currentItemIndex];
        if (current && current.base) {
          tipBoxEl.textContent = `Catch the opposite of ${current.base}!`;
        } else {
          tipBoxEl.textContent = 'Level complete';
        }
      } catch (_) {
        tipBoxEl.textContent = 'Catch the opposite!';
      }
    } else if (levelType === 'numbers') {
      try {
        const problems = level.problems || [];
        const current = problems[currentItemIndex];
        if (current && current.number) {
          tipBoxEl.textContent = `Catch the number ${current.number}!`;
        } else {
          tipBoxEl.textContent = 'Level complete';
        }
      } catch (_) {
        tipBoxEl.textContent = 'Catch the number!';
      }
    } else if (levelType === 'weather') {
      // Weather level removed
      tipBoxEl.textContent = '';
    } else if (levelType === 'color_match') {
      const problems = level.problems || [];
      const current = problems[currentItemIndex];
      if (current) {
        const color = String(current.color || '').toUpperCase();
        // Use level-specific hints if available, else fallback map
        let hint = '';
        try {
          const lvl = getCurrentLevel();
          const hints = (lvl && lvl.hints) || {};
          hint = hints[color] || '';
        } catch (_) { }
        if (!hint) {
          const fallbackHintMap = {
            RED: 'apple', BLUE: 'sky', GREEN: 'leaf', YELLOW: 'banana',
            ORANGE: 'orange', PURPLE: 'grapes', PINK: 'flower', BROWN: 'chocolate',
            BLACK: 'night', WHITE: 'milk', GRAY: 'cloud'
          };
          hint = fallbackHintMap[color] || '';
        }
        tipBoxEl.textContent = hint ? `Hint: ${hint}` : '';
      } else {
        tipBoxEl.textContent = '';
      }
    } else {
      const items = level.items || [];
      const next = items[currentItemIndex];
      if (next) {
        tipBoxEl.textContent = `Try ${next} next`;
      } else {
        // Use subject-specific tip when no specific item
        updateTipForSubject();
      }
    }
  } catch (_) {
    // ignore UI errors
  }
}

// Dynamic task text and tips based on subject
function updateTaskText() {
  const taskTextEl = document.querySelector('.task-text');
  if (!taskTextEl) return;

  const subject = selectedModuleName.toLowerCase();

  switch (subject) {
    case 'maths':
    case 'mathematics':
      taskTextEl.textContent = 'Choose the correct answer';
      break;

    case 'hindi':
      taskTextEl.textContent = 'Tap अ to ज्ञ in order';
      break;
    case 'science':
      taskTextEl.textContent = 'Combine atoms to form compounds';
      break;
    case 'social':
    case 'social science':
      taskTextEl.textContent = 'Learn about the world';
      break;
    default:
      taskTextEl.textContent = 'Complete the task';
  }
}

function updateTipForSubject() {
  if (!tipBoxEl) return;

  const subject = selectedModuleName.toLowerCase();

  switch (subject) {
    case 'maths':
    case 'mathematics':
      tipBoxEl.textContent = 'BODMAS';
      break;

    case 'hindi':
      tipBoxEl.textContent = 'Try अ next';
      break;
    case 'science':
      tipBoxEl.textContent = 'Touch atoms to combine them';
      break;
    case 'social':
    case 'social science':
      tipBoxEl.textContent = 'Try Social next';
      break;
    default:
      tipBoxEl.textContent = 'Try next';
  }
}

// ---- Button Event Listeners ----
const startButtonSide = document.getElementById("startButtonSide");
if (startButtonSide) {
  startButtonSide.addEventListener("click", () => {
    console.log("Start button clicked");
    startGame();
  });
}

const restartLevelButton = document.getElementById("restartLevelButton");
if (restartLevelButton) {
  restartLevelButton.addEventListener("click", () => {
    // Restart the current level without changing progress
    clearGameArea();
    // Clear history panel too
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        box.innerHTML = '';
      }
    } catch (_) { }
    currentItemIndex = 0;
    isGameRunning = true;

    if (selectedModuleName === 'science') {
      initializeScienceModule();
      return;
    }
    if (selectedModuleName === 'coding') {
      initializeCodingModule();
      return;
    }

    spawnNextItem();
  });
}

function startGame() {
  console.log("startGame() called."); // Debugging log
  // Show End Game button
  if (endGameButtonEl) {
    endGameButtonEl.style.display = "block";
  }

  // Update task text and tips based on subject
  updateTaskText();
  updateTipForSubject();

  // Reset score and progression within the current level
  score = 0;
  updateScore();
  currentItemIndex = 0;
  updateTip();

  // Update level display
  if (levelDisplayEl) {
    const level = getCurrentLevel();
    levelDisplayEl.textContent = `Level: ${level.level}`;
  }

  // Hide game over screen if visible
  if (gameOverScreen) {
    gameOverScreen.style.display = "none";
  }

  // Clear any existing letters in DOM and state
  for (const l of activeLetters) {
    if (l.el && l.el.parentNode) {
      l.el.parentNode.removeChild(l.el);
    }
  }
  activeLetters = [];

  // Clear history panel
  try {
    const box = document.getElementById('dropBox');
    if (box) {
      box.innerHTML = '';
    }
  } catch (_) { }

  // Start game and spawn the first item for this level
  isGameRunning = true;

  if (selectedModuleName === 'coding') {
    initializeCodingModule();
    return;
  }

  // If current is phonics, (re)build a randomized A–Z problems list
  try {
    const lvl = getCurrentLevel();
    if (lvl && lvl.type === 'phonics') {
      const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (let i = az.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [az[i], az[j]] = [az[j], az[i]];
      }
      lvl.problems = az.map(ch => ({ letter: ch }));
    }
    // Speak level intro voice if provided and not yet spoken
    if (lvl && lvl.introVoice) {
      const key = `intro_spoken_level_${String(lvl.level)}`;
      if (!spawnNextItem[key]) {
        spawnNextItem[key] = true;
        setTimeout(() => speak(lvl.introVoice), 250);
      }
    }
  } catch (_) { }
  spawnNextItem();
}

function spawnNextItem() {
  if (!isGameRunning) {
    return;
  }
  const level = getCurrentLevel();
  const levelType = getCurrentLevelType();
  // Ensure problem sets are prepared for problem-based levels before counting
  if (levelType === 'opposites') {
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const pairs = Array.isArray(level.pairs) ? level.pairs : [];
        level.problems = pairs.map(([a, b]) => ({ base: String(a).toUpperCase(), opposite: String(b).toUpperCase() }));
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
  }
  if (levelType === 'actions') {
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const words = Array.isArray(level.words) ? level.words : [];
        level.problems = words.map(w => ({ word: String(w).toUpperCase() }));
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
  }
  if (levelType === 'numbers') {
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const numbers = Array.isArray(level.numbers) ? level.numbers : [];
        level.problems = numbers.map(n => ({ number: String(n).toUpperCase() }));
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
  }
  if (levelType === 'weather') {
    // Weather level removed
  }

  // Handle Science module & Coding module
  if (selectedModuleName === 'science' || selectedModuleName === 'coding') {
    // Both modules have their own specialized initializers called from startGame
    return;
  }

  const totalCount = levelType === 'multiple_choice'
    ? (level.problems || []).length
    : selectedModuleName === 'science'
      ? (level.challenges || []).length || 4 // Default to 4 challenges per science level
      : selectedModuleName === 'coding'
        ? 1 // Coding has 1 puzzle per level
        : ((levelType === 'phonics' || levelType === 'color_match' || levelType === 'opposites' || levelType === 'actions' || levelType === 'numbers') ? (level.problems || []).length : (level.items || []).length);

  // If we just finished the last item/problem in this level
  if (currentItemIndex >= totalCount) {
    // Speak any level-specific completion voice immediately on completion
    try { maybeSpeakLevelCompletion(level); } catch (_) { }
    // Is there another level?
    const activeArray = getActiveModuleArray();
    if (currentLevelIndex < activeArray.length - 1) {
      // Mark current level as completed so right sidebar turns green
      try { markLevelComplete(currentLevelIndex); } catch (_) { }
      // Show Level Complete popup with options
      showLevelCompletePopup();
      return;
    }
    // No more levels: module complete
    try { markLevelComplete(currentLevelIndex); } catch (_) { }
    endGame("Congratulations! You've finished the Module!");
    return;
  }
  if (levelType === 'multiple_choice') {
    const problem = (level.problems || [])[currentItemIndex];
    spawnMathProblem(problem);
  } else if (levelType === 'phonics') {
    const problem = (level.problems || [])[currentItemIndex];
    spawnPhonicsOptions(problem);
    updateTip();
  } else if (levelType === 'opposites') {
    // Build problems from pairs on first entry
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const pairs = Array.isArray(level.pairs) ? level.pairs : [];
        level.problems = pairs.map(([a, b]) => ({ base: String(a).toUpperCase(), opposite: String(b).toUpperCase() }));
        // Shuffle for variety
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
    const problem = (level.problems || [])[currentItemIndex];
    spawnOppositesProblem(problem);
    updateTip();
  } else if (levelType === 'actions') {
    // Prepare problems from words
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const words = Array.isArray(level.words) ? level.words : [];
        // Map to problems with hint lookup
        level.problems = words.map(w => ({ word: String(w).toUpperCase() }));
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
    const problem = (level.problems || [])[currentItemIndex];
    spawnActionsProblem(problem);
    updateTip();
  } else if (levelType === 'numbers') {
    // Prepare problems from numbers list
    try {
      if (!Array.isArray(level.problems) || level.problems.length === 0) {
        const numbers = Array.isArray(level.numbers) ? level.numbers : [];
        level.problems = numbers.map(n => ({ number: String(n).toUpperCase() }));
        for (let i = level.problems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [level.problems[i], level.problems[j]] = [level.problems[j], level.problems[i]];
        }
      }
    } catch (_) { }
    const problem = (level.problems || [])[currentItemIndex];
    spawnNumbersProblem(problem);
    updateTip();
  } else if (levelType === 'weather') {
    // Weather level removed
    return;
  } else if (selectedModuleName === 'science') {
    // Science module - initialize with correct level
    initializeScienceModule();
  } else if (levelType === 'color_match') {
    const problem = (level.problems || [])[currentItemIndex];
    spawnColorMatch(problem);
    updateTip();
  } else {
    const nextItem = (level.items || [])[currentItemIndex];
    spawnLetter(nextItem);
    updateTip();
  }
}

// Timer functions removed in A–Z mode

function endGame(message) {
  // Reset button visibility
  if (endGameButtonEl) {
    endGameButtonEl.style.display = "none";
  }

  // Stop game state and any spawning safety
  isGameRunning = false;
  stopSpawning();

  // Clear any existing letters or items (safe)
  try {
    const gameItems = document.querySelectorAll('.game-item');
    gameItems.forEach(item => item.parentNode.removeChild(item));
    activeLetters = [];
  } catch (_) { }

  // Remove beaker image if Science module was active
  removeBeakerImage();

  // Show the Game Over screen
  if (gameOverScreen) {
    if (gameOverMessageEl) {
      const subjectName = selectedModuleName.charAt(0).toUpperCase() + selectedModuleName.slice(1);
      gameOverMessageEl.textContent = `${subjectName} Game Over!`; // Dynamic message
    }
    if (finalScoreDisplay) {
      finalScoreDisplay.textContent = `Final Score: ${score}`;
    }
    gameOverScreen.style.display = "flex";
  }

  // Save last score
  try {
    localStorage.setItem("lastGameScore", String(score));
  } catch (_) {
    // ignore storage errors
  }
}

// ---- Multiple Choice Spawning ----
function spawnMathProblem(problem) {
  if (!problem) return;
  try {
    clearGameArea();
    if (tipBoxEl) {
      tipBoxEl.innerHTML = `<span style="font-size: 24px;">${problem.question}</span>`;
    }

    const answers = Array.isArray(problem.answers) ? problem.answers : [];
    let options = [...answers];
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 120; // safe boundaries
    const topY = areaRect.top + 0.3 * h;
    const positions = [
      { x: areaRect.left + margin, y: topY },
      { x: areaRect.left + w / 2, y: topY },
      { x: areaRect.right - margin, y: topY }
    ];

    for (let i = 0; i < Math.min(3, options.length); i++) {
      const answerVal = String(options[i]);
      const pos = positions[i] || positions[0];
      spawnLetterAt(answerVal, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        added.el.style.background = "linear-gradient(135deg, #1E90FF, #0000CD)";
        added.el.style.border = "4px solid #FFF";
        added.el.style.borderRadius = "50%";
        added.el.style.width = "100px";
        added.el.style.height = "100px";
        added.el.style.display = "flex";
        added.el.style.alignItems = "center";
        added.el.style.justifyContent = "center";
        added.el.style.color = "#FFF";
        added.el.style.boxShadow = "0 8px 16px rgba(0,0,0,0.5)";
        added.el.style.fontSize = "40px";
        added.el.style.fontWeight = "bold";
        added.el.style.textShadow = "2px 2px 4px rgba(0,0,0,0.4)";
        added.el.style.textAlign = "center";
        added.el.style.padding = "0";
      }
    }

    spawnMathProblem.expected = String(problem.correctAnswer);
    setTimeout(() => speak(`What is ${problem.question}`), 200);
  } catch (e) {
    console.warn('spawnMathProblem failed', e);
  }
}

// ---- Multiple Choice Capture ----
function handleMultipleChoiceCapture(letter) {
  if (letter && letter.dataset && letter.dataset.cooldown === '1') {
    return;
  }
  if (letter && letter.dataset) {
    letter.dataset.cooldown = '1';
    setTimeout(() => { try { if (letter && letter.dataset) delete letter.dataset.cooldown; } catch (_) { } }, 700);
  }

  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;

  const chosen = String(letter.innerText || '').trim();
  const target = String(problem.correctAnswer || spawnMathProblem.expected || '').trim();
  const isCorrect = chosen === target;

  if (isCorrect) {
    score += 10;
    speak('Correct!');
    clearGameArea();

    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = `${problem.question} ${target}`;
        box.appendChild(badge);
      }
    } catch (_) { }

    currentItemIndex += 1;
    const nextProblem = problems[currentItemIndex];
    if (nextProblem) {
      setTimeout(() => { spawnMathProblem(nextProblem); updateTip(); }, 800);
    } else {
      setTimeout(() => showLevelCompletePopup(), 600);
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => {
      letter.classList.remove('wrong-answer-shake');
    }, { once: true });
    speak('Incorrect, try again');
  }
}

// ---- Audio and Speech ----
function speak(text) {
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (e) {
    // Non-fatal if speech not supported
    console.warn("Speech synthesis unavailable:", e);
  }
}

// ---- Opposites Level Spawning ----
function spawnOppositesProblem(problem) {
  if (!problem) return;
  try {
    clearGameArea();
    const level = getCurrentLevel();
    const allPairs = Array.isArray(level.pairs) ? level.pairs : [];
    const base = String(problem.base || '').toUpperCase();
    const correct = String(problem.opposite || '').toUpperCase();
    // Build distractor pool using any word except correct and base
    const pool = [];
    for (const p of allPairs) {
      if (Array.isArray(p) && p.length === 2) {
        const a = String(p[0]).toUpperCase();
        const b = String(p[1]).toUpperCase();
        if (a !== correct && a !== base) pool.push(a);
        if (b !== correct && b !== base) pool.push(b);
      }
    }
    const distractor = pickRandomSubset(pool, 1)[0];
    const options = [correct, distractor].filter(Boolean);

    // Position two options like color level (top-left and top-right) - safer boundaries
    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 80; // Increased margin for containment
    const topY = areaRect.top + 0.15 * h; // Slightly lower to avoid top edge
    const leftX = areaRect.left + margin;
    const rightX = areaRect.right - margin;
    const positions = [
      { x: leftX, y: topY },
      { x: rightX, y: topY }
    ];

    // Alternate expected position like color level
    const prevPos = typeof spawnOppositesProblem._prevExpectedPos === 'number' ? spawnOppositesProblem._prevExpectedPos : -1;
    const expectedPos = prevPos === 0 ? 1 : 0;
    spawnOppositesProblem._prevExpectedPos = expectedPos;
    const arranged = expectedPos === 0 ? [correct, distractor] : [distractor, correct];

    arranged.forEach((word, idx) => {
      const pos = positions[idx];
      spawnLetterAt(word, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        // Soft pastel pill styling
        const pastel = ['#93c5fd', '#fbcfe8'][idx % 2];
        added.el.style.color = '#0b1022';
        added.el.style.background = pastel;
        added.el.style.padding = '6px 10px';
        added.el.style.borderRadius = '10px';
        added.el.style.textShadow = 'none';
      }
    });
    spawnOppositesProblem.expected = correct;
    // Voice prompt
    setTimeout(() => speak(`Catch the opposite of ${problem.base}`), 200);
  } catch (e) {
    console.warn('spawnOppositesProblem failed', e);
  }
}

// ---- Actions Level Spawning ----
function spawnActionsProblem(problem) {
  if (!problem) return;
  try {
    clearGameArea();
    const level = getCurrentLevel();
    const allWords = Array.isArray(level.words) ? level.words.map(w => String(w).toUpperCase()) : [];
    const correct = String(problem.word || '').toUpperCase();
    let pool = allWords.filter(w => w !== correct);
    if (pool.length < 2) {
      pool = ["RUN", "JUMP", "EAT", "SLEEP", "PLAY", "READ"].filter(w => w !== correct);
    }
    const distractors = pickRandomSubset(pool, 2);
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Three options along the top - safer boundaries
    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 80; // Increased margin for containment
    const topY = areaRect.top + 0.15 * h; // Slightly lower to avoid top edge
    const positions = [
      { x: areaRect.left + margin, y: topY },
      { x: areaRect.left + w / 2, y: topY },
      { x: areaRect.right - margin, y: topY }
    ];
    const palette = ['#facc15', '#ef4444', '#22c55e'];
    for (let i = 0; i < Math.min(3, options.length); i++) {
      const word = options[i];
      const pos = positions[i];
      spawnLetterAt(word, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        added.el.style.background = palette[i % palette.length];
        added.el.style.color = '#0b1022';
        added.el.style.padding = '6px 12px';
        added.el.style.borderRadius = '10px';
        added.el.style.textShadow = 'none';
      }
    }
    spawnActionsProblem.expected = correct;
    // Prompt
    try {
      const hint = (level.hints && level.hints[correct]) || 'action';
      if (tipBoxEl) tipBoxEl.textContent = `Catch the action word for ${hint}!`;
      setTimeout(() => speak(`Catch the action word for ${hint}`), 150);
    } catch (_) { }
  } catch (e) {
    console.warn('spawnActionsProblem failed', e);
  }
}

// ---- Numbers Level Spawning ----
function spawnNumbersProblem(problem) {
  if (!problem) return;
  try {
    clearGameArea();
    const level = getCurrentLevel();
    const all = Array.isArray(level.numbers) ? level.numbers.map(n => String(n).toUpperCase()) : [];
    const correct = String(problem.number || '').toUpperCase();
    let pool = all.filter(n => n !== correct);
    if (pool.length < 2) pool = ["ONE", "TWO", "THREE", "FOUR", "FIVE"].filter(n => n !== correct);
    const distractors = pickRandomSubset(pool, 2);
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 80; // Increased margin for containment
    const topY = areaRect.top + 0.15 * h; // Slightly lower to avoid top edge
    const positions = [
      { x: areaRect.left + margin, y: topY },
      { x: areaRect.left + w / 2, y: topY },
      { x: areaRect.right - margin, y: topY }
    ];
    const colors = ['#60a5fa', '#fb923c', '#a78bfa'];
    for (let i = 0; i < Math.min(3, options.length); i++) {
      const word = options[i];
      const pos = positions[i];
      spawnLetterAt(word, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        added.el.style.background = colors[i % colors.length];
        added.el.style.color = '#0b1022';
        added.el.style.padding = '6px 12px';
        added.el.style.borderRadius = '10px';
        added.el.style.textShadow = 'none';
      }
    }
    spawnNumbersProblem.expected = correct;
    // Voice prompt: speak numeric and show tip already handled by updateTip
    setTimeout(() => speak(correct), 150);
  } catch (e) {
    console.warn('spawnNumbersProblem failed', e);
  }
}

// ---- Weather Level Spawning ----
function spawnWeatherProblem(problem) {
  if (!problem) return;
  try {
    clearGameArea();
    const level = getCurrentLevel();
    const all = Array.isArray(level.words) ? level.words.map(w => String(w).toUpperCase()) : [];
    const correct = String(problem.word || '').toUpperCase();
    let pool = all.filter(w => w !== correct);
    if (pool.length < 2) pool = ["SUNNY", "RAINY", "CLOUDY", "WINDY"].filter(w => w !== correct);
    const distractors = pickRandomSubset(pool, 2);
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 80; // Increased margin for containment
    const topY = areaRect.top + 0.15 * h; // Slightly lower to avoid top edge
    const positions = [
      { x: areaRect.left + margin, y: topY },
      { x: areaRect.left + w / 2, y: topY },
      { x: areaRect.right - margin, y: topY }
    ];
    const colors = ['#60a5fa', '#94a3b8', '#e2e8f0']; // blue, gray, white-ish
    for (let i = 0; i < Math.min(3, options.length); i++) {
      const word = options[i];
      const pos = positions[i];
      spawnLetterAt(word, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        added.el.style.background = colors[i % colors.length];
        added.el.style.color = '#0b1022';
        added.el.style.padding = '6px 12px';
        added.el.style.borderRadius = '10px';
        added.el.style.textShadow = 'none';
        added.el.style.animation = 'float-slow 5s ease-in-out infinite';
      }
    }
    spawnWeatherProblem.expected = correct;
    setTimeout(() => speak(`Catch the word for ${correct.toLowerCase()} weather`), 150);
  } catch (e) {
    console.warn('spawnWeatherProblem failed', e);
  }
}

// Utility: pick N random distinct elements from an array
function pickRandomSubset(source, count) {
  try {
    const arr = Array.isArray(source) ? [...source] : [];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.max(0, Math.min(count, arr.length)));
  } catch (_) {
    return [];
  }
}

// Spawn phonics options: target + 2 random distractors (total 3), and speak target
function spawnPhonicsOptions(problem) {
  if (!problem) return;
  clearGameArea();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const target = String(problem.letter || '').toUpperCase();
  const distractors = alphabet.filter(c => c !== target);
  const options = [target, ...pickRandomSubset(distractors, 2)];
  options.forEach(ch => spawnLetter(ch));
  if (problem.letter) {
    setTimeout(() => speak(problem.letter), 150);
  }
}

// Spawn color-match: show swatch and 4 color words (RED, BLUE, GREEN, YELLOW)
function spawnColorMatch(problem) {
  try {
    clearGameArea();
    // Determine target color
    const color = String(problem?.color || '').toUpperCase();
    const allColors = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 'BROWN', 'BLACK', 'WHITE', 'GRAY'];
    const others = allColors.filter(c => c !== color);
    const choices = [color, ...pickRandomSubset(others, 1)]; // exactly 2 options

    // Place two options far apart with safe boundaries
    const areaRect = videoEl.getBoundingClientRect();
    const w = Math.max(1, areaRect.width);
    const h = Math.max(1, areaRect.height);
    const margin = 80; // Increased margin for containment
    // Position both options near the top of the webcam, one left and one right
    const topY = areaRect.top + 0.15 * h; // Slightly lower to avoid top edge
    const positions = [
      { x: areaRect.left + margin, y: topY },
      { x: areaRect.right - margin, y: topY }
    ];

    // Ensure the expected color is not at the same position as last round
    const prevExpectedPos = typeof spawnColorMatch._prevExpectedPos === 'number' ? spawnColorMatch._prevExpectedPos : -1;
    const expectedPos = prevExpectedPos === 0 ? 1 : 0; // alternate between 0 and 1
    spawnColorMatch._prevExpectedPos = expectedPos;

    // Arrange so that `color` (expected) goes to expectedPos
    const expectedFirst = choices.find(c => c === color);
    const distractor = choices.find(c => c !== color);
    const arranged = expectedPos === 0 ? [expectedFirst, distractor] : [distractor, expectedFirst];

    arranged.forEach((word, idx) => {
      const pos = positions[idx];
      spawnLetterAt(word, pos.x, pos.y);
      const added = activeLetters[activeLetters.length - 1];
      if (added) {
        // Box styling for Level 5 (Colors)
        added.el.style.background = "linear-gradient(145deg, #87CEEB, #4682B4)"; // Light blue gradient background
        added.el.style.border = "3px solid #4169E1"; // Dark blue border
        added.el.style.borderRadius = "15px"; // Rounded corners
        added.el.style.padding = "12px 20px"; // More padding inside the box
        added.el.style.color = "#1E3A8A"; // Dark blue text
        added.el.style.textShadow = "1px 1px 2px rgba(255,255,255,0.8)"; // White outline
        added.el.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)"; // Deeper shadow
        added.el.style.fontSize = "32px";
        added.el.style.fontWeight = "800";
        added.el.style.minWidth = "100px"; // Wider minimum width
        added.el.style.minHeight = "60px"; // Minimum height for box
        added.el.style.textAlign = "center";
        added.el.style.display = "flex";
        added.el.style.alignItems = "center";
        added.el.style.justifyContent = "center";
        added.el.style.lineHeight = "1";
        try { added.el.style.color = word.toLowerCase(); } catch (_) { }
      }
    });

    // Speak the prompt
    try {
      const lvl = getCurrentLevel();
      if (color) {
        if (false) {
          const isFirst = currentItemIndex === 0 && !spawnColorMatch._introSpokenL5;
          if (isFirst) {
            spawnColorMatch._introSpokenL5 = true;
            setTimeout(() => speak(`Now let's learn color names. Choose ${color}`), 200);
          } else {
            setTimeout(() => speak(`Choose ${color}`), 200);
          }
        } else {
          setTimeout(() => speak(`Choose ${color}`), 200);
        }
      }
    } catch (_) { }
    // Tag expected for capture
    spawnColorMatch.expected = color;
    // Also store expected on level for resilience across re-renders
    try { if (level) level._expectedColor = color; } catch (_) { }
  } catch (e) {
    console.warn('spawnColorMatch failed', e);
  }
}

// Phonics capture: match letter to target
function handlePhonicsCapture(letter) {
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const target = String(problem.letter || '').toUpperCase();
  const isCorrect = chosen === target;

  if (isCorrect) {
    score += 1;
    speak('Correct!');
    clearGameArea();
    currentItemIndex += 1;
    const nextProblem = problems[currentItemIndex];
    if (nextProblem) {
      spawnPhonicsOptions(nextProblem);
      updateTip();
    } else {
      showLevelCompletePopup();
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => {
      letter.classList.remove('wrong-answer-shake');
    }, { once: true });
    speak('Incorrect, try again');
  }
}

// Color-match capture: compare word to swatch color
function handleColorMatchCapture(letter) {
  // Debounce repeated collisions on the same element
  if (letter && letter.dataset && letter.dataset.cooldown === '1') {
    return;
  }
  if (letter && letter.dataset) {
    letter.dataset.cooldown = '1';
    setTimeout(() => { try { if (letter && letter.dataset) delete letter.dataset.cooldown; } catch (_) { } }, 700);
  }
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  const expected = String(problem?.color || spawnColorMatch.expected || level?._expectedColor || '').toUpperCase();
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const isCorrect = expected && chosen === expected;
  if (isCorrect) {
    score += 1;
    speak('Correct!');
    clearGameArea();
    // Add chosen color to history (ensure color history is recorded)
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = expected;
        badge.style.color = expected.toLowerCase();
        box.appendChild(badge);
      }
    } catch (_) { }
    currentItemIndex += 1;
    const next = problems[currentItemIndex];
    if (next) {
      setTimeout(() => { spawnColorMatch(next); updateTip(); }, 800);
    } else {
      setTimeout(() => showLevelCompletePopup(), 600);
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => {
      letter.classList.remove('wrong-answer-shake');
    }, { once: true });
    speak('Incorrect, try again');
    // Slow down a bit before repeating the prompt
    setTimeout(() => {
      const level = getCurrentLevel();
      const problems = level.problems || [];
      const problem = problems[currentItemIndex];
      const expected = String(problem?.color || spawnColorMatch.expected || '').toUpperCase();
      if (expected) speak(`Choose ${expected}`);
    }, 900);
    // Optional hint after 3s
    setTimeout(() => {
      try { if (expected) speak(expected); } catch (_) { }
    }, 3000);
  }
}

// Opposites capture
function handleOppositesCapture(letter) {
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;
  const expected = String(problem.opposite || spawnOppositesProblem.expected || '').toUpperCase();
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const isCorrect = expected && chosen === expected;
  if (isCorrect) {
    score += 1;
    speak('Correct!');
    clearGameArea();
    // History entry
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = `${problem.base} → ${expected}`;
        box.appendChild(badge);
      }
    } catch (_) { }
    currentItemIndex += 1;
    const next = problems[currentItemIndex];
    if (next) {
      setTimeout(() => { spawnOppositesProblem(next); updateTip(); }, 700);
    } else {
      showLevelCompletePopup();
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => {
      letter.classList.remove('wrong-answer-shake');
    }, { once: true });
    speak('Try again!');
  }
}

// Actions capture
function handleActionsCapture(letter) {
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;
  const expected = String(problem.word || spawnActionsProblem?.expected || '').toUpperCase();
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const isCorrect = expected && chosen === expected;
  if (isCorrect) {
    score += 1;
    speak('Correct!');
    // Clear only spawned words, keep webcam/canvas intact
    try {
      const gameItems = document.querySelectorAll('.game-item');
      gameItems.forEach(item => item.parentNode.removeChild(item));
      activeLetters = [];
    } catch (_) { }
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = expected;
        box.appendChild(badge);
      }
    } catch (_) { }
    currentItemIndex += 1;
    const next = problems[currentItemIndex];
    if (next) {
      setTimeout(() => { spawnActionsProblem(next); updateTip(); }, 600);
    } else {
      showLevelCompletePopup();
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => { letter.classList.remove('wrong-answer-shake'); }, { once: true });
    speak('Try again!');
  }
}

// Numbers capture
function handleNumbersCapture(letter) {
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;
  const expected = String(problem.number || spawnNumbersProblem.expected || '').toUpperCase();
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const isCorrect = expected && chosen === expected;
  if (isCorrect) {
    score += 1;
    speak('Correct!');
    clearGameArea();
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = expected;
        box.appendChild(badge);
      }
    } catch (_) { }
    currentItemIndex += 1;
    const next = problems[currentItemIndex];
    if (next) {
      setTimeout(() => { spawnNumbersProblem(next); updateTip(); }, 650);
    } else {
      showLevelCompletePopup();
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => { letter.classList.remove('wrong-answer-shake'); }, { once: true });
    speak('Incorrect, try again');
  }
}

// Weather capture
function handleWeatherCapture(letter) {
  const level = getCurrentLevel();
  const problems = level.problems || [];
  const problem = problems[currentItemIndex];
  if (!problem) return;
  const expected = String(problem.word || spawnWeatherProblem.expected || '').toUpperCase();
  const chosen = (letter.innerText || '').trim().toUpperCase();
  const isCorrect = expected && chosen === expected;
  if (isCorrect) {
    score += 1;
    speak('Correct!');
    clearGameArea();
    try {
      const box = document.getElementById('dropBox');
      if (box) {
        const badge = document.createElement('span');
        badge.className = 'history-badge';
        badge.textContent = expected;
        box.appendChild(badge);
      }
    } catch (_) { }
    currentItemIndex += 1;
    const next = problems[currentItemIndex];
    if (next) {
      setTimeout(() => { spawnWeatherProblem(next); updateTip(); }, 650);
    } else {
      showLevelCompletePopup();
    }
    updateScore();
  } else {
    letter.classList.add('wrong-answer-shake');
    letter.addEventListener('animationend', () => { letter.classList.remove('wrong-answer-shake'); }, { once: true });
    speak('Try again!');
  }
}


let recognition = null;
function ensureRecognition() {
  if (recognition) {
    return recognition;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return null;
  }
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    try {
      const transcript = (event.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript || !lastCaughtLetter) {
        return;
      }
      // Compare first character case-insensitively
      const firstChar = transcript[0].toUpperCase();
      if (firstChar === lastCaughtLetter.toUpperCase()) {
        // Bonus point for correct pronunciation
        score += 1;
        updateScore();
        console.log("Correct! +1 bonus");
      } else {
        console.log("Heard:", transcript, "expected:", lastCaughtLetter);
      }
    } catch (e) {
      console.warn("Recognition handler error:", e);
    }
  };
  recognition.onend = () => {
    // Do not auto-restart; we trigger after each catch
  };
  recognition.onerror = (e) => {
    console.warn("Speech recognition error:", e);
  };
  return recognition;
}

function startRecognition() {
  const rec = ensureRecognition();
  if (!rec) {
    return;
  }
  try {
    // Small delay to avoid overlapping with speech synthesis
    setTimeout(() => {
      try {
        rec.start();
      } catch (_) {
        /* ignore if already started */
      }
    }, 350);
  } catch (e) {
    console.warn("Unable to start recognition:", e);
  }
}

// ---- Return to Dashboard ----
if (returnToDashboardButton) {
  returnToDashboardButton.addEventListener("click", () => {
    if (gameOverScreen) {
      gameOverScreen.style.display = "none";
    }
    try {
      localStorage.setItem("lastGameScore", String(score));
    } catch (_) {
      // ignore storage errors
    }
    // Navigate back to the main book (level-select)
    window.location.href = "../level-select.html";
  });
}

if (endGameButtonEl) {
  endGameButtonEl.addEventListener("click", () => {
    endGame("Game Over!");
  });
}

// Dashboard side (for reference):
// On the dashboard page script, read and display the last score:
// const stored = localStorage.getItem('lastGameScore');
// if (stored) {
//   showScoreToUser(stored);
//   localStorage.removeItem('lastGameScore');
// }

// Part 3: Execution
(async () => {
  try {
    await initializeHandLandmarker();
    await enableWebcam();
  } catch (err) {
    console.error("Initialization error:", err);
    loadingEl.textContent = "Failed to initialize. Please refresh.";
  }
})();

// Level Complete Popup Functions
function showLevelCompletePopup() {
  if (levelCompleteScreen) {
    // Also speak completion message when popup opens, in case immediate trigger failed
    try { maybeSpeakLevelCompletion(getCurrentLevel()); } catch (_) { }

    // Update score display
    if (levelCompleteScore) {
      levelCompleteScore.textContent = `Your Score: ${score}`;
    }

    // Get next level preview
    const activeArray = getActiveModuleArray();
    const nextLevelIndex = currentLevelIndex + 1;
    const isLastLevel = nextLevelIndex >= activeArray.length;

    if (isLastLevel) {
      if (nextLevelPreview) {
        nextLevelPreview.textContent = `Module Complete!`;
      }
      if (continueToNextLevelBtn) {
        continueToNextLevelBtn.textContent = "Go to Dashboard";
      }
    } else if (nextLevelPreview) {
      const nextLevel = activeArray[nextLevelIndex];
      const nextLevelName = nextLevel.name || `Level ${nextLevel.level}`;
      const subjectName = selectedModuleName.charAt(0).toUpperCase() + selectedModuleName.slice(1);
      nextLevelPreview.textContent = `Next ${subjectName} Level: ${nextLevelName}`;
      if (continueToNextLevelBtn) {
        continueToNextLevelBtn.textContent = `Next ${subjectName} Level`;
      }
    }

    levelCompleteScreen.style.display = "flex";
  }
}

function maybeSpeakLevelCompletion(level) {
  // Empty as English was removed
}

function hideLevelCompletePopup() {
  if (levelCompleteScreen) {
    levelCompleteScreen.style.display = "none";
  }
}

function advanceToNextLevel() {
  const activeArray = getActiveModuleArray();
  const nextLevelIndex = currentLevelIndex + 1;
  const isLastLevel = nextLevelIndex >= activeArray.length;

  if (isLastLevel) {
    // If it's the last level, go back to the main book
    window.location.href = "../level-select.html";
    return;
  }

  // Mark current level as complete
  markLevelComplete(currentLevelIndex);

  hideLevelCompletePopup();
  currentLevelIndex += 1;
  currentItemIndex = 0;

  // Special handling for science module
  if (selectedModuleName === 'science') {
    // Update science level index
    currentScienceLevelIndex = currentLevelIndex;
    challengesCompleted = 0;
    currentChallenge = null;
    activeAtoms = [];
    beakerContents = [];

    console.log('advanceToNextLevel - Science module - currentScienceLevelIndex:', currentScienceLevelIndex);
    console.log('advanceToNextLevel - Science module - levelData:', scienceLevels[currentScienceLevelIndex]);

    // Start the next science level
    startScienceLevel(currentScienceLevelIndex);
    return; // Don't continue with regular level spawning
  }

  // Special handling for coding module
  if (selectedModuleName === 'coding') {
    initializeCodingModule();
    return; // Don't continue with regular level spawning
  }

  // Update level display for the next level
  if (levelDisplayEl) {
    const newLevel = getCurrentLevel();
    levelDisplayEl.textContent = `Level: ${newLevel.level}`;
  }
  // Update task text and tips for the new level
  updateTaskText();
  updateTipForSubject();

  // Clear history board when advancing to next level
  try {
    const box = document.getElementById('dropBox');
    if (box) {
      box.innerHTML = '';
    }
  } catch (_) { }

  // Update level grid
  generateLevelGrid();

  spawnNextItem();
}

// Event Listeners for Level Complete Popup
if (continueToNextLevelBtn) {
  continueToNextLevelBtn.addEventListener('click', advanceToNextLevel);
}

if (endGameAfterLevelBtn) {
  endGameAfterLevelBtn.addEventListener('click', () => {
    // Back button: simply close the popup and return to the game screen
    hideLevelCompletePopup();
  });
}

// Level Progress and Lock System
let completedLevels = [];
let totalLevels = 10; // inner panel shows 10 levels

function initializeLevelProgress() {
  // Load completed levels from localStorage
  try {
    const key = `gameCompletedLevels_${selectedModuleName || 'science'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      completedLevels = JSON.parse(saved);
    }
  } catch (error) {
    console.log('No saved progress found');
  }

  // Generate level grid
  generateLevelGrid();
  updateProgressDisplay();
}

function generateLevelGrid() {
  if (!levelsGrid) return;

  levelsGrid.innerHTML = '';

  for (let i = 1; i <= totalLevels; i++) {
    const levelItem = document.createElement('div');
    levelItem.className = 'level-item';
    levelItem.textContent = i;
    levelItem.dataset.level = i;

    // Set level status
    if (completedLevels.includes(i)) {
      levelItem.classList.add('completed');
    } else if (i === currentLevelIndex + 1) {
      levelItem.classList.add('current');
    } else if (i > currentLevelIndex + 1) {
      // keep unlocked for quick testing across 10 internal levels
    }

    // Add click listener for unlocked levels
    levelItem.addEventListener('click', () => {
      jumpToLevel(i - 1); // allow jumping to any of the 10 internal levels
    });

    levelsGrid.appendChild(levelItem);
  }
}

function updateProgressDisplay() {
  const completedCount = completedLevels.length;
  const progressPercentage = (completedCount / totalLevels) * 100;

  if (progressFill) {
    progressFill.style.width = `${progressPercentage}%`;
  }

  if (completedLevelsSpan) {
    completedLevelsSpan.textContent = completedCount;
  }

  if (totalLevelsSpan) {
    totalLevelsSpan.textContent = totalLevels;
  }
}

function markLevelComplete(levelIndex) {
  const levelNumber = levelIndex + 1;

  if (!completedLevels.includes(levelNumber)) {
    completedLevels.push(levelNumber);

    // Save to localStorage
    try {
      const key = `gameCompletedLevels_${selectedModuleName || 'science'}`;
      localStorage.setItem(key, JSON.stringify(completedLevels));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }

    // Update display
    updateProgressDisplay();
    generateLevelGrid();
  }
}

function jumpToLevel(levelIndex) {
  if (levelIndex < 0 || levelIndex >= getActiveModuleArray().length) return;

  // If already on this level and items are on screen, reset before re-spawning
  clearGameArea();

  currentLevelIndex = levelIndex;
  currentItemIndex = 0;
  isGameRunning = true;

  // Special handling for science module
  if (selectedModuleName === 'science') {
    // Set the science level index and reset challenges
    currentScienceLevelIndex = levelIndex;
    challengesCompleted = 0;
    currentChallenge = null;
    activeAtoms = [];
    beakerContents = [];

    console.log('jumpToLevel - Science module - levelIndex:', levelIndex);
    console.log('jumpToLevel - Science module - currentScienceLevelIndex:', currentScienceLevelIndex);
    console.log('jumpToLevel - Science module - levelData:', scienceLevels[currentScienceLevelIndex]);

    // Initialize science module with the selected level
    initializeScienceModule();
    return; // Don't continue with regular level spawning
  }

  // Special handling for coding module
  if (selectedModuleName === 'coding') {
    initializeCodingModule();
    return; // Don't continue with regular level spawning
  }

  // Update task text and tips for the selected level
  updateTaskText();
  updateTipForSubject();

  // Update level display
  if (levelDisplayEl) {
    const newLevel = getCurrentLevel();
    levelDisplayEl.textContent = `Level: ${newLevel.level}`;
  }

  // Clear history board
  try {
    const box = document.getElementById('dropBox');
    if (box) {
      box.innerHTML = '';
    }
  } catch (_) { }

  // Regenerate level grid
  generateLevelGrid();

  // Start the level
  spawnNextItem();
}

// Initialize level progress when the game starts
if (levelsGrid) {
  initializeLevelProgress();
}

// Initialize task text and tips based on subject
updateTaskText();
updateTipForSubject();

function clearGameArea() {
  const gameItems = document.querySelectorAll('.game-item');
  gameItems.forEach(item => item.parentNode.removeChild(item));
  activeLetters = []; // Clear activeLetters array as well
}