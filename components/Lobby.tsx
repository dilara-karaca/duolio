"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/games/logic/catalog";
import { Button, CopyButton, ErrorNote, HeaderTools, Scoreboard, Screen, Wordmark, cx } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";

export function Lobby() {
  const router = useRouter();
  const { t } = useLocale();
  const { state, selectGame, startGame, leaveRoom } = useRoom();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!state) return null;
  const selected = state.selectedGame ? t.games[state.selectedGame] : null;
  const disconnected = state.players.find((player) => !player.connected);

  return (
    <Screen wide>
      <header className="flex items-center justify-between gap-3">
        <Wordmark />
        <HeaderTools />
      </header>
      <div className="mt-6 rounded-[28px] border border-line bg-card px-4 py-5 text-center shadow-card">
        <Scoreboard state={state} large />
        <p className="mt-3 text-sm font-semibold tracking-[0.18em] text-muted">{state.code}</p>
        <div className="mx-auto mt-3 flex max-w-sm">
          <CopyButton
            label={t.copyInvite}
            text={() => `${window.location.origin}/room/${state.code}`}
          />
        </div>
      </div>
      {disconnected ? (
        <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-sm font-medium text-muted">
          {t.disconnectedWait(disconnected.nickname)}
        </p>
      ) : null}
      <h2 className="mt-8 text-2xl font-bold">{t.chooseGame}</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map((game) => {
          const active = state.selectedGame === game.id;
          const copy = t.games[game.id];
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => void selectGame(game.id)}
              className={cx(
                "rounded-3xl border-2 bg-card p-4 text-left shadow-card transition active:scale-[0.99]",
                active ? "border-accent" : "border-transparent",
              )}
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-2xl">{game.emoji}</span>
              <span className="mt-3 block font-semibold">{copy.name}</span>
              <span className="mt-1 block text-sm text-muted">{copy.description}</span>
            </button>
          );
        })}
      </div>
      <div className="sticky bottom-3 mt-6">
        <Button
          className="w-full"
          disabled={!selected || pending || state.paused}
          onClick={() => {
            setPending(true);
            setError(null);
            void startGame().then((ack) => {
              setPending(false);
              if (!ack.ok) setError(translateMessage(ack.message, t));
            });
          }}
        >
          {selected ? t.startGame(selected.name) : t.chooseAGame}
        </Button>
        <ErrorNote message={error} />
      </div>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-muted"
        onClick={() => {
          void leaveRoom().then(() => router.push("/"));
        }}
      >
        {t.leaveRoom}
      </button>
    </Screen>
  );
}
