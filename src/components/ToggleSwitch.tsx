interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, label, description, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition ${
        checked
          ? "border-signal-cyan/50 bg-signal-cyan/10"
          : "border-white/10 bg-panel-950 hover:border-white/20 hover:bg-white/[0.05]"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span className="min-w-0">
        <span className="block font-bold text-white">{label}</span>
        {description ? <span className="mt-1 block text-sm text-slate-400">{description}</span> : null}
      </span>
      <span
        className={`flex h-7 w-12 shrink-0 items-center rounded-full border p-1 transition ${
          checked ? "justify-end border-signal-cyan bg-signal-cyan/20" : "justify-start border-white/15 bg-white/[0.04]"
        }`}
      >
        <span className={`h-5 w-5 rounded-full transition ${checked ? "bg-signal-cyan" : "bg-slate-500"}`} />
      </span>
    </button>
  );
}
