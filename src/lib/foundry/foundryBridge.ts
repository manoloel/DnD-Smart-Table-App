import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { FoundryEventMessage } from "../../types";

export interface FoundryBridgeSnapshot {
  enabled: boolean;
  endpoint: string;
  client_connected: boolean;
}

export interface FoundryBridgeStatusEvent {
  type: "listening" | "error";
  endpoint?: string;
  message?: string;
}

export interface FoundrySocketEvent {
  type: string;
  requestId?: string;
  command?: string;
  ok?: boolean;
  error?: { code: string; message: string } | null;
  payload?: unknown;
  worldId?: string;
  worldTitle?: string;
  userId?: string;
  userName?: string;
  module?: string;
}

export async function configureFoundryBridge(enabled: boolean, secret: string) {
  return invoke<FoundryBridgeSnapshot>("configure_foundry_bridge", { enabled, secret });
}

export async function sendFoundryNextTurnCommand() {
  return invoke<number>("foundry_next_turn");
}

export async function pingFoundry() {
  return invoke<number>("foundry_ping");
}

export async function subscribeFoundryBridge(handlers: {
  onEvent: (event: FoundryEventMessage) => void;
  onBridge: (event: FoundryBridgeStatusEvent) => void;
  onSocket: (event: FoundrySocketEvent) => void;
}) {
  const unlisteners: UnlistenFn[] = [];
  unlisteners.push(await listen<FoundryEventMessage>("foundry://event", (event) => handlers.onEvent(event.payload)));
  unlisteners.push(await listen<FoundryBridgeStatusEvent>("foundry://bridge", (event) => handlers.onBridge(event.payload)));
  unlisteners.push(await listen<FoundrySocketEvent>("foundry://ws", (event) => handlers.onSocket(event.payload)));
  return () => {
    for (const unlisten of unlisteners) {
      unlisten();
    }
  };
}
