// MotionLearn Backend — Express Server
// Provides REST API endpoints for game tracking, parental dashboard, and analytics

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase, supabaseAdmin } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
}));
app.use(express.json());

// ═══════════════════════════════════════════════
// AUTH MIDDLEWARE — extract user from Bearer token
// ═══════════════════════════════════════════════
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
}

// ═══════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MotionLearn Backend',
        timestamp: new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, displayName, childName, childAge } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // Create parent profile (using admin client to bypass RLS during signup)
        const { error: parentError } = await supabaseAdmin.from('parents').insert({
            id: authData.user.id,
            display_name: displayName || 'Parent',
            email: email,
        });

        if (parentError) {
            console.error('Parent profile error:', parentError);
        }

        // Create child profile if provided
        if (childName) {
            const { data: childData, error: childError } = await supabaseAdmin.from('children').insert({
                parent_id: authData.user.id,
                name: childName,
                age: childAge || null,
            }).select().single();

            if (!childError && childData) {
                // Initialize default parental controls
                await supabaseAdmin.from('parental_controls').insert({ child_id: childData.id });

                // Initialize default skill scores
                const defaultSkills = ['Problem Solving', 'Logical Thinking', 'Speed', 'Accuracy'];
                await supabaseAdmin.from('skill_scores').insert(
                    defaultSkills.map(skill => ({ child_id: childData.id, skill_name: skill, score: 0 }))
                );
            }
        }

        res.json({
            message: 'Account created successfully',
            user: authData.user,
            session: authData.session,
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/signin
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            user: data.user,
            session: data.session,
        });

    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/signout
app.post('/api/auth/signout', authMiddleware, async (req, res) => {
    await supabase.auth.signOut();
    res.json({ message: 'Signed out' });
});

// ═══════════════════════════════════════════════
// CHILDREN ROUTES
// ═══════════════════════════════════════════════

