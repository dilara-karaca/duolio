"use client";

import { useRouter } from "next/navigation";
import { CopyButton, HeaderTools, Scoreboard, Screen, Wordmark } from "@/components/ui";
import { useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";

export function WaitingRoom() {
  const router = useRouter();
  const { t } = useLocale();
  const { state, leaveRoom } = useRoom();
  if (!state) return null;
  const friend = state.players.find((player) => player.slot !== state.yourSlot);

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <Wordmark />
        <HeaderTools />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">{t.room}</p>
        <p className="mt-2 text-4xl font-bold tracking-[0.18em] sm:text-5xl">{state.code}</p>
        <div className="mt-6 flex w-full gap-2">
          <CopyButton label={t.copyCode} text={state.code} />
          <CopyButton
            label={t.copyInvite}
            text={() => `${window.location.origin}/room/${state.code}`}
          />
        </div>
        <div className="mt-10 flex items-center gap-2 text-muted">
          <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.2s]" />
          <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
          <span className="size-2 animate-bounce rounded-full bg-accent" />
        </div>
        <p className="mt-4 text-lg font-medium">
          {friend && !friend.connected ? t.disconnectedShort(friend.nickname) : t.waitingFriend}
        </p>
        <ul className="mt-6 w-full space-y-2">
          {state.players.map((player) => (
            <li key={player.slot} className="rounded-2xl border border-line bg-card px-4 py-3 text-left font-semibold">
              {player.nickname}
              {player.slot === state.yourSlot ? <span className="ml-2 text-sm font-medium text-accent">{t.you}</span> : null}
              {!player.connected ? <span className="ml-2 text-sm font-medium text-muted">{t.reconnecting}</span> : null}
            </li>
          ))}
        </ul>
        {state.players.length === 2 ? (
          <div className="mt-6">
            <Scoreboard state={state} large />
          </div>
        ) : null}
      </main>
      <button
        type="button"
        className="mt-6 text-sm font-semibold text-muted"
        onClick={() => {
          void leaveRoom().then(() => router.push("/"));
        }}
      >
        {t.leaveRoom}
      </button>
    </Screen>
  );
}
