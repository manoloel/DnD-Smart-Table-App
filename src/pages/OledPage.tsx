import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { OledPayload, PlayerSegmentId } from "../types";
import { Panel } from "../components/Panel";
import { CapabilityBadge } from "../components/CapabilityBadge";
import { useI18n } from "../hooks/useI18n";
import { playerSegmentIds, seatToSegmentId } from "../lib/api/segments";

type OledTemplate = "custom" | "player-name" | "hp-status" | "your-turn" | "waiting" | "open-seat";
const templates: OledTemplate[] = ["custom", "player-name", "hp-status", "your-turn", "waiting", "open-seat"];

export function OledPage() {
  const players = useAppStore((state) => state.players);
  const sendOled = useAppStore((state) => state.sendOled);
  const [segment, setSegment] = useState<PlayerSegmentId>(0);
  const [template, setTemplate] = useState<OledTemplate>("custom");
  const [name, setName] = useState("Арамил");
  const [hp, setHp] = useState(27);
  const [ac, setAc] = useState(15);
  const [message, setMessage] = useState("Твой ход!");
  const { t } = useI18n();

  const payload: OledPayload = { segment, name, hp, ac, message };

  function applyPlayer(playerSegment: PlayerSegmentId) {
    setSegment(playerSegment);
    const player = players.find((item) => seatToSegmentId(item.seat) === playerSegment);
    if (!player) {
      setName(`Место ${playerSegment + 1}`);
      setHp(0);
      setAc(0);
      setMessage("Свободное место");
      return;
    }
    setName(player.characterName || player.name);
    setHp(player.hp);
    setAc(player.armorClass);
    setMessage(player.active ? "Твой ход!" : "");
  }

  function applyTemplate(nextTemplate: OledTemplate) {
    setTemplate(nextTemplate);
    const player = players.find((item) => seatToSegmentId(item.seat) === segment) ?? players[0];
    if (!player) {
      setName(`Место ${segment + 1}`);
      setHp(0);
      setAc(0);
      setMessage("Свободное место");
      return;
    }
    if (nextTemplate === "player-name") {
      setName(player.characterName || player.name);
      setMessage(`${t("seat")} ${player.seat}`);
    }
    if (nextTemplate === "hp-status") {
      setName(player.characterName || player.name);
      setHp(player.hp);
      setAc(player.armorClass);
      setMessage("");
    }
    if (nextTemplate === "your-turn") {
      setName(player.characterName || player.name);
      setMessage("Твой ход!");
    }
    if (nextTemplate === "waiting") {
      setName("Waiting");
      setMessage(t("oledWaitingBody"));
    }
    if (nextTemplate === "open-seat") {
      setName(`Место ${segment + 1}`);
      setHp(0);
      setAc(0);
      setMessage("Свободное место");
    }
  }

  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] gap-6 max-xl:grid-cols-1">
      <Panel title={t("sendOledMessage")} eyebrow={t("displayCommand")} badge={<CapabilityBadge mode="mock" />}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            Segment
            <select
              value={segment}
              onChange={(event) => applyPlayer(Number(event.target.value) as PlayerSegmentId)}
              className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
            >
              {playerSegmentIds.map((id) => (
                <option key={id} value={id}>
                  Segment {id} / {t("seat")} {id + 1}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("template")}
            <select value={template} onChange={(event) => applyTemplate(event.target.value as OledTemplate)} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white">
              {templates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3">
            <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder="Name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={hp} onChange={(event) => setHp(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder="HP" />
            <input type="number" value={ac} onChange={(event) => setAc(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder="AC" />
          </div>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder={t("body")} />

          <button className="rounded-lg bg-signal-cyan px-4 py-4 font-black text-panel-950" onClick={() => sendOled(payload)}>
            {t("sendToOled")}
          </button>
          <button
            className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-4 font-bold text-white"
            onClick={() =>
              Promise.all(
                playerSegmentIds.map((id) =>
                  sendOled({
                    segment: id,
                    name: "Waiting",
                    hp: 0,
                    ac: 0,
                    message: t("oledWaitingBody"),
                  }),
                ),
              )
            }
          >
            {t("sendWaitingToAll")}
          </button>
        </div>
      </Panel>

      <Panel title={t("oledPreview")} eyebrow={t("layout128")} badge={<CapabilityBadge mode="mock" label="UI preview" />}>
        <div className="mx-auto max-w-xl rounded-[24px] border border-slate-600 bg-black p-5 shadow-2xl">
          <div className="aspect-[2/1] rounded-lg border border-signal-cyan/40 bg-[#071019] p-5 font-mono text-signal-cyan">
            <p className="text-2xl font-black">{name || t("title")}</p>
            {message ? <p className="mt-5 text-lg">{message}</p> : <p className="mt-5 text-lg">HP {hp} / AC {ac}</p>}
            <p className="mt-5 text-xs opacity-60">SEG {segment}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
