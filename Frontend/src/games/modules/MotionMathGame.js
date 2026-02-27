/**
 * Motion Math Game - Morpheus Math Motion Module
 * 5 Levels of Motion-Based Math Puzzles
 */

import { StemQuestionEngine } from '../utils/StemQuestionEngine.js';
import { ProgressManager } from '../utils/ProgressManager.js';
import { ScoreManager } from '../utils/ScoreManager.js';

export class MotionMathGame {
  constructor(canvasContext, config = {}) {
    this.ctx = canvasContext;
    this.canvas = canvasContext.canvas;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // Managers
    this.questionEngine = new StemQuestionEngine();
    this.progressManager = new ProgressManager();
    this.scoreManager = new ScoreManager();
    
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.currentQuestion = null;
    this.answerBubbles = [];
    this.selectedBubble = null;
    this.hoverStartTime = null;
    this.hoverProgress = 0;
    this.hoverDuration = 2000; // 2 seconds to select
    
    // Hand tracking
    this.handLandmarks = null;
    this.cursorPosition = { x: 0, y: 0 };
    
    // Animation states
    this.showSuccess = false;
    this.showError = false;
    this.showLevelComplete = false;
    this.showGameComplete = false;
    this.animationTimer = 0;
    
    // Timer for Level 3
    this.questionTimer = null;
    this.questionStartTime = null;
    this.timeRemaining = 0;
    
    // Callbacks
    this.onScoreUpdate = config.onScoreUpdate || (() => {});
    this.onProgressUpdate = config.onProgressUpdate || (() => {});
    this.onLevelChange = config.onLevelChange || (() => {});
    this.onHistoryUpdate = config.onHistoryUpdate || (() => {});
    this.onLevelComplete = config.onLevelComplete || (() => {});
    this.onGameComplete = config.onGameComplete || (() => {});
    
    // Colors
    this.colors = {
      primary: '#4F46E5',
      success: '#10B981',
      error: '#EF4444',
      bubble: '#60A5FA',
      bubbleHover: '#3B82F6',
      bubbleSelected: '#10B981',
      text: '#1F2937',
      background: 'rgba(250, 240, 210, 0.8)'
    };
  }

  /**
   * Initialize game
   */
  init() {
    this.reset();
    this.loadLevel(1);
  }

