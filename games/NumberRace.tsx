"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { playerName, cx } from "@/components/ui";
import { NUMBER_CELLS, NUMBER_GRID } from "@/games/logic/number-race";
import { useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";

export function NumberRace() {
  const { state, sendAction } = useRoom();
  const game = state?.game?.kind === "number-race" ? state.game : null;
  if (!state || !game) return null;
  return (
    <RaceRound
      key={`${game.roundPhase}:${game.target ?? "none"}:${game.fillerSlot}`}
      state={state}
      round={game}
      sendAction={sendAction}
    />
  );
}

function RaceRound({
  state,
  round,
  sendAction,
}: {
  state: NonNullable<ReturnType<typeof useRoom>["state"]>;
  round: Extract<NonNullable<ReturnType<typeof useRoom>["state"]>["game"], { kind: "number-race" }>;
  sendAction: ReturnType<typeof useRoom>["sendAction"];
}) {
  const { t } = useLocale();
  const [wrong, setWrong] = useState<number | null>(null);
  const [extra, setExtra] = useState<Set<number>>(new Set());
  const pending = useRef<number[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pending.current.length === 0) return;
      const cells = pending.current.splice(0, 48);
      void sendAction({ type: "number:fill", cells });
    }, 70);
    return () => window.clearInterval(timer);
  }, [sendAction]);

  const youFill = round.fillerSlot === state.yourSlot;
  const filler = playerName(state, round.fillerSlot);
  const finder = playerName(state, round.fillerSlot === 0 ? 1 : 0);

  function paint(event: PointerEvent<HTMLDivElement>) {
    if (!youFill || round.roundPhase !== "race") return;
    if (event.pointerType === "mouse" && event.buttons === 0) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-cell]");
    if (!hit) return;
    const index = Number((hit as HTMLElement).dataset.cell);
    if (!Number.isInteger(index) || round.yourBoard[index] || extra.has(index) || pending.current.includes(index)) {
      return;
    }
    setExtra((current) => {
      const next = new Set(current);
      next.add(index);
      return next;
    });
    pending.current.push(index);
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="grid gap-2">
        {[0, 1].map((slot) => (
          <div key={slot}>
            <div className="mb-1 flex justify-between text-xs font-medium">
              <span>{playerName(state, slot as 0 | 1)}</span>
              <span className="tabular-nums">{round.filled[slot]}/144</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(round.filled[slot] / 144) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {round.roundPhase === "pick" && youFill ? (
        <section>
          <h2 className="text-center text-lg font-semibold">{t.numberChoose(finder)}</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 50 }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => void sendAction({ type: "number:pick", number }, true)}
                className="h-11 rounded-xl border border-line bg-card text-sm font-semibold active:scale-95"
              >
                {number}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {round.roundPhase === "pick" && !youFill ? (
        <p className="grid min-h-48 place-items-center text-center text-lg font-medium">{t.numberChoosing(filler)}</p>
      ) : null}
      {round.roundPhase === "found" ? (
        <p className="grid min-h-48 place-items-center text-center text-2xl font-bold">{t.numberFound(round.target ?? 0)}</p>
      ) : null}
      {round.roundPhase === "race" && youFill ? (
        <section>
          <h2 className="text-center font-semibold">{t.numberFill(round.target ?? 0)}</h2>
          <div
            className="mt-3 touch-none select-none"
            style={{ display: "grid", gridTemplateColumns: `repeat(${NUMBER_GRID}, minmax(0, 1fr))`, gap: 2 }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              paint(event);
            }}
            onPointerMove={paint}
          >
            {Array.from({ length: NUMBER_CELLS }, (_, index) => {
              const filled = round.yourBoard[index] || extra.has(index);
              return (
                <div
                  key={index}
                  data-cell={index}
                  className={cx("aspect-square rounded-[3px]", filled ? "bg-accent" : "bg-card")}
                />
              );
            })}
          </div>
        </section>
      ) : null}
      {round.roundPhase === "race" && !youFill && round.layout ? (
        <section>
          <h2 className="text-center text-2xl font-bold">{t.numberFind(round.target ?? 0)}</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {round.layout.map((number, index) => (
              <button
                key={`${number}-${index}`}
                type="button"
                onClick={() => {
                  if (number !== round.target) {
                    setWrong(number);
                    window.setTimeout(() => setWrong(null), 280);
                    return;
                  }
                  void sendAction({ type: "number:mark", number }, true);
                }}
                className={cx(
                  "h-11 rounded-xl border border-line bg-card text-sm font-semibold active:scale-95",
                  wrong === number && "animate-shake bg-bad/15",
                )}
              >
                {number}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
