// MotionLearn — Supabase Client
// CDN-compatible module for use in public HTML pages
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://wyaikvjkuqlyhboxegxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5YWlrdmprdXFseWhib3hlZ3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTUzMzMsImV4cCI6MjA4Nzc5MTMzM30.3r6ekaFPOYpHx2PnGymmiwfDeHUhWyjILp0dJKkB8xQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
