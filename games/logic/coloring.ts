import type { ApplyOutcome, ColoringGame, GameAction, RegionFill } from "../../types";
import { COLORING_PAGES, isColoringImage } from "./catalog";
import { isPaletteHex } from "./palette";

const MAX_FILLS = 400;
const DEFAULT_IMAGE = COLORING_PAGES[0].id;

export function createColoringGame(imageId: string = DEFAULT_IMAGE): ColoringGame {
  return {
    kind: "coloring",
    imageId: isColoringImage(imageId) ? imageId : DEFAULT_IMAGE,
    fills: [],
    revision: 1,
  };
}

export function applyColoring(game: ColoringGame, playerId: string, action: GameAction): ApplyOutcome {
  if (action.type === "color:fill") return addFill(game, playerId, action);
  if (action.type === "color:undo") return undoFill(game, playerId);
  if (action.type === "color:clear") {
    return {
      game: { ...game, fills: [], revision: game.revision + 1 },
      event: { type: "ok" },
    };
  }
  if (action.type === "color:image") {
    if (!isColoringImage(action.imageId)) {
      return { game, event: { type: "invalid", message: "That picture is not available." } };
    }
    if (action.imageId === game.imageId) return { game, event: { type: "ok" }, quiet: true };
    return {
      game: { ...game, imageId: action.imageId, fills: [], revision: game.revision + 1 },
      event: { type: "ok" },
    };
  }
  if (action.type === "color:finish") {
    return { game, event: { type: "done", title: "Finished!" } };
  }
  return { game, event: { type: "invalid", message: "That tool is not available." } };
}

function addFill(
  game: ColoringGame,
  playerId: string,
  action: Extract<GameAction, { type: "color:fill" }>,
): ApplyOutcome {
  if (!isFillId(action.id)) return invalid(game, "Could not color that region.");
  if (game.fills.some((fill) => fill.id === action.id)) {
    return { game, event: { type: "ok" }, quiet: true };
  }
  if (game.fills.length >= MAX_FILLS) {
    return invalid(game, "The page is full. Undo or clear to keep coloring.");
  }
  if (!isPaletteHex(action.color)) return invalid(game, "Pick a color from the palette.");
  if (!isUnit(action.x) || !isUnit(action.y)) return invalid(game, "That spot is outside the page.");

  const fill: RegionFill = {
    id: action.id,
    playerId,
    color: action.color.toLowerCase(),
    x: action.x,
    y: action.y,
  };
  return {
    game: { ...game, fills: [...game.fills, fill] },
    event: { type: "ok" },
    quiet: true,
    relay: { op: "fill", fill },
  };
}

function undoFill(game: ColoringGame, playerId: string): ApplyOutcome {
  const index = game.fills.findLastIndex((fill) => fill.playerId === playerId);
  if (index < 0) return invalid(game, "Nothing to undo.");
  const fills = game.fills.slice();
  fills.splice(index, 1);
  return { game: { ...game, fills, revision: game.revision + 1 }, event: { type: "ok" } };
}

function isFillId(id: string) {
  return typeof id === "string" && /^[a-zA-Z0-9-]{8,60}$/.test(id);
}

function isUnit(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function invalid(game: ColoringGame, message: string): ApplyOutcome {
  return { game, event: { type: "invalid", message } };
}
