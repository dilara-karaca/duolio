"use client";

import type { ReactNode } from "react";
import { Button, HeaderTools, Scoreboard, cx } from "@/components/ui";
import { translateResultTitle, useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";
import { GameStage } from "@/games/GameStage";

export function GameShell() {
  const { t } = useLocale();
  const { state, backToLobby } = useRoom();
  if (!state) return null;
  const meta = state.selectedGame ? t.games[state.selectedGame] : null;
  const disconnected = state.players.find((player) => !player.connected);

  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => void backToLobby()}
            className="h-11 shrink-0 rounded-2xl px-2 text-sm font-semibold"
          >
            {t.lobby}
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold">{meta?.name ?? "Duolio"}</h1>
            <Scoreboard state={state} />
          </div>
          <HeaderTools />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 py-4 pb-10">
        {disconnected ? (
          <p className="mb-3 rounded-2xl bg-card px-4 py-3 text-sm font-medium text-muted">
            {t.disconnectedWait(disconnected.nickname)}
          </p>
        ) : null}
        <div className={cx(state.paused && "pointer-events-none opacity-60")}>
          {state.phase === "countdown" || !state.game ? (
            <Countdown name={meta?.name ?? t.getReady} value={state.countdown} />
          ) : (
            <GameStage />
          )}
        </div>
      </main>
      {state.result ? <ResultCard /> : null}
    </div>
  );
}

function Countdown({ name, value }: { name: string; value: number | null }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-center">
      <div>
        <p className="text-sm font-medium text-muted">{name}</p>
        <p key={value ?? 0} className="animate-pop mt-2 text-8xl font-bold text-accent">
          {value}
        </p>
      </div>
    </div>
  );
}

function ResultCard() {
  const { t } = useLocale();
  const { state, playAgain, backToLobby } = useRoom();
  if (!state?.result) return null;
  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-ink/35 p-4 sm:place-items-center">
      <div className="animate-rise w-full max-w-sm rounded-[28px] bg-card p-6 text-center shadow-card">
        <h2 className="text-3xl font-bold">{translateResultTitle(state.result.title, t)}</h2>
        {state.result.detail ? (
          <p className="mt-2 text-lg font-semibold text-accent">{state.result.detail}</p>
        ) : null}
        {state.result.scored ? <p className="mt-3 text-sm font-semibold text-good">{t.pointPlus}</p> : null}
        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={() => void playAgain()}>
            {t.playAgain}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => void backToLobby()}>
            {t.backToLobby}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-[28px] border border-line bg-card p-4 shadow-card", className)}>{children}</section>;
}
