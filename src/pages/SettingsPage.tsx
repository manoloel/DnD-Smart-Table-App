import { useAppStore } from "../store/useAppStore";
import { ZoneId } from "../types";
import { Panel } from "../components/Panel";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { SingleLedHardwareTest } from "../components/SingleLedHardwareTest";
import { useI18n } from "../hooks/useI18n";

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings);
  const device = useAppStore((state) => state.device);
  const demoMode = useAppStore((state) => state.demoMode);
  const connectTable = useAppStore((state) => state.connectTable);
  const disconnectTable = useAppStore((state) => state.disconnectTable);
  const toggleDemoMode = useAppStore((state) => state.toggleDemoMode);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const zones = Object.entries(settings.segmentMapping) as Array<[ZoneId, string]>;
  const { t } = useI18n();

  return (
    <div className="grid gap-6">
      <Panel title={t("network")} eyebrow={t("controllerEndpoint")} badge={<CapabilityBadge mode="real" label="table.local" />}>
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("tableHost")}
            <input value={settings.hostname} onChange={(event) => updateSettings({ hostname: event.target.value })} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("restPort")}
            <input type="number" value={settings.restPort} onChange={(event) => updateSettings({ restPort: Number(event.target.value) })} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("wsPort")}
            <input type="number" value={settings.wsPort} onChange={(event) => updateSettings({ wsPort: Number(event.target.value) })} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
          </label>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_160px_160px] items-center gap-3 max-lg:grid-cols-1">
          <div className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("connection")}</p>
            <p className="mt-1 font-black text-white">{device.connection}</p>
          </div>
          <button className="rounded-lg border border-signal-green/40 bg-signal-green/10 px-4 py-3 font-bold text-signal-green" onClick={connectTable}>
            {t("connect")}
          </button>
          <button className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-slate-200" onClick={disconnectTable}>
            {t("disconnect")}
          </button>
        </div>
      </Panel>

      <Panel title={t("safetyCooling")} eyebrow={t("hardwareGuardrails")} badge={<CapabilityBadge mode="mixed" />}>
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("brightnessSafetyLimit")} {settings.brightnessLimit}%
            <input type="range" min="10" max="100" value={settings.brightnessLimit} onChange={(event) => updateSettings({ brightnessLimit: Number(event.target.value) })} className="accent-signal-cyan" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("fanTargetTemperature")}
            <input type="number" value={settings.fanTargetTemperature} onChange={(event) => updateSettings({ fanTargetTemperature: Number(event.target.value) })} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-sm font-bold text-slate-300">
            <input type="checkbox" checked={settings.reconnect} onChange={(event) => updateSettings({ reconnect: event.target.checked })} />
            {t("reconnectAutomatically")}
          </label>
        </div>
        <button className="mt-5 rounded-lg border border-white/10 bg-white/[0.05] px-5 py-4 text-left font-bold text-white hover:bg-white/10" onClick={toggleDemoMode}>
          {t("toggleDemoMode")}: {demoMode ? t("enabled") : t("disabled")}
        </button>
      </Panel>

      <SingleLedHardwareTest />

      <Panel title={t("ledSegmentMapping")} eyebrow={t("logicalZones")} badge={<CapabilityBadge mode="mock" label="planned" />}>
        <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          {zones.map(([zone, value]) => (
            <label key={zone} className="grid gap-2 text-sm font-bold text-slate-300">
              {zone}
              <input
                value={value}
                onChange={(event) => updateSettings({ segmentMapping: { ...settings.segmentMapping, [zone]: event.target.value } })}
                className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 font-mono text-white"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 font-bold text-white">{t("exportConfiguration")}</button>
          <button className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 font-bold text-white">{t("importConfiguration")}</button>
        </div>
      </Panel>
    </div>
  );
}
