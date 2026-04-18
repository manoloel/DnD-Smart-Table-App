import { PlayerSegmentId, SegmentId, TableSegmentId, ZoneId } from "../../types";

export const playerSegmentIds: PlayerSegmentId[] = [0, 1, 2, 3, 4, 5];
export const tableSegmentId: TableSegmentId = 6;
export const segmentIds: SegmentId[] = [...playerSegmentIds, tableSegmentId];

export function zoneIdToSegmentId(zoneId: ZoneId): SegmentId {
  if (zoneId === "ambient") return tableSegmentId;
  return (Number(zoneId.split("-")[1]) - 1) as PlayerSegmentId;
}

export function seatToSegmentId(seat: number): PlayerSegmentId {
  return Math.max(0, Math.min(5, seat - 1)) as PlayerSegmentId;
}

export function segmentIdToZoneId(segmentId: SegmentId): ZoneId {
  return segmentId === tableSegmentId ? "ambient" : (`player-${segmentId + 1}` as ZoneId);
}
