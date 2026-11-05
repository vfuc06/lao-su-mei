import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project URL và Publishable Anon Key của Supabase (an toàn để công khai ở client)
const DEFAULT_SUPABASE_URL = 'https://lamhrbavfyhffeihyxdz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_f8W4S8FpFM2YZcA8zeryjQ_I_hC9JsI';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your_supabase_url') &&
  !supabaseAnonKey.includes('your_anon_key')
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
