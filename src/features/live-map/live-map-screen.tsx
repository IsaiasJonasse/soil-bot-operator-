import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card, Pill, SectionTitle } from '@/components/ui/operator-ui';
import { colors, radii } from '@/constants/soilbot-theme';
import { useOperator } from '@/state/operator-context';

const varieties = ['Clone A', 'Clone B', 'Cashew X', 'Mango Kent'];

function Metric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}><View style={[styles.metricDot, { backgroundColor: color }]} /></View><View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}<Text style={styles.metricUnit}> {unit}</Text></Text></View></View>;
}

function FieldGrid() {
  const { session, position, clones, marks, connection } = useOperator();
  const visibleRowCount = Math.min(session.rows, 10);
  const rows = Array.from({ length: visibleRowCount }, (_, index) => Math.min(session.rows, Math.floor((index * session.rows) / visibleRowCount) + 1));
  const robotLeft = `${Math.min(94, Math.max(3, (position.gridX / session.pathLength) * 100))}%` as const;
  const robotTop = `${Math.min(90, Math.max(5, ((position.gridY - 1) / session.rows) * 100))}%` as const;
  return <View style={styles.map}>
    <View style={styles.mapBadge}><Text style={styles.mapBadgeText}>{connection === 'connected' ? 'LIVE GRID' : 'DEMO GRID'} · {session.rows} ROWS</Text></View>
    <View style={styles.grid}>{rows.map((rowNumber) => <View key={rowNumber} style={styles.gridRow}><Text style={styles.rowLabel}>{String(rowNumber).padStart(2, '0')}</Text><View style={styles.rowLine}>{Array.from({ length: 12 }).map((__, j) => <View key={j} style={styles.tree} />)}</View></View>)}</View>
    {marks.slice(0, 60).map((mark) => <View key={mark.id} style={[styles.markPin, { left: `${Math.min(95, (mark.gridX / session.pathLength) * 100)}%`, top: `${Math.min(92, ((mark.gridY - 1) / session.rows) * 100)}%` }]} />)}
    {clones.slice(0, 12).map((clone) => <View key={clone.id} style={[styles.clonePin, { left: `${Math.min(95, (clone.gridX / session.pathLength) * 100)}%`, top: `${Math.min(92, ((clone.gridY - 1) / session.rows) * 100)}%` }]} />)}
    <View style={[styles.robot, { left: robotLeft, top: robotTop }]}><View style={styles.robotPulse} /><View style={styles.robotCore}><Text style={styles.robotGlyph}>▲</Text></View></View>
    <View style={styles.scale}><View style={styles.scaleLine} /><Text style={styles.scaleText}>20 m</Text></View>
  </View>;
}

