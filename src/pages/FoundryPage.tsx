import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { useI18n } from "../hooks/useI18n";

export function FoundryPage() {
  const foundry = useAppStore((state) => state.foundry);
  const players = useAppStore((state) => state.players);
  const demoMode = useAppStore((state) => state.demoMode);
  const updateFoundry = useAppStore((state) => state.updateFoundry);
  const mockTableTurnButton = useAppStore((state) => state.mockTableTurnButton);
  const { t } = useI18n();
  const activePlayer = players.find((player) => player.active);

  return (
    <div className="grid gap-6">
      <Panel title={t("webhookSettings")} eyebrow={t("mvpBridge")} badge={<CapabilityBadge mode={foundry.connection === "connected" ? "real" : "mixed"} label={t(foundry.connection)} />}>
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("foundryBridge")}</p>
              <p className="mt-2 text-lg font-black text-white">{foundry.enabled ? t(foundry.connection) : t("disabled")}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("foundryClient")}</p>
              <p className={foundry.clientConnected ? "mt-2 text-lg font-black text-signal-green" : "mt-2 text-lg font-black text-slate-400"}>
                {foundry.clientConnected ? t("connected") : t("offline")}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("foundryActiveActor")}</p>
              <p className="mt-2 truncate text-lg font-black text-white">{foundry.activeActorName ?? activePlayer?.characterName ?? t("noActivePlayer")}</p>
            </div>
          </div>
          <ToggleSwitch
            checked={foundry.enabled}
            label={t("enableFoundry")}
            description={t("foundryToggleHelp")}
            onChange={(enabled) => updateFoundry({ enabled })}
          />
          <input value={foundry.secret} onChange={(event) => updateFoundry({ secret: event.target.value })} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder={t("sharedSecret")} />
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("foundryButtonDebounce")}
            <input
              type="number"
              min={5000}
              max={10000}
              step={500}
              value={foundry.turnButtonDebounceMs}
              onChange={(event) => updateFoundry({ turnButtonDebounceMs: Number(event.target.value) })}
              className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
            />
          </label>
        </div>
      </Panel>

      {demoMode ? (
        <Panel title={t("simulatedTableButton")} eyebrow={t("esp32InputSimulation")} badge={<CapabilityBadge mode="mock" />}>
          <div className="grid grid-cols-6 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {Array.from({ length: 6 }, (_, index) => {
              const seat = index + 1;
              const player = players.find((player) => player.seat === seat);
              return (
                <button
                  key={seat}
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-signal-cyan/50 hover:bg-signal-cyan/10 disabled:cursor-default disabled:opacity-50"
                  disabled={!player}
                  onClick={() => void mockTableTurnButton(seat)}
                >
                  <span className="block text-xs font-bold uppercase text-slate-500">{t("seat")} {seat}</span>
                  <span className="mt-2 block truncate font-black text-white">{player?.characterName || player?.name || t("openSeat")}</span>
                  <span className={player?.active ? "mt-1 block text-xs text-signal-green" : "mt-1 block text-xs text-slate-500"}>{player?.active ? t("activeTurn") : t("waiting")}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
