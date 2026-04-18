import { LightingZone } from "../types";
import { useAppStore } from "../store/useAppStore";
import { useI18n } from "../hooks/useI18n";

export function TableOverview() {
  const zones = useAppStore((state) => state.zones);
  const players = useAppStore((state) => state.players);
  const highlightPlayer = useAppStore((state) => state.highlightPlayer);
  const clearActivePlayer = useAppStore((state) => state.clearActivePlayer);
  const { t } = useI18n();
  const ambient = zones.find((zone) => zone.id === "ambient");
  const hasActivePlayer = players.some((player) => player.active);
  const seats = zones
    .filter((zone) => zone.id !== "ambient")
    .sort((left, right) => Number(left.id.split("-")[1]) - Number(right.id.split("-")[1]));
  const topSeats = seats.slice(0, 3);
  const bottomSeats = seats.slice(3, 6);

  function renderSeat(zone: LightingZone) {
    const seat = Number(zone.id.split("-")[1]);
    const player = players.find((item) => item.seat === seat);
    const selected = Boolean(player?.active);

    return (
      <button
        key={zone.id}
        type="button"
        disabled={!player}
        onClick={() => player && highlightPlayer(player.id)}
        className={`min-h-28 rounded-lg border p-4 text-left transition max-sm:min-h-24 max-sm:p-3 ${
          selected
            ? "border-signal-cyan bg-signal-cyan/10 shadow-glow"
            : "border-white/10 bg-white/[0.04] hover:border-signal-cyan/50 hover:bg-signal-cyan/10"
        } disabled:cursor-default disabled:hover:border-white/10 disabled:hover:bg-white/[0.04]`}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-slate-500">{t("seat")} {seat}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-300">{player?.name ?? t("openSeat")}</p>
          </div>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
        </div>
        <p className="mt-5 truncate text-lg font-black text-white">{player?.characterName || player?.name || t("openSeat")}</p>
        <p className="text-xs text-slate-400">{zone.brightness}% - {t(`effect.${zone.effect}`)}</p>
      </button>
    );
  }

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-panel-950 p-5 max-sm:p-3">
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {topSeats.map(renderSeat)}
      </div>
      <div className="my-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 max-md:grid-cols-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("ambientZone")}</p>
            <p className="mt-1 text-lg font-black text-white">{ambient?.brightness ?? 0}% {t("tableWash")}</p>
          </div>
          <button
            type="button"
            disabled={!hasActivePlayer}
            onClick={clearActivePlayer}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-signal-cyan/50 hover:bg-signal-cyan/10 disabled:cursor-default disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/[0.05]"
          >
            {t("clearActivePlayer")}
          </button>
          <span className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: ambient?.color }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {bottomSeats.map(renderSeat)}
      </div>
    </div>
  );
}
