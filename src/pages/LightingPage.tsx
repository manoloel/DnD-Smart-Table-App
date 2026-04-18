import { useEffect, useState } from "react";
import { scenePresets } from "../config/presets";
import { useAppStore } from "../store/useAppStore";
import { EffectId, LightingZone, ZoneId } from "../types";
import { Panel } from "../components/Panel";
import { useI18n } from "../hooks/useI18n";

const effects: EffectId[] = ["static", "pulse", "breathing", "spark", "initiative", "warning", "scan"];
type ZoneDraft = Pick<LightingZone, "color" | "brightness" | "effect">;

function makeZoneDrafts(zones: LightingZone[]) {
  const drafts = {} as Record<ZoneId, ZoneDraft>;

  for (const zone of zones) {
    drafts[zone.id] = {
      color: zone.color,
      brightness: zone.brightness,
      effect: zone.effect,
    };
  }

  return drafts;
}

export function LightingPage() {
  const zones = useAppStore((state) => state.zones);
  const settings = useAppStore((state) => state.settings);
  const updateZone = useAppStore((state) => state.updateZone);
  const applyPreset = useAppStore((state) => state.applyPreset);
  const [zoneDrafts, setZoneDrafts] = useState<Record<ZoneId, ZoneDraft>>(() => makeZoneDrafts(zones));
  const { t } = useI18n();

  useEffect(() => {
    setZoneDrafts(makeZoneDrafts(zones));
  }, [zones]);

  const updateZoneDraft = (zoneId: ZoneId, patch: Partial<ZoneDraft>) =>
    setZoneDrafts((drafts) => ({
      ...drafts,
      [zoneId]: {
        ...drafts[zoneId],
        ...patch,
      },
    }));

  const applyZoneDraft = (zone: LightingZone) => {
    const draft = zoneDrafts[zone.id] ?? zone;
    return updateZone(zone.id, draft);
  };

  return (
    <div className="grid gap-6">
      <Panel title={t("lightingPresets")} eyebrow={t("presetEffects")}>
        <div className="grid grid-cols-6 gap-3 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {scenePresets.map((preset) => (
            <button
              key={preset.id}
              className="rounded-lg border border-white/10 bg-panel-950 p-4 text-left hover:border-signal-cyan/50"
              onClick={() => applyPreset(preset.id)}
            >
              <span className="block h-10 rounded-lg" style={{ backgroundColor: preset.color }} />
              <span className="mt-3 block font-black text-white">{t(`preset.${preset.id}.name`)}</span>
              <span className="text-xs text-slate-400">{t(`preset.${preset.id}.description`)}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-6 max-xl:grid-cols-1">
        {zones.map((zone) => (
          (() => {
            const draft = zoneDrafts[zone.id] ?? zone;
            const hasChanges = draft.color !== zone.color || draft.brightness !== zone.brightness || draft.effect !== zone.effect;

            return (
              <Panel
                key={zone.id}
                title={zone.label}
                eyebrow={zone.id === "ambient" ? t("ambient") : t("playerZone")}
              >
                <div className="grid gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <input
                      aria-label={`${zone.label} color`}
                      className="h-14 w-20 rounded-lg border border-white/10 bg-transparent p-1"
                      type="color"
                      value={draft.color}
                      onChange={(event) => updateZoneDraft(zone.id, { color: event.target.value })}
                    />
                    <div className="min-w-0">
                      <p className="font-black text-white">{draft.color.toUpperCase()}</p>
                      <p className="text-sm text-slate-400">{zone.online ? t("online") : t("offline")}</p>
                    </div>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-slate-300">
                    {t("brightness")} {draft.brightness}%
                    <input
                      type="range"
                      min="0"
                      max={settings.brightnessLimit}
                      value={draft.brightness}
                      onChange={(event) => updateZoneDraft(zone.id, { brightness: Number(event.target.value) })}
                      className="accent-signal-cyan"
                    />
                  </label>

                  <select
                    value={draft.effect}
                    onChange={(event) => updateZoneDraft(zone.id, { effect: event.target.value as EffectId })}
                    className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
                  >
                    {effects.map((effect) => (
                      <option key={effect} value={effect}>
                        {t(`effect.${effect}`)}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    <button
                      className="rounded-lg bg-signal-cyan px-4 py-3 font-black text-panel-950 disabled:cursor-default disabled:opacity-60"
                      disabled={!hasChanges}
                      onClick={() => applyZoneDraft(zone)}
                    >
                      {t("applyZoneChanges")}
                    </button>
                    <button
                      className="rounded-lg border border-signal-cyan/40 bg-signal-cyan/10 px-4 py-3 font-bold text-signal-cyan"
                      onClick={() => updateZone(zone.id as ZoneId, { effect: "initiative", brightness: settings.brightnessLimit })}
                    >
                      {t("testZoneHighlight")}
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })()
        ))}
      </div>
    </div>
  );
}
