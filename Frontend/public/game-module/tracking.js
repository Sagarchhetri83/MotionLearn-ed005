// MotionLearn — Game Tracking Layer
// This module auto-tracks game sessions without modifying the core game script.
// It hooks into the game lifecycle via DOM observation and localStorage.

import { startGameSession, endGameSession, updateSkillScores, checkAndAwardBadges, getSession } from '../api.js';

let currentSessionId = null;
let sessionStartTime = null;
let questionsTotal = 0;
let questionsCorrect = 0;
let lastKnownScore = 0;
let childId = null;
let isTracking = false;

/** Initialize tracking (call on page load) */
export async function initTracking() {
    try {
        // Get child ID from localStorage
        childId = localStorage.getItem('activeChildId');
        if (!childId) {
            console.log('[Tracking] No active child ID found. Tracking disabled.');
            return;
        }

        // Check if user is authenticated
        const session = await getSession();
        if (!session) {
            console.log('[Tracking] No auth session. Tracking disabled.');
            return;
        }

        isTracking = true;
        console.log('[Tracking] Initialized for child:', childId);

        // Get module info from localStorage
        const module = localStorage.getItem('selectedModule') || 'maths';
        const level = parseInt(localStorage.getItem('selectedLevel') || '1', 10);

        // Start a game session
        const sessionData = await startGameSession(childId, module, level);
        currentSessionId = sessionData.id;
        sessionStartTime = Date.now();
        questionsTotal = 0;
        questionsCorrect = 0;
        lastKnownScore = 0;

        console.log('[Tracking] Session started:', currentSessionId);

        // Observe score changes in the DOM
        observeScoreChanges();

        // Listen for page unload to end session
        window.addEventListener('beforeunload', endCurrentSession);

        // Listen for level complete or game over screens becoming visible
        observeGameEvents();

    } catch (err) {
        console.warn('[Tracking] Failed to initialize:', err.message);
    }
}

/** Watch for score display changes to count questions */
function observeScoreChanges() {
    const scoreEl = document.getElementById('score-display');
    if (!scoreEl) return;

    const observer = new MutationObserver(() => {
        const newScore = parseInt(scoreEl.textContent, 10);
        if (!isNaN(newScore) && newScore !== lastKnownScore) {
            if (newScore > lastKnownScore) {
                questionsCorrect++;
            }
            questionsTotal++;
            lastKnownScore = newScore;
        }
    });

    observer.observe(scoreEl, { childList: true, characterData: true, subtree: true });
}

/** Watch for game-over / level-complete screens */
function observeGameEvents() {
    // Observe visibility changes on game-over and level-complete screens
    const gameOverEl = document.getElementById('game-over-screen');
    const levelCompleteEl = document.getElementById('level-complete-screen');

    const visibilityObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target;
            const isVisible = target.style.display !== 'none' && !target.classList.contains('hidden');

            if (isVisible && (target.id === 'game-over-screen' || target.id === 'level-complete-screen')) {
                endCurrentSession();
            }
        }
    });

    if (gameOverEl) {
        visibilityObserver.observe(gameOverEl, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    if (levelCompleteEl) {
        visibilityObserver.observe(levelCompleteEl, { attributes: true, attributeFilter: ['style', 'class'] });
    }
}

/** End the current session and save data to Supabase */
async function endCurrentSession() {
    if (!isTracking || !currentSessionId) return;

    try {
        const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
        const finalScore = lastKnownScore;

        await endGameSession(
            currentSessionId,
            finalScore,
            questionsTotal,
            questionsCorrect,
            durationSeconds
        );

        // Update skill scores
        const accuracy = questionsTotal > 0 ? (questionsCorrect / questionsTotal) * 100 : 0;
        const speed = questionsTotal > 0
            ? Math.max(0, 100 - ((durationSeconds / questionsTotal) - 2) * 10)
            : 0;

        await updateSkillScores(childId, accuracy, speed);

        // Check for new badges
        await checkAndAwardBadges(childId);

        console.log('[Tracking] Session ended. Score:', finalScore, 'Duration:', durationSeconds + 's');

        // Reset so we don't double-save
        currentSessionId = null;
    } catch (err) {
        console.warn('[Tracking] Failed to end session:', err.message);
    }
}

// Auto-initialize when this module loads
initTracking();
