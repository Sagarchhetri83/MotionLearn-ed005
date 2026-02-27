/**
 * BaseGame - Abstract base class for all MotionLearn games
 * All game modules should extend this class
 */

export class BaseGame {
  constructor(canvasContext, config = {}) {
    this.ctx = canvasContext;
    this.config = {
      width: config.width || 1280,
      height: config.height || 720,
      difficulty: config.difficulty || 1,
      ...config
    };
    
    this.score = 0;
    this.level = 1;
    this.isRunning = false;
    this.isPaused = false;
    this.gameObjects = [];
    
    // Hand tracking data
    this.handLandmarks = null;
    this.gestureCallbacks = {};
  }

  /**
   * Initialize game - Override in child classes
   */
  init() {
    console.log('BaseGame initialized');
  }

  /**
   * Update game state - Override in child classes
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Update all game objects
    this.gameObjects.forEach(obj => {
      if (obj.update) obj.update(deltaTime);
    });
  }

  /**
   * Render game - Override in child classes
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.config.width, this.config.height);
    
    // Render all game objects
    this.gameObjects.forEach(obj => {
      if (obj.render) obj.render(this.ctx);
    });
  }

  /**
   * Handle hand landmarks update from MediaPipe
   */
  updateHands(landmarks) {
    this.handLandmarks = landmarks;
    this.checkGestures();
  }

  /**
   * Check for gesture events
   */
  checkGestures() {
    if (!this.handLandmarks) return;
    
    // Check registered gesture callbacks
    Object.keys(this.gestureCallbacks).forEach(gesture => {
      if (this[`detect${gesture}`] && this[`detect${gesture}`]()) {
        this.gestureCallbacks[gesture]();
      }
    });
  }

  /**
   * Register gesture callback
   */
  onGesture(gestureName, callback) {
    this.gestureCallbacks[gestureName] = callback;
  }

  /**
   * Start the game
   */
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.init();
  }

  /**
   * Pause the game
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the game
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Stop the game
   */
  stop() {
    this.isRunning = false;
    this.gameObjects = [];
  }

  /**
   * Reset the game
   */
  reset() {
    this.score = 0;
    this.level = 1;
    this.gameObjects = [];
    this.init();
  }

  /**
   * Add score
   */
  addScore(points) {
    this.score += points;
  }

  /**
   * Level up
   */
  levelUp() {
    this.level++;
    this.onLevelUp();
  }

  /**
   * Level up callback - Override in child classes
   */
  onLevelUp() {
    console.log(`Level ${this.level} reached`);
  }

  /**
   * Game over callback - Override in child classes
   */
  onGameOver() {
    console.log('Game Over');
  }

  /**
   * Spawn game object
   */
  spawnObject(obj) {
    this.gameObjects.push(obj);
  }

  /**
   * Remove game object
   */
  removeObject(obj) {
    const index = this.gameObjects.indexOf(obj);
    if (index > -1) {
      this.gameObjects.splice(index, 1);
    }
  }
}
