/**
 * Progress Manager - Track level and question completion
 */

export class ProgressManager {
  constructor() {
    this.levels = {
      1: { completed: 0, total: 5, unlocked: true },
      2: { completed: 0, total: 5, unlocked: false },
      3: { completed: 0, total: 5, unlocked: false },
      4: { completed: 0, total: 5, unlocked: false },
      5: { completed: 0, total: 5, unlocked: false }
    };
    this.currentLevel = 1;
    this.totalLevels = 5;
  }

  /**
   * Get progress percentage for a level
   */
  getLevelProgress(level) {
    const levelData = this.levels[level];
    if (!levelData) return 0;
    
    return Math.round((levelData.completed / levelData.total) * 100);
  }

  /**
   * Get overall progress percentage
   */
  getOverallProgress() {
    let totalCompleted = 0;
    let totalQuestions = 0;
    
    Object.values(this.levels).forEach(level => {
      totalCompleted += level.completed;
      totalQuestions += level.total;
    });
    
    return Math.round((totalCompleted / totalQuestions) * 100);
  }

  /**
   * Mark question as completed for current level
   */
  completeQuestion(level) {
    if (this.levels[level]) {
      this.levels[level].completed++;
      
      // Check if level is complete
      if (this.levels[level].completed >= this.levels[level].total) {
        this.completeLevel(level);
      }
    }
  }

  /**
   * Complete a level and unlock next
   */
  completeLevel(level) {
    if (this.levels[level]) {
      this.levels[level].completed = this.levels[level].total;
      
      // Unlock next level
      if (level < this.totalLevels && this.levels[level + 1]) {
        this.levels[level + 1].unlocked = true;
      }
    }
  }

  /**
   * Check if level is unlocked
   */
  isLevelUnlocked(level) {
    return this.levels[level]?.unlocked || false;
  }

  /**
   * Check if level is completed
   */
  isLevelCompleted(level) {
    const levelData = this.levels[level];
    if (!levelData) return false;
    
    return levelData.completed >= levelData.total;
  }

  /**
   * Set current level
   */
  setCurrentLevel(level) {
    if (this.isLevelUnlocked(level)) {
      this.currentLevel = level;
      return true;
    }
    return false;
  }

  /**
   * Get current level
   */
  getCurrentLevel() {
    return this.currentLevel;
  }

  /**
   * Get questions remaining in current level
   */
  getQuestionsRemaining(level = this.currentLevel) {
    const levelData = this.levels[level];
    if (!levelData) return 0;
    
    return Math.max(0, levelData.total - levelData.completed);
  }

  /**
   * Reset all progress
   */
  reset() {
    Object.keys(this.levels).forEach(level => {
      this.levels[level].completed = 0;
      this.levels[level].unlocked = (level === '1');
    });
    this.currentLevel = 1;
  }

  /**
   * Reset specific level
   */
  resetLevel(level) {
    if (this.levels[level]) {
      this.levels[level].completed = 0;
    }
  }

  /**
   * Get level stats
   */
  getLevelStats() {
    return Object.keys(this.levels).map(level => ({
      level: parseInt(level),
      progress: this.getLevelProgress(level),
      completed: this.isLevelCompleted(level),
      unlocked: this.isLevelUnlocked(level),
      questionsRemaining: this.getQuestionsRemaining(level)
    }));
  }
}
