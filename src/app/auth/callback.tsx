import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@/constants/soilbot-theme';
import { useAuth } from '@/state/auth-context';

export default function AuthCallbackRoute() {
  const url = Linking.useURL();
  const { completeOAuthRedirect } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) return;
    let active = true;
    void completeOAuthRedirect(url).then(() => {
      if (active) router.replace('/');
    }).catch((nextError: unknown) => {
      if (active) setError(nextError instanceof Error ? nextError.message : 'Unable to complete provider sign-in.');
    });
    return () => { active = false; };
  }, [completeOAuthRedirect, url]);

  return <View style={styles.container}>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <><ActivityIndicator color={colors.green} /><Text style={styles.message}>Completing secure sign-in…</Text></>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { color: colors.muted, fontSize: 14 },
  error: { color: colors.red, fontSize: 14, textAlign: 'center' },
});
