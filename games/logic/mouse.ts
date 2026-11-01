import type { ApplyOutcome, MouseGame, Slot } from "../../types";

export const MOUSE_START = 50;
export const MOUSE_STEP = 5;

export function createMouseGame(): MouseGame {
  return { kind: "mouse-cheese", position: MOUSE_START, clicks: [0, 0] };
}

export function applyMouse(
  game: MouseGame,
  slot: Slot,
): ApplyOutcome {
  const position = clampPosition(
    game.position + (slot === 0 ? -MOUSE_STEP : MOUSE_STEP),
  );
  const clicks: [number, number] = [game.clicks[0], game.clicks[1]];
  clicks[slot] += 1;
  const next: MouseGame = { ...game, position, clicks };
  if (position <= 0) {
    return { game: next, event: { type: "win", winnerSlot: 0 } };
  }
  if (position >= 100) {
    return { game: next, event: { type: "win", winnerSlot: 1 } };
  }
  return { game: next, event: { type: "ok" } };
}

function clampPosition(position: number) {
  return Math.min(100, Math.max(0, position));
}
