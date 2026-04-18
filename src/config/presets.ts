import { ScenePreset } from "../types";

export const scenePresets: ScenePreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Clean table light for setup and explanation.",
    color: "#d7e3f5",
    effect: "static",
    brightness: 45,
  },
  {
    id: "battle",
    name: "Battle",
    description: "High contrast red sweep for combat starts.",
    color: "#ef4444",
    effect: "pulse",
    brightness: 70,
  },
  {
    id: "dungeon",
    name: "Dungeon",
    description: "Low green-blue ambience for exploration.",
    color: "#22c55e",
    effect: "breathing",
    brightness: 34,
  },
  {
    id: "magic",
    name: "Magic",
    description: "Arcane cyan spark for spells and reveals.",
    color: "#38bdf8",
    effect: "spark",
    brightness: 68,
  },
  {
    id: "boss",
    name: "Boss Fight",
    description: "Threat lighting with warning pulses.",
    color: "#f97316",
    effect: "warning",
    brightness: 82,
  },
  {
    id: "warhammer",
    name: "Warhammer Active Turn",
    description: "Sharp active-player cue for demo games.",
    color: "#facc15",
    effect: "initiative",
    brightness: 74,
  },
];
