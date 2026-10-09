export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Position = { latitude: number; longitude: number; gridX: number; gridY: number };
export type Telemetry = { batteryLevel: number; temperature: number; airQuality: number; o2Level: number; timestamp: string };
export type FieldSession = { sessionId: string; fieldName: string; rows: number; pathLength: number; markingInterval: number; timestamp: string };
export type CloneCoordinate = Position & { id: string; sessionId: string; cloneVariety: string; timestamp: string };
export type TelemetryLog = Telemetry & { id: string; sessionId: string; latitude: number; longitude: number };
export type MarkingEvent = Position & { id: string; sessionId: string; timestamp: string };
