import { useState, useEffect, useRef } from 'react';
import { ThreeScene } from './ThreeScene';
import { GestureController } from './GestureController';
import { QuestionEngine } from './QuestionEngine';
import { LevelManager } from './LevelManager';
import { ProgressManager } from './ProgressManager';
import { ScoreManager } from './ScoreManager';

export default function MotionMathGame() {
  const [gameState, setGameState] = useState('idle'); // idle, playing, paused
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [tip, setTip] = useState('Click "Start" to begin! 🎮');
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const videoRef = useRef(null);
  const threeContainerRef = useRef(null);
  const threeSceneRef = useRef(null);
  const gestureControllerRef = useRef(null);
  const questionEngineRef = useRef(null);
  const levelManagerRef = useRef(null);
  const progressManagerRef = useRef(null);
  const scoreManagerRef = useRef(null);
  const timerRef = useRef(null);
  const answerStartTimeRef = useRef(null);
  
  useEffect(() => {
    questionEngineRef.current = new QuestionEngine();
    levelManagerRef.current = new LevelManager();
    progressManagerRef.current = new ProgressManager();
    scoreManagerRef.current = new ScoreManager();
    
    return () => {
      cleanup();
    };
  }, []);
  
  const cleanup = () => {
    if (threeSceneRef.current) {
      threeSceneRef.current.destroy();
      threeSceneRef.current = null;
    }
    
    if (gestureControllerRef.current) {
      gestureControllerRef.current.stop();
      gestureControllerRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const startGame = async () => {
    if (!videoRef.current || !threeContainerRef.current) {
      setTip('⚠️ Video or container not ready');
      return;
    }
    
    setTip('🔄 Initializing camera...');
    
    // Initialize Three.js scene
    threeSceneRef.current = new ThreeScene(
      threeContainerRef.current,
      handleAnswerHover,
      handleAnswerSelect
    );
    
    // Initialize gesture controller
    gestureControllerRef.current = new GestureController(
      videoRef.current,
      handleHandUpdate
    );
    
    const success = await gestureControllerRef.current.init();
    
    if (success) {
      setGameState('playing');
      generateNewQuestion(); // This sets the operation-specific tip
    } else {
      setTip('❌ Camera failed. Check permissions and reload.');
    }
  };
  
  const generateNewQuestion = () => {
    const level = levelManagerRef.current.getCurrentLevel();
    const question = questionEngineRef.current.generateForLevel(level);
    
    setCurrentQuestion(question);
    answerStartTimeRef.current = Date.now();
    
    // Set tip based on operation symbol from curriculum
    const operationSymbol = question.operationSymbol || '➕';
    const operationName = question.name || 'Math';
    const operationTip = `${operationSymbol} ${operationName} - Hover over answer for 2s`;
    
    setTip(operationTip);
    
    if (threeSceneRef.current) {
      threeSceneRef.current.createAnswerSpheres(question.options, question.correctAnswer);
    }
    
    // Start timer for level 3
    if (question.timeLimit) {
      setTimeRemaining(5);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeRemaining(null);
    }
  };
  
  const handleTimeout = () => {
    if (!currentQuestion) return;
    
    scoreManagerRef.current.addWrong();
    questionEngineRef.current.addToHistory(
      currentQuestion.question,
      currentQuestion.correctAnswer,
      false,
      currentQuestion.operationSymbol || ''
    );
    
    updateUI();
    setTip('Time out! Next question...');
    
    setTimeout(() => {
      checkLevelProgress();
    }, 1500);
  };
  
  const handleAnswerHover = (number) => {
    // Visual feedback handled by Three.js
  };
  
  const handleAnswerSelect = (number, isCorrect) => {
    if (!currentQuestion) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const timeElapsed = (Date.now() - answerStartTimeRef.current) / 1000;
    const timeBonus = timeElapsed < 3;
    
    if (isCorrect) {
      scoreManagerRef.current.addCorrect(timeBonus);
      setTip(timeBonus ? '✓ Correct! +15 XP (bonus)' : '✓ Correct! +10 XP');
    } else {
      scoreManagerRef.current.addWrong();
      setTip('✗ Wrong! Try next one');
    }
    
    questionEngineRef.current.addToHistory(
      currentQuestion.question,
      currentQuestion.correctAnswer,
      isCorrect,
      currentQuestion.operationSymbol || ''
    );
    
    progressManagerRef.current.addQuestion(currentLevel);
    
    updateUI();
    
    setTimeout(() => {
      checkLevelProgress();
    }, 1500);
  };
  
  const checkLevelProgress = () => {
    const progressMgr = progressManagerRef.current;
    const levelMgr = levelManagerRef.current;
    
    if (progressMgr.isLevelComplete(currentLevel)) {
      levelMgr.completeLevel();
      setShowLevelComplete(true);
      
      setTimeout(() => {
        setShowLevelComplete(false);
        
        if (currentLevel === 5) {
          setShowGameComplete(true);
          setGameState('idle');
        } else {
          const nextLevel = currentLevel + 1;
          setCurrentLevel(nextLevel);
          levelMgr.setLevel(nextLevel);
          generateNewQuestion();
        }
      }, 2000);
    } else {
      generateNewQuestion();
    }
  };
  
  const updateUI = () => {
    const stats = scoreManagerRef.current.getStats();
    setScore(stats.score);
    
    const overallProgress = progressManagerRef.current.getOverallProgress();
    setProgress(overallProgress);
    
    const hist = questionEngineRef.current.getHistory();
    setHistory(hist);
  };
  
  const handleHandUpdate = (hand) => {
    if (threeSceneRef.current && gameState === 'playing') {
      // Update hand position in 3D scene
      threeSceneRef.current.updateMousePosition(hand.x, hand.y);
      
      // Debug logging (remove after testing)
      console.log('Hand detected at:', hand.x.toFixed(2), hand.y.toFixed(2));
    }
  };
  
  const handleRestart = () => {
    cleanup();
    
    scoreManagerRef.current.reset();
    progressManagerRef.current.reset();
    levelManagerRef.current.reset();
    questionEngineRef.current.clearHistory();
    
    setCurrentLevel(1);
    setScore(0);
    setProgress(0);
    setHistory([]);
    setGameState('idle');
    setCurrentQuestion(null);
    setShowLevelComplete(false);
    setShowGameComplete(false);
    setTimeRemaining(null);
    setTip('Click "Start" to begin! 🎮');
  };
  
  const handleLevelSelect = (level) => {
    if (levelManagerRef.current.isLevelUnlocked(level)) {
      levelManagerRef.current.setLevel(level);
      setCurrentLevel(level);
      
      if (gameState === 'playing') {
        generateNewQuestion();
      }
    } else {
      setTip('Level locked! Complete previous levels first');
    }
  };
  
  const handleEndGame = () => {
    if (confirm('End game and return to dashboard?')) {
      cleanup();
      window.location.href = 'dashboard.html';
    }
  };
  
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f5e6d3 0%, #d4c5a9 100%)' }}>
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center shadow-md mx-5 mt-2 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.95)', border: '3px solid #d4af37' }}>
        <div className="text-xl font-bold" style={{ color: '#333' }}>
          {currentQuestion ? currentQuestion.question : 'Choose the correct answer'}
        </div>
        <button
          onClick={handleEndGame}
          className="px-6 py-2 rounded-xl transition font-semibold"
          style={{
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 10px rgba(231, 76, 60, 0.3)'
          }}
        >
          End Game
        </button>
      </div>

      <div className="flex h-[calc(100vh-80px)] px-5 pb-5 gap-5">
        {/* Left Sidebar */}
        <div className="w-64 p-4 space-y-4 overflow-y-auto">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Score</h3>
            <div className="text-3xl font-bold" style={{ color: '#8B6914' }}>Score: {score}</div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>History</h3>
            <div className="space-y-1 text-sm min-h-32 max-h-32 overflow-y-auto rounded-xl p-3" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '2px dashed #d4af37' }}>
              {history.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', paddingTop: '20px' }}>No history yet</div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} style={{ color: '#555' }}>
                    {item.operation && <span>{item.operation} </span>}
                    {item.question} = {item.answer} {item.correct ? '✔' : '✖'}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Tip</h3>
            <div className="text-sm text-center p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #FFFBEA, #FFF4CC)', border: '2px solid #d4af37', color: '#8B6914', fontWeight: 600 }}>{tip}</div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Controls</h3>
            <div className="space-y-2">
              <button
                onClick={startGame}
                disabled={gameState === 'playing'}
                className="w-full px-4 py-2 rounded-xl transition font-semibold"
                style={{
                  background: gameState === 'playing' ? '#9ca3af' : 'linear-gradient(135deg, #8B4513, #A0522D)',
                  color: 'white',
                  border: '2px solid #d4af37',
                  cursor: gameState === 'playing' ? 'not-allowed' : 'pointer'
                }}
              >
                Start
              </button>
              <button
                onClick={handleRestart}
                className="w-full px-4 py-2 rounded-xl transition font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #D2691E, #CD853F)',
                  color: 'white',
                  border: '2px solid #d4af37'
                }}
              >
                Restart
              </button>
            </div>
          </div>
        </div>

        {/* Center - 3D Game Area */}
        <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ border: '3px solid #d4af37', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover mirror-video"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          <div
            ref={threeContainerRef}
            className="absolute top-0 left-0 w-full h-full"
          />

          {timeRemaining !== null && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-6 py-3 rounded-full text-2xl font-bold">
              {timeRemaining}s
            </div>
          )}

          {showLevelComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-6xl text-white font-bold mb-4">
                  Level {currentLevel} Complete! 
                </div>
                <div className="text-3xl text-green-400">100%</div>
              </div>
            </div>
          )}

          {showGameComplete && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/90 to-blue-500/90 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-7xl text-white font-bold mb-4">
                  🎉 Math Module Complete!
                </div>
                <div className="text-4xl text-white mb-2">100% Completed</div>
                <div className="text-2xl text-white">Final Score: {score} XP</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 p-4 space-y-4">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Level</h3>
            <div className="text-2xl font-bold" style={{ color: '#8B6914' }}>Level: {currentLevel}</div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Progress</h3>
            <div className="w-full rounded-full h-6 mb-2" style={{ background: 'rgba(220, 220, 220, 0.6)', border: '2px solid #d4af37' }}>
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-center" style={{ color: '#999', fontWeight: 600 }}>{Math.round((progress / 100) * 5)}/5 Complete</div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 252, 240, 0.98)', border: '3px solid #d4af37', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)' }}>
            <h3 className="font-bold mb-2" style={{ color: '#8B6914' }}>Levels</h3>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  onClick={() => handleLevelSelect(level)}
                  disabled={!levelManagerRef.current?.isLevelUnlocked(level)}
                  className="px-4 py-2 rounded-xl font-bold transition"
                  style={{
                    background: currentLevel === level 
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                      : levelManagerRef.current?.isLevelUnlocked(level)
                        ? 'rgba(255, 255, 255, 0.9)'
                        : 'rgba(180, 180, 180, 0.5)',
                    color: currentLevel === level 
                      ? '#8B4513'
                      : levelManagerRef.current?.isLevelUnlocked(level)
                        ? '#8B6914'
                        : '#999',
                    border: '2px solid #d4af37',
                    cursor: levelManagerRef.current?.isLevelUnlocked(level) ? 'pointer' : 'not-allowed',
                    boxShadow: currentLevel === level ? '0 3px 12px rgba(255, 215, 0, 0.5)' : 'none',
                    fontWeight: 'bold'
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Camera Button */}
          <button
            className="w-full px-4 py-3 rounded-xl transition font-semibold"
            style={{
              background: 'linear-gradient(135deg, #faad14, #d48806)',
              color: 'white',
              border: '2px solid #d4af37',
              boxShadow: '0 3px 10px rgba(250, 173, 20, 0.3)'
            }}
          >
            Toggle Camera
          </button>
        </div>
      </div>
    </div>
  );
}
