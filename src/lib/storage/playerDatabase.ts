import { PlayerProfile } from "../../types";

const storageKey = "dnd-table.players.v1";
const seatedPlayersKey = "dnd-table.seated-players.v1";

function normalizePlayer(player: PlayerProfile): PlayerProfile {
  return {
    ...player,
    characterName: player.characterName ?? "",
    role: player.role ?? "Adventurer",
    armorClass: Number.isFinite(player.armorClass) ? player.armorClass : 10,
    initiative: Number.isFinite(player.initiative) ? player.initiative : 0,
    hp: Number.isFinite(player.hp) ? player.hp : 0,
  };
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadPlayersFromDatabase(fallback: PlayerProfile[]) {
  const taggedFallback = fallback.filter((player) => player.rfidTag).map(normalizePlayer);
  if (!canUseLocalStorage()) {
    return taggedFallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      savePlayersToDatabase(taggedFallback);
      return taggedFallback;
    }

    const parsed = JSON.parse(raw) as PlayerProfile[];
    if (!Array.isArray(parsed)) {
      return taggedFallback;
    }

    const fallbackById = new Map(fallback.map((player) => [player.id, player]));
    return parsed
      .map((player) => normalizePlayer({ ...fallbackById.get(player.id), ...player }))
      .filter((player) => player.rfidTag);
  } catch {
    return taggedFallback;
  }
}

export function savePlayersToDatabase(players: PlayerProfile[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(players.filter((player) => player.rfidTag).map(normalizePlayer)));
}

export function loadSeatedPlayersFromDatabase(playerDatabase: PlayerProfile[]) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(seatedPlayersKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PlayerProfile[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    const databaseById = new Map(playerDatabase.map((player) => [player.id, player]));
    return parsed
      .map((player) => normalizePlayer({ ...databaseById.get(player.id), ...player }))
      .filter((player) => Number.isFinite(player.seat))
      .sort((left, right) => left.seat - right.seat);
  } catch {
    return [];
  }
}

export function saveSeatedPlayersToDatabase(players: PlayerProfile[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(seatedPlayersKey, JSON.stringify(players.map(normalizePlayer)));
}

export function clearSeatedPlayersFromDatabase() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(seatedPlayersKey);
}
