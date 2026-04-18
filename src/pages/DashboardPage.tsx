import { scenePresets } from "../config/presets";
import { useTableHealth } from "../hooks/useTableHealth";
import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { StatusMetric } from "../components/StatusMetric";
import { TableOverview } from "../components/TableOverview";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { useI18n } from "../hooks/useI18n";

export function DashboardPage() {
  const device = useAppStore((state) => state.device);
  const players = useAppStore((state) => state.players);
  const activeScene = useAppStore((state) => state.activeScene);
  const allLightsOff = useAppStore((state) => state.allLightsOff);
  const resetTableState = useAppStore((state) => state.resetTableState);
  const applyPreset = useAppStore((state) => state.applyPreset);
  const health = useTableHealth();
  const { t } = useI18n();
  const activePlayer = players.find((player) => player.active);
  const preset = scenePresets.find((item) => item.id === activeScene);

  return (
    <div className="grid gap-6">
      {device.connection !== "connected" && (
        <div className="rounded-lg border border-signal-amber/40 bg-signal-amber/10 p-4 text-signal-amber">
          {t("dashboardDegraded")}
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 max-2xl:grid-cols-3 max-xl:grid-cols-2">
        <StatusMetric label={t("connection")} value={device.connection} tone={health.tone} />
        <StatusMetric label={t("controlMode")} value={t(health.labelKey)} tone={health.tone} />
        <StatusMetric label={t("activePlayer")} value={activePlayer?.name ?? t("noActivePlayer")} tone="cyan" />
        <StatusMetric label={t("temperature")} value={`${device.temperatureC.toFixed(1)} C`} tone={device.temperatureC > 47 ? "amber" : "green"} />
        <StatusMetric label={t("fan")} value={`${device.fanSpeed}%`} tone="slate" />
      </div>

      <div className="grid items-stretch grid-cols-[1.35fr_0.65fr] gap-6 max-xl:grid-cols-1">
        <Panel className="h-full" eyebrow={t("tableOverview")} badge={<CapabilityBadge mode="mixed" />}>
          <TableOverview />
        </Panel>

        <div className="grid h-full gap-6">
          <Panel className="flex h-full flex-col" eyebrow={t("currentScene")} badge={preset && <CapabilityBadge mode="real" label={preset.effect} />}>
            <div className="grid flex-1 content-start gap-4 rounded-lg border border-white/10 bg-panel-950 p-4">
              <span className="mb-3 block h-3 w-12 rounded-full" style={{ backgroundColor: preset?.color }} />
              <div>
                <p className="text-xl font-black text-white">{preset?.name}</p>
                <p className="mt-1 text-sm text-slate-400">{preset?.description}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{preset?.brightness}% - {preset?.effect}</p>
              </div>
            </div>
            <button
              className="mt-4 w-full rounded-lg border border-signal-red/50 bg-signal-red/10 px-6 py-5 text-center text-lg font-black uppercase text-signal-red transition hover:border-signal-red/80 hover:bg-signal-red/20"
              onClick={allLightsOff}
            >
              {t("allLightsOff")}
            </button>
            <button
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-6 py-4 text-center text-sm font-black uppercase text-slate-200 transition hover:border-signal-amber/60 hover:bg-signal-amber/10 hover:text-signal-amber"
              onClick={() => {
                if (window.confirm(t("resetTableConfirm"))) {
                  resetTableState();
                }
              }}
            >
              {t("resetTable")}
            </button>
          </Panel>
        </div>
      </div>

      <Panel eyebrow={t("oneTouchScenes")} badge={<CapabilityBadge mode="mixed" />}>
        <div className="grid grid-cols-6 gap-3 max-2xl:grid-cols-3 max-lg:grid-cols-2">
          {scenePresets.map((item) => (
            <button
              key={item.id}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-left hover:border-signal-cyan/50 hover:bg-signal-cyan/10"
              onClick={() => applyPreset(item.id)}
            >
              <span className="mb-3 block h-3 w-12 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="block font-black text-white">{item.name}</span>
              <span className="mt-1 block text-xs text-slate-400">{item.effect} · {item.brightness}%</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
