export class LevelManager {
  constructor() {
    this.currentLevel = 1;
    this.levels = {
      1: { name: 'Mixed Basics', unlocked: true },
      2: { name: 'Two-Digit Ops', unlocked: false },
      3: { name: 'Timed Mode', unlocked: false },
      4: { name: 'Missing Number', unlocked: false },
      5: { name: '3D Puzzle', unlocked: false }
    };
  }
  
  getCurrentLevel() {
    return this.currentLevel;
  }
  
  setLevel(level) {
    if (this.isLevelUnlocked(level)) {
      this.currentLevel = level;
      return true;
    }
    return false;
  }
  
  isLevelUnlocked(level) {
    return this.levels[level]?.unlocked || false;
  }
  
  unlockNextLevel() {
    const nextLevel = this.currentLevel + 1;
    if (this.levels[nextLevel]) {
      this.levels[nextLevel].unlocked = true;
    }
  }
  
  completeLevel() {
    this.unlockNextLevel();
  }
  
  getLevelInfo(level) {
    return this.levels[level] || null;
  }
  
  reset() {
    this.currentLevel = 1;
    Object.keys(this.levels).forEach(level => {
      this.levels[level].unlocked = (level === '1');
    });
  }
}
