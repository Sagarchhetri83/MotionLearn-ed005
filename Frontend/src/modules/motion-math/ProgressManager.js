export class ProgressManager {
  constructor() {
    this.questionsPerLevel = 5;
    this.levelProgress = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
  }
  
  addQuestion(level) {
    if (this.levelProgress[level] !== undefined) {
      this.levelProgress[level]++;
    }
  }
  
  isLevelComplete(level) {
    return this.levelProgress[level] >= this.questionsPerLevel;
  }
  
  getLevelProgress(level) {
    const answered = this.levelProgress[level] || 0;
    return Math.round((answered / this.questionsPerLevel) * 100);
  }
  
  getOverallProgress() {
    const totalQuestions = 5 * this.questionsPerLevel;
    const answeredQuestions = Object.values(this.levelProgress).reduce((sum, val) => sum + val, 0);
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }
  
  reset() {
    this.levelProgress = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
  }
  
  resetLevel(level) {
    if (this.levelProgress[level] !== undefined) {
      this.levelProgress[level] = 0;
    }
  }
}
