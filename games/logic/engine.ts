import type { ApplyOutcome, ClientGame, GameAction, GameId, ServerGame, Slot } from "../../types";
import { applyBomb, bombView, createBombGame } from "./bomb";
import { applyColoring, createColoringGame } from "./coloring";
import { applyMouse, createMouseGame } from "./mouse";
import { applyNumber, createNumberGame, nextNumberRound, numberView } from "./number-race";
import { applyPuzzle, createPuzzleGame } from "./puzzle";
import { applyWord, createWordGame } from "./word";

export function createGame(id: GameId, random: () => number = Math.random): ServerGame {
  switch (id) {
    case "mouse-cheese":
      return createMouseGame();
    case "bomb":
      return createBombGame();
    case "word-race":
      return createWordGame(random);
    case "number-race":
      return createNumberGame(random);
    case "coloring":
      return createColoringGame();
    case "puzzle":
      return createPuzzleGame(random);
  }
}

export function applyGameAction(
  game: ServerGame,
  slot: Slot,
  playerId: string,
  action: GameAction,
  random: () => number = Math.random,
): ApplyOutcome {
  switch (game.kind) {
    case "mouse-cheese":
      return action.type === "mouse:click"
        ? applyMouse(game, slot)
        : { game, event: { type: "invalid", message: "Tap to pull the mouse." } };
    case "bomb":
      return applyBomb(game, slot, action, random);
    case "word-race":
      return applyWord(game, slot, action);
    case "number-race":
      return applyNumber(game, slot, action, random);
    case "coloring":
      return applyColoring(game, playerId, action);
    case "puzzle":
      return applyPuzzle(game, slot, action, random);
  }
}

export function clientGameView(game: ServerGame, slot: Slot): ClientGame {
  switch (game.kind) {
    case "bomb":
      return bombView(game, slot);
    case "number-race":
      return numberView(game, slot);
    default:
      return game;
  }
}

export function continueIntermission(game: ServerGame): ServerGame {
  if (game.kind === "number-race" && game.roundPhase === "found") {
    return nextNumberRound(game);
  }
  return game;
}
