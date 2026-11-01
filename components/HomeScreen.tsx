"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, HeaderTools, Screen, ScreenFallback, TextField, Wordmark } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { sessionCode, sessionNickname, subscribeSession } from "@/lib/session";
import { SINGLE_PLAYER_TEST_MODE, SOLO_TEST_NICKNAME } from "@/lib/single-player-test";
import { useRoom } from "@/lib/socket-context";

export function HomeScreen() {
  // TEMP: Single-player test mode. Re-enable room system before production.
  if (SINGLE_PLAYER_TEST_MODE) {
    return <SoloTestEntry />;
  }
  return <RoomHomeScreen />;
}

/** TEMP: boots straight into a solo lobby with a mock opponent. */
function SoloTestEntry() {
  const router = useRouter();
  const { t } = useLocale();
  const { createRoom, connected, state } = useRoom();
  const storedName = useSyncExternalStore(subscribeSession, sessionNickname, () => "");
  const activeCode = useSyncExternalStore(subscribeSession, sessionCode, () => "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.code) {
      router.replace(`/room/${state.code}`);
      return;
    }
    if (!connected) return;
    if (activeCode) {
      router.replace(`/room/${activeCode}`);
      return;
    }

    let cancel = false;
    const nickname = storedName.trim() || SOLO_TEST_NICKNAME;
    void createRoom(nickname).then((ack) => {
      if (cancel) return;
      if (!ack.ok) {
        setError(translateMessage(ack.message, t));
        return;
      }
      if (ack.code) router.replace(`/room/${ack.code}`);
    });
    return () => {
      cancel = true;
    };
  }, [activeCode, connected, createRoom, router, state?.code, storedName, t]);

  if (error) {
    return (
      <Screen>
        <header className="flex items-center justify-between">
          <Wordmark />
          <HeaderTools />
        </header>
        <main className="flex flex-1 flex-col justify-center">
          <ErrorNote message={error} />
        </main>
      </Screen>
    );
  }
  return <ScreenFallback label={t.connecting} />;
}

function RoomHomeScreen() {
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
