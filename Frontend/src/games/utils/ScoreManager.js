/**
 * Score Manager - Track XP and achievements
 */

export class ScoreManager {
  constructor() {
    this.score = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.pointsPerCorrect = 10;
    this.pointsPerWrong = 0;
  }

  /**
   * Add points for correct answer
   */
  addCorrect() {
    this.score += this.pointsPerCorrect;
    this.correctAnswers++;
    this.combo++;
    
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    
    return this.score;
  }

  /**
   * Handle wrong answer
   */
  addWrong() {
    this.wrongAnswers++;
    this.combo = 0; // Reset combo
    return this.score;
  }

  /**
   * Get current score
   */
  getScore() {
    return this.score;
  }

  /**
   * Get accuracy percentage
   */
  getAccuracy() {
    const total = this.correctAnswers + this.wrongAnswers;
    if (total === 0) return 0;
    
    return Math.round((this.correctAnswers / total) * 100);
  }

  /**
   * Get combo count
   */
  getCombo() {
    return this.combo;
  }

  /**
   * Get max combo
   */
  getMaxCombo() {
    return this.maxCombo;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      score: this.score,
      correct: this.correctAnswers,
      wrong: this.wrongAnswers,
      accuracy: this.getAccuracy(),
      combo: this.combo,
      maxCombo: this.maxCombo
    };
  }

  /**
   * Reset score
   */
  reset() {
    this.score = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  /**
   * Check for achievements
   */
  checkAchievements() {
    const achievements = [];
    
    if (this.combo >= 5) {
      achievements.push({ name: '5 Combo!', icon: '🔥' });
    }
    
    if (this.score >= 100) {
      achievements.push({ name: 'Century!', icon: '💯' });
    }
    
    if (this.getAccuracy() === 100 && this.correctAnswers >= 5) {
      achievements.push({ name: 'Perfect!', icon: '⭐' });
    }
    
    return achievements;
  }
}