// GET /api/children — get all children for the logged-in parent
app.get('/api/children', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('children')
            .select('*')
            .eq('parent_id', req.user.id)
            .order('created_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/children — create a new child profile
app.post('/api/children', authMiddleware, async (req, res) => {
    try {
        const { name, age } = req.body;

        const { data, error } = await supabaseAdmin.from('children').insert({
            parent_id: req.user.id,
            name,
            age: age || null,
        }).select().single();

        if (error) return res.status(500).json({ error: error.message });

        // Initialize defaults
        await supabaseAdmin.from('parental_controls').insert({ child_id: data.id });
        const defaultSkills = ['Problem Solving', 'Logical Thinking', 'Speed', 'Accuracy'];
        await supabaseAdmin.from('skill_scores').insert(
            defaultSkills.map(skill => ({ child_id: data.id, skill_name: skill, score: 0 }))
        );

        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ═══════════════════════════════════════════════
// GAME SESSION ROUTES
// ═══════════════════════════════════════════════

// POST /api/sessions/start — start a new game session
app.post('/api/sessions/start', authMiddleware, async (req, res) => {
    try {
        const { childId, module, level } = req.body;

        const { data, error } = await supabaseAdmin.from('game_sessions').insert({
            child_id: childId,
            module,
            level: level || 1,
            started_at: new Date().toISOString(),
        }).select().single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sessions/:id/end — end a game session
app.post('/api/sessions/:id/end', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { score, questionsTotal, questionsCorrect, durationSeconds } = req.body;

        const { error } = await supabaseAdmin.from('game_sessions').update({
            score: score || 0,
            questions_total: questionsTotal || 0,
            questions_correct: questionsCorrect || 0,
            duration_seconds: durationSeconds || 0,
            ended_at: new Date().toISOString(),
        }).eq('id', id);

        if (error) return res.status(500).json({ error: error.message });

        // Get the child_id from the session
        const { data: session } = await supabaseAdmin
            .from('game_sessions')
            .select('child_id')
            .eq('id', id)
            .single();

        if (session) {
            // Update daily activity
            await updateDailyActivity(
                session.child_id,
                Math.ceil((durationSeconds || 0) / 60),
                questionsTotal || 0
            );

            // Update skill scores
            const accuracy = questionsTotal > 0 ? (questionsCorrect / questionsTotal) * 100 : 0;
            const speed = questionsTotal > 0
                ? Math.max(0, 100 - ((durationSeconds / questionsTotal) - 2) * 10)
                : 0;

            await updateSkillScore(session.child_id, 'Accuracy', Math.round(accuracy));
            await updateSkillScore(session.child_id, 'Speed', Math.round(speed));

            // Check for new badges
            await checkAndAwardBadges(session.child_id);
        }

        res.json({ message: 'Session ended successfully' });

    } catch (err) {
        console.error('End session error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sessions/:childId — get recent sessions for a child
app.get('/api/sessions/:childId', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('game_sessions')
            .select('*')
            .eq('child_id', req.params.childId)
            .not('ended_at', 'is', null)
            .order('started_at', { ascending: false })
            .limit(20);

        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ═══════════════════════════════════════════════
// DASHBOARD DATA ROUTES
// ═══════════════════════════════════════════════

// GET /api/dashboard/:childId — full dashboard data
app.get('/api/dashboard/:childId', authMiddleware, async (req, res) => {
    try {
        const childId = req.params.childId;

        const [performance, weeklyActivity, skills, badges, controls, distribution] = await Promise.all([
            getPerformanceStats(childId),
            getWeeklyActivity(childId),
            getSkillScores(childId),
            getAchievements(childId),
            getParentalControls(childId),
            getLearningDistribution(childId),
        ]);

        res.json({
            performance,
            weeklyActivity,
            skills,
            badges,
            controls,
            distribution,
        });

    } catch (err) {
        console.error('Dashboard data error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/controls/:childId — save parental controls
app.put('/api/controls/:childId', authMiddleware, async (req, res) => {
    try {
        const { dailyPlaytimeLimit, difficultyLevel, multiplayerEnabled, nightModeRestriction, progressNotifications } = req.body;

        const { error } = await supabaseAdmin.from('parental_controls').upsert({
            child_id: req.params.childId,
            daily_playtime_limit: dailyPlaytimeLimit,
            difficulty_level: difficultyLevel,
            multiplayer_enabled: multiplayerEnabled,
            night_mode_restriction: nightModeRestriction,
            progress_notifications: progressNotifications,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id' });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Settings saved' });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/achievements/:childId — get badges
app.get('/api/achievements/:childId', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('achievements')
            .select('*')
            .eq('child_id', req.params.childId)
            .order('earned_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ═══════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════

async function updateDailyActivity(childId, minutes, questionsSolved) {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabaseAdmin
        .from('daily_activity')
        .select('*')
        .eq('child_id', childId)
        .eq('date', today)
        .single();

    if (existing) {
        await supabaseAdmin.from('daily_activity').update({
            total_minutes: existing.total_minutes + minutes,
            sessions_count: existing.sessions_count + 1,
            questions_solved: existing.questions_solved + questionsSolved,
        }).eq('id', existing.id);
    } else {
        await supabaseAdmin.from('daily_activity').insert({
            child_id: childId,
            date: today,
            total_minutes: minutes,
            sessions_count: 1,
            questions_solved: questionsSolved,
        });
    }
}

async function updateSkillScore(childId, skillName, score) {
    await supabaseAdmin.from('skill_scores').update({
        score: Math.min(100, score),
        updated_at: new Date().toISOString(),
    }).eq('child_id', childId).eq('skill_name', skillName);
}

async function getPerformanceStats(childId) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: sessions } = await supabaseAdmin
        .from('game_sessions')
        .select('duration_seconds, score, level')
        .eq('child_id', childId)
        .gte('started_at', monthStart.toISOString())
        .not('ended_at', 'is', null);

    const all = sessions || [];
    const totalMinutes = all.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60;
    const totalScore = all.reduce((s, r) => s + (r.score || 0), 0);

    return {
        totalHours: (totalMinutes / 60).toFixed(1),
        levelsCompleted: all.length,
        totalScore,
        weeklyProgress: 0,
    };
}

async function getWeeklyActivity(childId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabaseAdmin
        .from('daily_activity')
        .select('date, total_minutes')
        .eq('child_id', childId)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = (data || []).find(r => r.date === dateStr);
        result.push({ label: days[d.getDay()], minutes: found ? found.total_minutes : 0 });
    }
    return result;
}

async function getSkillScores(childId) {
    const { data } = await supabaseAdmin
        .from('skill_scores')
        .select('skill_name, score')
        .eq('child_id', childId);
    return data || [];
}

async function getAchievements(childId) {
    const { data } = await supabaseAdmin
        .from('achievements')
        .select('badge_name, badge_icon, earned_at')
        .eq('child_id', childId)
        .order('earned_at', { ascending: true });
    return data || [];
}

async function getParentalControls(childId) {
    const { data } = await supabaseAdmin
        .from('parental_controls')
        .select('*')
        .eq('child_id', childId)
        .single();
    return data;
}

async function getLearningDistribution(childId) {
    const { data: sessions } = await supabaseAdmin
        .from('game_sessions')
        .select('module, duration_seconds')
        .eq('child_id', childId)
        .not('ended_at', 'is', null);

    const dist = {};
    (sessions || []).forEach(s => {
        if (!dist[s.module]) dist[s.module] = 0;
        dist[s.module] += s.duration_seconds || 0;
    });

    const total = Object.values(dist).reduce((s, v) => s + v, 0);
    return Object.entries(dist).map(([module, seconds]) => ({
        module,
        seconds,
        percentage: total > 0 ? Math.round((seconds / total) * 100) : 0,
    }));
}

// Badge criteria
const BADGE_CRITERIA = [
    { name: 'Champion', icon: '🏆', check: (s) => s.totalSessions >= 10 },
    { name: 'Speed Star', icon: '⚡', check: (s) => s.avgSpeed >= 80 },
    { name: 'Genius', icon: '🧠', check: (s) => s.avgAccuracy >= 90 },
    { name: 'On Fire', icon: '🔥', check: (s) => s.streak >= 7 },
    { name: 'Bullseye', icon: '🎯', check: (s) => s.perfectLevels >= 3 },
    { name: 'Rocket', icon: '🚀', check: (s) => s.totalSessions >= 25 },
    { name: 'Inventor', icon: '💡', check: (s) => s.modulesPlayed >= 3 },
    { name: 'All-Star', icon: '🌟', check: (s) => s.totalScore >= 5000 },
];

async function checkAndAwardBadges(childId) {
    const { data: existing } = await supabaseAdmin
        .from('achievements')
        .select('badge_name')
        .eq('child_id', childId);

    const earned = new Set((existing || []).map(b => b.badge_name));

    // Get stats
    const { data: sessions } = await supabaseAdmin
        .from('game_sessions')
        .select('*')
        .eq('child_id', childId)
        .not('ended_at', 'is', null);

    const all = sessions || [];
    const totalSessions = all.length;
    const totalScore = all.reduce((s, r) => s + (r.score || 0), 0);
    const totalCorrect = all.reduce((s, r) => s + (r.questions_correct || 0), 0);
    const totalQuestions = all.reduce((s, r) => s + (r.questions_total || 0), 0);
    const avgAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const perfectLevels = all.filter(s => s.questions_total > 0 && s.questions_correct === s.questions_total).length;
    const modulesPlayed = new Set(all.map(s => s.module)).size;
    const totalDuration = all.reduce((s, r) => s + (r.duration_seconds || 0), 0);
    const avgSpeed = totalQuestions > 0 ? Math.max(0, 100 - ((totalDuration / totalQuestions) - 2) * 10) : 0;

    const stats = { totalSessions, totalScore, avgAccuracy, avgSpeed, perfectLevels, modulesPlayed, streak: 0 };

    const newBadges = [];
    for (const badge of BADGE_CRITERIA) {
        if (!earned.has(badge.name) && badge.check(stats)) {
            newBadges.push({ child_id: childId, badge_name: badge.name, badge_icon: badge.icon });
        }
    }

    if (newBadges.length > 0) {
        await supabaseAdmin.from('achievements').insert(newBadges);
    }
}

// ═══════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`\n  🚀 MotionLearn Backend running on http://localhost:${PORT}`);
    console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`  🔗 Supabase: ${process.env.SUPABASE_URL}\n`);
});
