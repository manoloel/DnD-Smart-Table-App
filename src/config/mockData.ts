import {
  AppSettings,
  DeviceStatus,
  FoundrySettings,
  LightingZone,
  PlayerProfile,
  RfidEvent,
  ZoneId,
} from "../types";

const zoneIds: ZoneId[] = [
  "ambient",
  "player-1",
  "player-2",
  "player-3",
  "player-4",
  "player-5",
  "player-6",
];

export const initialZones: LightingZone[] = zoneIds.map((id, index) => ({
  id,
  label: id === "ambient" ? "Ambient Table" : `Seat ${index}`,
  color: id === "ambient" ? "#8fb7ff" : ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#c084fc"][index - 1],
  brightness: id === "ambient" ? 38 : 56,
  effect: "static",
  online: true,
}));

export const initialPlayers: PlayerProfile[] = Array.from({ length: 6 }, (_, index) => ({
  id: `player-${index + 1}`,
  name: ["Astra", "Borin", "Cyra", "Dain", "Elowen", "Forge"][index],
  characterName: ["Nyx", "Thorn", "Mira", "Kael", "Liora", "Brakka"][index],
  role: ["Wizard", "Fighter", "Rogue", "Paladin", "Cleric", "Artificer"][index],
  armorClass: [15, 18, 13, 16, 14, 19][index],
  initiative: [14, 8, 19, 11, 10, 6][index],
  color: ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#c084fc"][index],
  seat: index + 1,
  rfidTag: `TAG-0${index + 1}A${index + 7}`,
  hp: [31, 44, 27, 38, 22, 51][index],
  status: index === 0 ? "Active" : "Ready",
  active: index === 0,
}));

export const initialDeviceStatus: DeviceStatus = {
  connection: "offline",
  hostname: "192.168.0.192",
  ip: "192.168.0.192",
  ssid: "Manolo_2",
  wifiStatus: "connected",
  restPort: 80,
  wsPort: 81,
  firmware: "table-controller",
  temperatureC: 38.4,
  fanSpeed: 42,
  uptimeSeconds: 3680,
  lastSeen: new Date().toISOString(),
};

export const initialSettings: AppSettings = {
  hostname: "192.168.0.192",
  restPort: 80,
  wsPort: 81,
  reconnect: true,
  brightnessLimit: 85,
  fanAuto: true,
  fanTargetTemperature: 45,
  segmentMapping: {
    ambient: "LED 000-089",
    "player-1": "LED 090-119",
    "player-2": "LED 120-149",
    "player-3": "LED 150-179",
    "player-4": "LED 180-209",
    "player-5": "LED 210-239",
    "player-6": "LED 240-269",
  },
};

export const initialFoundry: FoundrySettings = {
  enabled: false,
  endpoint: "ws://localhost:30000/foundry",
  secret: "",
  connection: "offline",
  clientConnected: false,
  combatActive: false,
  turnButtonDebounceMs: 7000,
  mappings: [
    { event: "combat.started", action: "Highlight active combatant", enabled: true },
    { event: "combat.turnChanged", action: "Move active seat marker", enabled: true },
    { event: "combat.ended", action: "Clear active marker", enabled: true },
  ],
};

export const initialRfidEvents: RfidEvent[] = [
  {
    id: "rfid-1",
    tagId: "TAG-01A7",
    readerId: 1,
    playerId: "player-1",
    timestamp: new Date(Date.now() - 1000 * 90).toISOString(),
  },
  {
    id: "rfid-2",
    tagId: "TAG-DEMO-99",
    readerId: 4,
    timestamp: new Date(Date.now() - 1000 * 32).toISOString(),
  },
];
