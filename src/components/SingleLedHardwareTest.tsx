import { useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { useAppStore } from "../store/useAppStore";
import { EffectId, LedCommand } from "../types";
import { Panel } from "./Panel";

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

export function SingleLedHardwareTest() {
  const settings = useAppStore((state) => state.settings);
  const ledState = useAppStore((state) => state.ledState);
  const availableLedEffects = useAppStore((state) => state.availableLedEffects);
  const refreshLedState = useAppStore((state) => state.refreshLedState);
  const runLedTest = useAppStore((state) => state.runLedTest);
  const [testEffect, setTestEffect] = useState<EffectId>("static");
  const [testColor, setTestColor] = useState("#00b4ff");
  const [testBrightness, setTestBrightness] = useState(35);
  const [testSpeed, setTestSpeed] = useState(1200);
  const [testInterval, setTestInterval] = useState(160);
  const [testBackground, setTestBackground] = useState(8);
  const { t } = useI18n();

  const sendTest = (patch: Partial<LedCommand> = {}) =>
    runLedTest({
      effect: testEffect,
      rgb: hexToRgb(testColor),
      brightness: testBrightness,
      speed: testSpeed,
      interval: testInterval,
      background: testBackground,
      ...patch,
    });

  return (
    <Panel title={t("singleLedHardwareTest")} eyebrow={t("directLightCheck")}>
      <div className="grid grid-cols-[1fr_0.8fr] gap-6 max-xl:grid-cols-1">
        <div className="grid gap-4">
          <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("effect")}
              <select value={testEffect} onChange={(event) => setTestEffect(event.target.value as EffectId)} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white">
                {availableLedEffects.map((effect) => (
                  <option key={effect} value={effect}>
                    {t(`effect.${effect}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("color")}
              <input type="color" value={testColor} onChange={(event) => setTestColor(event.target.value)} className="h-12 rounded-lg border border-white/10 bg-transparent p-1" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("brightness")} {testBrightness}%
              <input type="range" min="0" max={settings.brightnessLimit} value={testBrightness} onChange={(event) => setTestBrightness(Number(event.target.value))} className="accent-signal-cyan" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("speed")}
              <input type="number" value={testSpeed} onChange={(event) => setTestSpeed(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("interval")}
              <input type="number" value={testInterval} onChange={(event) => setTestInterval(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              {t("background")}
              <input type="number" min="0" max="255" value={testBackground} onChange={(event) => setTestBackground(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" />
            </label>
          </div>

          <div className="grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            <button className="rounded-lg bg-signal-cyan px-4 py-3 font-black text-panel-950" onClick={() => sendTest()}>
              {t("sendTest")}
            </button>
            <button className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 font-bold text-white" onClick={() => refreshLedState()}>
              {t("readState")}
            </button>
            <button className="rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 font-bold text-signal-red" onClick={() => sendTest({ effect: "static", rgb: [0, 0, 0], brightness: 0 })}>
              {t("blackout")}
            </button>
            <button className="rounded-lg border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 font-bold text-signal-amber" onClick={() => sendTest({ effect: "warning", rgb: [255, 0, 0], brightness: 80, speed: 500 })}>
              {t("warning")}
            </button>
            <button className="rounded-lg border border-signal-green/40 bg-signal-green/10 px-4 py-3 font-bold text-signal-green" onClick={() => sendTest({ effect: "scan", rgb: [0, 255, 120], brightness: 70, speed: 1400 })}>
              {t("scan")}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-panel-950 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("currentLedState")}</p>
          <pre className="mt-3 overflow-auto rounded-lg bg-black/50 p-4 text-xs text-signal-cyan">
            {JSON.stringify(ledState ?? { status: t("notReadYet") }, null, 2)}
          </pre>
        </div>
      </div>
    </Panel>
  );
}
