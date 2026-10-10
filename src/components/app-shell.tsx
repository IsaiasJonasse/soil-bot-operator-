import { router, usePathname } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '@/constants/soilbot-theme';
import { useAuth } from '@/state/auth-context';
import { useOperator } from '@/state/operator-context';

const nav = [
  { href: '/', label: 'Live map', icon: '⌖' }, { href: '/setup', label: 'Field setup', icon: '⊞' },
  { href: '/environment', label: 'Environment', icon: '≈' }, { href: '/records', label: 'Records', icon: '▤' },
] as const;

export function AppShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const pathname = usePathname(); const { width } = useWindowDimensions(); const compact = width < 760;
  const { connection, databaseReady } = useOperator();
  const { session, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSignOutError('');
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setSigningOut(false);
    }
  };
  const connectionLabel = connection === 'connected' ? 'ROS live' : connection === 'connecting' ? 'Connecting' : connection === 'error' ? 'Connection error' : 'Demo data';
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.frame}>
        {!compact && <View style={styles.sidebar}>
          <View style={styles.brandMark}><Image source={require('../../assets/images/soilbot-mark.png')} resizeMode="contain" style={styles.brandLogo} /></View>
          <View style={styles.nav}>{nav.map((item) => <Pressable key={item.href} onPress={() => router.navigate(item.href)} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected: pathname === item.href }} style={({ pressed }) => [styles.navItem, pathname === item.href && styles.navActive, pressed && styles.navPressed]}><Text style={[styles.navIcon, pathname === item.href && styles.navIconActive]}>{item.icon}</Text></Pressable>)}</View>
          <View style={[styles.statusDot, databaseReady && styles.statusDotOn]} />
        </View>}
        <View style={styles.main}>
          <View style={[styles.header, compact && styles.headerCompact]}>
            <View style={styles.heading}><Text style={styles.eyebrow}>SOIL BOT OPERATOR</Text><Text numberOfLines={1} style={styles.title}>{title}</Text><Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text></View>
            <View style={styles.accountControls}><View style={styles.connection}><View style={[styles.connectionDot, connection === 'connected' && styles.online, connection === 'error' && styles.connectionError]} /><Text style={styles.connectionText}>{connectionLabel}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Sign out ${session?.user.email ?? ''}`} accessibilityState={{ busy: signingOut, disabled: signingOut }} disabled={signingOut} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOut, (pressed || signingOut) && styles.navPressed]}>{signingOut ? <ActivityIndicator size="small" color={colors.muted} /> : <Text style={styles.signOutText}>Sign out</Text>}</Pressable>{signOutError ? <Text accessibilityRole="alert" style={styles.signOutError}>{signOutError}</Text> : null}</View>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>{children}</ScrollView>
          {compact && <View style={styles.bottomNav}>{nav.map((item) => <Pressable key={item.href} onPress={() => router.navigate(item.href)} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected: pathname === item.href }} style={({ pressed }) => [styles.bottomItem, pressed && styles.navPressed]}><Text style={[styles.navIcon, pathname === item.href && styles.navIconActive]}>{item.icon}</Text><Text style={[styles.bottomLabel, pathname === item.href && styles.bottomLabelActive]}>{item.label.split(' ')[0]}</Text></Pressable>)}</View>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 82, alignItems: 'center', paddingVertical: 24, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: '#0B1714' },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center' }, brandLogo: { width: 38, height: 38 },
  nav: { flex: 1, gap: 14, paddingTop: 48 }, navItem: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, navActive: { backgroundColor: colors.panelRaised }, navPressed: { opacity: 0.65 }, navIcon: { color: colors.muted, fontSize: 23 }, navIconActive: { color: colors.green },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red }, statusDotOn: { backgroundColor: colors.green }, main: { flex: 1 },
  header: { minHeight: 106, paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, headerCompact: { minHeight: 96, paddingHorizontal: 14, paddingVertical: 13 }, heading: { flex: 1, minWidth: 0 }, eyebrow: { color: colors.green, letterSpacing: 2, fontSize: 10, fontWeight: '800' }, title: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 2 }, subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  connection: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.panel, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8 }, connectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber }, online: { backgroundColor: colors.green }, connectionError: { backgroundColor: colors.red }, connectionText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  accountControls: { alignItems: 'flex-end', gap: 7 }, signOut: { paddingHorizontal: 8, paddingVertical: 4 }, signOutText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, signOutError: { maxWidth: 200, color: colors.red, fontSize: 10, textAlign: 'right' },
  scroll: { flex: 1 }, content: { padding: 24, paddingBottom: 48, maxWidth: 1440, width: '100%', alignSelf: 'center' }, contentCompact: { padding: 14, paddingBottom: 110 },
  bottomNav: { position: 'absolute', left: 10, right: 10, bottom: 10, height: 68, borderRadius: 22, backgroundColor: '#14241F', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }, bottomItem: { alignItems: 'center', minWidth: 64, gap: 2 }, bottomLabel: { color: colors.muted, fontSize: 10 }, bottomLabelActive: { color: colors.green, fontWeight: '700' },
});
