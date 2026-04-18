import { FoundrySettings } from "../../types";

const storageKey = "dnd-table.foundry.v1";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeFoundrySettings(fallback: FoundrySettings, value: Partial<FoundrySettings>): FoundrySettings {
  return {
    ...fallback,
    ...value,
    mappings: fallback.mappings,
    endpoint: fallback.endpoint,
    connection: "offline",
    clientConnected: false,
    activeActorName: undefined,
    combatActive: false,
    lastEvent: undefined,
  };
}

export function loadFoundrySettingsFromStorage(fallback: FoundrySettings) {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<FoundrySettings>;
    return normalizeFoundrySettings(fallback, parsed);
  } catch {
    return fallback;
  }
}

export function saveFoundrySettingsToStorage(settings: FoundrySettings) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      enabled: settings.enabled,
      secret: settings.secret,
      turnButtonDebounceMs: settings.turnButtonDebounceMs,
    }),
  );
}
