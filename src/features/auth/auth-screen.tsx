import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/soilbot-theme';
import { useAuth } from '@/state/auth-context';

type Mode = 'signIn' | 'signUp';

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { configured, authError, signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isSignUp = mode === 'signUp';

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage('');
    setConfirmPassword('');
  };

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return setMessage('Enter a valid email address.');
    if (password.length < 8) return setMessage('Use at least 8 characters for your password.');
    if (isSignUp && password !== confirmPassword) return setMessage('Passwords do not match.');

    setBusy(true);
    setMessage('');
    try {
      if (isSignUp) {
        const result = await signUp(cleanEmail, password);
        if (result.needsEmailConfirmation) setMessage('Supabase is still requiring email confirmation. To sign in immediately after signup, disable “Confirm email” in Supabase under Authentication → Providers → Email.');
      } else {
        await signIn(cleanEmail, password);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (/email rate limit exceeded|rate limit.*email|email.*rate limit/i.test(errorMessage)) {
        setMessage('Supabase has temporarily limited signup emails. Wait before trying again. For ongoing use, configure custom SMTP in Supabase under Project Settings → Authentication → SMTP Settings.');
      } else {
        setMessage(errorMessage || 'Authentication failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: 'google' | 'apple') => {
    setBusy(true);
    setMessage('');
    try {
      await signInWithProvider(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/unsupported provider|provider is not enabled/i.test(message)) {
        setMessage(`${provider === 'google' ? 'Google' : 'Apple'} sign-in is not enabled in Supabase. Enable this provider in your Supabase Auth settings and configure its OAuth credentials.`);
      } else {
        setMessage(message || `Unable to continue with ${provider}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
            <Text style={styles.eyebrow}>SOIL BOT OPERATOR</Text>
            <Text style={styles.heroTitle}>Know every row.{`\n`}Protect every harvest.</Text>
            <Text style={styles.heroCopy}>Secure access to live robot telemetry, field mapping, and offline plantation records.</Text>
            <View style={styles.signalRow}><Signal label="Live mapping" /><Signal label="Offline records" /><Signal label="Encrypted session" /></View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={styles.subtitle}>{isSignUp ? 'Set up secure operator access.' : 'Sign in to continue to your field.'}</Text>

            <View style={styles.tabs}>
              <Pressable onPress={() => switchMode('signIn')} style={[styles.tab, !isSignUp && styles.tabActive]}><Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Sign in</Text></Pressable>
              <Pressable onPress={() => switchMode('signUp')} style={[styles.tab, isSignUp && styles.tabActive]}><Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Sign up</Text></Pressable>
            </View>

            {!configured && <View style={styles.setupNotice}><Text style={styles.setupTitle}>Authentication setup required</Text><Text style={styles.setupText}>Add your Supabase URL and publishable key to the local .env file.</Text></View>}

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="operator@example.com" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            {isSignUp && <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} editable={!busy} secureTextEntry autoComplete="new-password" placeholder="Repeat your password" placeholderTextColor={colors.muted} style={styles.input} />
            </View>}

            {authError ? <Text accessibilityRole="alert" style={styles.message}>{authError}</Text> : null}
            {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
            <Pressable disabled={busy || !configured} onPress={() => void submit()} style={({ pressed }) => [styles.primary, (pressed || busy || !configured) && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>{isSignUp ? 'Create account' : 'Sign in securely'}</Text>}
            </Pressable>

            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR CONTINUE WITH</Text><View style={styles.dividerLine} /></View>
            <View style={styles.socialRow}>
              <SocialButton label="Google" mark="G" disabled={busy || !configured} onPress={() => void social('google')} />
              <SocialButton label="Apple" mark="A" disabled={busy || !configured} onPress={() => void social('apple')} />
            </View>
            <Text style={styles.legal}>By continuing, you agree to secure handling of operator and field data.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Signal({ label }: { label: string }) {
  return <View style={styles.signal}><View style={styles.signalDot} /><Text style={styles.signalText}>{label}</Text></View>;
}

function SocialButton({ label, mark, disabled, onPress }: { label: string; mark: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Continue with ${label}`} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.social, (pressed || disabled) && styles.disabled]}><View style={styles.socialMark}><Text style={styles.socialMarkText}>{mark}</Text></View><Text style={styles.socialText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, paddingVertical: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 56 },
  scrollCompact: { flexDirection: 'column', gap: 28, justifyContent: 'flex-start' },
  hero: { flex: 1, maxWidth: 470, minWidth: 280 }, logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }, logoText: { color: colors.background, fontSize: 27, fontWeight: '900' },
  heroCompact: { flex: 0, width: '100%', maxWidth: 430 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 2.4 }, heroTitle: { color: colors.text, fontSize: 42, lineHeight: 47, fontWeight: '900', marginTop: 12, letterSpacing: -1.2 }, heroCopy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 18, maxWidth: 420 }, signalRow: { gap: 12, marginTop: 30 }, signal: { flexDirection: 'row', alignItems: 'center', gap: 10 }, signalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }, signalText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  card: { width: '100%', maxWidth: 430, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: 24, gap: 16 }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 13, marginTop: -9 },
  tabs: { flexDirection: 'row', padding: 4, backgroundColor: '#0B1815', borderRadius: radii.md, marginVertical: 2 }, tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, tabActive: { backgroundColor: colors.panelRaised }, tabText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, tabTextActive: { color: colors.green },
  setupNotice: { padding: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: `${colors.amber}66`, backgroundColor: `${colors.amber}12` }, setupTitle: { color: colors.amber, fontSize: 12, fontWeight: '800' }, setupText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  field: { gap: 7 }, label: { color: colors.text, fontSize: 11, fontWeight: '800' }, input: { height: 50, borderRadius: radii.md, backgroundColor: '#0B1815', borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, fontSize: 14 }, message: { color: colors.amber, fontSize: 11, lineHeight: 16 },
  primary: { height: 52, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.background, fontSize: 14, fontWeight: '900' }, disabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 }, dividerLine: { flex: 1, height: 1, backgroundColor: colors.border }, dividerText: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: '800' }, socialRow: { flexDirection: 'row', gap: 10 }, social: { flex: 1, height: 50, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, socialMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }, socialMarkText: { color: colors.background, fontSize: 12, fontWeight: '900' }, socialText: { color: colors.text, fontSize: 13, fontWeight: '800' }, legal: { color: colors.muted, textAlign: 'center', fontSize: 9, lineHeight: 14 },
});
