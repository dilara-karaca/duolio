"use client";

import { useRef, useState } from "react";
import { PUZZLE_PICTURES } from "@/games/logic/catalog";
import { PIECE, STAGE_H, STAGE_W, correctTopLeft } from "@/games/logic/puzzle-layout";
import { puzzleSvg, svgDataUri } from "@/games/artwork";
import { useLocale } from "@/lib/i18n";
import { useRoom } from "@/lib/socket-context";
import { cx } from "@/components/ui";

export function PuzzleGame() {
  const { t } = useLocale();
  const { state, sendAction } = useRoom();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const sentAt = useRef(0);
  if (state?.game?.kind !== "puzzle") return null;
  const game = state.game;
  const picture = svgDataUri(puzzleSvg(game.imageId));
  const locked = game.pieces.filter((piece) => piece.locked).length;

  function locate(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * STAGE_W - PIECE / 2;
    const y = ((clientY - rect.top) / rect.height) * STAGE_H - PIECE / 2;
    return {
      x: Math.min(STAGE_W - PIECE, Math.max(0, x)),
      y: Math.min(STAGE_H - PIECE, Math.max(0, y)),
    };
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t.puzzleLocked(locked)}</p>
        <div className="flex gap-1">
          {PUZZLE_PICTURES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void sendAction({ type: "puzzle:image", imageId: item.id }, true)}
              className={cx(
                "h-9 rounded-full px-3 text-xs font-semibold",
                game.imageId === item.id ? "bg-accent text-accent-ink" : "bg-card",
              )}
            >
              {t.puzzlePics[item.id]}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={stageRef}
        className="relative w-full touch-none overflow-hidden rounded-[28px] bg-[#d9d4ee] dark:bg-[#252944]"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      >
        {Array.from({ length: 9 }, (_, id) => {
          const spot = correctTopLeft(id % 3, Math.floor(id / 3));
          return (
            <div
              key={`slot-${id}`}
              className="absolute rounded-lg border border-dashed border-white/80 bg-white/25"
              style={boxStyle(spot.x, spot.y)}
            />
          );
        })}
        {game.pieces.map((piece) => {
          const x = drag?.id === piece.id ? drag.x : piece.x;
          const y = drag?.id === piece.id ? drag.y : piece.y;
          return (
            <div
              key={piece.id}
              className="absolute rounded-lg border-2 border-white shadow-md"
              style={{
                ...boxStyle(x, y),
                backgroundImage: `url("${picture}")`,
                backgroundSize: "300% 300%",
                backgroundPosition: `${piece.col * 50}% ${piece.row * 50}%`,
                zIndex: drag?.id === piece.id ? 10 : piece.locked ? 1 : 5,
                touchAction: "none",
              }}
              onPointerDown={(event) => {
                if (piece.locked || state.phase !== "playing") return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragId.current = piece.id;
                setDrag({ id: piece.id, ...locate(event.clientX, event.clientY) });
              }}
              onPointerMove={(event) => {
                if (dragId.current !== piece.id) return;
                const next = locate(event.clientX, event.clientY);
                setDrag({ id: piece.id, ...next });
                const now = Date.now();
                if (now - sentAt.current < 40) return;
                sentAt.current = now;
                void sendAction({ type: "puzzle:move", id: piece.id, ...next });
              }}
              onPointerUp={(event) => {
                if (dragId.current !== piece.id) return;
                const next = locate(event.clientX, event.clientY);
                dragId.current = null;
                setDrag(null);
                void sendAction({ type: "puzzle:drop", id: piece.id, ...next });
              }}
            />
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted">{t.puzzleHint}</p>
    </div>
  );
}

function boxStyle(x: number, y: number) {
  return {
    left: `${x}%`,
    top: `${(y / STAGE_H) * 100}%`,
    width: `${PIECE}%`,
    height: `${(PIECE / STAGE_H) * 100}%`,
  };
}
