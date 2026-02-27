// MotionLearn — Supabase Client
// CDN-compatible module for use in public HTML pages
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jxxdiunezswwcwcwcjoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eGRpdW5lenN3d2N3Y3djam96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzI5OTQsImV4cCI6MjA4Nzc0ODk5NH0.TivXn0Ks1BwM4alzZVl_m5fR7Ayrgbg_Rqh1rKz7zYU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
