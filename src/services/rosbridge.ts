import type { ConnectionState, Position, Telemetry } from '@/types/soilbot';

type RosCallbacks = {
  onState: (state: ConnectionState) => void;
  onPosition: (position: Position) => void;
  onTelemetry: (telemetry: Telemetry) => void;
  onMarking: () => void;
};

export class RosBridgeClient {
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private manualClose = false;
  constructor(private callbacks: RosCallbacks) {}

  connect(url: string) {
    this.disconnect();
    this.manualClose = false;
    this.callbacks.onState('connecting');
    try {
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.onopen = () => {
        this.callbacks.onState('connected');
        ['/soilbot/gps_coordinates', '/soilbot/telemetry', '/soilbot/marking_event'].forEach((topic) => {
          socket.send(JSON.stringify({ op: 'subscribe', topic, throttle_rate: 250 }));
        });
      };
      socket.onmessage = (event) => this.routeMessage(String(event.data));
      socket.onerror = () => this.callbacks.onState('error');
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = undefined;
        this.callbacks.onState('disconnected');
        if (!this.manualClose) this.reconnectTimer = setTimeout(() => this.connect(url), 5000);
      };
    } catch {
      this.callbacks.onState('error');
    }
  }

  disconnect() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
    this.callbacks.onState('disconnected');
  }

  private routeMessage(raw: string) {
    try {
      const packet = JSON.parse(raw) as { topic?: string; msg?: Record<string, number> };
      const msg = packet.msg ?? {};
      if (packet.topic === '/soilbot/gps_coordinates') {
        const values = [msg.latitude, msg.longitude, msg.grid_x, msg.grid_y];
        if (values.every(Number.isFinite)) {
          this.callbacks.onPosition({ latitude: msg.latitude, longitude: msg.longitude, gridX: msg.grid_x, gridY: msg.grid_y });
        }
      } else if (packet.topic === '/soilbot/telemetry') {
        const values = [msg.battery_level, msg.temperature, msg.air_quality, msg.o2_level];
        if (values.every(Number.isFinite)) {
          this.callbacks.onTelemetry({ batteryLevel: msg.battery_level, temperature: msg.temperature, airQuality: msg.air_quality, o2Level: msg.o2_level, timestamp: new Date().toISOString() });
        }
      } else if (packet.topic === '/soilbot/marking_event') this.callbacks.onMarking();
    } catch {
      // Ignore malformed messages; ROS telemetry must never crash the operator UI.
    }
  }
}
