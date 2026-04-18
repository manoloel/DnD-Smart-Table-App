import { ReactNode } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { FoundryPage } from "../pages/FoundryPage";
import { LightingPage } from "../pages/LightingPage";
import { LogsPage } from "../pages/LogsPage";
import { OledPage } from "../pages/OledPage";
import { PlayersPage } from "../pages/PlayersPage";
import { RfidPage } from "../pages/RfidPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useAppStore } from "../store/useAppStore";
import { TabId } from "../types";
import { ConnectionBadge } from "./ConnectionBadge";
import { useI18n } from "../hooks/useI18n";
import { useFoundryBridge } from "../hooks/useFoundryBridge";
import { useTableSocket } from "../hooks/useTableSocket";
import { TitleBar } from "./TitleBar";

const tabs: Array<{ id: TabId; labelKey: string; detailKey: string }> = [
  { id: "dashboard", labelKey: "tabDashboard", detailKey: "tabDashboardDetail" },
  { id: "lighting", labelKey: "tabLighting", detailKey: "tabLightingDetail" },
  { id: "players", labelKey: "tabPlayers", detailKey: "tabPlayersDetail" },
  { id: "rfid", labelKey: "tabRfid", detailKey: "tabRfidDetail" },
  { id: "oled", labelKey: "tabOled", detailKey: "tabOledDetail" },
  { id: "foundry", labelKey: "tabFoundry", detailKey: "tabFoundryDetail" },
  { id: "settings", labelKey: "tabSettings", detailKey: "tabSettingsDetail" },
  { id: "logs", labelKey: "tabLogs", detailKey: "tabLogsDetail" },
];

const pages: Record<TabId, ReactNode> = {
  dashboard: <DashboardPage />,
  lighting: <LightingPage />,
  players: <PlayersPage />,
  rfid: <RfidPage />,
  oled: <OledPage />,
  foundry: <FoundryPage />,
  settings: <SettingsPage />,
  logs: <LogsPage />,
};

export function AppShell() {
  useFoundryBridge();
  useTableSocket();
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeScene = useAppStore((state) => state.activeScene);
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-panel-950 text-slate-100">
      <TitleBar />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] max-xl:grid-cols-[230px_1fr] max-lg:grid-cols-1 max-lg:grid-rows-[auto_minmax(0,1fr)]">
        <aside className="sticky top-0 h-full overflow-y-auto border-r border-white/10 bg-panel-900/95 p-5 max-lg:h-auto max-lg:overflow-visible max-lg:border-b max-lg:border-r-0 max-md:p-4">
          <div className="mb-8 max-lg:mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-signal-cyan">{t("smartTable")}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white max-md:text-2xl">DnD Table</h1>
            <p className="mt-2 text-sm text-slate-400 max-lg:hidden">{t("appSubtitle")}</p>
          </div>

          <nav className="compact-scrollbar grid gap-2 max-lg:flex max-lg:overflow-x-auto max-lg:pb-2">
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg border px-4 py-3 text-left transition max-lg:min-w-36 max-lg:shrink-0 max-md:min-w-32 ${
                    selected
                      ? "border-signal-cyan/70 bg-signal-cyan/12 shadow-glow"
                      : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-sm font-bold text-white">{t(tab.labelKey)}</span>
                  <span className="mt-1 block text-xs text-slate-400 max-md:hidden">{t(tab.detailKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_32%),linear-gradient(180deg,#10141c,#090b10)]">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-panel-950/85 px-8 py-5 backdrop-blur max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4 max-md:py-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t("currentScene")}</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
                <h2 className="min-w-0 break-words text-2xl font-black text-white max-md:text-xl">{activeScene}</h2>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 max-md:w-full">
              <label className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-panel-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {t("language")}
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as typeof language)}
                  className="rounded-md border border-white/10 bg-panel-950 px-2 py-1 text-white"
                >
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                </select>
              </label>
              <ConnectionBadge />
            </div>
          </header>

          <div className="p-8 max-md:p-4 max-sm:p-3">{pages[activeTab]}</div>
        </main>
      </div>
    </div>
  );
}
