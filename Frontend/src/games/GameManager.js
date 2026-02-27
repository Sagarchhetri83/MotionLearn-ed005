/**
 * GameManager - Manages game loading, state, and transitions
 */

export class GameManager {
  constructor() {
    this.currentGame = null;
    this.gameRegistry = {};
    this.isPaused = false;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
  }

  /**
   * Register a game module
   */
  registerGame(name, GameClass) {
    this.gameRegistry[name] = GameClass;
  }

  /**
   * Load and start a game
   */
  loadGame(gameName, canvasContext, config = {}) {
    // Stop current game if running
    if (this.currentGame) {
      this.stopGame();
    }

    const GameClass = this.gameRegistry[gameName];
    if (!GameClass) {
      console.error(`Game "${gameName}" not found in registry`);
      return null;
    }

    // Create new game instance
    this.currentGame = new GameClass(canvasContext, config);
    this.currentGame.start();
    
    // Start game loop
    this.lastFrameTime = Date.now();
    this.startGameLoop();
    
    return this.currentGame;
  }

  /**
   * Start game loop
   */
  startGameLoop() {
    const gameLoop = () => {
      if (!this.currentGame || !this.currentGame.isRunning) {
        return;
      }

      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update and render
      if (!this.isPaused) {
        this.currentGame.update(deltaTime);
        this.currentGame.render();
      }

      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }

  /**
   * Pause current game
   */
  pauseGame() {
    if (this.currentGame) {
      this.currentGame.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume current game
   */
  resumeGame() {
    if (this.currentGame) {
      this.currentGame.resume();
      this.isPaused = false;
      this.lastFrameTime = Date.now();
    }
  }

  /**
   * Stop current game
   */
  stopGame() {
    if (this.currentGame) {
      this.currentGame.stop();
      this.currentGame = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset current game
   */
  resetGame() {
    if (this.currentGame) {
      this.currentGame.reset();
      this.lastFrameTime = Date.now();
    }
  }

  /**
   * Update hand landmarks for current game
   */
  updateHands(landmarks) {
    if (this.currentGame && this.currentGame.updateHands) {
      this.currentGame.updateHands(landmarks);
    }
  }

  /**
   * Get current game state
   */
  getGameState() {
    if (!this.currentGame) return null;

    return {
      score: this.currentGame.score,
      level: this.currentGame.level,
      isRunning: this.currentGame.isRunning,
      isPaused: this.currentGame.isPaused
    };
  }
}
