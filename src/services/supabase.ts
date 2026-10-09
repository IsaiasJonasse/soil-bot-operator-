import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const missingSupabaseEnv = [
  !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !supabaseKey ? 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY' : null,
].filter((value): value is string => Boolean(value));

export const authConfigured = missingSupabaseEnv.length === 0;

const browserStorage = {
  getItem: async (key: string) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const supabase = authConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: browserStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
