import { forwardRef, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/soilbot-theme';
import { useAuth } from '@/state/auth-context';

type Mode = 'signIn' | 'signUp';
type Notice = { tone: 'error' | 'success'; text: string } | null;

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const { configured, authError, signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const isSignUp = mode === 'signUp';

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
    setNotice(null);
  };

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setNotice({ tone: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (password.length < 8) {
      setNotice({ tone: 'error', text: 'Your password must contain at least 8 characters.' });
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setNotice({ tone: 'error', text: 'The passwords do not match.' });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      if (isSignUp) {
        const result = await signUp(cleanEmail, password);
        if (result.needsEmailConfirmation) {
          setNotice({ tone: 'success', text: 'Account created. Check your email to confirm your account.' });
        }
      } else {
        await signIn(cleanEmail, password);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (/email rate limit exceeded|rate limit.*email|email.*rate limit/i.test(errorMessage)) {
        setNotice({ tone: 'error', text: 'Too many emails were requested. Please wait a few minutes and try again.' });
      } else {
        setNotice({ tone: 'error', text: errorMessage || 'We could not authenticate your account. Please try again.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: 'google' | 'apple') => {
    setBusy(true);
    setNotice(null);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (/unsupported provider|provider is not enabled/i.test(errorMessage)) {
        setNotice({ tone: 'error', text: `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not available yet.` });
      } else {
        setNotice({ tone: 'error', text: errorMessage || `Could not continue with ${provider}.` });
      }
    } finally {
      setBusy(false);
    }
  };

  const displayedNotice: Notice = authError ? { tone: 'error', text: authError } : notice;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.brandPanel, isWide && styles.brandPanelWide]}>
            <View style={styles.brandRow}>
              <View style={styles.logo} accessibilityElementsHidden>
                <Image source={require('../../../assets/images/soilbot-mark.png')} resizeMode="contain" style={styles.logoImage} />
              </View>
              <View>
                <Text style={styles.brandName}>SOIL BOT</Text>
                <Text style={styles.brandCaption}>FIELD OPERATIONS</Text>
              </View>
            </View>

            {isWide ? (
              <View style={styles.heroContent}>
                <View style={styles.onlinePill}><View style={styles.onlineDot} /><Text style={styles.onlineText}>SYSTEM READY</Text></View>
                <Text style={styles.heroTitle}>Your field,{`\n`}always within reach.</Text>
                <Text style={styles.heroText}>Monitor your robot, map every row, and keep field records together in one secure workspace.</Text>
                <View style={styles.featureList}>
                  <Feature text="Live field monitoring" />
                  <Feature text="Secure operator access" />
                  <Feature text="Records available offline" />
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.authPanel, isWide && styles.authPanelWide]}>
            <View style={styles.heading}>
              <Text style={styles.title}>{isSignUp ? 'Create an account' : 'Welcome back'}</Text>
              <Text style={styles.subtitle}>{isSignUp ? 'Create your operator account to get started.' : 'Sign in to continue to Soil Bot.'}</Text>
            </View>

            {!configured ? (
              <View style={styles.setupNotice}>
                <Text style={styles.setupTitle}>Authentication is not configured</Text>
                <Text style={styles.setupText}>Add the Supabase URL and publishable key to the local .env file.</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <LabeledInput
                label="Email address"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@example.com"
              />

              <LabeledInput
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                textContentType={isSignUp ? 'newPassword' : 'password'}
                returnKeyType={isSignUp ? 'next' : 'go'}
                onSubmitEditing={() => isSignUp ? confirmationRef.current?.focus() : void submit()}
                placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                    hitSlop={12}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
                    <Text style={styles.visibilityText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                }
              />

              {isSignUp ? (
                <LabeledInput
                  ref={confirmationRef}
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!busy}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  placeholder="Enter your password again"
                />
              ) : null}
            </View>

            {displayedNotice ? (
              <View accessibilityRole="alert" style={[styles.notice, displayedNotice.tone === 'success' && styles.noticeSuccess]}>
                <View style={[styles.noticeDot, displayedNotice.tone === 'success' && styles.noticeDotSuccess]} />
                <Text style={[styles.noticeText, displayedNotice.tone === 'success' && styles.noticeTextSuccess]}>{displayedNotice.text}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy || !configured}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.primaryButton, (pressed || busy || !configured) && styles.buttonDisabled]}>
              {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton label="Google" mark="G" disabled={busy || !configured} onPress={() => void social('google')} />
              <SocialButton label="Apple" mark="●" disabled={busy || !configured} onPress={() => void social('apple')} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                hitSlop={10}
                onPress={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.switchAction}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
              </Pressable>
            </View>

            <Text style={styles.legal}>By continuing, you agree to the secure handling of your operator and field data.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type LabeledInputProps = ComponentPropsWithRef<typeof TextInput> & { label: string; trailing?: ReactNode };

const LabeledInput = forwardRef<TextInput, LabeledInputProps>(({ label, trailing, style, ...props }, ref) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputShell}>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        selectionColor={colors.green}
        style={[styles.input, trailing ? styles.inputWithTrailing : null, style]}
      />
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  </View>
));
LabeledInput.displayName = 'LabeledInput';

function Feature({ text }: { text: string }) {
  return <View style={styles.feature}><View style={styles.check}><Text style={styles.checkText}>✓</Text></View><Text style={styles.featureText}>{text}</Text></View>;
}

function SocialButton({ label, mark, disabled, onPress }: { label: string; mark: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, (pressed || disabled) && styles.buttonDisabled]}>
      <Text style={[styles.socialMark, label === 'Apple' && styles.appleMark]}>{mark}</Text>
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  glowTop: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#183A26', opacity: 0.38, top: -160, right: -130 },
  glowBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#12372F', opacity: 0.24, bottom: -170, left: -120 },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28 },
  scrollWide: { maxWidth: 1080, minHeight: '100%', flexDirection: 'row', alignItems: 'center', gap: 72, paddingHorizontal: 40, paddingVertical: 44 },
  brandPanel: { marginBottom: 42 },
  brandPanelWide: { flex: 1, maxWidth: 480, marginBottom: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 45, height: 45, borderRadius: 14, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center', shadowColor: colors.green, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  logoImage: { width: 41, height: 41 },
  brandName: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1.6 },
  brandCaption: { color: colors.green, fontSize: 8, fontWeight: '800', letterSpacing: 1.7, marginTop: 3 },
  heroContent: { marginTop: 72 },
  onlinePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: `${colors.green}14`, borderWidth: 1, borderColor: `${colors.green}36` },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  onlineText: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { color: colors.text, fontSize: 46, lineHeight: 51, fontWeight: '900', letterSpacing: -1.5, marginTop: 22 },
  heroText: { color: colors.muted, fontSize: 16, lineHeight: 25, marginTop: 18, maxWidth: 440 },
  featureList: { marginTop: 28, gap: 13 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  check: { width: 21, height: 21, borderRadius: 11, backgroundColor: `${colors.green}1F`, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: colors.green, fontSize: 12, fontWeight: '900' },
  featureText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  authPanel: { width: '100%' },
  authPanelWide: { flex: 1, maxWidth: 430, borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 30, shadowColor: '#000000', shadowOpacity: 0.26, shadowRadius: 28, shadowOffset: { width: 0, height: 16 } },
  heading: { marginBottom: 27 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  setupNotice: { padding: 13, borderRadius: radii.sm, borderWidth: 1, borderColor: `${colors.amber}55`, backgroundColor: `${colors.amber}12`, marginBottom: 18 },
  setupTitle: { color: colors.amber, fontSize: 12, fontWeight: '800' },
  setupText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  form: { gap: 17 },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 12, fontWeight: '800' },
  inputShell: { position: 'relative', justifyContent: 'center' },
  input: { width: '100%', height: 54, borderRadius: 14, backgroundColor: '#0C1916', borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 16, fontSize: 15 },
  inputWithTrailing: { paddingRight: 70 },
  trailing: { position: 'absolute', right: 15 },
  visibilityButton: { minHeight: 34, justifyContent: 'center' },
  visibilityText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: 12, borderRadius: radii.sm, backgroundColor: `${colors.red}12`, borderWidth: 1, borderColor: `${colors.red}42` },
  noticeSuccess: { backgroundColor: `${colors.green}10`, borderColor: `${colors.green}38` },
  noticeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red, marginTop: 4 },
  noticeDotSuccess: { backgroundColor: colors.green },
  noticeText: { color: '#FFAAA4', flex: 1, fontSize: 12, lineHeight: 17 },
  noticeTextSuccess: { color: colors.green },
  primaryButton: { height: 54, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: colors.green, shadowOpacity: 0.18, shadowRadius: 13, shadowOffset: { width: 0, height: 7 } },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '900' },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.65 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11 },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0C1916', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  socialMark: { color: colors.text, fontSize: 17, fontWeight: '900' },
  appleMark: { fontSize: 15 },
  socialText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 27 },
  switchPrompt: { color: colors.muted, fontSize: 13 },
  switchAction: { color: colors.green, fontSize: 13, fontWeight: '900' },
  legal: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 22, paddingHorizontal: 10 },
});
