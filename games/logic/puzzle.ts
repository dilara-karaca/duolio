import type { ApplyOutcome, GameAction, PuzzleGame, PuzzlePiece, Slot } from "../../types";
import { isPuzzleImage } from "./catalog";
import {
  LOCK_DISTANCE,
  PIECE,
  STAGE_H,
  STAGE_W,
  correctTopLeft,
  trayTopLeft,
} from "./puzzle-layout";
import { clamp, shuffle } from "./util";

export function createPuzzleGame(random: () => number, imageId = "coast"): PuzzleGame {
  const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], random);
  const pieces: PuzzlePiece[] = order.map((id, index) => {
    const spot = trayTopLeft(index, random);
    return {
      id,
      col: id % 3,
      row: Math.floor(id / 3),
      x: spot.x,
      y: spot.y,
      locked: false,
    };
  });
  return { kind: "puzzle", imageId, pieces };
}

export function applyPuzzle(
  game: PuzzleGame,
  _slot: Slot,
  action: GameAction,
  random: () => number,
): ApplyOutcome {
  if (action.type === "puzzle:image") {
    if (!isPuzzleImage(action.imageId)) {
      return { game, event: { type: "invalid", message: "That picture is not available." } };
    }
    return { game: createPuzzleGame(random, action.imageId), event: { type: "ok" } };
  }
  if (action.type !== "puzzle:move" && action.type !== "puzzle:drop") {
    return { game, event: { type: "invalid", message: "That move does not belong to Puzzle." } };
  }
  const piece = game.pieces.find((item) => item.id === action.id);
  if (!piece) return { game, event: { type: "invalid", message: "That piece is missing." } };
  if (piece.locked) return { game, event: { type: "invalid", message: "That piece is locked." } };
  if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) {
    return { game, event: { type: "invalid", message: "That position is invalid." } };
  }
  piece.x = clamp(action.x, 0, STAGE_W - PIECE);
  piece.y = clamp(action.y, 0, STAGE_H - PIECE);
  if (action.type === "puzzle:drop") {
    const correct = correctTopLeft(piece.col, piece.row);
    const distance = Math.hypot(piece.x - correct.x, piece.y - correct.y);
    if (distance <= LOCK_DISTANCE) {
      piece.x = correct.x;
      piece.y = correct.y;
      piece.locked = true;
    }
  }
  if (game.pieces.every((item) => item.locked)) {
    return { game, event: { type: "done", title: "Puzzle Complete! 🎉" } };
  }
  return { game, event: { type: "ok" } };
}
