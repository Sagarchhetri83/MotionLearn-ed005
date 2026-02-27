/**
 * STEM Question Engine - Generates math puzzles for MotionLearn
 * Morpheus Math Motion Module
 */

export class StemQuestionEngine {
  constructor() {
    this.questionHistory = [];
  }

  /**
   * Level 1 - Basic Addition
   */
  generateAddition() {
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const correctAnswer = num1 + num2;
    
    return {
      question: `${num1} + ${num2}`,
      correctAnswer: correctAnswer,
      options: this.generateOptions(correctAnswer, 3),
      type: 'addition',
      level: 1
    };
  }

  /**
   * Level 2 - Subtraction Challenge
   */
  generateSubtraction() {
    const num1 = Math.floor(Math.random() * 20) + 5; // 5-24
    const num2 = Math.floor(Math.random() * num1); // 0 to num1
    const correctAnswer = num1 - num2;
    
    return {
      question: `${num1} – ${num2}`,
      correctAnswer: correctAnswer,
      options: this.generateOptions(correctAnswer, 3),
      type: 'subtraction',
      level: 2
    };
  }

  /**
   * Level 3 - Multiplication Sprint
   */
  generateMultiplication() {
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const correctAnswer = num1 * num2;
    
    return {
      question: `${num1} × ${num2}`,
      correctAnswer: correctAnswer,
      options: this.generateOptions(correctAnswer, 3),
      type: 'multiplication',
      level: 3,
      timeLimit: 5000 // 5 seconds
    };
  }

  /**
   * Level 4 - Missing Number Puzzle
   */
  generateMissingNumber() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const missing = Math.floor(Math.random() * 10) + 1;
    const result = num1 + missing;
    
    return {
      question: `${num1} + __ = ${result}`,
      correctAnswer: missing,
      options: this.generateOptions(missing, 3),
      type: 'missing',
      level: 4
    };
  }

  /**
   * Level 5 - Logic Pattern Puzzle
   */
  generatePattern() {
    const patterns = [
      { sequence: [2, 4, 6], answer: 8, pattern: 'even numbers' },
      { sequence: [1, 3, 5], answer: 7, pattern: 'odd numbers' },
      { sequence: [5, 10, 15], answer: 20, pattern: 'multiples of 5' },
      { sequence: [3, 6, 9], answer: 12, pattern: 'multiples of 3' },
      { sequence: [10, 20, 30], answer: 40, pattern: 'multiples of 10' },
      { sequence: [1, 2, 4], answer: 8, pattern: 'powers of 2' },
      { sequence: [2, 5, 8], answer: 11, pattern: '+3 each time' },
      { sequence: [15, 12, 9], answer: 6, pattern: '-3 each time' }
    ];
    
    const selected = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
      question: `${selected.sequence.join(', ')}, __`,
      correctAnswer: selected.answer,
      options: this.generateOptions(selected.answer, 3),
      type: 'pattern',
      level: 5,
      hint: selected.pattern
    };
  }

  /**
   * Generate 3 unique answer options (1 correct + 2 wrong)
   */
  generateOptions(correctAnswer, count = 3) {
    const options = [correctAnswer];
    const range = Math.max(10, correctAnswer);
    
    while (options.length < count) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const wrongAnswer = correctAnswer + offset;
      
      // Ensure positive, unique, and not equal to correct answer
      if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  }

  /**
   * Generate question based on level
   */
  generateQuestionForLevel(level) {
    let question;
    
    switch(level) {
      case 1:
        question = this.generateAddition();
        break;
      case 2:
        question = this.generateSubtraction();
        break;
      case 3:
        question = this.generateMultiplication();
        break;
      case 4:
        question = this.generateMissingNumber();
        break;
      case 5:
        question = this.generatePattern();
        break;
      default:
        question = this.generateAddition();
    }
    
    // Add to history
    this.questionHistory.unshift({
      ...question,
      timestamp: Date.now()
    });
    
    // Keep only last 10
    if (this.questionHistory.length > 10) {
      this.questionHistory = this.questionHistory.slice(0, 10);
    }
    
    return question;
  }

  /**
   * Get recent question history
   */
  getHistory(limit = 5) {
    return this.questionHistory.slice(0, limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.questionHistory = [];
  }
}
