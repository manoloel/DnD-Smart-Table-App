import { invoke } from "@tauri-apps/api/core";
import { scenePresets } from "../../config/presets";
import {
  EffectId,
  FocusCommand,
  FocusState,
  LedCommand,
  LightingZone,
  OledPlayerResponse,
  OledPayload,
  PresetId,
  SegmentConfig,
  SegmentConfigResponse,
  SegmentState,
  SegmentStateResponse,
  TableLedResponse,
  TableStatusResponse,
  ZoneId,
} from "../../types";
import { DeviceClient } from "./deviceClient";
import { segmentIds, tableSegmentId, zoneIdToSegmentId } from "./segments";

const ledEffects: EffectId[] = ["static", "pulse", "breathing", "spark", "initiative", "warning", "scan"];
const requestTimeoutMs = 2000;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export class Esp32DeviceClient implements DeviceClient {
  private url: URL;

  constructor(private baseUrl: string) {
    this.url = new URL(baseUrl);
  }

  async connect() {
    await this.getStatus();
  }

  async disconnect() {
    return Promise.resolve();
  }

  async getStatus(): Promise<TableStatusResponse> {
    return this.getJson<TableStatusResponse>("/api/status");
  }

  async getLed(): Promise<TableLedResponse> {
    const payload = await this.getSegmentsState();
    const table: SegmentState = payload.segments.find((segment) => segment.id === tableSegmentId) ?? {
      id: tableSegmentId,
      effect: "static",
      rgb: [0, 0, 0],
      brightness: 0,
      speed: 1200,
      background: 0,
    };
    return {
      effect: table.effect,
      rgb: table.rgb,
      brightness: table.brightness,
      speed: table.speed,
      interval: 160,
      background: table.background ?? 8,
      transition_active: false,
    };
  }

  async getLedEffects(): Promise<EffectId[]> {
    return ledEffects;
  }

  async getSegmentsConfig(): Promise<SegmentConfigResponse> {
    return this.getJson<SegmentConfigResponse>("/api/segments/config");
  }

  async updateSegmentsConfig(segments: SegmentConfig[]) {
    await this.putJson("/api/segments/config", { segments });
  }

  async getSegmentsState(): Promise<SegmentStateResponse> {
    return this.getJson<SegmentStateResponse>("/api/segments/state");
  }

  async updateSegmentsState(segments: SegmentState[]) {
    await this.putJson("/api/segments/state", { segments });
  }

  async getFocus(): Promise<FocusState> {
    return this.getJson<FocusState>("/api/focus");
  }

  async setFocus(command: FocusCommand) {
    await this.postJson("/api/focus", command);
  }

  async clearFocus() {
    await this.postJson("/api/focus", { clear: true });
  }

  async sendLedCommand(command: LedCommand) {
    await this.updateSegmentsState(
      segmentIds.map((id) => ({
        id,
        effect: command.effect,
        rgb: command.rgb,
        brightness: command.brightness,
        speed: command.speed ?? 1200,
        background: command.background,
      })),
    );
  }

  async setZone(zone: LightingZone) {
    await this.updateSegmentsState([{
      id: zoneIdToSegmentId(zone.id),
      effect: zone.effect,
      rgb: hexToRgb(zone.color),
      brightness: zone.brightness,
      speed: 1200,
      background: 8,
    }]);
  }

  async applyPreset(preset: PresetId) {
    const config = scenePresets.find((item) => item.id === preset);
    if (!config) return;
    const rgb = hexToRgb(config.color);
    await this.clearFocus();
    await this.updateSegmentsState(
      segmentIds.map((id) => ({
        id,
        effect: config.effect,
        rgb,
        brightness: config.brightness,
        speed: config.effect === "warning" ? 500 : 1200,
        background: 8,
      })),
    );
  }

  async highlightSeat(seat: number) {
    await this.setFocus({
      active_segment: Math.max(0, Math.min(5, seat - 1)) as 0 | 1 | 2 | 3 | 4 | 5,
      effect: "initiative",
      rgb: [255, 160, 0],
      brightness: 85,
      speed: 900,
      dim_others: true,
      dim_brightness: 18,
      preserve_table: true,
    });
  }

  async allLightsOff() {
    await this.clearFocus();
    await this.updateSegmentsState(
      segmentIds.map((id) => ({
        id,
        effect: "static",
        rgb: [0, 0, 0],
        brightness: 0,
        speed: 1200,
        background: 0,
      })),
    );
  }

  async getOled(): Promise<OledPlayerResponse> {
    return this.getJson<OledPlayerResponse>("/api/player");
  }

  async sendOled(payload: OledPayload) {
    await this.postJson("/api/player", payload);
  }

  async clearOled() {
    await this.postJson("/api/player", { clear: true });
  }

  async requestRfidTag() {
    return Promise.resolve(`TAG-${Math.random().toString(16).slice(2, 8).toUpperCase()}`);
  }

  async bindRfid(_playerId: string, _tagId: string) {
    return Promise.resolve();
  }

  async readZone(_id: ZoneId) {
    const led = await this.getLed();
    return {
      id: "ambient" as ZoneId,
      label: "Ambient Table",
      color: `#${led.rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
      brightness: led.brightness,
      effect: led.effect,
      online: true,
    };
  }

  private async getJson<T>(path: string): Promise<T> {
    if (isTauriRuntime()) {
      const body = await invoke<string>("table_http_get", {
        hostname: this.hostname,
        port: this.port,
        path,
      });
      return JSON.parse(body) as T;
    }

    const response = await fetchWithTimeout(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`GET ${path} failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private async putJson(path: string, payload: unknown) {
    await this.writeJson("PUT", path, payload);
  }

  private async postJson(path: string, payload: unknown) {
    await this.writeJson("POST", path, payload);
  }

  private async writeJson(method: "POST" | "PUT", path: string, payload: unknown) {
    const body = JSON.stringify(payload);
    if (isTauriRuntime()) {
      await invoke<string>(method === "POST" ? "table_http_post_json" : "table_http_put_json", {
        hostname: this.hostname,
        port: this.port,
        path,
        body,
      });
      return;
    }

    const response = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      throw new Error(`${method} ${path} failed: ${response.status}`);
    }
  }

  private get hostname() {
    return this.url.hostname;
  }

  private get port() {
    return Number(this.url.port || "80");
  }
}

export function createEsp32Client(hostname: string, port: number) {
  const baseUrl = port === 80 ? `http://${hostname}` : `http://${hostname}:${port}`;
  return new Esp32DeviceClient(baseUrl);
}
