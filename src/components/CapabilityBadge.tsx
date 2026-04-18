type CapabilityMode = "real" | "mock" | "mixed";

interface CapabilityBadgeProps {
  mode: CapabilityMode;
  label?: string;
}

const styles: Record<CapabilityMode, string> = {
  real: "border-signal-green/40 bg-signal-green/10 text-signal-green",
  mock: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  mixed: "border-signal-amber/40 bg-signal-amber/10 text-signal-amber",
};

const labels: Record<CapabilityMode, string> = {
  real: "realApi",
  mock: "mocked",
  mixed: "mixed",
};

export function CapabilityBadge({ mode, label }: CapabilityBadgeProps) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${styles[mode]}`}>
      {label ?? t(labels[mode])}
    </span>
  );
}
import { useI18n } from "../hooks/useI18n";
