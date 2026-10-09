import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, Field, Pill, SectionTitle } from '@/components/ui/operator-ui';
import { colors } from '@/constants/soilbot-theme';
import { useOperator } from '@/state/operator-context';

export function SetupScreen() {
  const { width } = useWindowDimensions(); const compact = width < 780;
  const { session, databaseReady, databaseError, connection, rosUrl, connect, disconnect, createSession } = useOperator();
  const [fieldName, setFieldName] = useState(session.fieldName); const [rows, setRows] = useState(String(session.rows));
  const [pathLength, setPathLength] = useState(String(session.pathLength)); const [interval, setIntervalValue] = useState(String(session.markingInterval)); const [url, setUrl] = useState(rosUrl); const [error, setError] = useState('');
  const start = async () => {
    const parsed = { rows: Number(rows), pathLength: Number(pathLength), markingInterval: Number(interval) };
    if (!fieldName.trim() || Object.values(parsed).some((n) => !Number.isFinite(n) || n <= 0)) { setError('Enter a field name and positive numeric dimensions.'); return; }
    try {
      await createSession({ fieldName: fieldName.trim(), ...parsed });
      router.replace('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to create the field session.');
    }
  };
  return <View style={[styles.columns, compact && styles.stack]}>
    <Card style={styles.primary}><SectionTitle aside={<Pill label="Pre-run" tone="amber" />}>Plantation grid</SectionTitle><Text style={styles.intro}>Define the physical lanes before the robot begins mapping. Values are stored locally and remain available without a network.</Text>
      <View style={styles.fields}><Field label="Field or block name" value={fieldName} onChangeText={setFieldName} placeholder="North orchard" /><View style={styles.row}><Field label="Rows / fiadas" value={rows} onChangeText={setRows} keyboardType="number-pad" /><Field label="Path length (metres)" value={pathLength} onChangeText={setPathLength} keyboardType="decimal-pad" /></View><Field label="Paint marking interval (metres)" value={interval} onChangeText={setIntervalValue} keyboardType="decimal-pad" /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="Create session & open live map" onPress={start} />
    </Card>
    <View style={styles.side}>
      <Card><SectionTitle>System readiness</SectionTitle><Status label="Local field database" value={databaseError || (databaseReady ? 'Ready' : 'Starting')} ready={databaseReady} /><Status label="ROS middleware" value={connection === 'connected' ? 'Connected' : connection} ready={connection === 'connected'} /><Status label="Offline operation" value={databaseReady ? 'Available' : 'Waiting for database'} ready={databaseReady} /></Card>
      <Card><SectionTitle>ROSBridge connection</SectionTitle><Text style={styles.hint}>Use the robot computer LAN address and rosbridge websocket port.</Text><Field label="WebSocket URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="ws://192.168.1.50:9090" /><View style={styles.actions}><View style={styles.action}><Button label={connection === 'connected' ? 'Reconnect' : 'Connect'} onPress={() => connect(url)} /></View><View style={styles.action}><Button label="Disconnect" secondary onPress={disconnect} /></View></View></Card>
    </View>
  </View>;
}

function Status({ label, value, ready }: { label: string; value: string; ready: boolean }) { return <View style={styles.status}><View><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View><View style={[styles.statusDot, ready && styles.ready]} /></View>; }
const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, stack: { flexDirection: 'column' }, primary: { flex: 1, width: '100%', gap: 20 }, side: { width: 370, maxWidth: '100%', gap: 18 }, intro: { color: colors.muted, lineHeight: 20, marginTop: -12 }, fields: { gap: 16 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, error: { color: colors.red, fontSize: 12 }, hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 14 }, actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, action: { flex: 1 }, status: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusLabel: { color: colors.text, fontWeight: '700', fontSize: 13 }, statusValue: { color: colors.muted, fontSize: 11, marginTop: 3, textTransform: 'capitalize' }, statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber }, ready: { backgroundColor: colors.green },
});
