// MotionLearn — Backend API Helper
// Wraps all Supabase queries for game tracking, parental dashboard, and auth
import { supabase } from './supabaseClient.js';

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════

/** Sign up a new parent account */
export async function signUp(email, password, displayName) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });
    if (authError) throw authError;

    // Create parent profile row
    const { error: profileError } = await supabase.from('parents').insert({
        id: authData.user.id,
        display_name: displayName,
        email: email,
    });
    if (profileError) throw profileError;

    return authData;
}

/** Sign in an existing parent */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

/** Sign out */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/** Get current user session */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/** Listen for auth state changes */
export function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

// ═══════════════════════════════════════════════
// CHILDREN
// ═══════════════════════════════════════════════

/** Create a child profile under the current parent */
export async function createChild(name, age) {
    const session = await getSession();
    if (!session) throw new Error('Not logged in');

    const { data, error } = await supabase.from('children').insert({
        parent_id: session.user.id,
        name,
        age,
    }).select().single();

    if (error) throw error;

    // Initialize default parental controls for this child
    await supabase.from('parental_controls').insert({ child_id: data.id });

    // Initialize skill scores
    const defaultSkills = ['Problem Solving', 'Logical Thinking', 'Speed', 'Accuracy'];
    await supabase.from('skill_scores').insert(
        defaultSkills.map(skill => ({ child_id: data.id, skill_name: skill, score: 0 }))
    );

    return data;
}

