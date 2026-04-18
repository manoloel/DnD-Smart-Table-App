import { useAppStore } from "../store/useAppStore";
import { Panel } from "../components/Panel";
import { formatTime } from "../lib/time";
import { useI18n } from "../hooks/useI18n";

const levelStyle = {
  info: "text-signal-cyan",
  warn: "text-signal-amber",
  error: "text-signal-red",
};

const technicalLogPattern = /WebSocket|ESP32|REST|\bAPI\b|\/api/i;

function formatLogSource(source: string, t: (key: string) => string) {
  const key = `logSource.${source}`;
  const translated = t(key);
  return translated === key ? source : translated;
}

function formatLogLevel(level: string, t: (key: string) => string) {
  const key = `logLevel.${level}`;
  const translated = t(key);
  return translated === key ? level : translated;
}

function formatLogMessage(message: string, t: (key: string) => string) {
  if (technicalLogPattern.test(message)) {
    return t("technicalLogHidden");
  }

  return message;
}

export function LogsPage() {
  const logs = useAppStore((state) => state.logs);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const { t } = useI18n();

  return (
    <Panel title={t("operationalLogs")} eyebrow={t("logSources")}>
      <div className="mb-4 flex justify-end">
        <button className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-2 font-bold text-signal-red" onClick={clearLogs}>
          {t("clearLog")}
        </button>
      </div>
      <div className="grid gap-2">
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[95px_90px_110px_1fr] gap-3 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-sm max-md:grid-cols-2 max-sm:grid-cols-1">
            <span className="font-mono text-slate-500">{formatTime(log.timestamp)}</span>
            <span className={`font-black uppercase ${levelStyle[log.level]}`}>{formatLogLevel(log.level, t)}</span>
            <span className="text-slate-400">{formatLogSource(log.source, t)}</span>
            <span className="break-words text-slate-200">{formatLogMessage(log.message, t)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
