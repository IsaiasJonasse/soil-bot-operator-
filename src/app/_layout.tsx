import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from '@/features/auth/auth-screen';
import { colors } from '@/constants/soilbot-theme';
import { AuthProvider, useAuth } from '@/state/auth-context';
import { OperatorProvider } from '@/state/operator-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AuthenticatedApp() {
  const { loading, session } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.green} /></View>;
  if (!session) return <AuthScreen />;
  return <OperatorProvider><Slot /></OperatorProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' } });
