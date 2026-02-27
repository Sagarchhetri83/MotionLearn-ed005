// MotionLearn — Parent Dashboard Data Loader
// Fetches real data from Supabase and populates the dashboard

import {
    getSession,
    getChildren,
    getDashboardData,
    getLearningDistribution,
    saveParentalControls,
    signOut,
    subscribeToChildUpdates,
} from './api.js';

let activeChild = null;

/** Initialize dashboard with real data */
async function initDashboard() {
    try {
        // Check auth
        const session = await getSession();
        if (!session) {
            console.log('[Dashboard] No session — using static data');
            return; // Keep showing hardcoded data if not logged in
        }

        // Get children
        const children = await getChildren();
        if (children.length === 0) {
            console.log('[Dashboard] No children found — using static data');
            return;
        }

        activeChild = children[0]; // Use first child
        localStorage.setItem('activeChildId', activeChild.id);

        // Fetch all dashboard data
        const data = await getDashboardData(activeChild.id);
        const distribution = await getLearningDistribution(activeChild.id);

        // Populate the UI
        populateWelcomeBanner(data);
        populatePerformance(data.performance);
        populateLearningDistribution(distribution);
        populateSkillCircles(data.skills);
        populateWeeklyChart(data.weeklyActivity);
        populateBadges(data.badges);
        populateParentalControls(data.controls);

        console.log('[Dashboard] Loaded real data for:', activeChild.name);

        // Start listening for real-time updates from child gameplay
        setupLiveSync(activeChild.id);

    } catch (err) {
        console.warn('[Dashboard] Failed to load data:', err.message);
        // Gracefully fall back to static hardcoded data
    }
}

/** Set up Supabase Realtime sync to automatically refresh UI */
let syncChannel = null;

function setupLiveSync(childId) {
    if (syncChannel) {
        syncChannel.unsubscribe(); // Clean up old subscription
    }

    syncChannel = subscribeToChildUpdates(childId, async (payload) => {
        console.log('[Dashboard] ⚡ Live event received, refreshing UI data...');
        try {
            // Re-fetch everything silently
            const newData = await getDashboardData(childId);
            const newDist = await getLearningDistribution(childId);

            // Re-render UI components
            populateWelcomeBanner(newData);
            populatePerformance(newData.performance);
            populateLearningDistribution(newDist);
            populateSkillCircles(newData.skills);
            populateWeeklyChart(newData.weeklyActivity);
            populateBadges(newData.badges);

            // Optional: Show a subtle toast or notification that a live sync occurred
            console.log('[Dashboard] ✅ Live sync complete');

        } catch (err) {
            console.warn('[Dashboard] Live sync refresh failed:', err);
        }
    });
}

