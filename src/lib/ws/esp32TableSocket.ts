import { TableSocket, TableSocketMessage } from "./tableSocket";

type Esp32ButtonClickEvent = {
  event: "button_click";
  segment: number;
  timestamp: number;
};

type Esp32HelloEvent = {
  event: "hello";
  message: string;
};

type Esp32SocketEvent = Esp32HelloEvent | Esp32ButtonClickEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseEsp32Event(value: unknown): TableSocketMessage | undefined {
  if (!isRecord(value) || typeof value.event !== "string") {
    return undefined;
  }

  if (value.event === "hello" && typeof value.message === "string") {
    const event = value as Esp32HelloEvent;
    return { type: "hello", payload: { message: event.message } };
  }

  if (value.event === "button_click" && typeof value.segment === "number" && typeof value.timestamp === "number") {
    const event = value as Esp32ButtonClickEvent;
    return {
      type: "button_click",
      payload: {
        segment: event.segment,
        timestamp: event.timestamp,
      },
    };
  }

  return { type: "status", payload: `Ignored ESP32 event: ${value.event}` };
}

export class Esp32TableSocket implements TableSocket {
  private socket?: WebSocket;
  private reconnectTimer?: number;
  private closedByClient = false;

  constructor(
    private readonly url: string,
    private readonly reconnect = true,
  ) {}

  connect(onMessage: (message: TableSocketMessage) => void) {
    this.disconnect();
    this.closedByClient = false;

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      onMessage({ type: "status", payload: `WebSocket opened at ${this.url}` });
    });

    socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as Esp32SocketEvent;
        const message = parseEsp32Event(parsed);
        if (message) {
          onMessage(message);
        }
      } catch (error) {
        onMessage({ type: "error", payload: `Invalid WebSocket payload: ${String(error)}` });
      }
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        onMessage({ type: "status", payload: "WebSocket closed" });
        this.socket = undefined;
        this.scheduleReconnect(onMessage);
      }
    });

    socket.addEventListener("error", () => {
      onMessage({ type: "error", payload: `WebSocket error at ${this.url}` });
    });
  }

  disconnect() {
    this.closedByClient = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
  }

  private scheduleReconnect(onMessage: (message: TableSocketMessage) => void) {
    if (!this.reconnect || this.closedByClient || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      onMessage({ type: "status", payload: `Reconnecting WebSocket at ${this.url}` });
      this.connect(onMessage);
    }, 2000);
  }
}
