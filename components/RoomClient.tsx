"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameShell } from "@/components/GameShell";
import { Lobby } from "@/components/Lobby";
import { WaitingRoom } from "@/components/WaitingRoom";
import { Button, ErrorNote, HeaderTools, Screen, ScreenFallback, TextField, Wordmark } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { sessionCode, sessionNickname, subscribeSession } from "@/lib/session";
import { useRoom } from "@/lib/socket-context";
import type { Ack } from "@/types";

function subscribeHydration() {
  return () => undefined;
}

export function RoomClient() {
  const { t } = useLocale();
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const { state, connected, reconnect } = useRoom();
  const savedCode = useSyncExternalStore(subscribeSession, sessionCode, () => "");
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [attempt, setAttempt] = useState<{ code: string; ack: Ack } | null>(null);
  const returning = savedCode === code;

  useEffect(() => {
    if (!connected || !returning) return;
    let cancel = false;
    void reconnect(code).then((ack) => {
      if (!cancel) setAttempt({ code, ack });
    });
    return () => {
      cancel = true;
    };
  }, [code, connected, reconnect, returning]);

  if (state?.code === code) {
    if (state.phase === "waiting" || state.players.length < 2) return <WaitingRoom />;
    if (state.phase === "lobby") return <Lobby />;
    return <GameShell />;
  }
  if (!hydrated) return <ScreenFallback label={t.connecting} />;
  if (!returning) return <JoinPanel code={code} message={null} />;
  if (!connected || !attempt || attempt.code !== code) return <ScreenFallback label={t.connecting} />;
  const ack = attempt.ack;
  if (!ack.ok && ack.reason === "not-found") return <MissingRoom />;
  if (ack.ok) return <ScreenFallback label={t.connecting} />;
  return <JoinPanel code={code} message={translateMessage(ack.message, t)} />;
}

function JoinPanel({ code, message }: { code: string; message: string | null }) {
  const { t } = useLocale();
  const router = useRouter();
  const { joinRoom } = useRoom();
  const storedName = useSyncExternalStore(subscribeSession, sessionNickname, () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nickname = draft ?? storedName;

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <Wordmark />
        <HeaderTools />
      </header>
      <main className="flex flex-1 flex-col justify-center">
        <p className="text-sm font-medium text-muted">{t.room}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-[0.18em]">{code}</h1>
        <p className="mt-3 text-muted">{t.joinPrompt}</p>
        <div className="mt-6 space-y-3">
          <TextField label={t.nickname} value={nickname} onChange={setDraft} placeholder="Ece" maxLength={16} />
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void joinRoom(code, nickname).then((ack) => {
                setPending(false);
                if (!ack.ok) setError(translateMessage(ack.message, t));
              });
            }}
          >
            {t.joinRoom}
          </Button>
          <ErrorNote message={error ?? message} />
        </div>
      </main>
      <button type="button" className="text-sm font-semibold text-muted" onClick={() => router.push("/")}>
        {t.backHome}
      </button>
    </Screen>
  );
}

function MissingRoom() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <Screen>
      <main className="grid flex-1 place-items-center text-center">
        <div>
          <h1 className="text-2xl font-bold">{t.roomNotFound}</h1>
          <p className="mt-2 text-muted">{t.roomClosed}</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            {t.backHome}
          </Button>
        </div>
      </main>
    </Screen>
  );
}
