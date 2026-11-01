export type GameId =
  | "coloring"
  | "puzzle"
  | "number-race"
  | "mouse-cheese"
  | "bomb"
  | "word-race";

export type Phase = "waiting" | "lobby" | "countdown" | "playing" | "result";

export type Slot = 0 | 1;

export interface GameMeta {
  id: GameId;
  name: string;
  description: string;
  emoji: string;
  competitive: boolean;
}

export interface PublicPlayer {
  slot: Slot;
  nickname: string;
  connected: boolean;
}

export interface GameResult {
  winnerSlot: Slot | null;
  title: string;
  detail?: string;
  scored: boolean;
}

export interface RegionFill {
  id: string;
  playerId: string;
  color: string;
  x: number;
  y: number;
}

export type ColorOp = { op: "fill"; fill: RegionFill };

export type Tile = "hidden" | "safe" | "bomb";

export interface MouseGame {
  kind: "mouse-cheese";
  position: number;
  clicks: [number, number];
}

export interface BombServer {
  kind: "bomb";
  phase: "placing" | "playing";
  bombs: [number[], number[]];
  ready: [boolean, boolean];
  revealed: [boolean[], boolean[]];
  found: [number, number];
  turn: Slot;
  last: { attacker: Slot; index: number; bomb: boolean } | null;
}

export interface BombClient {
  kind: "bomb";
  phase: "placing" | "playing";
  yourBombs: number[];
  youReady: boolean;
  opponentReady: boolean;
  yourBoard: Tile[];
  opponentBoard: Tile[];
  yourFound: number;
  opponentFound: number;
  yourTurn: boolean;
  last: { on: "you" | "opponent"; index: number; bomb: boolean } | null;
}

export interface WordGame {
  kind: "word-race";
  letters: [string, string];
  winnerSlot: Slot | null;
  winningWord: string | null;
}

export interface NumberServer {
  kind: "number-race";
  boards: [boolean[], boolean[]];
  fillerSlot: Slot;
  roundPhase: "pick" | "race" | "found";
  target: number | null;
  layout: number[];
}

export interface NumberClient {
  kind: "number-race";
  filled: [number, number];
  yourBoard: boolean[];
  fillerSlot: Slot;
  roundPhase: "pick" | "race" | "found";
  target: number | null;
  layout: number[] | null;
}

export interface ColoringGame {
  kind: "coloring";
  imageId: string;
  fills: RegionFill[];
  revision: number;
}

export interface PuzzlePiece {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  locked: boolean;
}

export interface PuzzleGame {
  kind: "puzzle";
  imageId: string;
  pieces: PuzzlePiece[];
}

export type ServerGame =
  | MouseGame
  | BombServer
  | WordGame
  | NumberServer
  | ColoringGame
  | PuzzleGame;

export type ClientGame =
  | MouseGame
  | BombClient
  | WordGame
  | NumberClient
  | ColoringGame
  | PuzzleGame;

export interface ClientState {
  code: string;
  yourSlot: Slot;
  players: PublicPlayer[];
  scores: [number, number];
  phase: Phase;
  selectedGame: GameId | null;
  countdown: number | null;
  paused: boolean;
  game: ClientGame | null;
  result: GameResult | null;
}

export type GameAction =
  | { type: "mouse:click" }
  | { type: "bomb:toggle"; index: number }
  | { type: "bomb:confirm" }
  | { type: "bomb:reveal"; index: number }
  | { type: "word:submit"; word: string }
  | { type: "number:pick"; number: number }
  | { type: "number:fill"; cells: number[] }
  | { type: "number:mark"; number: number }
  | { type: "color:fill"; id: string; color: string; x: number; y: number }
  | { type: "color:undo" }
  | { type: "color:clear" }
  | { type: "color:finish" }
  | { type: "color:image"; imageId: string }
  | { type: "puzzle:move"; id: number; x: number; y: number }
  | { type: "puzzle:drop"; id: number; x: number; y: number }
  | { type: "puzzle:image"; imageId: string };

export type GameEvent =
  | { type: "ok" }
  | { type: "invalid"; message: string }
  | { type: "win"; winnerSlot: Slot; detail?: string }
  | { type: "done"; title: string; detail?: string }
  | { type: "intermission" };

export interface ApplyOutcome {
  game: ServerGame;
  event: GameEvent;
  relay?: ColorOp;
  quiet?: boolean;
}

export type Ack =
  | { ok: true; code?: string; state?: ClientState }
  | {
      ok: false;
      message: string;
      reason?: "not-found" | "not-member" | "full" | "invalid";
    };
