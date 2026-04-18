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
    <section className={`min-w-0 rounded-lg border border-white/10 bg-panel-850/88 p-5 shadow-2xl shadow-black/20 max-sm:p-4 ${className}`}>
      {(title || eyebrow) && (
        <div className="mb-4 flex items-start justify-between gap-4 max-sm:flex-col">
          <div className="min-w-0">
            {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.18em] text-signal-cyan">{eyebrow}</p>}
            {title && <h3 className="mt-1 break-words text-lg font-black text-white">{title}</h3>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}
