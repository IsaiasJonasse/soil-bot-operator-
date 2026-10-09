import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Pill, SectionTitle } from '@/components/ui/operator-ui';
import { colors, radii } from '@/constants/soilbot-theme';
import { cloneCoordinatesToCsv, exportAllData, getCloneCoordinates, getSessions, importAllData } from '@/services/database';
import { exportRecordFile, pickRecordJson } from '@/services/record-transfer';
import type { CloneCoordinate, FieldSession } from '@/types/soilbot';

export function RecordsScreen() {
  const [sessions, setSessions] = useState<FieldSession[]>([]);
  const [clones, setClones] = useState<CloneCoordinate[]>([]);
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState('');

  const reload = async () => {
    const [nextSessions, nextClones] = await Promise.all([getSessions(), getCloneCoordinates()]);
    setSessions(nextSessions);
    setClones(nextClones);
  };
  useEffect(() => {
    void Promise.all([getSessions(), getCloneCoordinates()]).then(([nextSessions, nextClones]) => {
      setSessions(nextSessions);
      setClones(nextClones);
    });
  }, []);

  const exportFile = async (format: 'json' | 'csv') => {
    try {
      const content = format === 'json' ? await exportAllData() : cloneCoordinatesToCsv(clones);
      const name = format === 'json' ? 'soilbot-field-records.json' : 'soilbot-clone-coordinates.csv';
      const mime = format === 'json' ? 'application/json' : 'text/csv';
      setPayload(content);
      await exportRecordFile(content, name, mime);
      setMessage(Platform.OS === 'web' ? `${format.toUpperCase()} downloaded.` : 'Choose where to share or save the export.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to export records.');
    }
  };
  const chooseJson = async () => {
    try {
      const content = await pickRecordJson();
      if (content) { setPayload(content); setMessage('JSON file loaded. Review it, then tap Import.'); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open that file.');
    }
  };
  const importJson = async () => {
    try {
      await importAllData(payload);
      await reload();
      setMessage('Import complete. Local records were replaced safely.');
    } catch {
      setMessage('Import failed. Select or paste a valid Soil Bot JSON export.');
    }
  };

  return <View style={styles.page}>
    <View style={styles.summary}><Summary value={String(sessions.length)} label="Field sessions" /><Summary value={String(clones.length)} label="Clone coordinates" /><Summary value={Platform.OS === 'web' ? 'Browser' : 'SQLite'} label="Local database" /></View>
    <View style={styles.columns}>
      <Card style={styles.history}><SectionTitle aside={<Pill label="Offline ready" />}>Recent field sessions</SectionTitle>{sessions.length === 0 ? <Text style={styles.empty}>No sessions yet. Create one from Field setup.</Text> : sessions.slice(0, 8).map((s) => <View key={s.sessionId} style={styles.session}><View style={styles.sessionIcon}><Text style={styles.sessionGlyph}>+</Text></View><View style={styles.sessionBody}><Text style={styles.sessionName}>{s.fieldName}</Text><Text style={styles.sessionMeta}>{s.rows} rows - {s.pathLength} m - marks every {s.markingInterval} m</Text></View><Text style={styles.date}>{new Date(s.timestamp).toLocaleDateString()}</Text></View>)}</Card>
      <Card style={styles.transfer}><SectionTitle>Transfer records</SectionTitle><Text style={styles.help}>Move complete JSON archives between operator devices, or export clone positions as spreadsheet-ready CSV.</Text><View style={styles.actions}><View style={styles.action}><Button label="Export JSON" onPress={() => void exportFile('json')} /></View><View style={styles.action}><Button label="Export CSV" secondary onPress={() => void exportFile('csv')} /></View></View>{Platform.OS !== 'web' && <Button label="Choose JSON file" secondary onPress={() => void chooseJson()} />}<TextInput multiline value={payload} onChangeText={setPayload} placeholder="Select or paste Soil Bot JSON here..." placeholderTextColor={colors.muted} style={styles.payload} textAlignVertical="top" /><Button label="Import JSON" secondary onPress={() => void importJson()} disabled={!payload.trim()} />{message ? <Text style={styles.message}>{message}</Text> : null}</Card>
    </View>
    <Card><SectionTitle>Latest clone tags</SectionTitle><View style={styles.tableHeader}><Text style={[styles.th, styles.cloneCol]}>VARIETY</Text><Text style={styles.th}>GRID</Text><Text style={styles.th}>GPS</Text></View>{clones.slice(0, 10).map((c) => <View key={c.id} style={styles.tableRow}><Text style={[styles.tdStrong, styles.cloneCol]}>{c.cloneVariety}</Text><Text style={styles.td}>R{c.gridY} - {c.gridX.toFixed(1)}m</Text><Text style={styles.td}>{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</Text></View>)}{!clones.length && <Text style={styles.empty}>Coordinates tagged on the Live map will appear here.</Text>}</Card>
  </View>;
}

function Summary({ value, label }: { value: string; label: string }) { return <Card style={styles.summaryCard}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></Card>; }

const styles = StyleSheet.create({
  page: { gap: 18 }, summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, summaryCard: { flex: 1, minWidth: 160, paddingVertical: 16 }, summaryValue: { color: colors.green, fontSize: 25, fontWeight: '900' }, summaryLabel: { color: colors.muted, fontSize: 11, marginTop: 3 }, columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, history: { flex: 1, minWidth: 300 }, transfer: { flex: 1, minWidth: 300, gap: 12 }, session: { flexDirection: 'row', minHeight: 68, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }, sessionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center' }, sessionGlyph: { color: colors.green, fontSize: 18 }, sessionBody: { flex: 1 }, sessionName: { color: colors.text, fontWeight: '800', fontSize: 13 }, sessionMeta: { color: colors.muted, fontSize: 10, marginTop: 4 }, date: { color: colors.muted, fontSize: 10 }, empty: { color: colors.muted, fontSize: 12, paddingVertical: 18 }, help: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: -8 }, actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 }, payload: { minHeight: 130, maxHeight: 180, borderRadius: radii.md, backgroundColor: '#0B1815', borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 12, fontSize: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }, message: { color: colors.green, fontSize: 11 }, tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, tableRow: { flexDirection: 'row', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }, th: { flex: 1, color: colors.muted, fontSize: 9, letterSpacing: 1 }, td: { flex: 1, color: colors.muted, fontSize: 11 }, tdStrong: { color: colors.text, fontWeight: '700', fontSize: 12 }, cloneCol: { flex: 1.2 },
});
