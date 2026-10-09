import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getCloneCoordinates, initializeDatabase, saveCloneCoordinate, saveSession, saveTelemetryLog } from '@/services/database';
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
  connect: (url?: string) => void;
  disconnect: () => void;
  createSession: (input: Omit<FieldSession, 'sessionId' | 'timestamp'>) => Promise<void>;
  assignClone: (variety: string) => Promise<void>;
};

const defaultSession: FieldSession = { sessionId: 'field-demo', fieldName: 'Field 07 - North block', rows: 8, pathLength: 120, markingInterval: 5, timestamp: new Date().toISOString() };
const defaultPosition: Position = { latitude: 38.7223, longitude: -9.1393, gridX: 23.8, gridY: 4 };
const defaultTelemetry: Telemetry = { batteryLevel: 86, temperature: 28.4, airQuality: 42, o2Level: 20.9, timestamp: new Date().toISOString() };
const OperatorContext = createContext<OperatorContextValue | null>(null);

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

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { telemetryRef.current = telemetry; }, [telemetry]);

  const recordMark = useCallback(() => {
    const mark: MarkingEvent = { ...positionRef.current, id: `mark-${Date.now()}-${Math.random()}`, sessionId: sessionRef.current.sessionId, timestamp: new Date().toISOString() };
    setMarks((items) => [mark, ...items].slice(0, 500));
  }, []);

  const onTelemetry = useCallback((next: Telemetry) => {
    telemetryRef.current = next;
    setTelemetry(next);
    setHistory((items) => [...items.slice(-29), next]);
    const p = positionRef.current;
    const s = sessionRef.current;
    void saveTelemetryLog({ ...next, id: `${Date.now()}-${Math.random()}`, sessionId: s.sessionId, latitude: p.latitude, longitude: p.longitude });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await initializeDatabase();
        await saveSession(defaultSession);
        setClones(await getCloneCoordinates(defaultSession.sessionId));
        setDatabaseReady(true);
      } catch (error) {
        setDatabaseError(error instanceof Error ? error.message : 'Unable to open the local database.');
      }
    })();
    client.current = new RosBridgeClient({ onState: setConnection, onPosition: setPosition, onTelemetry, onMarking: recordMark });
    return () => client.current?.disconnect();
  }, [onTelemetry, recordMark]);

  useEffect(() => {
    if (connection === 'connected') return;
    const timer = setInterval(() => {
      const current = positionRef.current;
      const nextX = (current.gridX + 1.2) % session.pathLength;
      const next = { ...current, gridX: nextX, gridY: Math.max(1, Math.ceil((nextX / session.pathLength) * session.rows)) };
      positionRef.current = next;
      setPosition(next);
      if (Math.floor(current.gridX / session.markingInterval) !== Math.floor(nextX / session.markingInterval)) recordMark();
      onTelemetry({ batteryLevel: Math.max(5, telemetryRef.current.batteryLevel - 0.1), temperature: 28 + Math.random() * 1.2, airQuality: 38 + Math.round(Math.random() * 10), o2Level: 20.7 + Math.random() * 0.3, timestamp: new Date().toISOString() });
    }, 4000);
    return () => clearInterval(timer);
  }, [connection, onTelemetry, recordMark, session.markingInterval, session.pathLength, session.rows]);

  const connect = useCallback((url?: string) => {
    const target = url?.trim() || rosUrl;
    setRosUrl(target);
    client.current?.connect(target);
  }, [rosUrl]);
  const disconnect = useCallback(() => client.current?.disconnect(), []);
  const createSession = useCallback(async (input: Omit<FieldSession, 'sessionId' | 'timestamp'>) => {
    const next = { ...input, sessionId: `session-${Date.now()}`, timestamp: new Date().toISOString() };
    await saveSession(next);
    sessionRef.current = next;
    setSession(next);
    setClones([]);
    setMarks([]);
    setHistory([telemetryRef.current]);
    const nextPosition = { ...positionRef.current, gridX: 0, gridY: 1 };
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, []);
  const assignClone = useCallback(async (cloneVariety: string) => {
    const item: CloneCoordinate = { ...positionRef.current, id: `clone-${Date.now()}`, sessionId: sessionRef.current.sessionId, cloneVariety, timestamp: new Date().toISOString() };
    await saveCloneCoordinate(item);
    setClones((items) => [item, ...items]);
  }, []);

  const value = useMemo(() => ({ session, position, telemetry, history, clones, marks, connection, databaseReady, databaseError, rosUrl, connect, disconnect, createSession, assignClone }), [session, position, telemetry, history, clones, marks, connection, databaseReady, databaseError, rosUrl, connect, disconnect, createSession, assignClone]);
  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator() {
  const context = useContext(OperatorContext);
  if (!context) throw new Error('useOperator must be used inside OperatorProvider');
  return context;
}
