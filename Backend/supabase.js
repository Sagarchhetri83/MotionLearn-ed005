// MotionLearn Backend — Supabase Client (Server-side)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Public client (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (bypasses RLS — use carefully for server-side operations only)
export const supabaseAdmin = supabaseServiceKey && supabaseServiceKey !== 'your_service_role_key_here'
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase;
