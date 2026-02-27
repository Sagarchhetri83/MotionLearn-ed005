export class ScoreManager {
  constructor() {
    this.score = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
  }
  
  addCorrect(timeBonus = false) {
    this.score += 10;
    if (timeBonus) {
      this.score += 5;
    }
    this.correctAnswers++;
  }
  
  addWrong() {
    this.wrongAnswers++;
  }
  
  getScore() {
    return this.score;
  }
  
  getAccuracy() {
    const total = this.correctAnswers + this.wrongAnswers;
    if (total === 0) return 0;
    return Math.round((this.correctAnswers / total) * 100);
  }
  
  getStats() {
    return {
      score: this.score,
      correct: this.correctAnswers,
      wrong: this.wrongAnswers,
      accuracy: this.getAccuracy()
    };
  }
  
  reset() {
    this.score = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
  }
}
