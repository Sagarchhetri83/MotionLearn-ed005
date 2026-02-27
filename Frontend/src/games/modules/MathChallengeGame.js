/**
 * MathChallengeGame - Solve math problems using hand gestures
 * Subject: Mathematics
 */

import { BaseGame } from '../BaseGame.js';
import { GestureDetector } from '../utils/GestureDetector.js';

export class MathChallengeGame extends BaseGame {
  constructor(canvasContext, config = {}) {
    super(canvasContext, config);
    
    this.gestureDetector = new GestureDetector(this.config.width, this.config.height);
    this.currentProblem = null;
    this.answerOptions = [];
    this.timeLimit = 15000; // 15 seconds
    this.timeRemaining = this.timeLimit;
    this.problemsCompleted = 0;
  }

  init() {
    console.log('Math Challenge Game initialized');
    this.generateProblem();
  }

  update(deltaTime) {
    if (this.isPaused || !this.isRunning) return;
    
    this.timeRemaining -= deltaTime;
    
    if (this.timeRemaining <= 0) {
      this.onTimeUp();
    }
    
    // Check for hand interaction with answers
    if (this.handLandmarks) {
      this.checkAnswerSelection();
    }
  }

  render() {
    // Draw problem
    this.ctx.save();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      this.currentProblem.question,
      this.config.width / 2,
      150
    );
    
    // Draw answer options
    this.answerOptions.forEach((option, index) => {
      const x = (this.config.width / 4) * (index + 1);
      const y = this.config.height / 2;
      
      // Draw answer bubble
      this.ctx.fillStyle = option.selected ? '#4CAF50' : '#2196F3';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 60, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 36px Arial';
      this.ctx.fillText(option.value.toString(), x, y + 12);
    });
    
    // Draw timer
    this.drawTimer();
    
    this.ctx.restore();
  }

  drawTimer() {
    const percentage = this.timeRemaining / this.timeLimit;
    const barWidth = 300;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(this.config.width / 2 - barWidth / 2, 50, barWidth, 20);
    
    this.ctx.fillStyle = percentage > 0.3 ? '#4CAF50' : '#FF5252';
    this.ctx.fillRect(
      this.config.width / 2 - barWidth / 2,
      50,
      barWidth * percentage,
      20
    );
  }

  generateProblem() {
    const difficulty = this.level;
    const maxNum = 10 * difficulty;
    
    const num1 = Math.floor(Math.random() * maxNum) + 1;
    const num2 = Math.floor(Math.random() * maxNum) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    let question;
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
        break;
      case '-':
        answer = Math.max(num1, num2) - Math.min(num1, num2);
        question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`;
        break;
      case '*':
        answer = num1 * num2;
        question = `${num1} × ${num2} = ?`;
        break;
    }
    
    this.currentProblem = { question, answer };
    this.generateAnswerOptions(answer);
    this.timeRemaining = this.timeLimit;
  }

  generateAnswerOptions(correctAnswer) {
    this.answerOptions = [{ value: correctAnswer, isCorrect: true, selected: false }];
    
    // Generate 2 wrong answers
    for (let i = 0; i < 2; i++) {
      let wrongAnswer;
      do {
        const offset = Math.floor(Math.random() * 10) + 1;
        wrongAnswer = correctAnswer + (Math.random() > 0.5 ? offset : -offset);
      } while (
        wrongAnswer === correctAnswer ||
        wrongAnswer < 0 ||
        this.answerOptions.some(opt => opt.value === wrongAnswer)
      );
      
      this.answerOptions.push({ value: wrongAnswer, isCorrect: false, selected: false });
    }
    
    // Shuffle options
    this.answerOptions.sort(() => Math.random() - 0.5);
  }

  checkAnswerSelection() {
    const indexTip = this.gestureDetector.getFingerTip(this.handLandmarks, 1);
    if (!indexTip) return;
    
    this.answerOptions.forEach((option, index) => {
      const x = (this.config.width / 4) * (index + 1);
      const y = this.config.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(x - indexTip.x, 2) +
        Math.pow(y - indexTip.y, 2)
      );
      
      if (distance < 60 && this.gestureDetector.isPinching(this.handLandmarks)) {
        this.selectAnswer(option);
      }
    });
  }

  selectAnswer(option) {
    if (option.isCorrect) {
      this.onCorrectAnswer();
    } else {
      this.onWrongAnswer();
    }
  }

  onCorrectAnswer() {
    this.addScore(Math.ceil(this.timeRemaining / 100));
    this.problemsCompleted++;
    
    if (this.problemsCompleted >= 5) {
      this.levelUp();
      this.problemsCompleted = 0;
    }
    
    this.generateProblem();
    
    if (this.config.onCorrect) {
      this.config.onCorrect(this.score);
    }
  }

  onWrongAnswer() {
    this.addScore(-10);
    
    if (this.config.onWrong) {
      this.config.onWrong();
    }
  }

  onTimeUp() {
    this.onWrongAnswer();
    this.generateProblem();
  }

  updateHands(landmarks) {
    this.handLandmarks = landmarks;
  }
}
