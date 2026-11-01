"use client";

import { useState } from "react";
import { playerName, cx } from "@/components/ui";
import { translateMessage, useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";
import type { Tile } from "@/types";

export function BombGame() {
  const { t } = useLocale();
  const { state, sendAction } = useRoom();
  const [error, setError] = useState<string | null>(null);
  if (state?.game?.kind !== "bomb") return null;
  const game = state.game;
  const opponent = playerName(state, state.yourSlot === 0 ? 1 : 0);

  async function act(action: Parameters<typeof sendAction>[0]) {
    const ack = await sendAction(action, true);
    setError(ack.ok ? null : translateMessage(ack.message, t));
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="text-center">
        <p className="text-sm font-medium text-muted">{t.bombsFound}</p>
        <p className="mt-1 text-2xl tracking-widest">
          {[0, 1, 2].map((index) => (
            <span key={index}>{index < game.yourFound ? "💣" : "○"}</span>
          ))}
        </p>
        <p className="mt-1 text-xs text-muted">{t.bombRule}</p>
      </div>
      {game.phase === "placing" ? (
        <section className="rounded-[28px] border border-line bg-card p-4 shadow-card">
          <h2 className="text-lg font-semibold">{t.hideBombs}</h2>
          <p className="mt-1 text-sm text-muted">
            {game.youReady
              ? game.opponentReady
                ? t.starting
                : t.waitingFriendShort
              : t.bombsSelected(game.yourBombs.length)}
          </p>
          <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
            {game.yourBoard.map((tile, index) => (
              <TileButton
                key={index}
                tile={tile}
                secret={game.yourBombs.includes(index)}
                disabled={game.youReady}
                onClick={() => void act({ type: "bomb:toggle", index })}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={game.youReady || game.yourBombs.length !== 3}
            onClick={() => void act({ type: "bomb:confirm" })}
            className="mt-4 h-12 w-full rounded-2xl bg-accent font-semibold text-accent-ink disabled:opacity-45"
          >
            {game.youReady ? t.bombsLocked : t.lockBombs}
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-[28px] border border-line bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{opponent}</h2>
              <span className="text-sm font-medium text-accent">
                {game.yourTurn ? t.yourTurn : t.theirTurn}
              </span>
            </div>
            <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
              {game.opponentBoard.map((tile, index) => (
                <TileButton
                  key={index}
                  tile={tile}
                  hot={game.last?.on === "opponent" && game.last.index === index}
                  disabled={!game.yourTurn || tile !== "hidden"}
                  onClick={() => void act({ type: "bomb:reveal", index })}
                />
              ))}
            </div>
          </section>
          <section className="rounded-[28px] border border-line bg-card p-4 shadow-card">
            <h2 className="text-sm font-semibold text-muted">{t.yourBoardFound(game.opponentFound)}</h2>
            <div className="mx-auto mt-3 grid max-w-[220px] grid-cols-3 gap-2">
              {game.yourBoard.map((tile, index) => (
                <TileButton
                  key={index}
                  tile={tile}
                  secret={tile === "hidden" && game.yourBombs.includes(index)}
                  hot={game.last?.on === "you" && game.last.index === index}
                  disabled
                />
              ))}
            </div>
          </section>
        </>
      )}
      {error ? <p className="text-center text-sm font-medium text-bad">{error}</p> : null}
    </div>
  );
}

function TileButton({
  tile,
  secret = false,
  hot = false,
  disabled,
  onClick,
}: {
  tile: Tile;
  secret?: boolean;
  hot?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "aspect-square rounded-2xl text-2xl font-semibold transition active:scale-95 disabled:active:scale-100",
        tile === "hidden" && "border border-line bg-paper",
        tile === "safe" && "bg-good/15 text-good",
        tile === "bomb" && "bg-bad/15",
        hot && "ring-2 ring-accent",
        disabled && tile === "hidden" && "disabled:opacity-100",
      )}
    >
      {tile === "bomb" ? "💣" : tile === "safe" ? "·" : secret ? "💣" : ""}
    </button>
  );
}