/** Get all children for the current parent */
export async function getChildren() {
    const session = await getSession();
    if (!session) throw new Error('Not logged in');

    const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', session.user.id)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

// ═══════════════════════════════════════════════
// GAME SESSIONS — called from game-module/script.js
// ═══════════════════════════════════════════════

/** Start a new game session (called when game begins) */
export async function startGameSession(childId, module, level) {
    const { data, error } = await supabase.from('game_sessions').insert({
        child_id: childId,
        module,
        level,
        started_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    return data;
}

/** End a game session (called when game ends or level completes) */
export async function endGameSession(sessionId, score, questionsTotal, questionsCorrect, durationSeconds) {
    const { error } = await supabase.from('game_sessions').update({
        score,
        questions_total: questionsTotal,
        questions_correct: questionsCorrect,
        duration_seconds: durationSeconds,
        ended_at: new Date().toISOString(),
    }).eq('id', sessionId);

    if (error) throw error;

    // Also update daily activity
    const session = await supabase.from('game_sessions').select('child_id').eq('id', sessionId).single();
    if (session.data) {
        await updateDailyActivity(session.data.child_id, Math.ceil(durationSeconds / 60), questionsTotal);
    }
}

/** Update or create the daily activity row for today */
async function updateDailyActivity(childId, minutes, questionsSolved) {
    const today = new Date().toISOString().split('T')[0];

    // Try to get existing row for today
    const { data: existing } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('child_id', childId)
        .eq('date', today)
        .single();

    if (existing) {
        await supabase.from('daily_activity').update({
            total_minutes: existing.total_minutes + minutes,
            sessions_count: existing.sessions_count + 1,
            questions_solved: existing.questions_solved + questionsSolved,
        }).eq('id', existing.id);
    } else {
        await supabase.from('daily_activity').insert({
            child_id: childId,
            date: today,
            total_minutes: minutes,
            sessions_count: 1,
            questions_solved: questionsSolved,
        });
    }
}

// ═══════════════════════════════════════════════
// SKILL SCORES — updated after each session
// ═══════════════════════════════════════════════

/** Update skill scores based on game performance */
export async function updateSkillScores(childId, accuracy, speed) {
    // Accuracy skill
    if (accuracy !== undefined) {
        await supabase.from('skill_scores').update({
            score: Math.min(100, Math.round(accuracy)),
            updated_at: new Date().toISOString(),
        }).eq('child_id', childId).eq('skill_name', 'Accuracy');
    }

    // Speed skill (based on avg time per question — lower is better)
    if (speed !== undefined) {
        await supabase.from('skill_scores').update({
            score: Math.min(100, Math.round(speed)),
            updated_at: new Date().toISOString(),
        }).eq('child_id', childId).eq('skill_name', 'Speed');
    }
}

// ═══════════════════════════════════════════════
// ACHIEVEMENTS — badge evaluation
// ═══════════════════════════════════════════════

const BADGE_CRITERIA = [
    { name: 'Champion', icon: '🏆', check: (stats) => stats.totalSessions >= 10 },
    { name: 'Speed Star', icon: '⚡', check: (stats) => stats.avgSpeed >= 80 },
    { name: 'Genius', icon: '🧠', check: (stats) => stats.avgAccuracy >= 90 },
    { name: 'On Fire', icon: '🔥', check: (stats) => stats.streak >= 7 },
    { name: 'Bullseye', icon: '🎯', check: (stats) => stats.perfectLevels >= 3 },
    { name: 'Rocket', icon: '🚀', check: (stats) => stats.totalSessions >= 25 },
    { name: 'Inventor', icon: '💡', check: (stats) => stats.modulesPlayed >= 3 },
    { name: 'All-Star', icon: '🌟', check: (stats) => stats.totalScore >= 5000 },
];

/** Check and award badges the child has earned but doesn't have yet */
export async function checkAndAwardBadges(childId) {
    // Get existing badges
    const { data: existing } = await supabase
        .from('achievements')
        .select('badge_name')
        .eq('child_id', childId);
    const earnedNames = new Set((existing || []).map(b => b.badge_name));

    // Get stats for evaluation
    const stats = await getChildGameStats(childId);

    // Check each badge
    const newBadges = [];
    for (const badge of BADGE_CRITERIA) {
        if (!earnedNames.has(badge.name) && badge.check(stats)) {
            newBadges.push({
                child_id: childId,
                badge_name: badge.name,
                badge_icon: badge.icon,
            });
        }
    }

    if (newBadges.length > 0) {
        await supabase.from('achievements').insert(newBadges);
    }

    return newBadges;
}

/** Get aggregated game stats for a child */
async function getChildGameStats(childId) {
    const { data: sessions } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('child_id', childId)
        .not('ended_at', 'is', null);

    const allSessions = sessions || [];
    const totalSessions = allSessions.length;
    const totalScore = allSessions.reduce((s, r) => s + (r.score || 0), 0);
    const totalCorrect = allSessions.reduce((s, r) => s + (r.questions_correct || 0), 0);
    const totalQuestions = allSessions.reduce((s, r) => s + (r.questions_total || 0), 0);
    const avgAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const perfectLevels = allSessions.filter(s => s.questions_total > 0 && s.questions_correct === s.questions_total).length;
    const modulesPlayed = new Set(allSessions.map(s => s.module)).size;

    // Calculate streak (consecutive days with activity)
    const { data: activity } = await supabase
        .from('daily_activity')
        .select('date')
        .eq('child_id', childId)
        .order('date', { ascending: false })
        .limit(30);

    let streak = 0;
    if (activity && activity.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);

        for (const row of activity) {
            const rowDate = new Date(row.date);
            rowDate.setHours(0, 0, 0, 0);
            const diff = Math.round((checkDate - rowDate) / 86400000);
            if (diff <= 1) {
                streak++;
                checkDate = rowDate;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Speed: average duration per question (invert for score)
    const totalDuration = allSessions.reduce((s, r) => s + (r.duration_seconds || 0), 0);
    const avgTimePerQ = totalQuestions > 0 ? totalDuration / totalQuestions : 999;
    const avgSpeed = Math.max(0, 100 - (avgTimePerQ - 2) * 10); // 2s per Q = 100, 12s = 0

    return { totalSessions, totalScore, avgAccuracy, avgSpeed, perfectLevels, modulesPlayed, streak };
}

// ═══════════════════════════════════════════════
// PARENTAL DASHBOARD — data fetching
// ═══════════════════════════════════════════════

/** Get full dashboard data for a specific child */
export async function getDashboardData(childId) {
    const [
        perfResult,
        weeklyResult,
        skillsResult,
        badgesResult,
        controlsResult,
        sessionsResult,
    ] = await Promise.all([
        getPerformanceStats(childId),
        getWeeklyActivity(childId),
        getSkillScores(childId),
        getAchievements(childId),
        getParentalControls(childId),
        getRecentSessions(childId),
    ]);

    return {
        performance: perfResult,
        weeklyActivity: weeklyResult,
        skills: skillsResult,
        badges: badgesResult,
        controls: controlsResult,
        recentSessions: sessionsResult,
    };
}

/** Performance overview stats */
async function getPerformanceStats(childId) {
    // Total time this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthSessions } = await supabase
        .from('game_sessions')
        .select('duration_seconds, score, level')
        .eq('child_id', childId)
        .gte('started_at', monthStart.toISOString())
        .not('ended_at', 'is', null);

    const sessions = monthSessions || [];
    const totalMinutes = sessions.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60;
    const levelsCompleted = sessions.length;
    const totalScore = sessions.reduce((s, r) => s + (r.score || 0), 0);

    // Week over week progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: thisWeek } = await supabase
        .from('game_sessions')
        .select('score')
        .eq('child_id', childId)
        .gte('started_at', weekAgo.toISOString())
        .not('ended_at', 'is', null);

    const { data: lastWeek } = await supabase
        .from('game_sessions')
        .select('score')
        .eq('child_id', childId)
        .gte('started_at', twoWeeksAgo.toISOString())
        .lt('started_at', weekAgo.toISOString())
        .not('ended_at', 'is', null);

    const thisWeekScore = (thisWeek || []).reduce((s, r) => s + r.score, 0);
    const lastWeekScore = (lastWeek || []).reduce((s, r) => s + r.score, 0);
    const weeklyProgress = lastWeekScore > 0
        ? Math.round(((thisWeekScore - lastWeekScore) / lastWeekScore) * 100)
        : 0;

    return {
        totalHours: (totalMinutes / 60).toFixed(1),
        levelsCompleted,
        totalScore,
        weeklyProgress,
    };
}

/** Weekly activity for the bar chart (last 7 days) */
async function getWeeklyActivity(childId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
        .from('daily_activity')
        .select('date, total_minutes')
        .eq('child_id', childId)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

    // Fill in missing days with 0
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = (data || []).find(r => r.date === dateStr);
        result.push({
            label: days[d.getDay()],
            minutes: found ? found.total_minutes : 0,
        });
    }
    return result;
}

/** Get skill mastery scores */
async function getSkillScores(childId) {
    const { data } = await supabase
        .from('skill_scores')
        .select('skill_name, score')
        .eq('child_id', childId);
    return data || [];
}

/** Get earned achievements */
async function getAchievements(childId) {
    const { data } = await supabase
        .from('achievements')
        .select('badge_name, badge_icon, earned_at')
        .eq('child_id', childId)
        .order('earned_at', { ascending: true });
    return data || [];
}

/** Get parental control settings */
async function getParentalControls(childId) {
    const { data } = await supabase
        .from('parental_controls')
        .select('*')
        .eq('child_id', childId)
        .single();
    return data;
}

/** Save parental control settings */
export async function saveParentalControls(childId, settings) {
    const { error } = await supabase.from('parental_controls').upsert({
        child_id: childId,
        ...settings,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'child_id' });

    if (error) throw error;
}

/** Get most recent game sessions */
async function getRecentSessions(childId) {
    const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('child_id', childId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(10);
    return data || [];
}

/** Get learning distribution (time per module) */
export async function getLearningDistribution(childId) {
    const { data: sessions } = await supabase
        .from('game_sessions')
        .select('module, duration_seconds')
        .eq('child_id', childId)
        .not('ended_at', 'is', null);

    const distribution = {};
    (sessions || []).forEach(s => {
        if (!distribution[s.module]) distribution[s.module] = 0;
        distribution[s.module] += s.duration_seconds || 0;
    });

    const totalSeconds = Object.values(distribution).reduce((s, v) => s + v, 0);
    return Object.entries(distribution).map(([module, seconds]) => ({
        module,
        seconds,
        percentage: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0,
    }));
}

// ═══════════════════════════════════════════════
// REAL-TIME SYNC
// ═══════════════════════════════════════════════

/** Subscribe to live updates for a specific child's data */
export function subscribeToChildUpdates(childId, callback) {
    if (!childId) return null;

    console.log(`[Realtime] Subscribing to updates for child: ${childId}`);

    // Create a Supabase channel
    const channel = supabase.channel(`child_${childId}_updates`);

    // Listen to all relevant tables where child_id matches
    const tables = ['game_sessions', 'achievements', 'daily_activity', 'skill_scores'];

    tables.forEach(table => {
        channel.on(
            'postgres_changes',
            {
                event: '*',          // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: table,
                filter: `child_id=eq.${childId}`
            },
            (payload) => {
                console.log(`[Realtime] Received ${payload.eventType} on ${table}`, payload);
                if (callback) callback(payload);
            }
        );
    });

    // Start listening
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Successfully connected to live updates!`);
        }
    });

    return channel;
}
