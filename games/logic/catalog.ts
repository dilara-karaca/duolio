import type { GameId, GameMeta } from "../../types";

export const GAMES: GameMeta[] = [
  {
    id: "coloring",
    name: "Coloring",
    description: "Paint together on the same canvas.",
    emoji: "🎨",
    competitive: false,
  },
  {
    id: "puzzle",
    name: "Puzzle",
    description: "Complete one puzzle together.",
    emoji: "🧩",
    competitive: false,
  },
  {
    id: "number-race",
    name: "Number Race",
    description: "Find numbers while filling your board.",
    emoji: "🔢",
    competitive: true,
  },
  {
    id: "mouse-cheese",
    name: "Mouse & Cheese",
    description: "Click fast and feed the mouse first.",
    emoji: "🐭",
    competitive: true,
  },
  {
    id: "bomb",
    name: "Bomb",
    description: "Find your opponent's bombs without hitting the third one.",
    emoji: "💣",
    competitive: true,
  },
  {
    id: "word-race",
    name: "Word Race",
    description: "Create a word from the letters before your opponent.",
    emoji: "🔤",
    competitive: true,
  },
];

export const COLORING_PAGES = [
  { id: "arcade", file: "arcade.png" },
  { id: "astronaut", file: "astronot.png" },
  { id: "bikeRide", file: "bisiklet_gezisi.png" },
  { id: "library", file: "büyülü_kütüphane.png" },
  { id: "picnic", file: "gece_piknik.png" },
  { id: "tokyo", file: "japon_sokak.png" },
  { id: "cafe", file: "kafe.png" },
  { id: "track", file: "pist.png" },
  { id: "squirrels", file: "sincaplar.png" },
] as const;

export const PUZZLE_PICTURES = [
  { id: "coast", label: "Coast" },
  { id: "city", label: "City" },
  { id: "garden", label: "Garden" },
] as const;

export type ColoringImageId = (typeof COLORING_PAGES)[number]["id"];
export type PuzzleImageId = (typeof PUZZLE_PICTURES)[number]["id"];

export function gameById(id: GameId | null): GameMeta | undefined {
  return GAMES.find((game) => game.id === id);
}

export function isColoringImage(id: string): id is ColoringImageId {
  return COLORING_PAGES.some((page) => page.id === id);
}

export function isPuzzleImage(id: string): id is PuzzleImageId {
  return PUZZLE_PICTURES.some((picture) => picture.id === id);
}

export function coloringPageSrc(id: string) {
  const page = COLORING_PAGES.find((item) => item.id === id) ?? COLORING_PAGES[0];
  return `/coloring/${encodeURIComponent(page.file)}`;
}
