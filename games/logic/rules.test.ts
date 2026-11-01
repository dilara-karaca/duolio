import assert from "node:assert/strict";
import test from "node:test";
import type { BombServer, NumberServer, WordGame } from "../../types";
import { bombView } from "./bomb";
import { applyGameAction, continueIntermission, createGame } from "./engine";
import { MOUSE_STEP } from "./mouse";
import { NUMBER_CELLS } from "./number-race";
import { correctTopLeft } from "./puzzle-layout";

const player = "11111111-1111-4111-8111-111111111111";

test("mouse reaches a cheese after ten unopposed taps", () => {
  let game = createGame("mouse-cheese");
  for (let tap = 0; tap < 9; tap += 1) {
    const outcome = applyGameAction(game, 0, player, { type: "mouse:click" });
    game = outcome.game;
    assert.equal(outcome.event.type, "ok");
  }
  assert.equal(game.kind === "mouse-cheese" && game.position, 50 - 9 * MOUSE_STEP);
  const win = applyGameAction(game, 0, player, { type: "mouse:click" });
  assert.deepEqual(win.event, { type: "win", winnerSlot: 0 });
});

test("equal mouse taps keep the mouse in the middle", () => {
  let game = createGame("mouse-cheese");
  game = applyGameAction(game, 0, player, { type: "mouse:click" }).game;
  const outcome = applyGameAction(game, 1, player, { type: "mouse:click" });
  assert.equal(outcome.game.kind === "mouse-cheese" && outcome.game.position, 50);
  assert.equal(outcome.event.type, "ok");
});

test("finding the third bomb loses and earlier tiles cannot be reopened", () => {
  let game = createGame("bomb", () => 0);
  for (const slot of [0, 1] as const) {
    for (const index of [0, 1, 2]) {
      game = applyGameAction(game, slot, player, { type: "bomb:toggle", index }).game;
    }
    game = applyGameAction(game, slot, player, { type: "bomb:confirm" }, () => 0).game;
  }
  assert.equal(game.kind === "bomb" && game.phase, "playing");
  assert.equal(game.kind === "bomb" && game.turn, 0);

  const hidden = bombView(game as BombServer, 0);
  assert.deepEqual(hidden.opponentBoard, Array(9).fill("hidden"));
  assert.deepEqual(hidden.yourBombs, [0, 1, 2]);
  assert.equal(JSON.stringify(hidden).includes('"bombs"'), false);

  const sequence = [
    { slot: 0 as const, index: 0, type: "ok" },
    { slot: 1 as const, index: 3, type: "ok" },
    { slot: 0 as const, index: 1, type: "ok" },
    { slot: 1 as const, index: 4, type: "ok" },
    { slot: 0 as const, index: 2, type: "win" },
  ];
  for (const step of sequence) {
    const outcome = applyGameAction(game, step.slot, player, {
      type: "bomb:reveal",
      index: step.index,
    });
    game = outcome.game;
    assert.equal(outcome.event.type, step.type);
  }
  assert.equal(game.kind === "bomb" && game.found[0], 3);

  const reopened = applyGameAction(game, 1, player, { type: "bomb:reveal", index: 3 });
  assert.equal(reopened.event.type, "invalid");
});

test("word race accepts the first word that contains both letters", () => {
  const created = createGame("word-race");
  assert.equal(created.kind, "word-race");
  const game: WordGame = { ...created, letters: ["Ç", "M"] };
  const invalid = applyGameAction(game, 0, player, { type: "word:submit", word: "elma" });
  assert.equal(invalid.event.type, "invalid");
  const short = applyGameAction(game, 0, player, { type: "word:submit", word: "Ç" });
  assert.equal(short.event.type, "invalid");
  const win = applyGameAction(game, 1, player, { type: "word:submit", word: "çam" });
  assert.deepEqual(win.event, { type: "win", winnerSlot: 1, detail: "ÇAM" });
  const late = applyGameAction(win.game, 0, player, { type: "word:submit", word: "maç" });
  assert.equal(late.event.type, "invalid");
});

