/**
 * AlphabetCatchGame - Catch falling letters using hand gestures
 * Subject: English/Technology
 */

import { BaseGame } from '../BaseGame.js';
import { GestureDetector } from '../utils/GestureDetector.js';

export class AlphabetCatchGame extends BaseGame {
  constructor(canvasContext, config = {}) {
    super(canvasContext, config);
    
    this.gestureDetector = new GestureDetector(this.config.width, this.config.height);
    this.letters = [];
    this.targetLetter = 'A';
    this.letterSequence = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    this.currentIndex = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 2000; // 2 seconds
    this.lastFrameTime = Date.now();
    
    // Game settings
    this.fallSpeed = 100; // pixels per second
    this.letterSize = 60;
    this.correctLetterColor = '#4CAF50';
    this.wrongLetterColor = '#FF5252';
    this.targetLetterColor = '#FFD700';
  }

  init() {
    console.log('Alphabet Catch Game initialized');
    this.letters = [];
    this.currentIndex = 0;
    this.targetLetter = this.letterSequence[0];
    this.spawnTimer = 0;
    
    // Spawn first letter
    this.spawnLetter();
  }

  update(deltaTime) {
    if (this.isPaused || !this.isRunning) return;
    
    // Update spawn timer
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnLetter();
      this.spawnTimer = 0;
    }

    // Update all letters
    this.letters.forEach((letter, index) => {
      letter.y += (this.fallSpeed * deltaTime) / 1000;
      
      // Check if letter is caught by hand
      if (this.handLandmarks) {
        const indexTip = this.gestureDetector.getFingerTip(this.handLandmarks, 1);
        if (indexTip && this.checkCollision(letter, indexTip)) {
          this.catchLetter(letter, index);
        }
      }
      
      // Remove letters that fell off screen
      if (letter.y > this.config.height + 50) {
        this.letters.splice(index, 1);
        if (letter.isTarget) {
          this.onMissedLetter();
        }
      }
    });
  }

  render() {
    // Render all letters
    this.letters.forEach(letter => {
      this.ctx.save();
      
      // Set color based on letter type
      if (letter.isTarget) {
        this.ctx.fillStyle = this.targetLetterColor;
      } else {
        this.ctx.fillStyle = this.wrongLetterColor;
      }
      
      // Draw letter with shadow
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
      
      this.ctx.font = `bold ${this.letterSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(letter.char, letter.x, letter.y);
      
      // Draw circle around target letter
      if (letter.isTarget) {
        this.ctx.strokeStyle = this.targetLetterColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(letter.x, letter.y, this.letterSize / 2 + 10, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    });

    // Draw target letter indicator
    this.drawTargetIndicator();
    
    // Draw hand cursor if detected
    if (this.handLandmarks) {
      this.drawHandCursor();
    }
  }

  drawTargetIndicator() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(10, 10, 200, 80);
    
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('Catch:', 110, 30);
    
    this.ctx.fillStyle = this.targetLetterColor;
    this.ctx.font = 'bold 40px Arial';
    this.ctx.fillText(this.targetLetter, 110, 65);
    
    this.ctx.restore();
  }

  drawHandCursor() {
    const indexTip = this.gestureDetector.getFingerTip(this.handLandmarks, 1);
    if (!indexTip) return;
    
    this.ctx.save();
    
    // Draw glowing circle at finger tip
    const gradient = this.ctx.createRadialGradient(
      indexTip.x, indexTip.y, 0,
      indexTip.x, indexTip.y, 30
    );
    gradient.addColorStop(0, 'rgba(0, 191, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(indexTip.x, indexTip.y, 30, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw inner circle
    this.ctx.fillStyle = '#00BFFF';
    this.ctx.beginPath();
    this.ctx.arc(indexTip.x, indexTip.y, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  spawnLetter() {
    const isTarget = Math.random() < 0.4; // 40% chance of target letter
    const char = isTarget ? this.targetLetter : this.getRandomWrongLetter();
    
    const letter = {
      char: char,
      x: Math.random() * (this.config.width - 100) + 50,
      y: -50,
      isTarget: isTarget,
      caught: false
    };
    
    this.letters.push(letter);
  }

  getRandomWrongLetter() {
    const availableLetters = this.letterSequence.filter(l => l !== this.targetLetter);
    return availableLetters[Math.floor(Math.random() * availableLetters.length)];
  }

  checkCollision(letter, fingerTip) {
    const distance = Math.sqrt(
      Math.pow(letter.x - fingerTip.x, 2) +
      Math.pow(letter.y - fingerTip.y, 2)
    );
    
    return distance < this.letterSize / 2 + 20;
  }

  catchLetter(letter, index) {
    if (letter.caught) return;
    
    letter.caught = true;
    this.letters.splice(index, 1);
    
    if (letter.isTarget) {
      // Correct letter caught!
      this.addScore(10);
      this.onCorrectCatch(letter.char);
      
      // Move to next letter
      this.currentIndex++;
      if (this.currentIndex >= this.letterSequence.length) {
        this.onLevelComplete();
      } else {
        this.targetLetter = this.letterSequence[this.currentIndex];
      }
    } else {
      // Wrong letter caught
      this.addScore(-5);
      this.onWrongCatch(letter.char);
    }
  }

  onCorrectCatch(letter) {
    console.log(`Correct! Caught ${letter}`);
    // Trigger success animation/sound
    if (this.config.onCorrect) {
      this.config.onCorrect(letter, this.score);
    }
  }

  onWrongCatch(letter) {
    console.log(`Wrong! Caught ${letter}, need ${this.targetLetter}`);
    if (this.config.onWrong) {
      this.config.onWrong(letter);
    }
  }

  onMissedLetter() {
    console.log(`Missed ${this.targetLetter}`);
    if (this.config.onMissed) {
      this.config.onMissed(this.targetLetter);
    }
  }

  onLevelComplete() {
    console.log('Level Complete! All letters caught!');
    this.levelUp();
    this.currentIndex = 0;
    this.targetLetter = this.letterSequence[0];
    
    // Increase difficulty
    this.fallSpeed += 20;
    this.spawnInterval = Math.max(1000, this.spawnInterval - 200);
    
    if (this.config.onLevelComplete) {
      this.config.onLevelComplete(this.level, this.score);
    }
  }

  updateHands(landmarks) {
    this.handLandmarks = landmarks;
  }
}
