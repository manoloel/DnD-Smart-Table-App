interface StatusMetricProps {
  label: string;
  value: string;
  tone?: "cyan" | "green" | "amber" | "red" | "slate";
}

const tones = {
  cyan: "text-signal-cyan",
  green: "text-signal-green",
  amber: "text-signal-amber",
  red: "text-signal-red",
  slate: "text-slate-200",
};

export function StatusMetric({ label, value, tone = "slate" }: StatusMetricProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tones[tone]}`}>{value}</p>
    </div>
  );
}
