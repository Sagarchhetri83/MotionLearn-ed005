-- MotionLearn Database Schema for Supabase
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New Query)

-- 1. Parents (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Children (profiles managed by parents)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Game Sessions (every time a child plays a module)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  module TEXT NOT NULL,               -- 'maths', 'physics', 'chemistry', 'biology', 'english'
  level INTEGER NOT NULL DEFAULT 1,
  score INTEGER DEFAULT 0,
  questions_total INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 4. Achievements / Badges
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, badge_name)
);

-- 5. Daily Activity Log (aggregated per day for the activity chart)
CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_minutes INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  questions_solved INTEGER DEFAULT 0,
  UNIQUE(child_id, date)
);

-- 6. Skill Scores (tracked per skill dimension)
CREATE TABLE IF NOT EXISTS skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,           -- 'Problem Solving', 'Logical Thinking', 'Speed', 'Accuracy'
  score INTEGER DEFAULT 0,            -- 0 to 100
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, skill_name)
);

-- 7. Parental Controls (settings per child)
CREATE TABLE IF NOT EXISTS parental_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  daily_playtime_limit INTEGER DEFAULT 60,
  difficulty_level INTEGER DEFAULT 3,
  multiplayer_enabled BOOLEAN DEFAULT true,
  night_mode_restriction BOOLEAN DEFAULT false,
  progress_notifications BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id)
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — parents can only see their own children's data
-- ═══════════════════════════════════════════════════════

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_controls ENABLE ROW LEVEL SECURITY;

-- Parents: can read/write own row
CREATE POLICY "Parents own row" ON parents
  FOR ALL USING (auth.uid() = id);

-- Children: parent can manage their own children
CREATE POLICY "Parent manages children" ON children
  FOR ALL USING (parent_id = auth.uid());

-- Game sessions: accessible if child belongs to logged-in parent
CREATE POLICY "Parent sees child sessions" ON game_sessions
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Achievements: accessible if child belongs to logged-in parent
CREATE POLICY "Parent sees child achievements" ON achievements
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Daily activity: accessible if child belongs to logged-in parent
CREATE POLICY "Parent sees child activity" ON daily_activity
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Skill scores: accessible if child belongs to logged-in parent
CREATE POLICY "Parent sees child skills" ON skill_scores
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Parental controls: accessible if child belongs to logged-in parent
CREATE POLICY "Parent manages controls" ON parental_controls
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON game_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON game_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_child_date ON daily_activity(child_id, date);
CREATE INDEX IF NOT EXISTS idx_skills_child ON skill_scores(child_id);
CREATE INDEX IF NOT EXISTS idx_achievements_child ON achievements(child_id);
