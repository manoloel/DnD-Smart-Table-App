import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { formatTime } from "../lib/time";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { useI18n } from "../hooks/useI18n";

const levelStyle = {
  info: "text-signal-cyan",
  warn: "text-signal-amber",
  error: "text-signal-red",
};

export function LogsPage() {
  const logs = useAppStore((state) => state.logs);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const { t } = useI18n();

  return (
    <Panel title={t("operationalLogs")} eyebrow={t("logSources")} badge={<CapabilityBadge mode="mixed" />}>
      <div className="mb-4 flex justify-end">
        <button className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-2 font-bold text-signal-red" onClick={clearLogs}>
          {t("clearLog")}
        </button>
      </div>
      <div className="grid gap-2">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[95px_90px_110px_1fr] gap-3 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-sm">
            <span className="font-mono text-slate-500">{formatTime(log.timestamp)}</span>
            <span className={`font-black uppercase ${levelStyle[log.level]}`}>{log.level}</span>
            <span className="font-mono text-slate-400">{log.source}</span>
            <span className="text-slate-200">{log.message}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
