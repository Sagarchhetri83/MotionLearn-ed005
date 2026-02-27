// Structured math curriculum with predefined problems from game-module
const mathsCurriculum = {
  addition: [
    {
      level: 1,
      name: "Single Digit Addition",
      operation: "+",
      problems: [
        { question: "1 + 2 =", answers: [3, 4, 2], correctAnswer: 3 },
        { question: "3 + 1 =", answers: [5, 3, 4], correctAnswer: 4 },
        { question: "2 + 2 =", answers: [3, 4, 5], correctAnswer: 4 },
        { question: "4 + 3 =", answers: [6, 7, 8], correctAnswer: 7 },
        { question: "5 + 2 =", answers: [6, 7, 8], correctAnswer: 7 },
        { question: "6 + 1 =", answers: [5, 7, 8], correctAnswer: 7 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Addition",
      operation: "+",
      problems: [
        { question: "15 + 7 =", answers: [21, 23, 22], correctAnswer: 22 },
        { question: "28 + 14 =", answers: [42, 40, 43], correctAnswer: 42 },
        { question: "39 + 25 =", answers: [63, 64, 65], correctAnswer: 64 },
        { question: "52 + 18 =", answers: [60, 70, 72], correctAnswer: 70 },
        { question: "43 + 29 =", answers: [71, 72, 73], correctAnswer: 72 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Addition",
      operation: "+",
      problems: [
        { question: "123 + 45 =", answers: [168, 178, 169], correctAnswer: 168 },
        { question: "245 + 112 =", answers: [357, 367, 347], correctAnswer: 357 },
        { question: "301 + 199 =", answers: [490, 500, 499], correctAnswer: 500 },
        { question: "567 + 233 =", answers: [700, 800, 900], correctAnswer: 800 }
      ]
    }
  ],
  subtraction: [
    {
      level: 1,
      name: "Single Digit Subtraction",
      operation: "-",
      problems: [
        { question: "5 - 2 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "8 - 3 =", answers: [4, 5, 6], correctAnswer: 5 },
        { question: "7 - 4 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "9 - 1 =", answers: [7, 8, 9], correctAnswer: 8 },
        { question: "6 - 2 =", answers: [3, 4, 5], correctAnswer: 4 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Subtraction",
      operation: "-",
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
      operation: "-",
      problems: [
        { question: "123 - 45 =", answers: [78, 88, 98], correctAnswer: 78 },
        { question: "245 - 112 =", answers: [130, 133, 143], correctAnswer: 133 },
        { question: "301 - 199 =", answers: [100, 102, 104], correctAnswer: 102 }
      ]
    }
  ],
  multiplication: [
    {
      level: 1,
      name: "Single Digit Multiplication",
      operation: "×",
      problems: [
        { question: "2 × 3 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "4 × 2 =", answers: [6, 8, 9], correctAnswer: 8 },
        { question: "5 × 3 =", answers: [10, 15, 20], correctAnswer: 15 },
        { question: "6 × 4 =", answers: [20, 24, 28], correctAnswer: 24 },
        { question: "3 × 3 =", answers: [6, 9, 12], correctAnswer: 9 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Multiplication",
      operation: "×",
      problems: [
        { question: "12 × 3 =", answers: [34, 36, 38], correctAnswer: 36 },
        { question: "15 × 5 =", answers: [70, 75, 80], correctAnswer: 75 },
        { question: "20 × 4 =", answers: [60, 80, 100], correctAnswer: 80 },
        { question: "25 × 6 =", answers: [120, 150, 180], correctAnswer: 150 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Multiplication",
      operation: "×",
      problems: [
        { question: "123 × 2 =", answers: [244, 246, 248], correctAnswer: 246 },
        { question: "210 × 3 =", answers: [630, 633, 636], correctAnswer: 630 },
        { question: "150 × 5 =", answers: [700, 750, 800], correctAnswer: 750 }
      ]
    }
  ],
  division: [
    {
      level: 1,
      name: "Single Digit Division",
      operation: "÷",
      problems: [
        { question: "6 ÷ 2 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "10 ÷ 5 =", answers: [1, 2, 3], correctAnswer: 2 },
        { question: "9 ÷ 3 =", answers: [2, 3, 4], correctAnswer: 3 },
        { question: "8 ÷ 4 =", answers: [1, 2, 3], correctAnswer: 2 },
        { question: "12 ÷ 3 =", answers: [3, 4, 5], correctAnswer: 4 }
      ]
    },
    {
      level: 2,
      name: "Double Digit Division",
      operation: "÷",
      problems: [
        { question: "24 ÷ 4 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "36 ÷ 6 =", answers: [5, 6, 7], correctAnswer: 6 },
        { question: "45 ÷ 9 =", answers: [4, 5, 6], correctAnswer: 5 },
        { question: "50 ÷ 10 =", answers: [4, 5, 6], correctAnswer: 5 }
      ]
    },
    {
      level: 3,
      name: "Triple Digit Division",
      operation: "÷",
      problems: [
        { question: "120 ÷ 10 =", answers: [10, 12, 14], correctAnswer: 12 },
        { question: "250 ÷ 25 =", answers: [8, 10, 12], correctAnswer: 10 },
        { question: "300 ÷ 3 =", answers: [90, 100, 110], correctAnswer: 100 }
      ]
    }
  ]
};

export class QuestionEngine {
  constructor() {
    this.history = [];
    this.problemIndex = {}; // Track which problem index we're on for each level/operation
  }
  
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Get the operation type symbol for display
  getOperationSymbol(operation) {
    const symbols = {
      '+': '➕',
      '-': '➖',
      '×': '✖️',
      '÷': '➗'
    };
    return symbols[operation] || operation;
  }

  // Get a random problem from the curriculum for a given level
  generateForLevel(level) {
    // Map levels 1-5 to curriculum difficulty (1-3)
    const difficultyMap = {
      1: 1, // Level 1 = Single digit
      2: 1, // Level 2 = Single digit (different operation mix)
      3: 2, // Level 3 = Double digit
      4: 2, // Level 4 = Double digit
      5: 3  // Level 5 = Triple digit
    };

    const difficulty = difficultyMap[level] || 1;
    
    // Pick a random operation
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const operationType = operations[Math.floor(Math.random() * operations.length)];
    
    // Get the curriculum for this operation
    const curriculum = mathsCurriculum[operationType];
    
    // Find the level data that matches our difficulty
    const levelData = curriculum.find(l => l.level === difficulty) || curriculum[0];
    
    // Get or initialize problem index for this level/operation combo
    const key = `${level}-${operationType}`;
    if (!this.problemIndex[key]) {
      this.problemIndex[key] = 0;
    }
    
    // Get the current problem
    const problems = levelData.problems;
    const problemIdx = this.problemIndex[key] % problems.length;
    const problem = problems[problemIdx];
    
    // Increment for next time
    this.problemIndex[key] = (this.problemIndex[key] + 1) % problems.length;
    
    // Return in the format expected by the game
    return {
      question: problem.question,
      correctAnswer: problem.correctAnswer,
      options: this.shuffle([...problem.answers]), // Shuffle the answer choices
      level: level,
      operation: levelData.operation,
      operationSymbol: this.getOperationSymbol(levelData.operation),
      type: 'multiple_choice',
      name: levelData.name
    };
  }
  
  addToHistory(question, answer, isCorrect, operation = '') {
    this.history.unshift({
      question: question,
      answer: answer,
      correct: isCorrect,
      operation: operation,
      timestamp: Date.now()
    });
    
    if (this.history.length > 5) {
      this.history = this.history.slice(0, 5);
    }
  }
  
  getHistory() {
    return this.history;
  }
  
  clearHistory() {
    this.history = [];
    this.problemIndex = {};
  }
}

