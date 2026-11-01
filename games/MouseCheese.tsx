"use client";

import { playerName } from "@/components/ui";
import { useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";

export function MouseCheese() {
  const { t } = useLocale();
  const { state, sendAction } = useRoom();
  if (state?.game?.kind !== "mouse-cheese") return null;
  const game = state.game;
  const you = state.yourSlot;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4">
      <div className="rounded-[28px] border border-line bg-card p-4 shadow-card">
        <div className="mb-3 flex justify-between text-sm font-semibold">
          <span>{playerName(state, 0)} 🧀</span>
          <span>🧀 {playerName(state, 1)}</span>
        </div>
        <div className="relative h-20 rounded-full bg-paper">
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl transition-[left] duration-100 ease-linear"
            style={{ left: `${game.position}%` }}
          >
            🐭
          </span>
        </div>
        <div className="mt-3 flex justify-between text-xs font-medium text-muted">
          <span>{t.taps(game.clicks[0])}</span>
          <span>{t.taps(game.clicks[1])}</span>
        </div>
      </div>
      <p className="text-center text-sm text-muted">{t.mouseHint}</p>
      <button
        type="button"
        disabled={state.phase !== "playing" || state.paused}
        onPointerDown={(event) => {
          event.preventDefault();
          void sendAction({ type: "mouse:click" });
        }}
        className="h-28 w-full touch-manipulation rounded-[28px] bg-accent text-2xl font-bold text-accent-ink shadow-card active:scale-[0.98] disabled:opacity-50"
      >
        {you === 0 ? t.tapLeft : t.tapRight}
      </button>
    </div>
  );
}
