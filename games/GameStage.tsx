"use client";

import { BombGame } from "@/games/BombGame";
import { ColoringGame } from "@/games/ColoringGame";
import { MouseCheese } from "@/games/MouseCheese";
import { NumberRace } from "@/games/NumberRace";
import { PuzzleGame } from "@/games/PuzzleGame";
import { WordRace } from "@/games/WordRace";
import { useRoom } from "@/lib/socket-context";

export function GameStage() {
  const { state } = useRoom();
  switch (state?.game?.kind) {
    case "mouse-cheese":
      return <MouseCheese />;
    case "bomb":
      return <BombGame />;
    case "word-race":
      return <WordRace />;
    case "number-race":
      return <NumberRace />;
    case "coloring":
      return <ColoringGame />;
    case "puzzle":
      return <PuzzleGame />;
    default:
      return null;
  }
}