/** Update welcome banner with real child data */
function populateWelcomeBanner(data) {
    const bannerText = document.querySelector('.banner-text');
    if (!bannerText || !activeChild) return;

    const streak = data.weeklyActivity.filter(d => d.minutes > 0).length;
    const todayMins = data.weeklyActivity[data.weeklyActivity.length - 1]?.minutes || 0;
    const todaySessions = data.recentSessions.filter(s => {
        const d = new Date(s.started_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;

    const tagEl = bannerText.querySelector('.tag');
    const h2El = bannerText.querySelector('h2');
    const subEl = bannerText.querySelector('.sub');

    if (tagEl) tagEl.textContent = '👋 Welcome back!';
    if (h2El) h2El.textContent = `${activeChild.name} is on a ${streak}-day streak! 🔥`;
    if (subEl) subEl.textContent = `Completed ${todaySessions} challenges today · ${todayMins} mins active`;

    // Update stat chips
    const statChips = document.querySelectorAll('.stat-chip');
    if (statChips[0]) {
        statChips[0].querySelector('.val').textContent = data.performance.totalScore.toLocaleString();
    }
}

/** Update performance cards */
function populatePerformance(perf) {
    const perfCards = document.querySelectorAll('.perf-card');
    if (perfCards.length < 4) return;

    // Time Spent
    const timeVal = perfCards[0].querySelector('.perf-val');
    if (timeVal) timeVal.textContent = perf.totalHours + 'h';

    // Levels Completed
    const levelsVal = perfCards[1].querySelector('.perf-val');
    if (levelsVal) levelsVal.textContent = perf.levelsCompleted;

    // Total Score
    const scoreVal = perfCards[2].querySelector('.perf-val');
    if (scoreVal) scoreVal.textContent = perf.totalScore.toLocaleString();

    // Weekly Progress
    const progressVal = perfCards[3].querySelector('.perf-val');
    if (progressVal) {
        const sign = perf.weeklyProgress >= 0 ? '+' : '';
        progressVal.textContent = sign + perf.weeklyProgress + '%';
    }
}

/** Update learning distribution bars */
function populateLearningDistribution(distribution) {
    const ldBars = document.getElementById('ld-bars');
    if (!ldBars || distribution.length === 0) return;

    const moduleNames = {
        maths: '🔢 Math',
        physics: '⚛️ Physics',
        chemistry: '🧪 Chemistry',
        biology: '🧬 Biology',
        english: '💻 English',
    };

    ldBars.innerHTML = '';
    distribution.forEach(({ module, percentage }) => {
        const name = moduleNames[module] || module;
        ldBars.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">
          <span>${name}</span>
          <span class="pct">${percentage}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${percentage}%;background:linear-gradient(90deg,#a8e0f5,#5bc4e8)"></div>
        </div>
      </div>`;
    });
}

/** Update skill mastery circles */
function populateSkillCircles(skills) {
    const circlesWrap = document.getElementById('skill-circles');
    if (!circlesWrap || skills.length === 0) return;

    const colors = {
        'Problem Solving': { color: '#5bc4e8', track: '#c8eef8' },
        'Logical Thinking': { color: '#c084fc', track: '#ede9fe' },
        'Speed': { color: '#fb923c', track: '#fde8d8' },
        'Accuracy': { color: '#6abf59', track: '#d4f0d0' },
    };

    const R = 36, CIRC = 2 * Math.PI * R;
    circlesWrap.innerHTML = '';

    skills.forEach(({ skill_name, score }) => {
        const { color, track } = colors[skill_name] || { color: '#999', track: '#ddd' };
        const offset = CIRC - (score / 100) * CIRC;
        circlesWrap.innerHTML += `
      <div class="circle-wrap">
        <div class="circle-svg-w">
          <svg viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="${R}" fill="none" stroke="${track}" stroke-width="8"/>
            <circle cx="48" cy="48" r="${R}" fill="none" stroke="${color}" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${offset}"
              style="transform:rotate(-90deg);transform-origin:center"/>
          </svg>
          <div class="circle-pct" style="color:${color}">${score}%</div>
        </div>
        <div class="circle-lbl">${skill_name}</div>
      </div>`;
    });

    // Update overall mastery bar
    const overall = skills.length > 0
        ? Math.round(skills.reduce((s, sk) => s + sk.score, 0) / skills.length)
        : 0;
    const overallRow = document.querySelector('.mastery-overall .row span:last-child');
    if (overallRow) overallRow.textContent = overall + '%';
    const overallFill = document.querySelector('.overall-fill');
    if (overallFill) overallFill.style.width = overall + '%';
}

/** Update weekly activity chart */
function populateWeeklyChart(weeklyActivity) {
    // The chart is already created by Chart.js in the HTML
    // We need to update it with new data
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;

    // Chart.js stores the instance on the canvas
    const chartInstance = Chart.getChart(canvas);
    if (chartInstance) {
        chartInstance.data.labels = weeklyActivity.map(d => d.label);
        chartInstance.data.datasets[0].data = weeklyActivity.map(d => d.minutes);
        chartInstance.update();
    }

    // Update total
    const total = weeklyActivity.reduce((s, d) => s + d.minutes, 0);
    const totalEl = document.querySelector('.card-hdr .pill-sky');
    if (totalEl) {
        totalEl.innerHTML = `<span style="color:#0ea5e9;font-weight:800">${total} mins</span>&nbsp;total`;
    }

    // Update avg
    const avg = Math.round(total / 7);
    const avgEl = document.querySelector('.chart-meta .strong');
    if (avgEl) avgEl.textContent = ` ${avg} min/day`;
}

/** Update badges grid */
function populateBadges(earnedBadges) {
    const bgGrid = document.getElementById('badges-grid');
    if (!bgGrid) return;

    const allBadges = [
        { icon: '🏆', name: 'Champion' },
        { icon: '⚡', name: 'Speed Star' },
        { icon: '🧠', name: 'Genius' },
        { icon: '🔥', name: 'On Fire' },
        { icon: '🎯', name: 'Bullseye' },
        { icon: '🚀', name: 'Rocket' },
        { icon: '💡', name: 'Inventor' },
        { icon: '🌟', name: 'All-Star' },
    ];

    const earnedNames = new Set(earnedBadges.map(b => b.badge_name));

    bgGrid.innerHTML = '';
    allBadges.forEach(({ icon, name }) => {
        const earned = earnedNames.has(name);
        bgGrid.innerHTML += `
      <div class="badge-item ${earned ? 'earned' : 'locked'}" title="${name}">
        <span class="icon">${icon}</span>
        <span>${name}</span>
      </div>`;
    });

    // Update earned count
    const earnedCountEl = document.querySelector('.rw-box:nth-child(2) .v');
    if (earnedCountEl) earnedCountEl.textContent = earnedBadges.length;
}

/** Load parental controls from DB */
function populateParentalControls(controls) {
    if (!controls) return;

    // Playtime slider
    const playtimeSlider = document.getElementById('playtime-slider');
    if (playtimeSlider) {
        playtimeSlider.value = controls.daily_playtime_limit;
        playtimeSlider.dispatchEvent(new Event('input'));
    }

    // Difficulty slider
    const diffSlider = document.getElementById('diff-slider');
    if (diffSlider) {
        diffSlider.value = controls.difficulty_level;
        diffSlider.dispatchEvent(new Event('input'));
    }

    // Toggles
    const toggleMap = {
        't-multiplayer': controls.multiplayer_enabled,
        't-night': controls.night_mode_restriction,
        't-notif': controls.progress_notifications,
    };

    Object.entries(toggleMap).forEach(([id, value]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('on', value);
            btn.setAttribute('aria-checked', String(value));
        }
    });
}

/** Override save button to persist to Supabase */
function wireSaveButton() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (!saveBtn || !activeChild) return;

    // Remove old listener by cloning
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener('click', async () => {
        newBtn.disabled = true;
        newBtn.textContent = 'Saving...';

        try {
            const settings = {
                daily_playtime_limit: parseInt(document.getElementById('playtime-slider').value, 10),
                difficulty_level: parseInt(document.getElementById('diff-slider').value, 10),
                multiplayer_enabled: document.getElementById('t-multiplayer').classList.contains('on'),
                night_mode_restriction: document.getElementById('t-night').classList.contains('on'),
                progress_notifications: document.getElementById('t-notif').classList.contains('on'),
            };

            await saveParentalControls(activeChild.id, settings);
            newBtn.textContent = '✅ Settings Saved!';
        } catch (err) {
            newBtn.textContent = '❌ Error saving';
            console.error('[Dashboard] Save error:', err);
        }

        setTimeout(() => {
            newBtn.textContent = 'Save Settings';
            newBtn.disabled = false;
        }, 2000);
    });
}

/** Override sign-out to use Supabase auth */
function wireSignOut() {
    const logoutBtn = document.getElementById('pd-logout-btn');
    if (!logoutBtn) return;

    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

    newBtn.addEventListener('click', async () => {
        try {
            await signOut();
            localStorage.removeItem('activeChildId');
            window.location.href = '/login.html';
        } catch (err) {
            window.location.href = '/';
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a tick for Chart.js and other scripts to finish
    setTimeout(async () => {
        await initDashboard();
        wireSaveButton();
        wireSignOut();
    }, 500);
});
