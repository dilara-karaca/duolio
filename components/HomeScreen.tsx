"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, HeaderTools, Screen, TextField, Wordmark } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { sessionCode, sessionNickname, subscribeSession } from "@/lib/session";
import { useRoom } from "@/lib/socket-context";

export function HomeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { createRoom, joinRoom } = useRoom();
  const storedName = useSyncExternalStore(subscribeSession, sessionNickname, () => "");
  const activeCode = useSyncExternalStore(subscribeSession, sessionCode, () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nickname = draft ?? storedName;

  async function onCreate() {
    setPending(true);
    setError(null);
    const ack = await createRoom(nickname);
    setPending(false);
    if (!ack.ok) {
      setError(translateMessage(ack.message, t));
      return;
    }
    if (ack.code) router.push(`/room/${ack.code}`);
  }

  async function onJoin() {
    setPending(true);
    setError(null);
    const ack = await joinRoom(code, nickname);
    setPending(false);
    if (!ack.ok) {
      setError(translateMessage(ack.message, t));
      return;
    }
    if (ack.code) router.push(`/room/${ack.code}`);
  }

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <Wordmark />
        <HeaderTools />
      </header>
      <main className="flex flex-1 flex-col justify-center py-8">
        <div className="animate-rise">
          <h1 className="max-w-sm text-4xl font-bold tracking-tight sm:text-5xl">{t.headline}</h1>
          <p className="mt-4 text-lg text-muted">{t.subhead}</p>
        </div>
        <div className="mt-8 space-y-3 rounded-[28px] border border-line bg-card p-4 shadow-card">
          <TextField
            label={t.nickname}
            value={nickname}
            onChange={setDraft}
            placeholder="Anıl"
            maxLength={16}
          />
          <Button className="w-full" disabled={pending} onClick={() => void onCreate()}>
            {t.createRoom}
          </Button>
          {joining ? (
            <div className="space-y-3">
              <TextField
                label={t.roomCode}
                value={code}
                onChange={(value) => setCode(value.toUpperCase())}
                placeholder="AB7K29"
                autoCapitalize="characters"
                maxLength={6}
              />
              <Button variant="secondary" className="w-full" disabled={pending} onClick={() => void onJoin()}>
                {t.joinRoom}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setJoining(true)}>
              {t.joinRoom}
            </Button>
          )}
          <ErrorNote message={error} />
        </div>
        {activeCode ? (
          <button
            type="button"
            onClick={() => router.push(`/room/${activeCode}`)}
            className="mt-4 text-sm font-semibold text-accent"
          >
            {t.returnToRoom(activeCode)}
          </button>
        ) : null}
      </main>
    </Screen>
  );
}
