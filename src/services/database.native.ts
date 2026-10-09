import * as SQLite from 'expo-sqlite';
import type { CloneCoordinate, FieldSession, TelemetryLog } from '@/types/soilbot';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
const getDb = () => (database ??= SQLite.openDatabaseAsync('soilbot-operator.db'));
export async function initializeDatabase() {
  const db = await getDb();
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS field_sessions (session_id TEXT PRIMARY KEY NOT NULL, field_name TEXT NOT NULL, grid_dimensions TEXT NOT NULL, rows_count INTEGER NOT NULL, path_length REAL NOT NULL, marking_interval REAL NOT NULL, timestamp TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clone_coordinates (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, grid_x REAL NOT NULL, grid_y REAL NOT NULL, clone_variety TEXT NOT NULL, timestamp TEXT NOT NULL, FOREIGN KEY (session_id) REFERENCES field_sessions(session_id));
    CREATE TABLE IF NOT EXISTS telemetry_logs (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, battery_level REAL NOT NULL, temperature REAL NOT NULL, air_quality REAL NOT NULL, o2_level REAL NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, timestamp TEXT NOT NULL, FOREIGN KEY (session_id) REFERENCES field_sessions(session_id));
    CREATE INDEX IF NOT EXISTS clone_session_idx ON clone_coordinates(session_id); CREATE INDEX IF NOT EXISTS telemetry_session_idx ON telemetry_logs(session_id);`);
}
export async function saveSession(s: FieldSession) {
  await (await getDb()).runAsync(`INSERT OR REPLACE INTO field_sessions (session_id, field_name, grid_dimensions, rows_count, path_length, marking_interval, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`, s.sessionId, s.fieldName, `${s.rows} × ${s.pathLength}m`, s.rows, s.pathLength, s.markingInterval, s.timestamp);
}
export async function saveCloneCoordinate(c: CloneCoordinate) {
  await (await getDb()).runAsync(`INSERT INTO clone_coordinates VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, c.id, c.sessionId, c.latitude, c.longitude, c.gridX, c.gridY, c.cloneVariety, c.timestamp);
}
export async function saveTelemetryLog(t: TelemetryLog) {
  await (await getDb()).runAsync(`INSERT INTO telemetry_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, t.id, t.sessionId, t.batteryLevel, t.temperature, t.airQuality, t.o2Level, t.latitude, t.longitude, t.timestamp);
}
type SessionRow = { session_id: string; field_name: string; rows_count: number; path_length: number; marking_interval: number; timestamp: string };
type CloneRow = { id: string; session_id: string; latitude: number; longitude: number; grid_x: number; grid_y: number; clone_variety: string; timestamp: string };
type TelemetryRow = { id: string; session_id: string; battery_level: number; temperature: number; air_quality: number; o2_level: number; latitude: number; longitude: number; timestamp: string };
export async function getSessions(): Promise<FieldSession[]> {
  const rows = await (await getDb()).getAllAsync<SessionRow>('SELECT * FROM field_sessions ORDER BY timestamp DESC');
  return rows.map((r) => ({ sessionId: r.session_id, fieldName: r.field_name, rows: r.rows_count, pathLength: r.path_length, markingInterval: r.marking_interval, timestamp: r.timestamp }));
}
export async function getCloneCoordinates(sessionId?: string): Promise<CloneCoordinate[]> {
  const db = await getDb(); const rows = sessionId ? await db.getAllAsync<CloneRow>('SELECT * FROM clone_coordinates WHERE session_id = ? ORDER BY timestamp DESC', sessionId) : await db.getAllAsync<CloneRow>('SELECT * FROM clone_coordinates ORDER BY timestamp DESC');
  return rows.map((r) => ({ id: r.id, sessionId: r.session_id, latitude: r.latitude, longitude: r.longitude, gridX: r.grid_x, gridY: r.grid_y, cloneVariety: r.clone_variety, timestamp: r.timestamp }));
}
export async function getTelemetryLogs(sessionId?: string): Promise<TelemetryLog[]> {
  const db = await getDb(); const rows = sessionId ? await db.getAllAsync<TelemetryRow>('SELECT * FROM telemetry_logs WHERE session_id = ? ORDER BY timestamp DESC', sessionId) : await db.getAllAsync<TelemetryRow>('SELECT * FROM telemetry_logs ORDER BY timestamp DESC');
  return rows.map((r) => ({ id: r.id, sessionId: r.session_id, batteryLevel: r.battery_level, temperature: r.temperature, airQuality: r.air_quality, o2Level: r.o2_level, latitude: r.latitude, longitude: r.longitude, timestamp: r.timestamp }));
}
export async function exportAllData() { return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), field_sessions: await getSessions(), clone_coordinates: await getCloneCoordinates(), telemetry_logs: await getTelemetryLogs() }, null, 2); }
export async function importAllData(raw: string) {
  const data = JSON.parse(raw) as { field_sessions?: FieldSession[]; clone_coordinates?: CloneCoordinate[]; telemetry_logs?: TelemetryLog[] };
  if (!Array.isArray(data.field_sessions) || !Array.isArray(data.clone_coordinates) || !Array.isArray(data.telemetry_logs)) throw new Error('Invalid Soil Bot export');
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM telemetry_logs; DELETE FROM clone_coordinates; DELETE FROM field_sessions;');
    for (const s of data.field_sessions!) {
      await txn.runAsync(`INSERT INTO field_sessions (session_id, field_name, grid_dimensions, rows_count, path_length, marking_interval, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`, s.sessionId, s.fieldName, `${s.rows} × ${s.pathLength}m`, s.rows, s.pathLength, s.markingInterval, s.timestamp);
    }
    for (const c of data.clone_coordinates!) {
      await txn.runAsync(`INSERT INTO clone_coordinates VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, c.id, c.sessionId, c.latitude, c.longitude, c.gridX, c.gridY, c.cloneVariety, c.timestamp);
    }
    for (const t of data.telemetry_logs!) {
      await txn.runAsync(`INSERT INTO telemetry_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, t.id, t.sessionId, t.batteryLevel, t.temperature, t.airQuality, t.o2Level, t.latitude, t.longitude, t.timestamp);
    }
  });
}
export function cloneCoordinatesToCsv(rows: CloneCoordinate[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ['id,session_id,latitude,longitude,grid_x,grid_y,clone_variety,timestamp', ...rows.map((r) => [r.id, r.sessionId, r.latitude, r.longitude, r.gridX, r.gridY, r.cloneVariety, r.timestamp].map(escape).join(','))].join('\n');
}
