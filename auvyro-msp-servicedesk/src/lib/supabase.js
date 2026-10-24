import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const appMode = import.meta.env?.VITE_APP_MODE || 'demo';

export const isSupabaseConfigured = Boolean(url && anonKey);
export const hostedConfigurationError = appMode === 'hosted' && !isSupabaseConfigured
  ? 'Ambiente hospedado sem configuração obrigatória do Supabase.'
  : '';
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
