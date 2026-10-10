import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getCloneCoordinates, getMarkingEvents, getSessions, getTelemetryLogs, initializeDatabase, saveCloneCoordinate, saveMarkingEvent, saveSession, saveTelemetryLog } from '@/services/database';
import { RosBridgeClient } from '@/services/rosbridge';
import type { CloneCoordinate, ConnectionState, FieldSession, MarkingEvent, Position, Telemetry } from '@/types/soilbot';

type OperatorContextValue = {
  session: FieldSession;
  position: Position;
  telemetry: Telemetry;
  history: Telemetry[];
  clones: CloneCoordinate[];
  marks: MarkingEvent[];
  connection: ConnectionState;
  databaseReady: boolean;
  databaseError: string;
  rosUrl: string;
  refreshFromDatabase: () => Promise<void>;
  connect: (url?: string) => void;
  disconnect: () => void;
  createSession: (input: Omit<FieldSession, 'sessionId' | 'timestamp'>) => Promise<void>;
  assignClone: (variety: string) => Promise<void>;
};

const defaultSession: FieldSession = { sessionId: 'field-demo', fieldName: 'Field 07 - North block', rows: 8, pathLength: 120, markingInterval: 5, timestamp: new Date().toISOString() };
const defaultPosition: Position = { latitude: 38.7223, longitude: -9.1393, gridX: 23.8, gridY: 4 };
const defaultTelemetry: Telemetry = { batteryLevel: 86, temperature: 28.4, airQuality: 42, o2Level: 20.9, timestamp: new Date().toISOString() };
const OperatorContext = createContext<OperatorContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function OperatorProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(defaultSession);
  const [position, setPosition] = useState(defaultPosition);
  const [telemetry, setTelemetry] = useState(defaultTelemetry);
  const [history, setHistory] = useState<Telemetry[]>([defaultTelemetry]);
  const [clones, setClones] = useState<CloneCoordinate[]>([]);
  const [marks, setMarks] = useState<MarkingEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('disconnected');
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState('');
  const [rosUrl, setRosUrl] = useState('ws://192.168.1.50:9090');
  const client = useRef<RosBridgeClient | null>(null);
  const sessionRef = useRef(session);
  const positionRef = useRef(position);
  const telemetryRef = useRef(telemetry);
  const lastTelemetrySaveAt = useRef(0);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);

  const recordMark = useCallback(() => {
    const mark: MarkingEvent = { ...positionRef.current, id: createId('mark'), sessionId: sessionRef.current.sessionId, timestamp: new Date().toISOString() };
    setMarks((items) => [mark, ...items].slice(0, 500));
    void saveMarkingEvent(mark)
      .then(() => setDatabaseError(''))
      .catch((error: unknown) => {
        setDatabaseError(error instanceof Error ? error.message : 'Unable to save the marking event.');
      });
  }, []);

  const onTelemetry = useCallback((next: Telemetry) => {
    telemetryRef.current = next;
    setTelemetry(next);
    setHistory((items) => [...items.slice(-29), next]);
    const p = positionRef.current;
    const s = sessionRef.current;
    const now = Date.now();
    if (now - lastTelemetrySaveAt.current >= 4000) {
      lastTelemetrySaveAt.current = now;
      void saveTelemetryLog({ ...next, id: createId('telemetry'), sessionId: s.sessionId, latitude: p.latitude, longitude: p.longitude, gridX: p.gridX, gridY: p.gridY })
        .then(() => setDatabaseError(''))
        .catch((error: unknown) => {
          setDatabaseError(error instanceof Error ? error.message : 'Unable to save telemetry.');
        });
    }
  }, []);

  const onPosition = useCallback((next: Position) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  const onConnectionState = useCallback((next: ConnectionState) => {
    setConnection(next);
    if (next === 'connected') setMarks((items) => items.filter((item) => !item.id.startsWith('demo-mark-')));
  }, []);

  const refreshFromDatabase = useCallback(async () => {
    await initializeDatabase();
    const sessions = await getSessions();
    if (sessions.length === 0) await saveSession(defaultSession);
    const activeSession = sessions[0] ?? defaultSession;
    const [savedClones, savedMarks, savedTelemetry] = await Promise.all([
      getCloneCoordinates(activeSession.sessionId),
      getMarkingEvents(activeSession.sessionId),
      getTelemetryLogs(activeSession.sessionId),
    ]);
    sessionRef.current = activeSession;
    setSession(activeSession);
    setClones(savedClones);
    setMarks(savedMarks.slice(0, 500));
    telemetryRef.current = defaultTelemetry;
    positionRef.current = defaultPosition;
    setTelemetry(defaultTelemetry);
    setPosition(defaultPosition);
    setHistory([defaultTelemetry]);
    if (savedTelemetry.length > 0) {
      const latest = savedTelemetry[0];
      const restoredTelemetry: Telemetry = {
        batteryLevel: latest.batteryLevel,
        temperature: latest.temperature,
        airQuality: latest.airQuality,
        o2Level: latest.o2Level,
        timestamp: latest.timestamp,
      };
      const restoredPosition: Position = {
        latitude: latest.latitude,
        longitude: latest.longitude,
        gridX: latest.gridX ?? defaultPosition.gridX,
        gridY: latest.gridY ?? defaultPosition.gridY,
      };
      telemetryRef.current = restoredTelemetry;
      positionRef.current = restoredPosition;
      setTelemetry(restoredTelemetry);
      setPosition(restoredPosition);
      setHistory(savedTelemetry.slice(0, 30).reverse().map((item) => ({
        batteryLevel: item.batteryLevel,
        temperature: item.temperature,
        airQuality: item.airQuality,
        o2Level: item.o2Level,
        timestamp: item.timestamp,
      })));
    }
    setDatabaseError('');
    setDatabaseReady(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(refreshFromDatabase).catch((error: unknown) => {
      if (mounted) setDatabaseError(error instanceof Error ? error.message : 'Unable to open the local database.');
    });
    client.current = new RosBridgeClient({ onState: onConnectionState, onPosition, onTelemetry, onMarking: recordMark });
    return () => {
      mounted = false;
      client.current?.disconnect();
    };
  }, [onConnectionState, onPosition, onTelemetry, recordMark, refreshFromDatabase]);

  useEffect(() => {
    if (!databaseReady || connection === 'connected') return;
    const timer = setInterval(() => {
      const current = positionRef.current;
      const nextX = (current.gridX + 1.2) % session.pathLength;
      const next = { ...current, gridX: nextX, gridY: Math.max(1, Math.ceil((nextX / session.pathLength) * session.rows)) };
      positionRef.current = next;
      setPosition(next);
      if (Math.floor(current.gridX / session.markingInterval) !== Math.floor(nextX / session.markingInterval)) {
        const demoMark: MarkingEvent = { ...next, id: createId('demo-mark'), sessionId: session.sessionId, timestamp: new Date().toISOString() };
        setMarks((items) => [demoMark, ...items].slice(0, 500));
      }
      const demoTelemetry = {
        batteryLevel: Math.max(5, telemetryRef.current.batteryLevel - 0.1),
        temperature: 28 + Math.random() * 1.2,
        airQuality: 38 + Math.round(Math.random() * 10),
        o2Level: 20.7 + Math.random() * 0.3,
        timestamp: new Date().toISOString(),
      };
      telemetryRef.current = demoTelemetry;
      setTelemetry(demoTelemetry);
      setHistory((items) => [...items.slice(-29), demoTelemetry]);
    }, 4000);
    return () => clearInterval(timer);
  }, [connection, databaseReady, session.markingInterval, session.pathLength, session.rows, session.sessionId]);

  const connect = useCallback((url?: string) => {
    const target = url?.trim() || rosUrl;
    setRosUrl(target);
    client.current?.connect(target);
  }, [rosUrl]);
  const disconnect = useCallback(() => client.current?.disconnect(), []);
  const createSession = useCallback(async (input: Omit<FieldSession, 'sessionId' | 'timestamp'>) => {
    const next = { ...input, sessionId: createId('session'), timestamp: new Date().toISOString() };
    await saveSession(next);
    sessionRef.current = next;
    setSession(next);
    setClones([]);
    setMarks([]);
    setHistory([telemetryRef.current]);
    const nextPosition = { ...positionRef.current, gridX: 0, gridY: 1 };
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    setDatabaseError('');
  }, []);
  const assignClone = useCallback(async (cloneVariety: string) => {
    const item: CloneCoordinate = { ...positionRef.current, id: createId('clone'), sessionId: sessionRef.current.sessionId, cloneVariety, timestamp: new Date().toISOString() };
    await saveCloneCoordinate(item);
    setClones((items) => [item, ...items]);
    setDatabaseError('');
  }, []);

  const value = useMemo(() => ({ session, position, telemetry, history, clones, marks, connection, databaseReady, databaseError, rosUrl, refreshFromDatabase, connect, disconnect, createSession, assignClone }), [session, position, telemetry, history, clones, marks, connection, databaseReady, databaseError, rosUrl, refreshFromDatabase, connect, disconnect, createSession, assignClone]);
  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator() {
  const context = useContext(OperatorContext);
  if (!context) throw new Error('useOperator must be used inside OperatorProvider');
  return context;
}
