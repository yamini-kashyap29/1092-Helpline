import { io, Socket } from "socket.io-client";

type EventCallback = (data: unknown) => void;

class WebSocketManager {
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  connect(path: string): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // Connect to the backend socket.io server
    const API_BASE_URL = "http://localhost:8000";
    this.socket = io(API_BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log(`[WS] Connected with ID: ${this.socket?.id}`);
      
      // If path specifies a call room (e.g. /agent/CA123)
      if (path.startsWith("/agent/")) {
        const callId = path.split("/")[2];
        if (callId) {
          this.socket?.emit("join_call", callId);
        }
      }
    });

    this.socket.on("disconnect", () => {
      console.log("[WS] Disconnected");
    });

    // Handle incoming generic events and dispatch to local subscribers
    this.socket.onAny((event, ...args) => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => cb(args.length > 0 ? args[0] : null));
      }
    });
  }

  send(payload: { type: string; data: unknown }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(payload.type, payload.data);
    }
  }

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  simulateEvent(type: string, data: unknown): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribers.clear();
  }
}

export const wsManager = new WebSocketManager();
export default WebSocketManager;