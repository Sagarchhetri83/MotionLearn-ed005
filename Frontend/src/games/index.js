/**
 * Main export file for game modules
 * Import all game modules and utilities here
 */

export { BaseGame } from './BaseGame.js';
export { GameManager } from './GameManager.js';
export { GestureDetector } from './utils/GestureDetector.js';
export { StemQuestionEngine } from './utils/StemQuestionEngine.js';
export { ProgressManager } from './utils/ProgressManager.js';
export { ScoreManager } from './utils/ScoreManager.js';

// Game Modules
export { AlphabetCatchGame } from './modules/AlphabetCatchGame.js';
export { MathChallengeGame } from './modules/MathChallengeGame.js';
export { MotionMathGame } from './modules/MotionMathGame.js';

/**
 * Quick setup function for game initialization
 */
export function initializeGameSystem(canvasContext) {
  const manager = new GameManager();
  
  // Register all available games
  manager.registerGame('alphabet', AlphabetCatchGame);
  manager.registerGame('math', MathChallengeGame);
  manager.registerGame('motionmath', MotionMathGame);
  
  return manager;
}

/**
 * Get game by subject
 */
export function getGameForSubject(subject) {
  const gameMap = {
    'english': 'alphabet',
    'technology': 'alphabet',
    'maths': 'motionmath',
    'mathematics': 'motionmath',
    'science': 'math' // Can be changed to science-specific game later
  };
  
  return gameMap[subject] || 'alphabet';
}