test("number race fills only on your turn and the full board wins", () => {
  const board = Array<boolean>(NUMBER_CELLS).fill(true);
  board[143] = false;
  const game: NumberServer = {
    kind: "number-race",
    boards: [board, Array<boolean>(NUMBER_CELLS).fill(false)],
    fillerSlot: 0,
    roundPhase: "race",
    target: 27,
    layout: [27, 1, 2],
  };
  const blocked = applyGameAction(game, 1, player, { type: "number:fill", cells: [0] });
  assert.equal(blocked.event.type, "invalid");
  const win = applyGameAction(game, 0, player, { type: "number:fill", cells: [143] });
  assert.deepEqual(win.event, { type: "win", winnerSlot: 0 });
});

test("finding the called number ends the round and swaps roles", () => {
  const game: NumberServer = {
    kind: "number-race",
    boards: [Array<boolean>(NUMBER_CELLS).fill(false), Array<boolean>(NUMBER_CELLS).fill(false)],
    fillerSlot: 0,
    roundPhase: "race",
    target: 27,
    layout: [4, 27],
  };
  const wrong = applyGameAction(game, 1, player, { type: "number:mark", number: 4 });
  assert.equal(wrong.event.type, "invalid");
  const found = applyGameAction(game, 1, player, { type: "number:mark", number: 27 });
  assert.equal(found.event.type, "intermission");
  const next = continueIntermission(found.game);
  assert.equal(next.kind === "number-race" && next.fillerSlot, 1);
  assert.equal(next.kind === "number-race" && next.roundPhase, "pick");
});

test("puzzle pieces lock on the correct square and complete together", () => {
  let game = createGame("puzzle", () => 0.25);
  assert.equal(game.kind, "puzzle");
  let last = "";
  for (const piece of [...game.pieces]) {
    const spot = correctTopLeft(piece.col, piece.row);
    const outcome = applyGameAction(game, 0, player, {
      type: "puzzle:drop",
      id: piece.id,
      x: spot.x,
      y: spot.y,
    });
    game = outcome.game;
    last = outcome.event.type;
  }
  assert.equal(last, "done");
  assert.equal(game.kind === "puzzle" && game.pieces.every((piece) => piece.locked), true);
});

test("coloring undo removes only your last fill", () => {
  let game = createGame("coloring");
  assert.equal(game.kind === "coloring" && game.imageId, "frogs");
  game = applyGameAction(game, 0, "player-a", {
    type: "color:fill",
    id: "fill-aaa-1",
    color: "#7c5cfc",
    x: 0.31,
    y: 0.48,
  }).game;
  game = applyGameAction(game, 0, "player-a", {
    type: "color:fill",
    id: "fill-aaa-2",
    color: "#1f9d62",
    x: 0.2,
    y: 0.2,
  }).game;
  game = applyGameAction(game, 1, "player-b", {
    type: "color:fill",
    id: "fill-bbb-1",
    color: "#e24b57",
    x: 0.62,
    y: 0.58,
  }).game;
  const undone = applyGameAction(game, 0, "player-a", { type: "color:undo" });
  assert.equal(undone.game.kind === "coloring" && undone.game.fills.length, 2);
  assert.equal(undone.game.kind === "coloring" && undone.game.fills[0].id, "fill-aaa-1");
  assert.equal(undone.game.kind === "coloring" && undone.game.fills[1].playerId, "player-b");
  const again = applyGameAction(undone.game, 0, "player-a", { type: "color:undo" });
  assert.equal(again.game.kind === "coloring" && again.game.fills.length, 1);
  assert.equal(again.game.kind === "coloring" && again.game.fills[0].playerId, "player-b");
  const empty = applyGameAction(again.game, 0, "player-a", { type: "color:undo" });
  assert.equal(empty.event.type, "invalid");
  const cleared = applyGameAction(again.game, 1, "player-b", { type: "color:clear" });
  assert.equal(cleared.game.kind === "coloring" && cleared.game.fills.length, 0);
  const finished = applyGameAction(cleared.game, 0, "player-a", { type: "color:finish" });
  assert.deepEqual(finished.event, { type: "done", title: "Finished!" });
});
