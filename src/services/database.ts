import type { CloneCoordinate, FieldSession, MarkingEvent, TelemetryLog } from '@/types/soilbot';
import { isCloneCoordinate, isFieldSession, isMarkingEvent, isTelemetryLog, parseRecordsArchive } from '@/services/record-validation';

const KEYS = { sessions: 'soilbot.sessions', clones: 'soilbot.clones', telemetry: 'soilbot.telemetry', marks: 'soilbot.marks' };
function getStorage(): Storage {
  try {
    if (typeof localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
    return localStorage;
  } catch {
    throw new Error('Browser storage is unavailable. Enable site storage and reload the app.');
  }
}

function read<T>(key: string, validate: (value: unknown) => value is T): T[] {
  const stored = getStorage().getItem(key);
  if (stored === null) return [];
  let values: unknown;
  try {
    values = JSON.parse(stored);
  } catch {
    throw new Error(`Saved browser records (${key}) are not valid JSON. Export may not be possible until this storage is repaired.`);
  }
  if (!Array.isArray(values) || !values.every(validate)) {
    throw new Error(`Saved browser records (${key}) have an invalid format.`);
  }
  return values;
}
function write<T>(key: string, values: T[]) {
  getStorage().setItem(key, JSON.stringify(values));
}
export async function initializeDatabase() { getStorage(); }
export async function saveSession(session: FieldSession) {
  write(KEYS.sessions, [session, ...read(KEYS.sessions, isFieldSession).filter((x) => x.sessionId !== session.sessionId)]);
}
export async function saveCloneCoordinate(item: CloneCoordinate) { write(KEYS.clones, [item, ...read(KEYS.clones, isCloneCoordinate)]); }
export async function saveTelemetryLog(item: TelemetryLog) { write(KEYS.telemetry, [item, ...read(KEYS.telemetry, isTelemetryLog)].slice(0, 5000)); }
export async function saveMarkingEvent(item: MarkingEvent) { write(KEYS.marks, [item, ...read(KEYS.marks, isMarkingEvent)]); }
export async function getSessions() { return read(KEYS.sessions, isFieldSession); }
export async function getCloneCoordinates(sessionId?: string) {
  const rows = read(KEYS.clones, isCloneCoordinate); return sessionId ? rows.filter((x) => x.sessionId === sessionId) : rows;
}
export async function getTelemetryLogs(sessionId?: string) {
  const rows = read(KEYS.telemetry, isTelemetryLog); return sessionId ? rows.filter((x) => x.sessionId === sessionId) : rows;
}
export async function getMarkingEvents(sessionId?: string) {
  const rows = read(KEYS.marks, isMarkingEvent); return sessionId ? rows.filter((x) => x.sessionId === sessionId) : rows;
}
export async function exportAllData() {
  return JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), field_sessions: await getSessions(), clone_coordinates: await getCloneCoordinates(), telemetry_logs: await getTelemetryLogs(), marking_events: await getMarkingEvents() }, null, 2);
}
export async function importAllData(raw: string) {
  const data = parseRecordsArchive(raw);
  write(KEYS.sessions, data.field_sessions);
  write(KEYS.clones, data.clone_coordinates);
  write(KEYS.telemetry, data.telemetry_logs);
  write(KEYS.marks, data.marking_events);
}
export function cloneCoordinatesToCsv(rows: CloneCoordinate[]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ['id,session_id,latitude,longitude,grid_x,grid_y,clone_variety,timestamp', ...rows.map((r) => [r.id, r.sessionId, r.latitude, r.longitude, r.gridX, r.gridY, r.cloneVariety, r.timestamp].map(escape).join(','))].join('\n');
}
