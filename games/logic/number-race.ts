import type {
  ApplyOutcome,
  GameAction,
  NumberClient,
  NumberServer,
  Slot,
} from "../../types";
import { shuffle } from "./util";

export const NUMBER_GRID = 12;
export const NUMBER_CELLS = NUMBER_GRID * NUMBER_GRID;

const NUMBERS = Array.from({ length: 50 }, (_, index) => index + 1);

export function createNumberGame(random: () => number): NumberServer {
  return {
    kind: "number-race",
    boards: [emptyBoard(), emptyBoard()],
    fillerSlot: random() < 0.5 ? 0 : 1,
    roundPhase: "pick",
    target: null,
    layout: [],
  };
}

export function applyNumber(
  game: NumberServer,
  slot: Slot,
  action: GameAction,
  random: () => number,
): ApplyOutcome {
  if (action.type === "number:pick") return pickNumber(game, slot, action.number, random);
  if (action.type === "number:fill") return fillCells(game, slot, action.cells);
  if (action.type === "number:mark") return markNumber(game, slot, action.number);
  return invalid(game, "That move does not belong to Number Race.");
}

export function nextNumberRound(game: NumberServer): NumberServer {
  return {
    ...game,
    fillerSlot: game.fillerSlot === 0 ? 1 : 0,
    roundPhase: "pick",
    target: null,
    layout: [],
  };
}

export function numberView(game: NumberServer, slot: Slot): NumberClient {
  const finder = slot !== game.fillerSlot;
  const showLayout = finder && game.roundPhase !== "pick";
  return {
    kind: "number-race",
    filled: [count(game.boards[0]), count(game.boards[1])],
    yourBoard: game.boards[slot].slice(),
    fillerSlot: game.fillerSlot,
    roundPhase: game.roundPhase,
    target: game.target,
    layout: showLayout ? game.layout.slice() : null,
  };
}

function pickNumber(
  game: NumberServer,
  slot: Slot,
  number: number,
  random: () => number,
): ApplyOutcome {
  if (game.roundPhase !== "pick") return invalid(game, "The number is already chosen.");
  if (slot !== game.fillerSlot) return invalid(game, "Wait for your turn to choose.");
  if (!Number.isInteger(number) || number < 1 || number > 50) {
    return invalid(game, "Choose a number from 1 to 50.");
  }
  return {
    game: {
      ...game,
      target: number,
      layout: shuffle(NUMBERS, random),
      roundPhase: "race",
    },
    event: { type: "ok" },
  };
}

function fillCells(game: NumberServer, slot: Slot, cells: number[]): ApplyOutcome {
  if (game.roundPhase !== "race") return invalid(game, "You can fill during the race.");
  if (slot !== game.fillerSlot) return invalid(game, "Your friend is filling this round.");
  if (!Array.isArray(cells)) return invalid(game, "Pick squares on your board.");
  const board = game.boards[slot].slice();
  for (const cell of cells.slice(0, 48)) {
    if (Number.isInteger(cell) && cell >= 0 && cell < NUMBER_CELLS) board[cell] = true;
  }
  const boards: [boolean[], boolean[]] = [game.boards[0], game.boards[1]];
  boards[slot] = board;
  const next: NumberServer = { ...game, boards };
  if (count(board) >= NUMBER_CELLS) {
    return { game: next, event: { type: "win", winnerSlot: slot } };
  }
  return { game: next, event: { type: "ok" } };
}

function markNumber(game: NumberServer, slot: Slot, number: number): ApplyOutcome {
  if (game.roundPhase !== "race" || game.target === null) {
    return invalid(game, "There is nothing to find yet.");
  }
  if (slot === game.fillerSlot) return invalid(game, "You are filling the board this round.");
  if (number !== game.target) return invalid(game, "That's not the number.");
  return {
    game: { ...game, roundPhase: "found" },
    event: { type: "intermission" },
  };
}

function emptyBoard() {
  return Array<boolean>(NUMBER_CELLS).fill(false);
}

function count(board: boolean[]) {
  let filled = 0;
  for (const cell of board) if (cell) filled += 1;
  return filled;
}

function invalid(game: NumberServer, message: string): ApplyOutcome {
  return { game, event: { type: "invalid", message } };
}
