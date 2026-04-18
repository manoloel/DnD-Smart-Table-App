import { ReactNode } from "react";

interface PanelProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export function Panel({ title, eyebrow, children, className = "", badge }: PanelProps) {
  return (
    <section className={`rounded-lg border border-white/10 bg-panel-850/88 p-5 shadow-2xl shadow-black/20 ${className}`}>
      {(title || eyebrow) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-signal-cyan">{eyebrow}</p>}
            {title && <h3 className="mt-1 text-lg font-black text-white">{title}</h3>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}
