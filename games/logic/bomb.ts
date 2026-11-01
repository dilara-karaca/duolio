import type { ApplyOutcome, BombClient, BombServer, GameAction, Slot, Tile } from "../../types";

export const BOMB_COUNT = 3;
export const TILE_COUNT = 9;

export function createBombGame(): BombServer {
  return {
    kind: "bomb",
    phase: "placing",
    bombs: [[], []],
    ready: [false, false],
    revealed: [Array(TILE_COUNT).fill(false), Array(TILE_COUNT).fill(false)],
    found: [0, 0],
    turn: 0,
    last: null,
  };
}

export function applyBomb(
  game: BombServer,
  slot: Slot,
  action: GameAction,
  random: () => number,
): ApplyOutcome {
  if (action.type === "bomb:toggle") return toggleBomb(game, slot, action.index);
  if (action.type === "bomb:confirm") return confirmBombs(game, slot, random);
  if (action.type === "bomb:reveal") return revealTile(game, slot, action.index);
  return invalid(game, "That move does not belong to Bomb.");
}

export function bombView(game: BombServer, slot: Slot): BombClient {
  const opponent: Slot = slot === 0 ? 1 : 0;
  return {
    kind: "bomb",
    phase: game.phase,
    yourBombs: game.bombs[slot].slice(),
    youReady: game.ready[slot],
    opponentReady: game.ready[opponent],
    yourBoard: tiles(game, slot),
    opponentBoard: tiles(game, opponent),
    yourFound: game.found[slot],
    opponentFound: game.found[opponent],
    yourTurn: game.phase === "playing" && game.turn === slot,
    last: game.last
      ? {
          on: game.last.attacker === slot ? "opponent" : "you",
          index: game.last.index,
          bomb: game.last.bomb,
        }
      : null,
  };
}

function toggleBomb(game: BombServer, slot: Slot, index: number): ApplyOutcome {
  if (game.phase !== "placing" || game.ready[slot]) {
    return invalid(game, "You already locked your bombs.");
  }
  if (!isTile(index)) return invalid(game, "Pick a tile on your board.");
  const selected = new Set(game.bombs[slot]);
  if (selected.has(index)) selected.delete(index);
  else if (selected.size >= BOMB_COUNT) {
    return invalid(game, "You can only hide 3 bombs.");
  } else selected.add(index);
  const bombs: [number[], number[]] = [game.bombs[0], game.bombs[1]];
  bombs[slot] = [...selected].sort((a, b) => a - b);
  return { game: { ...game, bombs }, event: { type: "ok" } };
}

function confirmBombs(
  game: BombServer,
  slot: Slot,
  random: () => number,
): ApplyOutcome {
  if (game.phase !== "placing") return invalid(game, "The round already started.");
  if (game.bombs[slot].length !== BOMB_COUNT) {
    return invalid(game, "Hide exactly 3 bombs.");
  }
  const ready: [boolean, boolean] = [game.ready[0], game.ready[1]];
  ready[slot] = true;
  if (ready[0] && ready[1]) {
    return {
      game: {
        ...game,
        ready,
        phase: "playing",
        turn: random() < 0.5 ? 0 : 1,
      },
      event: { type: "ok" },
    };
  }
  return { game: { ...game, ready }, event: { type: "ok" } };
}

function revealTile(game: BombServer, slot: Slot, index: number): ApplyOutcome {
  if (game.phase !== "playing") return invalid(game, "Place your bombs first.");
  if (game.turn !== slot) return invalid(game, "Wait for your turn.");
  if (!isTile(index)) return invalid(game, "Pick a tile.");
  const opponent: Slot = slot === 0 ? 1 : 0;
  if (game.revealed[opponent][index]) {
    return invalid(game, "That tile is already open.");
  }
  const revealed: [boolean[], boolean[]] = [
    game.revealed[0].slice(),
    game.revealed[1].slice(),
  ];
  revealed[opponent][index] = true;
  const bomb = game.bombs[opponent].includes(index);
  const found: [number, number] = [game.found[0], game.found[1]];
  if (bomb) found[slot] += 1;
  const next: BombServer = {
    ...game,
    revealed,
    found,
    last: { attacker: slot, index, bomb },
    turn: opponent,
  };
  if (bomb && found[slot] >= BOMB_COUNT) {
    return { game: next, event: { type: "win", winnerSlot: opponent } };
  }
  return { game: next, event: { type: "ok" } };
}

function tiles(game: BombServer, slot: Slot): Tile[] {
  return game.revealed[slot].map((open, index) => {
    if (!open) return "hidden";
    return game.bombs[slot].includes(index) ? "bomb" : "safe";
  });
}

function isTile(index: number) {
  return Number.isInteger(index) && index >= 0 && index < TILE_COUNT;
}

function invalid(game: BombServer, message: string): ApplyOutcome {
  return { game, event: { type: "invalid", message } };
}
