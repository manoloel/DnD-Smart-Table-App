import { useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { formatTime } from "../lib/time";
import { useI18n } from "../hooks/useI18n";

export function RfidPage() {
  const players = useAppStore((state) => state.players);
  const playerDatabase = useAppStore((state) => state.playerDatabase);
  const events = useAppStore((state) => state.rfidEvents);
  const demoMode = useAppStore((state) => state.demoMode);
  const addRfidScan = useAppStore((state) => state.addRfidScan);
  const bindRfidToPlayer = useAppStore((state) => state.bindRfidToPlayer);
  const { t } = useI18n();
  const [savedPlayerSearch, setSavedPlayerSearch] = useState("");
  const [selectedSavedPlayerId, setSelectedSavedPlayerId] = useState("");
  const [isSavedPlayerDropdownOpen, setSavedPlayerDropdownOpen] = useState(false);
  const [scanSeat, setScanSeat] = useState(1);
  const playersWithoutRfid = players.filter((player) => !player.rfidTag);
  const selectedSavedPlayer = playerDatabase.find((player) => player.id === selectedSavedPlayerId);
  const filteredSavedPlayers = useMemo(() => {
    const query = savedPlayerSearch.trim().toLowerCase();
    if (!query) {
      return playerDatabase.slice(0, 6);
    }

    return playerDatabase
      .filter((player) =>
        [player.name, player.characterName, player.rfidTag]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
      .slice(0, 6);
  }, [playerDatabase, savedPlayerSearch]);

  const scanSelectedPlayer = () => {
    if (!selectedSavedPlayer?.rfidTag) return;
    addRfidScan(scanSeat, selectedSavedPlayer.rfidTag);
  };

  return (
    <div className="grid grid-cols-[0.85fr_1.15fr] gap-6 max-xl:grid-cols-1">
      <Panel title={t("tagBinding")} eyebrow={t("rfidWorkflow")}>
        <div className="grid gap-4">
          <div className="rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal-cyan">{t("playersWithoutRfid")}</p>
            <p className="mt-2 text-sm text-slate-300">{t("rfidBindHelp")}</p>
            <div className="mt-4 grid gap-3">
              {playersWithoutRfid.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-sm text-slate-400">{t("noPlayersWithoutRfid")}</p>
              ) : (
                playersWithoutRfid.map((player) => (
                  <div key={player.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-panel-950 p-4 max-sm:grid-cols-1">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{player.characterName || player.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {t("seat")} {player.seat} - {player.name}
                      </p>
                    </div>
                    <button
                      className="rounded-lg border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 font-black text-signal-cyan hover:border-signal-cyan/70 hover:bg-signal-cyan/15"
                      onClick={() => void bindRfidToPlayer(player.id)}
                    >
                      {t("bindRfidTag")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {demoMode ? (
            <>
              <p className="text-sm text-slate-400">{t("rfidSimulationHelp")}</p>
              <div className="rounded-lg border border-white/10 bg-panel-950 p-4">
                <div className="grid grid-cols-[1fr_120px_auto] gap-3 max-lg:grid-cols-1">
                  <div
                    className="relative"
                    onBlur={(event) => {
                      const nextFocus = event.relatedTarget;
                      if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
                        setSavedPlayerDropdownOpen(false);
                      }
                    }}
                  >
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("savedPlayer")}</label>
                    <input
                      value={savedPlayerSearch}
                      onChange={(event) => {
                        setSavedPlayerSearch(event.target.value);
                        setSelectedSavedPlayerId("");
                        setSavedPlayerDropdownOpen(true);
                      }}
                      onFocus={() => setSavedPlayerDropdownOpen(true)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-white outline-none transition focus:border-signal-cyan/60"
                      placeholder={t("searchSavedPlayer")}
                    />
                    {isSavedPlayerDropdownOpen ? (
                      <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-panel-900 p-2 shadow-2xl">
                        {filteredSavedPlayers.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-slate-400">{t("noSavedPlayersFound")}</p>
                        ) : (
                          filteredSavedPlayers.map((player) => (
                            <button
                              key={player.id}
                              className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition max-sm:grid-cols-1 ${
                                selectedSavedPlayerId === player.id ? "bg-signal-cyan/15 text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                              }`}
                              onClick={() => {
                                setSelectedSavedPlayerId(player.id);
                                setSavedPlayerSearch(player.characterName || player.name);
                                setSavedPlayerDropdownOpen(false);
                              }}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-black">{player.characterName || player.name}</span>
                                <span className="block truncate text-xs text-slate-500">{player.name}</span>
                              </span>
                              <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: player.color }} />
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("seat")}</span>
                    <select
                      value={scanSeat}
                      onChange={(event) => setScanSeat(Number(event.target.value))}
                      className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 font-bold text-white outline-none transition focus:border-signal-cyan/60"
                    >
                      {[1, 2, 3, 4, 5, 6].map((seat) => (
                        <option key={seat} value={seat} className="bg-panel-950 text-white">
                          {seat}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="self-end rounded-lg border border-signal-cyan/30 bg-signal-cyan/10 px-5 py-3 font-black text-signal-cyan transition hover:border-signal-cyan/70 hover:bg-signal-cyan/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
                    disabled={!selectedSavedPlayer?.rfidTag}
                    onClick={scanSelectedPlayer}
                  >
                    {t("simulateScanAtSeat")}
                  </button>
                </div>
                {selectedSavedPlayer ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 max-sm:flex-col max-sm:items-start">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{selectedSavedPlayer.characterName || selectedSavedPlayer.name}</p>
                      <p className="mt-1 font-mono text-xs text-signal-cyan">{selectedSavedPlayer.rfidTag ?? t("noTagAssigned")}</p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {t("reader")} {scanSeat}
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </Panel>

      <Panel title={t("liveScanLog")} eyebrow={t("lastEvents")}>
        <div className="grid gap-3">
          {events.map((event) => {
            const player = players.find((item) => item.id === event.playerId) ?? playerDatabase.find((item) => item.id === event.playerId);
            return (
              <div key={event.id} className="grid grid-cols-[110px_1fr_110px] items-center gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 max-md:grid-cols-1">
                <span className="text-xs font-bold text-slate-500">{formatTime(event.timestamp)}</span>
                <div className="min-w-0">
                  <p className="break-all font-mono font-bold text-white">{event.tagId}</p>
                  <p className="text-sm text-slate-400">{player ? `${t("boundTo")} ${player.name}` : t("unassignedTag")}</p>
                </div>
                <span className="rounded-full bg-signal-cyan/10 px-3 py-1 text-center text-xs font-bold text-signal-cyan">{t("reader")} {event.readerId}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
