import { DeviceClient } from "./deviceClient";
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
import { segmentIds, tableSegmentId, zoneIdToSegmentId } from "./segments";

const delay = (ms = 120) => new Promise((resolve) => window.setTimeout(resolve, ms));
const ledEffects: EffectId[] = ["static", "pulse", "breathing", "spark", "initiative", "warning", "scan"];

export class MockDeviceClient implements DeviceClient {
  private zones = new Map<ZoneId, LightingZone>();
  private segmentConfig: SegmentConfig[] = segmentIds.map((id) => ({
    id,
    start: id === tableSegmentId ? 180 : id * 30,
    length: id === tableSegmentId ? 60 : 30,
    is_table: id === tableSegmentId,
  }));
  private segmentState = new Map<number, SegmentState>();
  private focus: FocusState = {
    enabled: false,
    dim_others: true,
    dim_brightness: 18,
    preserve_table: true,
  };
  private oled?: OledPayload;

  constructor(initialZones: LightingZone[]) {
    initialZones.forEach((zone) => {
      this.zones.set(zone.id, zone);
      this.segmentState.set(zoneIdToSegmentId(zone.id), {
        id: zoneIdToSegmentId(zone.id),
        effect: zone.effect,
        rgb: [
          Number.parseInt(zone.color.slice(1, 3), 16),
          Number.parseInt(zone.color.slice(3, 5), 16),
          Number.parseInt(zone.color.slice(5, 7), 16),
        ],
        brightness: zone.brightness,
        speed: 1200,
        background: 8,
      });
    });
  }

  async connect() {
    await delay();
  }

  async disconnect() {
    await delay(80);
  }

  async getStatus(): Promise<TableStatusResponse> {
    await delay();
    return {
      device_name: "table",
      hostname: "192.168.0.192",
      ssid: "MockNet",
      wifi_status: "connected",
      ip: "192.168.0.192",
      chip_temperature_c: 37.1,
    };
  }

  async getLed(): Promise<TableLedResponse> {
    await delay();
    const table: SegmentState = this.segmentState.get(tableSegmentId) ?? {
      id: tableSegmentId,
      effect: "static",
      rgb: [0, 0, 0],
      brightness: 0,
      speed: 1200,
      background: 0,
    };
    return {
      rgb: table.rgb,
      brightness: table.brightness,
      effect: table.effect,
      speed: table.speed,
      interval: 160,
      background: table.background ?? 8,
      transition_active: false,
    };
  }

  async getLedEffects(): Promise<EffectId[]> {
    await delay();
    return ledEffects;
  }

  async getSegmentsConfig(): Promise<SegmentConfigResponse> {
    await delay();
    return { ok: true, led_count: 240, segments: this.segmentConfig };
  }

  async updateSegmentsConfig(segments: SegmentConfig[]) {
    await delay();
    this.segmentConfig = segments;
  }

  async getSegmentsState(): Promise<SegmentStateResponse> {
    await delay();
    return { ok: true, segments: Array.from(this.segmentState.values()) };
  }

  async updateSegmentsState(segments: SegmentState[]) {
    await delay();
    segments.forEach((segment) => this.segmentState.set(segment.id, segment));
  }

  async getFocus(): Promise<FocusState> {
    await delay();
    return { ok: true, ...this.focus };
  }

  async setFocus(command: FocusCommand) {
    await delay();
    this.focus = {
      enabled: true,
      active_segment: command.active_segment,
      dim_others: command.dim_others ?? true,
      dim_brightness: command.dim_brightness ?? 18,
      preserve_table: command.preserve_table ?? true,
    };
    const current = this.segmentState.get(command.active_segment);
    if (current) {
      this.segmentState.set(command.active_segment, {
        ...current,
        effect: command.effect ?? current.effect,
        rgb: command.rgb ?? current.rgb,
        brightness: command.brightness ?? current.brightness,
        speed: command.speed ?? current.speed,
      });
    }
  }

  async clearFocus() {
    await delay();
    this.focus = {
      enabled: false,
      dim_others: true,
      dim_brightness: 18,
      preserve_table: true,
    };
  }

  async sendLedCommand(command: LedCommand) {
    await delay();
    segmentIds.forEach((id) =>
      this.segmentState.set(id, {
        id,
        effect: command.effect,
        rgb: command.rgb,
        brightness: command.brightness,
        speed: command.speed ?? 1200,
        background: command.background,
      }),
    );
  }

  async setZone(zone: LightingZone) {
    await delay();
    this.zones.set(zone.id, zone);
    this.segmentState.set(zoneIdToSegmentId(zone.id), {
      id: zoneIdToSegmentId(zone.id),
      effect: zone.effect,
      rgb: [
        Number.parseInt(zone.color.slice(1, 3), 16),
        Number.parseInt(zone.color.slice(3, 5), 16),
        Number.parseInt(zone.color.slice(5, 7), 16),
      ],
      brightness: zone.brightness,
      speed: 1200,
      background: 8,
    });
  }

  async applyPreset(_preset: PresetId) {
    await delay(140);
    const preset = scenePresets.find((item) => item.id === _preset);
    if (!preset) return;
    const rgb: [number, number, number] = [
      Number.parseInt(preset.color.slice(1, 3), 16),
      Number.parseInt(preset.color.slice(3, 5), 16),
      Number.parseInt(preset.color.slice(5, 7), 16),
    ];
    segmentIds.forEach((id) =>
      this.segmentState.set(id, {
        id,
        effect: preset.effect,
        rgb,
        brightness: preset.brightness,
        speed: preset.effect === "warning" ? 500 : 1200,
        background: 8,
      }),
    );
  }

  async highlightSeat(seat: number) {
    await delay(90);
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
    await delay(90);
    await this.clearFocus();
    segmentIds.forEach((id) =>
      this.segmentState.set(id, {
        id,
        effect: "static",
        rgb: [0, 0, 0],
        brightness: 0,
        speed: 1200,
        background: 0,
      }),
    );
  }

  async getOled(): Promise<OledPlayerResponse> {
    await delay(80);
    return this.oled
      ? { ok: true, valid: true, ...this.oled }
      : {
          ok: true,
          valid: false,
          segment: 0,
          name: "",
          hp: 0,
          ac: 0,
          message: "",
        };
  }

  async sendOled(payload: OledPayload) {
    await delay(120);
    this.oled = payload;
  }

  async clearOled() {
    await delay(120);
    this.oled = undefined;
  }

  async requestRfidTag() {
    await delay(160);
    return `TAG-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  async bindRfid(_playerId: string, _tagId: string) {
    await delay(120);
  }

  async readZone(id: ZoneId) {
    await delay(60);
    return this.zones.get(id);
  }
}
