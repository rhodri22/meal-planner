import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const HOUSEHOLD_ID = import.meta.env.VITE_HOUSEHOLD_ID || 'default';

// supabase will be null if env vars aren't set — app falls back to localStorage
export const supabase = url && key ? createClient(url, key) : null;
