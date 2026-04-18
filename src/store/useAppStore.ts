import { create } from "zustand";
import {
  AppLog,
  AppSettings,
  DeviceStatus,
  FoundryEventMessage,
  FoundrySettings,
  EffectId,
  Language,
  LedCommand,
  LightingZone,
  OledPayload,
  PlayerProfile,
  PresetId,
  RfidEvent,
  TabId,
  TableLedResponse,
  ZoneId,
} from "../types";
import { configureFoundryBridge, sendFoundryNextTurnCommand } from "../lib/foundry/foundryBridge";
import {
  initialDeviceStatus,
  initialFoundry,
  initialPlayers,
  initialSettings,
  initialZones,
} from "../config/mockData";
import { scenePresets } from "../config/presets";
import { MockDeviceClient } from "../lib/api/mockDeviceClient";
import { createEsp32Client } from "../lib/api/esp32DeviceClient";
import { DeviceClient } from "../lib/api/deviceClient";
import { seatToSegmentId } from "../lib/api/segments";
import { TableSocketMessage } from "../lib/ws/tableSocket";
import { loadFoundrySettingsFromStorage, saveFoundrySettingsToStorage } from "../lib/storage/foundrySettings";
import {
  clearSeatedPlayersFromDatabase,
  loadPlayersFromDatabase,
  loadSeatedPlayersFromDatabase,
  savePlayersToDatabase,
  saveSeatedPlayersToDatabase,
} from "../lib/storage/playerDatabase";

