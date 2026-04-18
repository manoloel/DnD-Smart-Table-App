import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { useI18n } from "../hooks/useI18n";
import { seatToSegmentId } from "../lib/api/segments";

export function PlayersPage() {
  const players = useAppStore((state) => state.players);
  const addManualPlayer = useAppStore((state) => state.addManualPlayer);
  const updatePlayer = useAppStore((state) => state.updatePlayer);
  const clearPlayerSeat = useAppStore((state) => state.clearPlayerSeat);
  const testHighlight = useAppStore((state) => state.testHighlight);
  const sendOled = useAppStore((state) => state.sendOled);
  const { t } = useI18n();
  const seats = [1, 2, 3, 4, 5, 6];

  return (
    <div className="grid grid-cols-2 gap-6 max-xl:grid-cols-1">
      {seats.map((seat) => {
        const player = players.find((item) => item.seat === seat);

        return (
        <Panel key={seat} title={`${t("seat")} ${seat}`} eyebrow={player?.active ? t("activeTurn") : t("playerProfile")} badge={<CapabilityBadge mode="mock" />}>
          {!player ? (
            <div className="grid gap-4 rounded-lg border border-white/10 bg-panel-950 p-5">
              <p className="font-black text-white">{t("openSeat")}</p>
              <p className="mt-2 text-sm text-slate-400">{t("scanRfidToSeat")}</p>
              <button className="rounded-lg bg-signal-cyan px-4 py-3 font-black text-panel-950" onClick={() => addManualPlayer(seat)}>
                {t("addManualPlayer")}
              </button>
            </div>
          ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                {t("playerName")}
                <input
                  value={player.name}
                  onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                {t("characterName")}
                <input
                  value={player.characterName}
                  onChange={(event) => updatePlayer(player.id, { characterName: event.target.value })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                Role
                <input
                  value={player.role}
                  onChange={(event) => updatePlayer(player.id, { role: event.target.value })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-[78px_78px_78px_88px_1fr_88px] gap-3 max-lg:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                {t("seat")}
                <select
                  value={player.seat}
                  onChange={(event) => updatePlayer(player.id, { seat: Number(event.target.value) })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-3 py-2 text-white"
                >
                  {[1, 2, 3, 4, 5, 6].map((seat) => (
                    <option key={seat} value={seat}>
                      {seat}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                {t("armorClass")}
                <input
                  type="number"
                  value={player.armorClass}
                  onChange={(event) => updatePlayer(player.id, { armorClass: Number(event.target.value) })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                HP
                <input
                  type="number"
                  value={player.hp}
                  onChange={(event) => updatePlayer(player.id, { hp: Number(event.target.value) })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                Init
                <input
                  type="number"
                  value={player.initiative}
                  onChange={(event) => updatePlayer(player.id, { initiative: Number(event.target.value) })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300 max-lg:col-span-2">
                {t("status")}
                <input
                  value={player.status}
                  onChange={(event) => updatePlayer(player.id, { status: event.target.value })}
                  className="min-w-0 rounded-lg border border-white/10 bg-panel-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-300">
                {t("color")}
                <input
                  type="color"
                  value={player.color}
                  onChange={(event) => updatePlayer(player.id, { color: event.target.value })}
                  className="h-10 min-w-0 rounded-lg border border-white/10 bg-transparent p-1"
                />
              </label>
            </div>

            <div className="rounded-lg border border-white/10 bg-panel-950 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("rfidTag")}</p>
              <p className="mt-2 font-mono text-sm text-signal-cyan">{player.rfidTag ?? t("noTagAssigned")}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
              <button className="rounded-lg bg-signal-cyan px-4 py-3 font-black text-panel-950" onClick={() => testHighlight(player.id)}>
                {t("testHighlight")}
              </button>
              <button
                className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 font-bold text-white"
                onClick={() =>
                  sendOled({
                    segment: seatToSegmentId(player.seat),
                    name: player.characterName || player.name,
                    hp: player.hp,
                    ac: player.armorClass,
                    message: "",
                  })
                }
              >
                {t("sendOledTest")}
              </button>
              <button className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 font-bold text-signal-red" onClick={() => clearPlayerSeat(player.seat)}>
                {t("clearSeat")}
              </button>
            </div>
          </div>
          )}
        </Panel>
      );
      })}
    </div>
  );
}
