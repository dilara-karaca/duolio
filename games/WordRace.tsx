"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";

export function WordRace() {
  const { t } = useLocale();
  const { state, sendAction } = useRoom();
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (state?.game?.kind !== "word-race") return null;
  const game = state.game;

  async function submit() {
    setPending(true);
    const ack = await sendAction({ type: "word:submit", word }, true);
    setPending(false);
    if (!ack.ok) setError(translateMessage(ack.message, t));
    else setWord("");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center">
      <p className="text-sm font-medium text-muted">{t.wordHint}</p>
      <div className="mt-5 flex gap-3">
        {game.letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="grid size-24 place-items-center rounded-[28px] border border-line bg-card text-5xl font-bold shadow-card"
          >
            {letter}
          </span>
        ))}
      </div>
      <form
        className="mt-8 w-full space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          value={word}
          onChange={(event) => {
            setWord(event.target.value);
            setError(null);
          }}
          placeholder={t.yourWord}
          autoCapitalize="off"
          autoCorrect="off"
          maxLength={24}
          className="h-14 w-full rounded-2xl border border-line bg-card px-4 text-lg outline-none focus:border-accent"
        />
        <Button type="submit" className="w-full" disabled={pending || word.trim().length < 2}>
          {t.submit}
        </Button>
        {error ? <p className="text-center text-sm font-medium text-bad">{error}</p> : null}
      </form>
    </div>
  );
}
