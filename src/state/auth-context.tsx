import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { authConfigured, supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = 'google' | 'apple';
type SignUpResult = { needsEmailConfirmation: boolean };

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  authError: string;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  completeOAuthRedirect: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireClient() {
  if (!supabase) throw new Error('Authentication is not configured yet. Add the Supabase environment variables.');
  return supabase;
}

async function completeOAuth(url: string) {
  const client = requireClient();
  const parsed = new URL(url);
  const query = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const errorDescription = query.get('error_description') ?? fragment.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = query.get('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('The identity provider did not return a valid session.');
  const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let mounted = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    }).catch((error: unknown) => {
      if (mounted) {
        setAuthError(error instanceof Error ? error.message : 'Unable to restore the saved sign-in session.');
        setLoading(false);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError('');
      setLoading(false);
    });
    const appState = Platform.OS === 'web' ? null : AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });

    if (Platform.OS !== 'web') client.auth.startAutoRefresh();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await requireClient().auth.signUp({ email, password });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signInWithProvider = useCallback(async (provider: SocialProvider) => {
    const client = requireClient();
    const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? '';
    const redirectTo = Platform.OS === 'web'
      ? Linking.createURL(`${baseUrl}/auth/callback`)
      : Linking.createURL('auth/callback');
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });
    if (error) throw error;
    if (Platform.OS === 'web') return;
    if (!data.url) throw new Error('The provider did not return a sign-in URL.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await completeOAuth(result.url);
    else if (result.type !== 'cancel' && result.type !== 'dismiss') throw new Error('Social sign-in could not be completed.');
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  }, []);

  const completeOAuthRedirect = useCallback((url: string) => completeOAuth(url), []);
  const value = useMemo(() => ({ configured: authConfigured, loading, authError, session, signIn, signUp, signInWithProvider, completeOAuthRedirect, signOut }), [loading, authError, session, signIn, signUp, signInWithProvider, completeOAuthRedirect, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