  /**
   * Start game
   */
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.generateNewQuestion();
  }

  /**
   * Pause game
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume game
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Stop game
   */
  stop() {
    this.isRunning = false;
    this.currentQuestion = null;
    this.answerBubbles = [];
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
    }
  }

  /**
   * Reset game to Level 1
   */
  reset() {
    this.stop();
    this.scoreManager.reset();
    this.progressManager.reset();
    this.questionEngine.clearHistory();
    this.loadLevel(1);
    this.updateCallbacks();
  }

  /**
   * Load a specific level
   */
  loadLevel(level) {
    if (this.progressManager.setCurrentLevel(level)) {
      this.currentLevel = level;
      this.onLevelChange(level);
      this.generateNewQuestion();
      return true;
    }
    return false;
  }

  /**
   * Generate new question
   */
  generateNewQuestion() {
    const level = this.progressManager.getCurrentLevel();
    this.currentQuestion = this.questionEngine.generateQuestionForLevel(level);
    
    // Create answer bubbles
    this.createAnswerBubbles();
    
    // Reset hover state
    this.selectedBubble = null;
    this.hoverStartTime = null;
    this.hoverProgress = 0;
    
    // Start timer for Level 3
    if (level === 3 && this.currentQuestion.timeLimit) {
      this.startQuestionTimer(this.currentQuestion.timeLimit);
    }
  }

  /**
   * Create answer bubbles
   */
  createAnswerBubbles() {
    this.answerBubbles = [];
    const options = this.currentQuestion.options;
    const bubbleRadius = 60;
    const spacing = 200;
    const startX = this.width / 2 - (spacing * (options.length - 1)) / 2;
    const y = this.height * 0.7;
    
    options.forEach((answer, index) => {
      this.answerBubbles.push({
        x: startX + (index * spacing),
        y: y,
        radius: bubbleRadius,
        answer: answer,
        isCorrect: answer === this.currentQuestion.correctAnswer,
        hoverProgress: 0,
        scale: 1
      });
    });
  }

  /**
   * Start question timer (for Level 3)
   */
  startQuestionTimer(duration) {
    this.questionStartTime = Date.now();
    this.timeRemaining = duration;
    
    this.questionTimer = setTimeout(() => {
      this.handleTimeout();
    }, duration);
  }

  /**
   * Handle question timeout
   */
  handleTimeout() {
    this.handleWrongAnswer();
    this.showErrorAnimation();
  }

  /**
   * Update hand landmarks from MediaPipe
   */
  updateHands(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.handLandmarks = null;
      return;
    }
    
    this.handLandmarks = landmarks;
    
    // Get index finger tip position (landmark 8)
    const indexTip = landmarks[8];
    this.cursorPosition = {
      x: indexTip.x * this.width,
      y: indexTip.y * this.height
    };
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    if (!this.isRunning || this.isPaused) return;
    
    // Update animations
    if (this.animationTimer > 0) {
      this.animationTimer -= deltaTime;
      if (this.animationTimer <= 0) {
        this.clearAnimations();
      }
    }
    
    // Update timer for Level 3
    if (this.questionStartTime && this.currentQuestion?.timeLimit) {
      const elapsed = Date.now() - this.questionStartTime;
      this.timeRemaining = Math.max(0, this.currentQuestion.timeLimit - elapsed);
    }
    
    // Check hover on bubbles
    this.checkBubbleHover();
  }

  /**
   * Check if cursor is hovering over a bubble
   */
  checkBubbleHover() {
    if (!this.handLandmarks || !this.currentQuestion) return;
    
    let hoveredBubble = null;
    
    // Find hovered bubble
    this.answerBubbles.forEach(bubble => {
      const dx = this.cursorPosition.x - bubble.x;
      const dy = this.cursorPosition.y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bubble.radius) {
        hoveredBubble = bubble;
      }
    });
    
    // Update hover state
    if (hoveredBubble) {
      if (!this.hoverStartTime) {
        this.hoverStartTime = Date.now();
      }
      
      const hoverTime = Date.now() - this.hoverStartTime;
      this.hoverProgress = Math.min(1, hoverTime / this.hoverDuration);
      hoveredBubble.hoverProgress = this.hoverProgress;
      hoveredBubble.scale = 1 + (this.hoverProgress * 0.2);
      
      // Selection complete
      if (this.hoverProgress >= 1) {
        this.selectAnswer(hoveredBubble);
      }
    } else {
      // Reset hover
      this.hoverStartTime = null;
      this.hoverProgress = 0;
      this.answerBubbles.forEach(b => {
        b.hoverProgress = 0;
        b.scale = 1;
      });
    }
  }

  /**
   * Select an answer
   */
  selectAnswer(bubble) {
    if (this.selectedBubble) return; // Already selected
    
    this.selectedBubble = bubble;
    
    // Clear timer
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
    
    if (bubble.isCorrect) {
      this.handleCorrectAnswer();
      this.showSuccessAnimation();
    } else {
      this.handleWrongAnswer();
      this.showErrorAnimation();
    }
    
    // Generate next question after delay
    setTimeout(() => {
      this.nextQuestion();
    }, 1500);
  }

  /**
   * Handle correct answer
   */
  handleCorrectAnswer() {
    this.scoreManager.addCorrect();
    this.progressManager.completeQuestion(this.currentLevel);
    
    // Add to history
    this.addToHistory(this.currentQuestion, true);
    
    this.updateCallbacks();
    
    // Check if level completed
    if (this.progressManager.isLevelCompleted(this.currentLevel)) {
      this.handleLevelComplete();
    }
  }

  /**
   * Handle wrong answer
   */
  handleWrongAnswer() {
    this.scoreManager.addWrong();
    
    // Add to history
    this.addToHistory(this.currentQuestion, false);
    
    this.updateCallbacks();
  }

  /**
   * Handle level completion
   */
  handleLevelComplete() {
    this.showLevelCompleteAnimation();
    this.onLevelComplete(this.currentLevel);
    
    // Check if game completed (all 5 levels)
    if (this.currentLevel === 5) {
      this.handleGameComplete();
    }
  }

  /**
   * Handle game completion
   */
  handleGameComplete() {
    this.showGameCompleteAnimation();
    this.onGameComplete({
      score: this.scoreManager.getScore(),
      accuracy: this.scoreManager.getAccuracy(),
      maxCombo: this.scoreManager.getMaxCombo()
    });
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    this.clearAnimations();
    
    if (this.progressManager.getQuestionsRemaining() > 0) {
      this.generateNewQuestion();
    } else {
      // Level complete, wait for user to select next level
      this.currentQuestion = null;
      this.answerBubbles = [];
    }
  }

  /**
   * Add question to history
   */
  addToHistory(question, isCorrect) {
    const historyItem = {
      question: question.question,
      answer: question.correctAnswer,
      correct: isCorrect,
      timestamp: Date.now()
    };
    
    this.onHistoryUpdate(historyItem);
  }

  /**
   * Update callbacks
   */
  updateCallbacks() {
    this.onScoreUpdate(this.scoreManager.getStats());
    this.onProgressUpdate({
      currentLevel: this.currentLevel,
      levelProgress: this.progressManager.getLevelProgress(this.currentLevel),
      overallProgress: this.progressManager.getOverallProgress(),
      questionsRemaining: this.progressManager.getQuestionsRemaining()
    });
  }

  /**
   * Show success animation
   */
  showSuccessAnimation() {
    this.showSuccess = true;
    this.animationTimer = 1000;
  }

  /**
   * Show error animation
   */
  showErrorAnimation() {
    this.showError = true;
    this.animationTimer = 1000;
  }

  /**
   * Show level complete animation
   */
  showLevelCompleteAnimation() {
    this.showLevelComplete = true;
    this.animationTimer = 3000;
  }

  /**
   * Show game complete animation
   */
  showGameCompleteAnimation() {
    this.showGameComplete = true;
    this.animationTimer = 5000;
  }

  /**
   * Clear animations
   */
  clearAnimations() {
    this.showSuccess = false;
    this.showError = false;
    this.showLevelComplete = false;
    // Keep game complete visible
  }

  /**
   * Render game
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (!this.isRunning) {
      this.renderStartScreen();
      return;
    }
    
    // Render question
    if (this.currentQuestion) {
      this.renderQuestion();
      this.renderAnswerBubbles();
      
      // Render timer for Level 3
      if (this.currentLevel === 3 && this.questionStartTime) {
        this.renderTimer();
      }
    }
    
    // Render cursor
    if (this.handLandmarks) {
      this.renderCursor();
    }
    
    // Render animations
    if (this.showSuccess) {
      this.renderSuccessAnimation();
    }
    
    if (this.showError) {
      this.renderErrorAnimation();
    }
    
    if (this.showLevelComplete) {
      this.renderLevelCompleteAnimation();
    }
    
    if (this.showGameComplete) {
      this.renderGameCompleteAnimation();
    }
  }

  /**
   * Render start screen
   */
  renderStartScreen() {
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Motion Math', this.width / 2, this.height / 2 - 40);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Click Start to Begin', this.width / 2, this.height / 2 + 20);
  }

  /**
   * Render question
   */
  renderQuestion() {
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = 'bold 56px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.currentQuestion.question, this.width / 2, this.height * 0.35);
    
    // Render hint for Level 5
    if (this.currentQuestion.hint) {
      this.ctx.font = '20px Arial';
      this.ctx.fillStyle = '#6B7280';
      this.ctx.fillText(`Hint: ${this.currentQuestion.hint}`, this.width / 2, this.height * 0.45);
    }
  }

  /**
   * Render answer bubbles
   */
  renderAnswerBubbles() {
    this.answerBubbles.forEach(bubble => {
      this.ctx.save();
      
      // Scale transformation
      this.ctx.translate(bubble.x, bubble.y);
      this.ctx.scale(bubble.scale, bubble.scale);
      this.ctx.translate(-bubble.x, -bubble.y);
      
      // Draw bubble
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      
      // Color based on state
      if (this.selectedBubble === bubble) {
        this.ctx.fillStyle = bubble.isCorrect ? this.colors.bubbleSelected : this.colors.error;
      } else if (bubble.hoverProgress > 0) {
        this.ctx.fillStyle = this.colors.bubbleHover;
      } else {
        this.ctx.fillStyle = this.colors.bubble;
      }
      
      this.ctx.fill();
      
      // Draw hover progress ring
      if (bubble.hoverProgress > 0 && !this.selectedBubble) {
        this.ctx.beginPath();
        this.ctx.arc(bubble.x, bubble.y, bubble.radius + 5, 
                     -Math.PI / 2, 
                     -Math.PI / 2 + (Math.PI * 2 * bubble.hoverProgress));
        this.ctx.strokeStyle = this.colors.success;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
      }
      
      // Draw answer text
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(bubble.answer.toString(), bubble.x, bubble.y);
      
      this.ctx.restore();
    });
  }

  /**
   * Render timer (Level 3)
   */
  renderTimer() {
    const barWidth = 300;
    const barHeight = 30;
    const x = (this.width - barWidth) / 2;
    const y = this.height * 0.5;
    
    // Background
    this.ctx.fillStyle = '#E5E7EB';
    this.ctx.fillRect(x, y, barWidth, barHeight);
    
    // Progress
    const progress = this.timeRemaining / this.currentQuestion.timeLimit;
    this.ctx.fillStyle = progress > 0.5 ? this.colors.success : 
                         progress > 0.25 ? '#F59E0B' : this.colors.error;
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);
    
    // Border
    this.ctx.strokeStyle = this.colors.text;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Time text
    const seconds = (this.timeRemaining / 1000).toFixed(1);
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${seconds}s`, this.width / 2, y + barHeight + 25);
  }

  /**
   * Render cursor
   */
  renderCursor() {
    this.ctx.beginPath();
    this.ctx.arc(this.cursorPosition.x, this.cursorPosition.y, 15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
    this.ctx.fill();
    this.ctx.strokeStyle = '#4F46E5';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  /**
   * Render success animation
   */
  renderSuccessAnimation() {
    const progress = 1 - (this.animationTimer / 1000);
    const scale = 1 + progress;
    const alpha = 1 - progress;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = `bold ${48 * scale}px Arial`;
    this.ctx.fillStyle = this.colors.success;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✓ Correct!', this.width / 2, this.height / 2);
    this.ctx.restore();
  }

  /**
   * Render error animation
   */
  renderErrorAnimation() {
    const shake = Math.sin(this.animationTimer * 0.05) * 10;
    
    this.ctx.save();
    this.ctx.translate(shake, 0);
    this.ctx.font = 'bold 48px Arial';
    this.ctx.fillStyle = this.colors.error;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✗ Try Again', this.width / 2, this.height / 2);
    this.ctx.restore();
  }

  /**
   * Render level complete animation
   */
  renderLevelCompleteAnimation() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = 'bold 56px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Level ${this.currentLevel} Complete!`, this.width / 2, this.height / 2 - 40);
    
    this.ctx.font = '32px Arial';
    this.ctx.fillStyle = this.colors.success;
    this.ctx.fillText('100% Progress', this.width / 2, this.height / 2 + 20);
    
    this.ctx.restore();
  }

  /**
   * Render game complete animation
   */
  renderGameCompleteAnimation() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = 'bold 64px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 Math Module Completed!', this.width / 2, this.height / 2 - 60);
    
    this.ctx.font = 'bold 48px Arial';
    this.ctx.fillText('100% Complete', this.width / 2, this.height / 2 + 20);
    
    const stats = this.scoreManager.getStats();
    this.ctx.font = '28px Arial';
    this.ctx.fillText(`Score: ${stats.score} XP | Accuracy: ${stats.accuracy}%`, 
                      this.width / 2, this.height / 2 + 80);
    
    this.ctx.restore();
  }

  /**
   * Get game state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentLevel: this.currentLevel,
      score: this.scoreManager.getStats(),
      progress: {
        currentLevel: this.currentLevel,
        levelProgress: this.progressManager.getLevelProgress(this.currentLevel),
        overallProgress: this.progressManager.getOverallProgress()
      },
      levels: this.progressManager.getLevelStats()
    };
  }
}
