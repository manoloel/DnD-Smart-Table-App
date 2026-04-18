import { RfidEvent } from "../../types";

export type TableSocketMessage =
  | { type: "hello"; payload: { message: string } }
  | { type: "button_click"; payload: { segment: number; timestamp: number } }
  | { type: "rfid"; payload: RfidEvent }
  | { type: "temperature"; payload: { temperatureC: number; fanSpeed: number } }
  | { type: "status"; payload: string }
  | { type: "error"; payload: string };

export interface TableSocket {
  connect(onMessage: (message: TableSocketMessage) => void): void;
  disconnect(): void;
}