interface AppState {
  language: Language;
  activeTab: TabId;
  activeScene: PresetId;
  device: DeviceStatus;
  zones: LightingZone[];
  playerDatabase: PlayerProfile[];
  players: PlayerProfile[];
  rfidEvents: RfidEvent[];
  settings: AppSettings;
  foundry: FoundrySettings;
  logs: AppLog[];
  demoMode: boolean;
  selectedPlayerId: string;
  ledState?: TableLedResponse;
  availableLedEffects: EffectId[];
  setLanguage: (language: Language) => void;
  setActiveTab: (tab: TabId) => void;
  connectTable: () => Promise<void>;
  disconnectTable: () => Promise<void>;
  updateZone: (zoneId: ZoneId, patch: Partial<LightingZone>) => Promise<void>;
  refreshLedState: () => Promise<void>;
  runLedTest: (command: LedCommand) => Promise<void>;
  applyPreset: (preset: PresetId) => Promise<void>;
  highlightPlayer: (playerId: string) => Promise<void>;
  clearActivePlayer: () => Promise<void>;
  highlightNextPlayer: () => Promise<void>;
  allLightsOff: () => Promise<void>;
  resetTableState: () => void;
  toggleDemoMode: () => void;
  addManualPlayer: (seat: number) => void;
  updatePlayer: (playerId: string, patch: Partial<PlayerProfile>) => void;
  clearPlayerSeat: (seat: number) => void;
  testHighlight: (playerId: string) => Promise<void>;
  sendOled: (payload: OledPayload) => Promise<void>;
  handleRfidScan: (tagId: string, readerId: number) => Promise<void>;
  addRfidScan: (readerId?: number, tagId?: string) => void;
  bindRfidToPlayer: (playerId: string) => Promise<void>;
  assignLatestTag: (playerId: string) => Promise<void>;
  removePlayerTag: (playerId: string) => void;
  setSelectedPlayer: (playerId: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateFoundry: (patch: Partial<FoundrySettings>) => void;
  configureFoundryIntegration: () => Promise<void>;
  handleFoundryEvent: (event: FoundryEventMessage) => Promise<void>;
  handleFoundrySocketStatus: (event: {
    type: string;
    worldTitle?: string;
    userName?: string;
    command?: string;
    ok?: boolean;
    payload?: unknown;
    error?: { code: string; message: string } | null;
  }) => void;
  handleTableSocketMessage: (message: TableSocketMessage) => Promise<void>;
  handleTableTurnButton: (seat: number) => Promise<void>;
  mockTableTurnButton: (seat: number) => Promise<void>;
  pushLog: (log: Omit<AppLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clampBrightness = (brightness: number, limit: number) => Math.max(0, Math.min(brightness, limit));
const lastTurnButtonAtBySeat = new Map<number, number>();

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stringFromPath(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

function getFoundryActorName(event: FoundryEventMessage) {
  if (event.event === "combat.started") {
    return stringFromPath(event.payload, ["activeCombatant", "actorName"]);
  }
  if (event.event === "combat.turnChanged") {
    return stringFromPath(event.payload, ["current", "combatant", "actorName"]);
  }
  if (event.event === "combat.ended") {
    return stringFromPath(event.payload, ["finalState", "activeCombatant", "actorName"]);
  }
  return undefined;
}

function getDeviceClient(): DeviceClient {
  const { settings } = useAppStore.getState();
  return createEsp32Client(settings.hostname, settings.restPort);
}

function getActiveClient() {
  if (canUseRealTable()) {
    return getDeviceClient();
  }

  if (canUseDemoMode()) {
    return fallbackMockClient;
  }

  throw createDemoDisabledError();
}

function createPlayerOledPayload(player: PlayerProfile, message = "Your turn!"): OledPayload {
  return {
    segment: seatToSegmentId(player.seat),
    name: player.characterName || player.name || "Player",
    hp: player.hp,
    ac: player.armorClass,
    message,
  };
}

function createOpenSeatOledPayload(seat: number): OledPayload {
  return {
    segment: seatToSegmentId(seat),
    name: `Seat ${seat}`,
    hp: 0,
    ac: 0,
    message: "Open seat",
  };
}

function canUseRealTable() {
  const connection = useAppStore.getState().device.connection;
  return connection === "connected";
}

function canUseDemoMode() {
  return useAppStore.getState().demoMode;
}

function createDemoDisabledError() {
  return new Error("Table is offline. Enable demo mode to use simulated commands.");
}

const fallbackMockClient = new MockDeviceClient(initialZones);
const storedPlayerDatabase = loadPlayersFromDatabase(initialPlayers);
const storedSeatedPlayers = loadSeatedPlayersFromDatabase(storedPlayerDatabase);
const storedFoundry = loadFoundrySettingsFromStorage(initialFoundry);

function upsertPlayerRecord(records: PlayerProfile[], player: PlayerProfile) {
  if (!player.rfidTag) {
    const nextRecords = records.filter((record) => record.id !== player.id);
    savePlayersToDatabase(nextRecords);
    return nextRecords;
  }

  const nextRecords = records.some((record) => record.id === player.id)
    ? records.map((record) => (record.id === player.id ? { ...record, ...player } : record))
    : [...records, player];
  savePlayersToDatabase(nextRecords);
  return nextRecords;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en",
  activeTab: "dashboard",
  activeScene: "neutral",
  device: initialDeviceStatus,
  zones: initialZones,
  playerDatabase: storedPlayerDatabase,
  players: storedSeatedPlayers,
  rfidEvents: [],
  settings: initialSettings,
  foundry: storedFoundry,
  demoMode: false,
  selectedPlayerId: "",
  ledState: undefined,
  availableLedEffects: ["static", "pulse", "breathing", "spark", "initiative", "warning", "scan"],
  logs: [
    {
      id: "log-boot",
      level: "info",
      source: "system",
      message: "Operator console booted",
      timestamp: now(),
    },
  ],
  setLanguage: (language) => set({ language }),
  setActiveTab: (activeTab) => set({ activeTab }),
  connectTable: async () => {
    set((state) => ({ device: { ...state.device, connection: "connecting" } }));
    try {
      const client = getDeviceClient();
      const status = await client.getStatus();
      const [led, effects] = await Promise.all([client.getLed(), client.getLedEffects()]);
      set((state) => ({
        device: {
          ...state.device,
          connection: "connected",
          hostname: status.hostname,
          ip: status.ip,
          ssid: status.ssid,
          wifiStatus: status.wifi_status,
          temperatureC: status.chip_temperature_c,
          lastSeen: now(),
        },
        ledState: led,
        availableLedEffects: effects,
        zones: state.zones.map((zone) =>
          zone.id === "ambient"
            ? {
                ...zone,
                color: `#${led.rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
                brightness: led.brightness,
                effect: led.effect,
              }
            : zone,
        ),
      }));
      get().pushLog({ level: "info", source: "rest", message: `Connected to ${status.hostname} at ${status.ip}` });
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded", lastSeen: now() } }));
      get().pushLog({ level: "error", source: "rest", message: `Connection failed: ${String(error)}` });
    }
  },
  disconnectTable: async () => {
    if (canUseRealTable()) {
      await getDeviceClient().disconnect();
    } else if (canUseDemoMode()) {
      await fallbackMockClient.disconnect();
    }
    set((state) => ({ device: { ...state.device, connection: "offline" } }));
    get().pushLog({ level: "warn", source: "system", message: "Table connection set to offline" });
  },
  updateZone: async (zoneId, patch) => {
    const zone = get().zones.find((item) => item.id === zoneId);
    if (!zone) return;
    const limit = get().settings.brightnessLimit;
    const nextZone = { ...zone, ...patch, brightness: clampBrightness(patch.brightness ?? zone.brightness, limit) };
    try {
      if (canUseRealTable()) {
        await getDeviceClient().setZone(nextZone);
      } else if (canUseDemoMode()) {
        await fallbackMockClient.setZone(nextZone);
      } else {
        throw createDemoDisabledError();
      }
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `LED command failed: ${String(error)}` });
      return;
    }
    set((state) => ({
      zones: state.zones.map((item) => (item.id === zoneId ? nextZone : item)),
    }));
    get().pushLog({
      level: "info",
      source: "rest",
      message: `Updated ${nextZone.label}`,
    });
  },
  refreshLedState: async () => {
    try {
      let led: TableLedResponse;
      if (canUseRealTable()) {
        led = await getDeviceClient().getLed();
      } else if (canUseDemoMode()) {
        led = await fallbackMockClient.getLed();
      } else {
        throw createDemoDisabledError();
      }
      set((state) => ({
        ledState: led,
        zones: state.zones.map((zone) =>
          zone.id === "ambient"
            ? {
                ...zone,
                color: `#${led.rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
                brightness: led.brightness,
                effect: led.effect,
              }
            : zone,
        ),
      }));
      get().pushLog({ level: "info", source: "rest", message: `Read LED state: ${led.effect}, ${led.brightness}%` });
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `LED read failed: ${String(error)}` });
    }
  },
  runLedTest: async (command) => {
    const limitedCommand = {
      ...command,
      brightness: clampBrightness(command.brightness, get().settings.brightnessLimit),
    };
    try {
      if (canUseRealTable()) {
        await getDeviceClient().sendLedCommand(limitedCommand);
      } else if (canUseDemoMode()) {
        await fallbackMockClient.sendLedCommand(limitedCommand);
      } else {
        throw createDemoDisabledError();
      }
      const led = canUseRealTable() ? await getDeviceClient().getLed() : await fallbackMockClient.getLed();
      set((state) => ({
        ledState: led,
        zones: state.zones.map((zone) =>
          zone.id === "ambient"
            ? {
                ...zone,
                color: `#${led.rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
                brightness: led.brightness,
                effect: led.effect,
              }
            : zone,
        ),
      }));
      get().pushLog({ level: "info", source: "rest", message: `LED test: ${limitedCommand.effect}, ${limitedCommand.brightness}%` });
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `LED test failed: ${String(error)}` });
    }
  },
  applyPreset: async (preset) => {
    const presetConfig = scenePresets.find((item) => item.id === preset);
    if (!presetConfig) return;
    const limitedBrightness = clampBrightness(presetConfig.brightness, get().settings.brightnessLimit);

    try {
      if (canUseRealTable()) {
        await getDeviceClient().applyPreset(preset);
      } else if (canUseDemoMode()) {
        await fallbackMockClient.applyPreset(preset);
      } else {
        throw createDemoDisabledError();
      }
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `Preset command failed: ${String(error)}` });
      return;
    }
    set((state) => ({
      activeScene: preset,
      zones: state.zones.map((zone) => ({
        ...zone,
        color: presetConfig.color,
        brightness: limitedBrightness,
        effect: presetConfig.effect,
      })),
    }));
    get().pushLog({ level: "info", source: "rest", message: `Applied preset ${presetConfig.name}` });
  },
  highlightPlayer: async (playerId) => {
    const players = get().players;
    const player = players.find((item) => item.id === playerId);
    if (!player) return;
    const nextPlayers = players.map((player) => ({
      ...player,
      active: player.id === playerId,
      status: player.id === playerId ? "Active" : "Ready",
    }));
    set({
      selectedPlayerId: player.id,
      players: nextPlayers,
    });
    saveSeatedPlayersToDatabase(nextPlayers);

    try {
      const command: LedCommand = {
        effect: "initiative",
        rgb: [125, 211, 252],
        brightness: clampBrightness(80, get().settings.brightnessLimit),
        speed: 750,
        duration: 750,
      };
      if (canUseRealTable()) {
        await getDeviceClient().setFocus({
          active_segment: seatToSegmentId(player.seat),
          effect: command.effect,
          rgb: command.rgb,
          brightness: command.brightness,
          speed: command.speed,
          dim_others: true,
          dim_brightness: 18,
          preserve_table: true,
        });
      } else if (canUseDemoMode()) {
        await fallbackMockClient.highlightSeat(player.seat);
      } else {
        throw createDemoDisabledError();
      }
      await getActiveClient().sendOled(createPlayerOledPayload(player));
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `Highlight command failed: ${String(error)}` });
      return;
    }
    get().pushLog({ level: "info", source: "rest", message: `Highlighted ${player.name}` });
  },
  clearActivePlayer: async () => {
    const nextPlayers = get().players.map((player) => ({
      ...player,
      active: false,
      status: player.status === "Active" ? "Ready" : player.status,
    }));
    set({ players: nextPlayers });
    saveSeatedPlayersToDatabase(nextPlayers);
    try {
      await getActiveClient().clearFocus();
      await getActiveClient().clearOled();
    } catch (error) {
      get().pushLog({ level: "error", source: "rest", message: `Clear active player failed: ${String(error)}` });
    }
    get().pushLog({ level: "info", source: "system", message: "Cleared active player" });
  },
  highlightNextPlayer: async () => {
    const players = get().players;
    if (players.length === 0) return;
    const currentIndex = players.findIndex((player) => player.active);
    const nextPlayer = players[(currentIndex + 1) % players.length];
    await get().highlightPlayer(nextPlayer.id);
  },
  allLightsOff: async () => {
    try {
      if (canUseRealTable()) {
        await getDeviceClient().allLightsOff();
      } else if (canUseDemoMode()) {
        await fallbackMockClient.allLightsOff();
      } else {
        throw createDemoDisabledError();
      }
    } catch (error) {
      set((state) => ({ device: { ...state.device, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "rest", message: `Lights off failed: ${String(error)}` });
      return;
    }
    set((state) => ({
      zones: state.zones.map((zone) => ({ ...zone, brightness: 0, effect: "static" })),
    }));
    get().pushLog({ level: "warn", source: "rest", message: "All lights off" });
  },
  resetTableState: () => {
    clearSeatedPlayersFromDatabase();
    lastTurnButtonAtBySeat.clear();
    set((state) => ({
      activeScene: "neutral",
      zones: initialZones,
      players: [],
      rfidEvents: [],
      selectedPlayerId: "",
      foundry: {
        ...state.foundry,
        activeActorName: undefined,
        combatActive: false,
        lastEvent: undefined,
      },
    }));
    get().pushLog({ level: "warn", source: "system", message: "Reset table to a clean state" });
  },
  toggleDemoMode: () => {
    const demoMode = !get().demoMode;
    set({ demoMode });
    get().pushLog({ level: "info", source: "system", message: `Demo mode ${demoMode ? "enabled" : "disabled"}` });
  },
  addManualPlayer: (seat) => {
    const colors = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#c084fc"];
    const player: PlayerProfile = {
      id: makeId("manual-player"),
      name: "Player",
      characterName: "",
      role: "Adventurer",
      armorClass: 10,
      initiative: 0,
      color: colors[(seat - 1) % colors.length],
      seat,
      hp: 0,
      status: "Ready",
      active: false,
    };
    const nextPlayers = [...get().players.filter((item) => item.seat !== seat), player].sort((left, right) => left.seat - right.seat);
    set({ players: nextPlayers, selectedPlayerId: player.id });
    saveSeatedPlayersToDatabase(nextPlayers);
    get().pushLog({ level: "info", source: "system", message: `Added manual player at seat ${seat}` });
  },
  updatePlayer: (playerId, patch) => {
    const currentPlayer = get().players.find((player) => player.id === playerId);
    const currentRecord = get().playerDatabase.find((player) => player.id === playerId);
    const nextPlayer = currentPlayer ? { ...currentPlayer, ...patch } : undefined;
    const nextPlayers = get().players.map((player) => (player.id === playerId ? { ...player, ...patch } : player));
    const nextDatabase =
      nextPlayer || currentRecord ? upsertPlayerRecord(get().playerDatabase, { ...(currentRecord ?? currentPlayer), ...patch } as PlayerProfile) : get().playerDatabase;
    set({ players: nextPlayers, playerDatabase: nextDatabase });
    saveSeatedPlayersToDatabase(nextPlayers);
    if (nextPlayer?.active && patch.seat !== undefined) {
      void get().highlightPlayer(nextPlayer.id);
    }
  },
  clearPlayerSeat: (seat) => {
    const removedPlayer = get().players.find((player) => player.seat === seat);
    const nextPlayers = get().players.filter((player) => player.seat !== seat);
    set({
      players: nextPlayers,
      selectedPlayerId: removedPlayer?.id === get().selectedPlayerId ? "" : get().selectedPlayerId,
    });
    saveSeatedPlayersToDatabase(nextPlayers);
    get().pushLog({ level: "info", source: "system", message: `Cleared seat ${seat}` });
    if (canUseRealTable() || canUseDemoMode()) {
      void getActiveClient().sendOled(createOpenSeatOledPayload(seat));
    }
  },
  testHighlight: async (playerId) => {
    const player = get().players.find((item) => item.id === playerId);
    if (!player) return;
    try {
      if (canUseRealTable()) {
        await getDeviceClient().highlightSeat(player.seat);
      } else if (canUseDemoMode()) {
        await fallbackMockClient.highlightSeat(player.seat);
      } else {
        throw createDemoDisabledError();
      }
    } catch (error) {
      get().pushLog({ level: "error", source: "rest", message: `Highlight test failed: ${String(error)}` });
      return;
    }
    get().pushLog({ level: "info", source: "rest", message: `Test highlight for ${player.name}` });
  },
  sendOled: async (payload) => {
    try {
      if (canUseRealTable()) {
        await getDeviceClient().sendOled(payload);
      } else if (canUseDemoMode()) {
        await fallbackMockClient.sendOled(payload);
      } else {
        throw createDemoDisabledError();
      }
    } catch (error) {
      get().pushLog({ level: "error", source: "oled", message: `OLED command failed: ${String(error)}` });
      return;
    }
    get().pushLog({ level: "info", source: "oled", message: `OLED segment ${payload.segment}: ${payload.name}` });
  },
  handleRfidScan: async (tagId, readerId) => {
    const record = get().playerDatabase.find((item) => item.rfidTag === tagId);
    const player = record ? { ...record, seat: readerId, active: false, status: record.status === "Active" ? "Ready" : record.status } : undefined;
    const event: RfidEvent = {
      id: makeId("rfid"),
      tagId,
      readerId,
      playerId: record?.id,
      timestamp: now(),
    };

    let nextPlayers: PlayerProfile[] = [];
    set((state) => {
      nextPlayers = player
        ? [
            ...state.players.filter((item) => item.id !== player.id && item.seat !== readerId),
            player,
          ].sort((left, right) => left.seat - right.seat)
        : state.players;

      return {
      rfidEvents: [event, ...state.rfidEvents].slice(0, 30),
      players: nextPlayers,
      selectedPlayerId: player?.id ?? state.selectedPlayerId,
      };
    });
    saveSeatedPlayersToDatabase(nextPlayers);
    if (!player) {
      get().pushLog({ level: "warn", source: "rfid", message: `Reader ${readerId} scanned unbound ${tagId}` });
      return;
    }

    await get().highlightPlayer(player.id);
    await get().sendOled(createPlayerOledPayload(player, ""));
    get().pushLog({ level: "info", source: "rfid", message: `Reader ${readerId} matched ${player.name}` });
  },
  addRfidScan: (readerId = Math.ceil(Math.random() * 6), tagId) => {
    if (!canUseDemoMode()) {
      get().pushLog({ level: "warn", source: "rfid", message: "RFID simulation requires demo mode" });
      return;
    }

    const database = get().playerDatabase.filter((player) => player.rfidTag);
    const randomPlayer = database[Math.floor(Math.random() * database.length)];
    const nextTagId = tagId ?? randomPlayer?.rfidTag ?? `TAG-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    void get().handleRfidScan(nextTagId, readerId);
  },
  bindRfidToPlayer: async (playerId) => {
    const player = get().players.find((item) => item.id === playerId);
    if (!player) return;

    let tagId: string;
    try {
      const client = canUseRealTable() ? getDeviceClient() : canUseDemoMode() ? fallbackMockClient : undefined;
      if (!client) {
        throw createDemoDisabledError();
      }
      tagId = await client.requestRfidTag();
      await client.bindRfid(playerId, tagId);
    } catch (error) {
      get().pushLog({ level: "error", source: "rfid", message: `RFID bind failed: ${String(error)}` });
      return;
    }

    const nextPlayer = { ...player, rfidTag: tagId };
    const nextPlayers = get().players.map((item) => (item.id === playerId ? nextPlayer : item));
    const nextDatabase = upsertPlayerRecord(get().playerDatabase, nextPlayer);
    const event: RfidEvent = {
      id: makeId("rfid"),
      tagId,
      readerId: player.seat,
      playerId,
      timestamp: now(),
    };

    set((state) => ({
      players: nextPlayers,
      playerDatabase: nextDatabase,
      rfidEvents: [event, ...state.rfidEvents].slice(0, 30),
    }));
    saveSeatedPlayersToDatabase(nextPlayers);
    get().pushLog({ level: "info", source: "rfid", message: `Bound ${tagId} to ${player.name}` });
  },
  assignLatestTag: async (playerId) => {
    const latest = get().rfidEvents[0];
    const player = get().players.find((item) => item.id === playerId);
    if (!latest || !player) return;
    if (!canUseDemoMode()) {
      get().pushLog({ level: "warn", source: "rfid", message: "Assigning simulated scans requires demo mode" });
      return;
    }
    await fallbackMockClient.bindRfid(playerId, latest.tagId);
    const nextPlayer = { ...player, rfidTag: latest.tagId };
    const nextPlayers = get().players.map((item) => (item.id === playerId ? nextPlayer : item));
    const nextDatabase = upsertPlayerRecord(get().playerDatabase, nextPlayer);
    set((state) => ({
      players: nextPlayers,
      playerDatabase: nextDatabase,
      rfidEvents: state.rfidEvents.map((event) => (event.id === latest.id ? { ...event, playerId } : event)),
    }));
    saveSeatedPlayersToDatabase(nextPlayers);
    get().pushLog({ level: "info", source: "rfid", message: `Bound ${latest.tagId} to ${player.name}` });
  },
  removePlayerTag: (playerId) => {
    const player = get().players.find((item) => item.id === playerId);
    const nextPlayers = get().players.map((item) => (item.id === playerId ? { ...item, rfidTag: undefined } : item));
    const nextDatabase = get().playerDatabase.filter((item) => item.id !== playerId);
    savePlayersToDatabase(nextDatabase);
    set({ players: nextPlayers, playerDatabase: nextDatabase });
    saveSeatedPlayersToDatabase(nextPlayers);
    get().pushLog({ level: "warn", source: "rfid", message: `Removed RFID tag from ${player?.name ?? "player"}` });
  },
  setSelectedPlayer: (selectedPlayerId) => set({ selectedPlayerId }),
  updateSettings: (patch) => {
    set((state) => ({ settings: { ...state.settings, ...patch } }));
    get().pushLog({ level: "info", source: "system", message: "Updated table settings" });
  },
  updateFoundry: (patch) => {
    const foundry = { ...get().foundry, ...patch };
    saveFoundrySettingsToStorage(foundry);
    set({ foundry });
    get().pushLog({ level: "info", source: "foundry", message: "Updated Foundry integration settings" });
    void get().configureFoundryIntegration();
  },
  configureFoundryIntegration: async () => {
    const foundry = get().foundry;
    try {
      const snapshot = await configureFoundryBridge(foundry.enabled, foundry.secret);
      set((state) => ({
        foundry: {
          ...state.foundry,
          endpoint: snapshot.endpoint,
          connection: snapshot.client_connected ? "connected" : foundry.enabled ? "connecting" : "offline",
          clientConnected: snapshot.client_connected,
        },
      }));
      get().pushLog({
        level: "info",
        source: "foundry",
        message: foundry.enabled ? `Foundry bridge armed at ${snapshot.endpoint}` : "Foundry bridge disabled",
      });
    } catch (error) {
      set((state) => ({ foundry: { ...state.foundry, connection: "degraded" } }));
      get().pushLog({ level: "error", source: "foundry", message: `Foundry bridge configure failed: ${String(error)}` });
    }
  },
  handleFoundryEvent: async (event) => {
    const enabledMapping = get().foundry.mappings.find((mapping) => mapping.event === event.event && mapping.enabled);
    if (!get().foundry.enabled || !enabledMapping) {
      return;
    }

    const actorName = getFoundryActorName(event);
    set((state) => ({
      foundry: {
        ...state.foundry,
        lastEvent: event.event,
        activeActorName: actorName ?? state.foundry.activeActorName,
        combatActive: event.event === "combat.ended" ? false : state.foundry.combatActive || event.event.startsWith("combat."),
      },
    }));

    if (event.event === "combat.ended") {
      await get().clearActivePlayer();
      get().pushLog({ level: "info", source: "foundry", message: "Foundry combat ended; active seat cleared" });
      return;
    }

    if (!actorName) {
      get().pushLog({ level: "warn", source: "foundry", message: `Foundry ${event.event} has no actorName` });
      return;
    }

    const normalizedActor = normalizeName(actorName);
    const player = get().players.find((player) => {
      const names = [player.characterName, player.name].filter(Boolean).map(normalizeName);
      return names.includes(normalizedActor) || names.some((name) => name.includes(normalizedActor) || normalizedActor.includes(name));
    });

    if (!player) {
      await get().clearActivePlayer();
      get().pushLog({ level: "warn", source: "foundry", message: `No seated player matched Foundry actor ${actorName}` });
      return;
    }

    await get().highlightPlayer(player.id);
    get().pushLog({ level: "info", source: "foundry", message: `Foundry actor ${actorName} mapped to seat ${player.seat}` });
  },
  handleFoundrySocketStatus: (event) => {
    if (event.type === "connected") {
      set((state) => ({
        foundry: { ...state.foundry, connection: "connected", clientConnected: true },
      }));
      get().pushLog({ level: "info", source: "foundry", message: `Foundry connected: ${event.worldTitle ?? "world"} / ${event.userName ?? "GM"}` });
      return;
    }
    if (event.type === "disconnected") {
      set((state) => ({
        foundry: { ...state.foundry, connection: state.foundry.enabled ? "connecting" : "offline", clientConnected: false },
      }));
      get().pushLog({ level: "warn", source: "foundry", message: "Foundry WebSocket disconnected" });
      return;
    }
    if (event.type === "pong") {
      get().pushLog({ level: "info", source: "foundry", message: "Foundry pong received" });
      return;
    }
    if (event.type === "result" && event.command) {
      const result = event.ok ? "ok" : event.error?.code ?? "failed";
      get().pushLog({ level: event.ok ? "info" : "error", source: "foundry", message: `Foundry command ${event.command}: ${result}` });
    }
  },
  handleTableSocketMessage: async (message) => {
    if (message.type === "hello") {
      get().pushLog({ level: "info", source: "websocket", message: `ESP32 hello: ${message.payload.message}` });
      return;
    }

    if (message.type === "status") {
      get().pushLog({ level: "info", source: "websocket", message: message.payload });
      return;
    }

    if (message.type === "error") {
      get().pushLog({ level: "error", source: "websocket", message: message.payload });
      return;
    }

    if (message.type === "temperature") {
      set((state) => ({
        device: {
          ...state.device,
          temperatureC: message.payload.temperatureC,
          fanSpeed: message.payload.fanSpeed,
          lastSeen: now(),
        },
      }));
      return;
    }

    if (message.type === "rfid") {
      await get().handleRfidScan(message.payload.tagId, message.payload.readerId);
      return;
    }

    if (message.type === "button_click") {
      const seat = message.payload.segment + 1;
      get().pushLog({
        level: "info",
        source: "websocket",
        message: `Button click from segment ${message.payload.segment} mapped to seat ${seat}`,
      });
      await get().handleTableTurnButton(seat);
    }
  },
  handleTableTurnButton: async (seat) => {
    const foundry = get().foundry;
    const nowMs = Date.now();
    const lastTurnButtonAt = lastTurnButtonAtBySeat.get(seat) ?? 0;
    if (nowMs - lastTurnButtonAt < foundry.turnButtonDebounceMs) {
      get().pushLog({ level: "warn", source: "foundry", message: `Seat ${seat} turn button ignored by debounce` });
      return;
    }

    const player = get().players.find((player) => player.seat === seat);
    const activePlayer = get().players.find((player) => player.active);
    if (!foundry.enabled || foundry.connection !== "connected") {
      get().pushLog({ level: "warn", source: "foundry", message: "Turn button ignored: Foundry is not connected" });
      return;
    }
    if (!player || !activePlayer || player.id !== activePlayer.id) {
      get().pushLog({ level: "warn", source: "foundry", message: `Seat ${seat} is not the active Foundry actor` });
      return;
    }

    try {
      lastTurnButtonAtBySeat.set(seat, nowMs);
      const sent = await sendFoundryNextTurnCommand();
      get().pushLog({ level: "info", source: "foundry", message: `Requested Foundry next turn from seat ${seat} (${sent} client)` });
    } catch (error) {
      get().pushLog({ level: "error", source: "foundry", message: `Foundry next turn failed: ${String(error)}` });
    }
  },
  mockTableTurnButton: async (seat) => {
    if (!canUseDemoMode()) {
      get().pushLog({ level: "warn", source: "websocket", message: "Simulated table buttons require demo mode" });
      return;
    }

    get().pushLog({ level: "info", source: "websocket", message: `Simulated table turn button at seat ${seat}` });
    await get().handleTableTurnButton(seat);
  },
  pushLog: (log) =>
    set((state) => ({
      logs: [{ ...log, id: makeId("log"), timestamp: now() }, ...state.logs].slice(0, 100),
    })),
  clearLogs: () => set({ logs: [] }),
}));
