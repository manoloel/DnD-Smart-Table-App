import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { OledPayload, PlayerSegmentId } from "../types";
import { Panel } from "../components/Panel";
import { useI18n } from "../hooks/useI18n";
import { playerSegmentIds, seatToSegmentId } from "../lib/api/segments";

type OledTemplate = "custom" | "player-name" | "hp-status" | "your-turn" | "waiting" | "open-seat";
const templates: OledTemplate[] = ["custom", "player-name", "hp-status", "your-turn", "waiting", "open-seat"];

export function OledPage() {
  const players = useAppStore((state) => state.players);
  const sendOled = useAppStore((state) => state.sendOled);
  const { t } = useI18n();
  const [segment, setSegment] = useState<PlayerSegmentId>(0);
  const [template, setTemplate] = useState<OledTemplate>("custom");
  const [name, setName] = useState(t("sampleCharacterName"));
  const [hp, setHp] = useState(27);
  const [ac, setAc] = useState(15);
  const [message, setMessage] = useState(t("yourTurn"));

  const payload: OledPayload = { segment, name, hp, ac, message };

  function applyPlayer(playerSegment: PlayerSegmentId) {
    setSegment(playerSegment);
    const player = players.find((item) => seatToSegmentId(item.seat) === playerSegment);
    if (!player) {
      setName(`${t("seat")} ${playerSegment + 1}`);
      setHp(0);
      setAc(0);
      setMessage(t("openSeat"));
      return;
    }

    setName(player.characterName || player.name);
    setHp(player.hp);
    setAc(player.armorClass);
    setMessage(player.active ? t("yourTurn") : "");
  }

  function applyTemplate(nextTemplate: OledTemplate) {
    setTemplate(nextTemplate);
    const player = players.find((item) => seatToSegmentId(item.seat) === segment) ?? players[0];
    if (!player) {
      setName(`${t("seat")} ${segment + 1}`);
      setHp(0);
      setAc(0);
      setMessage(t("openSeat"));
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
      setMessage(t("yourTurn"));
    }
    if (nextTemplate === "waiting") {
      setName(t("waiting"));
      setMessage(t("oledWaitingBody"));
    }
    if (nextTemplate === "open-seat") {
      setName(`${t("seat")} ${segment + 1}`);
      setHp(0);
      setAc(0);
      setMessage(t("openSeat"));
    }
  }

  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] gap-6 max-xl:grid-cols-1">
      <Panel title={t("sendOledMessage")} eyebrow={t("displayCommand")}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("displaySlot")}
            <select
              value={segment}
              onChange={(event) => applyPlayer(Number(event.target.value) as PlayerSegmentId)}
              className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white"
            >
              {playerSegmentIds.map((id) => (
                <option key={id} value={id}>
                  {t("displaySlot")} {id + 1}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {t("template")}
            <select value={template} onChange={(event) => applyTemplate(event.target.value as OledTemplate)} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white">
              {templates.map((item) => (
                <option key={item} value={item}>
                  {t(`oledTemplate.${item}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3">
            <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder={t("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <input type="number" value={hp} onChange={(event) => setHp(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder={t("hpShort")} />
            <input type="number" value={ac} onChange={(event) => setAc(Number(event.target.value))} className="rounded-lg border border-white/10 bg-panel-950 px-4 py-3 text-white" placeholder={t("armorClassShort")} />
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
                    name: t("waiting"),
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

      <Panel title={t("oledPreview")} eyebrow={t("layout128")}>
        <div className="mx-auto w-full max-w-xl rounded-lg border border-slate-600 bg-black p-5 shadow-2xl max-sm:p-3">
          <div className="aspect-[2/1] min-h-44 overflow-hidden rounded-lg border border-signal-cyan/40 bg-[#071019] p-5 font-mono text-signal-cyan max-sm:p-3">
            <p className="break-words text-2xl font-black max-sm:text-xl">{name || t("title")}</p>
            {message ? <p className="mt-5 break-words text-lg max-sm:text-base">{message}</p> : <p className="mt-5 text-lg max-sm:text-base">{t("hpShort")} {hp} / {t("armorClassShort")} {ac}</p>}
            <p className="mt-5 text-xs opacity-60">{t("segmentShort")} {segment + 1}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
