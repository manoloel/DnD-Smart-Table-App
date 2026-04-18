export type ConnectionStatus = "connected" | "connecting" | "degraded" | "offline";

export type Language = "ru" | "en";

export type TabId =
  | "dashboard"
  | "lighting"
  | "players"
  | "rfid"
  | "oled"
  | "foundry"
  | "settings"
  | "logs";

export type ZoneId =
  | "ambient"
  | "player-1"
  | "player-2"
  | "player-3"
  | "player-4"
  | "player-5"
  | "player-6";

export type EffectId =
  | "static"
  | "pulse"
  | "breathing"
  | "spark"
  | "initiative"
  | "warning"
  | "scan";

export type PresetId =
  | "neutral"
  | "battle"
  | "dungeon"
  | "magic"
  | "boss"
  | "warhammer";

export interface LightingZone {
  id: ZoneId;
  label: string;
  color: string;
  brightness: number;
  effect: EffectId;
  online: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  characterName: string;
  role: string;
  armorClass: number;
  initiative: number;
  color: string;
  seat: number;
  rfidTag?: string;
  hp: number;
  status: string;
  active: boolean;
}

export interface RfidEvent {
  id: string;
  tagId: string;
  readerId: number;
  playerId?: string;
  timestamp: string;
}

export type PlayerSegmentId = 0 | 1 | 2 | 3 | 4 | 5;
export type TableSegmentId = 6;
export type SegmentId = PlayerSegmentId | TableSegmentId;

export interface OledPayload {
  segment: PlayerSegmentId;
  name: string;
  hp: number;
  ac: number;
  message: string;
}

export interface OledPlayerResponse extends OledPayload {
  ok: boolean;
  valid: boolean;
}

export interface SegmentConfig {
  id: SegmentId;
  start: number;
  length: number;
  is_table: boolean;
}

export interface SegmentConfigResponse {
  ok: boolean;
  led_count: number;
  segments: SegmentConfig[];
}

export interface SegmentState {
  id: SegmentId;
  effect: EffectId;
  rgb: [number, number, number];
  brightness: number;
  speed: number;
  background?: number;
}

export interface SegmentStateResponse {
  ok: boolean;
  segments: SegmentState[];
}

export interface FocusState {
  ok?: boolean;
  enabled: boolean;
  active_segment?: PlayerSegmentId;
  dim_others: boolean;
  dim_brightness: number;
  preserve_table: boolean;
}

export interface FocusCommand {
  active_segment: PlayerSegmentId;
  effect?: EffectId;
  rgb?: [number, number, number];
  brightness?: number;
  speed?: number;
  dim_others?: boolean;
  dim_brightness?: number;
  preserve_table?: boolean;
}

export interface DeviceStatus {
  connection: ConnectionStatus;
  hostname: string;
  ip: string;
  ssid?: string;
  wifiStatus?: string;
  restPort: number;
  wsPort: number;
  firmware: string;
  temperatureC: number;
  fanSpeed: number;
  uptimeSeconds: number;
  lastSeen?: string;
}

export interface FoundrySettings {
  enabled: boolean;
  endpoint: string;
  secret: string;
  connection: ConnectionStatus;
  clientConnected: boolean;
  lastEvent?: string;
  activeActorName?: string;
  combatActive: boolean;
  turnButtonDebounceMs: number;
  mappings: FoundryMapping[];
}

export interface FoundryMapping {
  event: "combat.started" | "combat.turnChanged" | "combat.ended";
  action: string;
  enabled: boolean;
}

export interface FoundryWorld {
  id: string;
  title: string;
}

export interface FoundryUser {
  id: string;
  name: string;
}

export interface FoundryEventMessage {
  type: "event";
  event: "combat.started" | "combat.turnChanged" | "combat.ended" | string;
  timestamp: string;
  world: FoundryWorld;
  user: FoundryUser;
  payload: Record<string, unknown>;
}

export interface AppSettings {
  hostname: string;
  restPort: number;
  wsPort: number;
  reconnect: boolean;
  brightnessLimit: number;
  fanAuto: boolean;
  fanTargetTemperature: number;
  segmentMapping: Record<ZoneId, string>;
}

export interface AppLog {
  id: string;
  level: "info" | "warn" | "error";
  source: "rest" | "websocket" | "rfid" | "oled" | "foundry" | "system";
  message: string;
  timestamp: string;
}

export interface ScenePreset {
  id: PresetId;
  name: string;
  description: string;
  color: string;
  effect: EffectId;
  brightness: number;
}

export interface TableStatusResponse {
  device_name: string;
  hostname: string;
  ssid: string;
  wifi_status: string;
  ip: string;
  chip_temperature_c: number;
}

export interface TableLedResponse {
  effect: EffectId;
  rgb: [number, number, number];
  brightness: number;
  speed: number;
  interval: number;
  background: number;
  transition_active: boolean;
}

export interface LedCommand {
  effect: EffectId;
  rgb: [number, number, number];
  brightness: number;
  duration?: number;
  speed?: number;
  interval?: number;
  background?: number;
}
