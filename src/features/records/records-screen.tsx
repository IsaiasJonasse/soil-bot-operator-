import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Pill, SectionTitle } from '@/components/ui/operator-ui';
import { colors, radii } from '@/constants/soilbot-theme';
import { cloneCoordinatesToCsv, exportAllData, getCloneCoordinates, getSessions, importAllData } from '@/services/database';
import { exportRecordFile, pickRecordJson } from '@/services/record-transfer';
import { useOperator } from '@/state/operator-context';
import type { CloneCoordinate, FieldSession } from '@/types/soilbot';

export function RecordsScreen() {
  const { databaseReady, databaseError, refreshFromDatabase } = useOperator();
  const [sessions, setSessions] = useState<FieldSession[]>([]);
  const [clones, setClones] = useState<CloneCoordinate[]>([]);
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [busyAction, setBusyAction] = useState<'export-json' | 'export-csv' | 'choose' | 'import' | null>(null);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const busy = busyAction !== null;

  const reload = useCallback(async () => {
    const [nextSessions, nextClones] = await Promise.all([getSessions(), getCloneCoordinates()]);
    setSessions(nextSessions);
    setClones(nextClones);
  }, []);
  useEffect(() => {
    if (!databaseReady) return;
    let active = true;
    void Promise.all([getSessions(), getCloneCoordinates()]).then(([nextSessions, nextClones]) => {
      if (active) {
        setSessions(nextSessions);
        setClones(nextClones);
      }
    }).catch((error: unknown) => {
      if (active) {
        setMessageIsError(true);
        setMessage(error instanceof Error ? error.message : 'Unable to load saved records.');
      }
    });
    return () => { active = false; };
  }, [databaseReady]);

  const exportFile = async (format: 'json' | 'csv') => {
    setBusyAction(`export-${format}`);
    setMessage('');
    try {
      const content = format === 'json' ? await exportAllData() : cloneCoordinatesToCsv(clones);
      const name = format === 'json' ? 'soilbot-field-records.json' : 'soilbot-clone-coordinates.csv';
      const mime = format === 'json' ? 'application/json' : 'text/csv';
      setPayload(content);
      await exportRecordFile(content, name, mime);
      setMessageIsError(false);
      setMessage(Platform.OS === 'web' ? `${format.toUpperCase()} downloaded.` : 'Choose where to share or save the export.');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to export records.');
    } finally {
      setBusyAction(null);
    }
  };
  const chooseJson = async () => {
    setBusyAction('choose');
    setMessage('');
    try {
      const content = await pickRecordJson();
      if (content) { setPayload(content); setConfirmingImport(false); setMessageIsError(false); setMessage('JSON file loaded. Review it, then tap Import.'); }
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to open that file.');
    } finally {
      setBusyAction(null);
    }
  };
  const importJson = async () => {
    setBusyAction('import');
    setMessage('');
    try {
      await importAllData(payload);
      await refreshFromDatabase();
      await reload();
      setConfirmingImport(false);
      setMessageIsError(false);
      setMessage('Import complete. Local records were replaced safely.');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to import records.');
    } finally {
      setBusyAction(null);
    }
  };

  return <View style={styles.page}>
    <View style={styles.summary}><Summary value={String(sessions.length)} label="Field sessions" /><Summary value={String(clones.length)} label="Clone coordinates" /><Summary value={Platform.OS === 'web' ? 'Browser' : 'SQLite'} label="Local database" /></View>
    <View style={styles.columns}>
      <Card style={styles.history}><SectionTitle aside={<Pill label="Offline ready" />}>Recent field sessions</SectionTitle>{sessions.length === 0 ? <Text style={styles.empty}>No sessions yet. Create one from Field setup.</Text> : sessions.slice(0, 8).map((s) => <View key={s.sessionId} style={styles.session}><View style={styles.sessionIcon}><Text style={styles.sessionGlyph}>+</Text></View><View style={styles.sessionBody}><Text style={styles.sessionName}>{s.fieldName}</Text><Text style={styles.sessionMeta}>{s.rows} rows - {s.pathLength} m - marks every {s.markingInterval} m</Text></View><Text style={styles.date}>{new Date(s.timestamp).toLocaleDateString()}</Text></View>)}</Card>
      <Card style={styles.transfer}><SectionTitle>Transfer records</SectionTitle><Text style={styles.help}>Importing replaces the records stored on this device. Move complete JSON archives between operator devices, or export clone positions as spreadsheet-ready CSV.</Text><View style={styles.actions}><View style={styles.action}><Button label="Export JSON" onPress={() => void exportFile('json')} disabled={busy || !databaseReady} loading={busyAction === 'export-json'} /></View><View style={styles.action}><Button label="Export CSV" secondary onPress={() => void exportFile('csv')} disabled={busy || !databaseReady} loading={busyAction === 'export-csv'} /></View></View><Button label="Choose JSON file" secondary onPress={() => void chooseJson()} disabled={busy || !databaseReady} loading={busyAction === 'choose'} /><TextInput accessibilityLabel="Records JSON" multiline value={payload} onChangeText={(value) => { setPayload(value); setConfirmingImport(false); }} editable={!busy} placeholder="Select or paste Soil Bot JSON here..." placeholderTextColor={colors.muted} style={styles.payload} textAlignVertical="top" />{confirmingImport ? <View style={styles.confirm}><Text style={styles.confirmTitle}>Replace all local records?</Text><Text style={styles.confirmText}>This cannot be undone unless you export a backup first.</Text><View style={styles.actions}><View style={styles.action}><Button label="Cancel" secondary onPress={() => setConfirmingImport(false)} disabled={busy} /></View><View style={styles.action}><Button label="Replace records" onPress={() => void importJson()} loading={busyAction === 'import'} /></View></View></View> : <Button label="Import JSON" secondary onPress={() => setConfirmingImport(true)} disabled={busy || !databaseReady || !payload.trim()} />}{message || databaseError ? <Text accessibilityRole="alert" style={[styles.message, (messageIsError || Boolean(databaseError)) && styles.messageError]}>{databaseError || message}</Text> : null}</Card>
    </View>
    <Card><SectionTitle>Latest clone tags</SectionTitle><View style={styles.tableHeader}><Text style={[styles.th, styles.cloneCol]}>VARIETY</Text><Text style={styles.th}>GRID</Text><Text style={styles.th}>GPS</Text></View>{clones.slice(0, 10).map((c) => <View key={c.id} style={styles.tableRow}><Text style={[styles.tdStrong, styles.cloneCol]}>{c.cloneVariety}</Text><Text style={styles.td}>R{c.gridY} - {c.gridX.toFixed(1)}m</Text><Text style={styles.td}>{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</Text></View>)}{!clones.length && <Text style={styles.empty}>Coordinates tagged on the Live map will appear here.</Text>}</Card>
  </View>;
}

function Summary({ value, label }: { value: string; label: string }) { return <Card style={styles.summaryCard}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></Card>; }

const styles = StyleSheet.create({
  page: { gap: 18 }, summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, summaryCard: { flex: 1, minWidth: 160, paddingVertical: 16 }, summaryValue: { color: colors.green, fontSize: 25, fontWeight: '900' }, summaryLabel: { color: colors.muted, fontSize: 11, marginTop: 3 }, columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, history: { flex: 1, minWidth: 300 }, transfer: { flex: 1, minWidth: 300, gap: 12 }, session: { flexDirection: 'row', minHeight: 68, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }, sessionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.panelRaised, alignItems: 'center', justifyContent: 'center' }, sessionGlyph: { color: colors.green, fontSize: 18 }, sessionBody: { flex: 1 }, sessionName: { color: colors.text, fontWeight: '800', fontSize: 13 }, sessionMeta: { color: colors.muted, fontSize: 10, marginTop: 4 }, date: { color: colors.muted, fontSize: 10 }, empty: { color: colors.muted, fontSize: 12, paddingVertical: 18 }, help: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: -8 }, actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 }, payload: { minHeight: 130, maxHeight: 180, borderRadius: radii.md, backgroundColor: '#0B1815', borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 12, fontSize: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }, confirm: { gap: 10, padding: 13, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.amber}66`, backgroundColor: `${colors.amber}10` }, confirmTitle: { color: colors.amber, fontSize: 13, fontWeight: '800' }, confirmText: { color: colors.muted, fontSize: 11, lineHeight: 16 }, message: { color: colors.green, fontSize: 11 }, messageError: { color: colors.red }, tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, tableRow: { flexDirection: 'row', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }, th: { flex: 1, color: colors.muted, fontSize: 9, letterSpacing: 1 }, td: { flex: 1, color: colors.muted, fontSize: 11 }, tdStrong: { color: colors.text, fontWeight: '700', fontSize: 12 }, cloneCol: { flex: 1.2 },
});