export function LiveMapScreen() {
  const { width } = useWindowDimensions(); const wide = width >= 1060;
  const { telemetry, position, session, marks, assignClone, connection, databaseReady, databaseError } = useOperator(); const [selected, setSelected] = useState(varieties[0]); const [saved, setSaved] = useState(false); const [markError, setMarkError] = useState(''); const [marking, setMarking] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useMemo(() => Math.max(0, Math.min(100, Math.round((position.gridX / session.pathLength) * 100))), [position.gridX, session.pathLength]);
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);
  const mark = async () => {
    setMarking(true);
    setMarkError('');
    try {
      await assignClone(selected);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setMarkError(error instanceof Error ? error.message : 'Unable to save this coordinate.');
    } finally {
      setMarking(false);
    }
  };
  return <View style={styles.page}>
    <Card style={styles.telemetry}><Metric label="Battery" value={telemetry.batteryLevel.toFixed(0)} unit="%" color={colors.green} /><Metric label="Air temperature" value={telemetry.temperature.toFixed(1)} unit="°C" color={colors.amber} /><Metric label="Air quality" value={telemetry.airQuality.toFixed(0)} unit="AQI" color={colors.cyan} /><Metric label="Oxygen" value={telemetry.o2Level.toFixed(1)} unit="%" color={colors.cyan} /></Card>
    <View style={[styles.workspace, !wide && styles.workspaceStack]}>
      <Card style={styles.mapCard}><SectionTitle aside={<Pill label={connection === 'connected' ? 'Mapping active' : 'Demo simulation'} tone={connection === 'connected' ? 'green' : 'amber'} />}>Robot position</SectionTitle><FieldGrid /><View style={styles.mapFooter}><Text style={styles.coords}>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</Text><Text style={styles.coords}>Row {position.gridY} · {position.gridX.toFixed(1)} m</Text></View></Card>
      <View style={[styles.rightColumn, !wide && styles.rightColumnStack]}>
        <Card><SectionTitle>Run progress</SectionTitle><View style={styles.progressTop}><Text style={styles.progressValue}>{progress}%</Text><Text style={styles.progressMeta}>{position.gridX.toFixed(1)} / {session.pathLength} m</Text></View><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View><View style={styles.runStats}><View><Text style={styles.statLabel}>ROW</Text><Text style={styles.statValue}>{position.gridY} of {session.rows}</Text></View><View><Text style={styles.statLabel}>{connection === 'connected' ? 'PAINT MARKS' : 'DEMO MARKS'}</Text><Text style={styles.statValue}>{marks.length}</Text></View><View><Text style={styles.statLabel}>INTERVAL</Text><Text style={styles.statValue}>{session.markingInterval} m</Text></View></View></Card>
        <Card style={styles.cloneCard}><SectionTitle aside={<Pill label="At robot" tone="cyan" />}>Assign clone variety</SectionTitle><Text style={styles.helper}>Tag the current coordinate with a genetic variety.</Text><View style={styles.varietyList}>{varieties.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === item }} key={item} onPress={() => setSelected(item)} style={({ pressed }) => [styles.variety, selected === item && styles.varietyActive, pressed && styles.varietyPressed]}><View style={[styles.radio, selected === item && styles.radioActive]}>{selected === item && <View style={styles.radioCore} />}</View><Text style={[styles.varietyText, selected === item && styles.varietyTextActive]}>{item}</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityState={{ busy: marking, disabled: marking || !databaseReady }} disabled={marking || !databaseReady} onPress={() => void mark()} style={({ pressed }) => [styles.markButton, (pressed || marking || !databaseReady) && styles.markButtonDisabled]}>{marking ? <ActivityIndicator color={colors.background} /> : <Text style={styles.markButtonText}>{!databaseReady ? 'Loading records…' : saved ? 'Coordinate saved ✓' : `Mark ${selected} here`}</Text>}</Pressable>{markError || databaseError ? <Text accessibilityRole="alert" style={styles.markError}>{markError || databaseError}</Text> : null}</Card>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: 18 }, telemetry: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }, metric: { flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 155, flex: 1 }, metricIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, metricDot: { width: 10, height: 10, borderRadius: 5 }, metricLabel: { color: colors.muted, fontSize: 11 }, metricValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, metricUnit: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  workspace: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' }, workspaceStack: { flexDirection: 'column' }, mapCard: { flex: 1, width: '100%', minHeight: 560 }, rightColumn: { width: 330, gap: 18 }, rightColumnStack: { width: '100%', flexDirection: 'row', flexWrap: 'wrap' }, map: { height: 440, backgroundColor: '#0A1714', borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: '#203A33', paddingTop: 42, paddingHorizontal: 22 }, mapBadge: { position: 'absolute', top: 12, left: 14, zIndex: 3, backgroundColor: colors.panelRaised, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }, mapBadgeText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, grid: { flex: 1, justifyContent: 'space-around' }, gridRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, rowLabel: { color: '#52675F', fontSize: 9, width: 16 }, rowLine: { height: 1, flex: 1, backgroundColor: '#294139', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, tree: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3F6A50' }, robot: { position: 'absolute', width: 42, height: 42, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -21 }, { translateY: -21 }] }, robotPulse: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: '#A8F05A33', borderWidth: 1, borderColor: '#A8F05A77' }, robotCore: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green }, robotGlyph: { color: colors.background, fontSize: 11 }, markPin: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber }, clonePin: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: colors.cyan, borderWidth: 2, borderColor: colors.background }, scale: { position: 'absolute', right: 18, bottom: 12, alignItems: 'center' }, scaleLine: { width: 55, borderTopWidth: 2, borderColor: colors.muted }, scaleText: { color: colors.muted, fontSize: 9, marginTop: 3 }, mapFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 }, coords: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }, progressValue: { color: colors.green, fontSize: 34, fontWeight: '900' }, progressMeta: { color: colors.muted, fontSize: 11 }, progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#263B35', marginTop: 12, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.green }, runStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, statLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1 }, statValue: { color: colors.text, fontWeight: '800', fontSize: 13, marginTop: 4 }, cloneCard: { flexGrow: 1 }, helper: { color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 14 }, varietyList: { gap: 8 }, variety: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, varietyActive: { backgroundColor: '#1D3125', borderColor: colors.greenDark }, varietyPressed: { opacity: 0.7 }, radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: colors.green }, radioCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }, varietyText: { color: colors.muted, fontSize: 13 }, varietyTextActive: { color: colors.text, fontWeight: '700' }, markButton: { backgroundColor: colors.green, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, markButtonDisabled: { opacity: 0.7 }, markButtonText: { color: colors.background, fontWeight: '900' }, markError: { color: colors.red, fontSize: 11, marginTop: 8 },
});
