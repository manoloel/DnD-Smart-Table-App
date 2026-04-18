import {
  LightingZone,
  LedCommand,
  EffectId,
  FocusCommand,
  FocusState,
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

export interface DeviceClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<TableStatusResponse>;
  getLed(): Promise<TableLedResponse>;
  getLedEffects(): Promise<EffectId[]>;
  getSegmentsConfig(): Promise<SegmentConfigResponse>;
  updateSegmentsConfig(segments: SegmentConfig[]): Promise<void>;
  getSegmentsState(): Promise<SegmentStateResponse>;
  updateSegmentsState(segments: SegmentState[]): Promise<void>;
  getFocus(): Promise<FocusState>;
  setFocus(command: FocusCommand): Promise<void>;
  clearFocus(): Promise<void>;
  sendLedCommand(command: LedCommand): Promise<void>;
  setZone(zone: LightingZone): Promise<void>;
  applyPreset(preset: PresetId): Promise<void>;
  highlightSeat(seat: number): Promise<void>;
  allLightsOff(): Promise<void>;
  getOled(): Promise<OledPlayerResponse>;
  sendOled(payload: OledPayload): Promise<void>;
  clearOled(): Promise<void>;
  requestRfidTag(): Promise<string>;
  bindRfid(playerId: string, tagId: string): Promise<void>;
  readZone(id: ZoneId): Promise<LightingZone | undefined>;
}
