import type { CloneCoordinate, FieldSession, TelemetryLog } from '@/types/soilbot';

const KEYS = { sessions: 'soilbot.sessions', clones: 'soilbot.clones', telemetry: 'soilbot.telemetry' };
function read<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]; } catch { return []; }
}
function write<T>(key: string, values: T[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(values));
}
export async function initializeDatabase() {}
export async function saveSession(session: FieldSession) {
  write(KEYS.sessions, [session, ...read<FieldSession>(KEYS.sessions).filter((x) => x.sessionId !== session.sessionId)]);
}
export async function saveCloneCoordinate(item: CloneCoordinate) { write(KEYS.clones, [item, ...read<CloneCoordinate>(KEYS.clones)]); }
export async function saveTelemetryLog(item: TelemetryLog) { write(KEYS.telemetry, [item, ...read<TelemetryLog>(KEYS.telemetry)].slice(0, 5000)); }
export async function getSessions() { return read<FieldSession>(KEYS.sessions); }
export async function getCloneCoordinates(sessionId?: string) {
  const rows = read<CloneCoordinate>(KEYS.clones); return sessionId ? rows.filter((x) => x.sessionId === sessionId) : rows;
}
export async function getTelemetryLogs(sessionId?: string) {
  const rows = read<TelemetryLog>(KEYS.telemetry); return sessionId ? rows.filter((x) => x.sessionId === sessionId) : rows;
}
export async function exportAllData() {
  return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), field_sessions: await getSessions(), clone_coordinates: await getCloneCoordinates(), telemetry_logs: await getTelemetryLogs() }, null, 2);
}
export async function importAllData(raw: string) {
  const data = JSON.parse(raw) as { field_sessions?: FieldSession[]; clone_coordinates?: CloneCoordinate[]; telemetry_logs?: TelemetryLog[] };
  if (!Array.isArray(data.field_sessions) || !Array.isArray(data.clone_coordinates) || !Array.isArray(data.telemetry_logs)) throw new Error('Invalid Soil Bot export');
  write(KEYS.sessions, data.field_sessions); write(KEYS.clones, data.clone_coordinates); write(KEYS.telemetry, data.telemetry_logs);
}
export function cloneCoordinatesToCsv(rows: CloneCoordinate[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ['id,session_id,latitude,longitude,grid_x,grid_y,clone_variety,timestamp', ...rows.map((r) => [r.id, r.sessionId, r.latitude, r.longitude, r.gridX, r.gridY, r.cloneVariety, r.timestamp].map(escape).join(','))].join('\n');
}
