import type { CloneCoordinate, FieldSession, MarkingEvent, TelemetryLog } from '@/types/soilbot';

export type RecordsArchive = {
  field_sessions: FieldSession[];
  clone_coordinates: CloneCoordinate[];
  telemetry_logs: TelemetryLog[];
  marking_events: MarkingEvent[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTimestamp(value: unknown): value is string {
  return isText(value) && Number.isFinite(Date.parse(value));
}

function isPosition(value: Record<string, unknown>) {
  return isFiniteNumber(value.latitude)
    && value.latitude >= -90 && value.latitude <= 90
    && isFiniteNumber(value.longitude)
    && value.longitude >= -180 && value.longitude <= 180
    && isFiniteNumber(value.gridX) && value.gridX >= 0
    && isFiniteNumber(value.gridY) && value.gridY >= 1;
}

export function isFieldSession(value: unknown): value is FieldSession {
  if (!isObject(value)) return false;
  return isText(value.sessionId)
    && isText(value.fieldName)
    && isFiniteNumber(value.rows)
    && value.rows > 0
    && isFiniteNumber(value.pathLength) && value.pathLength > 0
    && isFiniteNumber(value.markingInterval) && value.markingInterval > 0
    && isTimestamp(value.timestamp);
}

export function isCloneCoordinate(value: unknown): value is CloneCoordinate {
  if (!isObject(value)) return false;
  return isText(value.id)
    && isText(value.sessionId)
    && isPosition(value)
    && isText(value.cloneVariety)
    && isTimestamp(value.timestamp);
}

export function isTelemetryLog(value: unknown): value is TelemetryLog {
  if (!isObject(value)) return false;
  return isText(value.id)
    && isText(value.sessionId)
    && isFiniteNumber(value.batteryLevel)
    && isFiniteNumber(value.temperature)
    && isFiniteNumber(value.airQuality)
    && isFiniteNumber(value.o2Level)
    && isFiniteNumber(value.latitude) && value.latitude >= -90 && value.latitude <= 90
    && isFiniteNumber(value.longitude) && value.longitude >= -180 && value.longitude <= 180
    && (value.gridX === undefined || (isFiniteNumber(value.gridX) && value.gridX >= 0))
    && (value.gridY === undefined || (isFiniteNumber(value.gridY) && value.gridY >= 1))
    && isTimestamp(value.timestamp);
}

export function isMarkingEvent(value: unknown): value is MarkingEvent {
  if (!isObject(value)) return false;
  return isText(value.id) && isText(value.sessionId) && isPosition(value) && isTimestamp(value.timestamp);
}

export function parseRecordsArchive(raw: string): RecordsArchive {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isObject(parsed) || (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2)) {
    throw new Error('This file is not a supported Soil Bot records export.');
  }

  const sessions = parsed.field_sessions;
  const clones = parsed.clone_coordinates;
  const telemetry = parsed.telemetry_logs;
  const marks = parsed.marking_events ?? (parsed.schemaVersion === 1 ? [] : undefined);
  if (!Array.isArray(sessions) || !sessions.every(isFieldSession)
    || !Array.isArray(clones) || !clones.every(isCloneCoordinate)
    || !Array.isArray(telemetry) || !telemetry.every(isTelemetryLog)
    || !Array.isArray(marks) || !marks.every(isMarkingEvent)) {
    throw new Error('The records export contains missing or invalid data.');
  }
  if (sessions.length === 0) throw new Error('The records export must contain at least one field session.');

  const sessionIds = new Set(sessions.map((session) => session.sessionId));
  if (sessionIds.size !== sessions.length
    || new Set(clones.map((item) => item.id)).size !== clones.length
    || new Set(telemetry.map((item) => item.id)).size !== telemetry.length
    || new Set(marks.map((item) => item.id)).size !== marks.length
    || !clones.every((item) => sessionIds.has(item.sessionId))
    || !telemetry.every((item) => sessionIds.has(item.sessionId))
    || !marks.every((item) => sessionIds.has(item.sessionId))) {
    throw new Error('The records export contains duplicate or unknown field session references.');
  }

  return {
    field_sessions: sessions,
    clone_coordinates: clones,
    telemetry_logs: telemetry,
    marking_events: marks,
  };
}
