import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "../hooks/useI18n";

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function runWindowAction(action: (window: ReturnType<typeof getCurrentWindow>) => Promise<void>) {
  if (!isTauriRuntime()) {
    return;
  }

  await action(getCurrentWindow());
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setMaximized).catch(() => setMaximized(false));
    const unlisten = appWindow.onResized(() => {
      void appWindow.isMaximized().then(setMaximized).catch(() => setMaximized(false));
    });

    return () => {
      void unlisten.then((cleanup) => cleanup());
    };
  }, []);

  const minimize = () => {
    void runWindowAction((appWindow) => appWindow.minimize());
  };

  const toggleMaximize = () => {
    void runWindowAction(async (appWindow) => {
      const isMaximized = await appWindow.isMaximized();

      if (isMaximized) {
        await appWindow.unmaximize();
        setMaximized(false);
      } else {
        await appWindow.maximize();
        setMaximized(true);
      }
    });
  };

  const close = () => {
    void runWindowAction((appWindow) => appWindow.close());
  };

  const startDragging = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.detail > 1) {
      return;
    }

    void runWindowAction((appWindow) => appWindow.startDragging());
  };

  const handleTitleBarDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("button")) {
      return;
    }

    toggleMaximize();
  };

  return (
    <div
      className="flex h-11 shrink-0 items-center justify-between overflow-hidden border-b border-white/10 bg-panel-950/95 pl-3 text-slate-300 backdrop-blur sm:pl-4"
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div className="flex h-full min-w-0 flex-1 items-center gap-2 pr-2 sm:gap-3" onMouseDown={startDragging}>
        <img className="h-6 w-6 shrink-0 rounded-md max-[360px]:hidden" src="/favicon.png?v=d20-realms" alt="" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            DnD Table
          </p>
          <p className="truncate text-[11px] font-medium text-slate-500 max-sm:hidden">
            {t("titleBarSubtitle")}
          </p>
        </div>
      </div>

      <div className="flex h-full shrink-0 items-stretch">
        <button
          type="button"
          className="flex h-full w-10 items-center justify-center border-l border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-white sm:w-12"
          aria-label={t("minimizeWindow")}
          onClick={minimize}
        >
          <span className="block h-px w-3 bg-current" />
        </button>
        <button
          type="button"
          className="flex h-full w-10 items-center justify-center border-l border-white/5 text-slate-400 hover:bg-white/[0.08] hover:text-white sm:w-12"
          aria-label={maximized ? t("restoreWindow") : t("maximizeWindow")}
          onClick={toggleMaximize}
        >
          {maximized ? (
            <span className="relative block h-3.5 w-3.5">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 border border-current" />
              <span className="absolute left-1.5 top-0 h-2.5 w-2.5 border border-current bg-panel-950" />
            </span>
          ) : (
            <span className="block h-3 w-3 border border-current" />
          )}
        </button>
        <button
          type="button"
          className="flex h-full w-10 items-center justify-center border-l border-white/5 text-slate-400 hover:bg-signal-red hover:text-panel-950 sm:w-12"
          aria-label={t("closeWindow")}
          onClick={close}
        >
          <span className="relative block h-3.5 w-3.5">
            <span className="absolute left-1/2 top-0 h-3.5 w-px -rotate-45 bg-current" />
            <span className="absolute left-1/2 top-0 h-3.5 w-px rotate-45 bg-current" />
          </span>
        </button>
      </div>
    </div>
  );
}
