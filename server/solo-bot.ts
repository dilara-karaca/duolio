import type { BombServer, NumberServer, ServerGame, Slot } from "../types";
import { BOMB_COUNT, TILE_COUNT, applyBomb } from "../games/logic/bomb";
import { applyNumber } from "../games/logic/number-race";
import { SINGLE_PLAYER_TEST_MODE, SOLO_BOT_ID, SOLO_BOT_NICKNAME } from "../lib/single-player-test";

// TEMP: Single-player test mode. Re-enable room system before production.

export interface SoloBotPlayer {
  id: string;
  nickname: string;
  socketId: string;
  slot: Slot;
  connected: boolean;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export function isSoloTestMode() {
  return SINGLE_PLAYER_TEST_MODE;
}

export function createSoloBot(slot: Slot = 1): SoloBotPlayer {
  return {
    id: SOLO_BOT_ID,
    nickname: SOLO_BOT_NICKNAME,
    socketId: "",
    slot,
    connected: true,
  };
}

export function isSoloBot(playerId: string | undefined) {
  return playerId === SOLO_BOT_ID;
}

/**
 * Sync bot steps that should happen right after a human action / game start.
 * Number-race "find" while the human fills is handled separately with a short delay.
 */
export function advanceSoloGame(game: ServerGame, random: () => number = Math.random): ServerGame {
  if (!SINGLE_PLAYER_TEST_MODE) return game;
  if (game.kind === "bomb") return advanceBomb(game, random);
  if (game.kind === "number-race") return advanceNumberPick(game, random);
  return game;
}

/** True when the bot should mark the target so the filler round can continue. */
export function soloNeedsDelayedNumberMark(game: ServerGame) {
  return (
    SINGLE_PLAYER_TEST_MODE &&
    game.kind === "number-race" &&
    game.roundPhase === "race" &&
    game.fillerSlot === 0 &&
    game.target !== null
  );
}

export function soloMarkNumberAsBot(game: NumberServer, random: () => number = Math.random): NumberServer {
  if (game.target === null) return game;
  const outcome = applyNumber(game, 1, { type: "number:mark", number: game.target }, random);
  return outcome.game as NumberServer;
}

function advanceBomb(game: BombServer, random: () => number): BombServer {
  let next = game;

  if (next.phase === "placing" && next.ready[0] && !next.ready[1]) {
    const taken = new Set(next.bombs[1]);
    const picks: number[] = [];
    while (picks.length < BOMB_COUNT) {
      const index = Math.floor(random() * TILE_COUNT);
      if (taken.has(index)) continue;
      taken.add(index);
      picks.push(index);
    }
    next = {
      ...next,
      bombs: [next.bombs[0], picks.sort((a, b) => a - b)],
    };
    const confirmed = applyBomb(next, 1, { type: "bomb:confirm" }, random);
    next = confirmed.game as BombServer;
  }

  // Bot takes its reveal turn so the human is not stuck waiting.
  while (next.phase === "playing" && next.turn === 1) {
    const open = next.revealed[0]
      .map((revealed, index) => (revealed ? -1 : index))
      .filter((index) => index >= 0);
    if (open.length === 0) break;
    const index = open[Math.floor(random() * open.length)]!;
    const outcome = applyBomb(next, 1, { type: "bomb:reveal", index }, random);
    next = outcome.game as BombServer;
    if (outcome.event.type === "win") break;
  }

  return next;
}

function advanceNumberPick(game: NumberServer, random: () => number): NumberServer {
  const botSlot: Slot = 1;
  if (game.roundPhase !== "pick" || game.fillerSlot !== botSlot) return game;
  const number = 1 + Math.floor(random() * 50);
  const outcome = applyNumber(game, botSlot, { type: "number:pick", number }, random);
  return outcome.game as NumberServer;
}
