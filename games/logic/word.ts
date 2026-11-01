import type { ApplyOutcome, GameAction, Slot, WordGame } from "../../types";
import { shuffle } from "./util";

const ALPHABET = [
  "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L",
  "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
];

export function createWordGame(random: () => number): WordGame {
  const [first, second] = shuffle(ALPHABET, random);
  return {
    kind: "word-race",
    letters: [first, second],
    winnerSlot: null,
    winningWord: null,
  };
}

export function wordError(word: string, letters: [string, string]): string | null {
  const normalized = word.trim().toLocaleUpperCase("tr-TR");
  if (normalized.length < 2) return "Word must be at least 2 letters.";
  if (normalized.length > 24) return "Keep the word under 24 letters.";
  if (!/^[\p{L}]+$/u.test(normalized)) return "Use letters only.";
  const missing = letters.filter(
    (letter) => !normalized.includes(letter.toLocaleUpperCase("tr-TR")),
  );
  if (missing.length > 0) {
    return `Your word must include ${letters.join(" and ")}.`;
  }
  return null;
}

export function applyWord(
  game: WordGame,
  slot: Slot,
  action: GameAction,
): ApplyOutcome {
  if (action.type !== "word:submit") {
    return { game, event: { type: "invalid", message: "Type a word to submit." } };
  }
  if (game.winnerSlot !== null) {
    return { game, event: { type: "invalid", message: "This round is already over." } };
  }
  const message = wordError(action.word, game.letters);
  if (message) return { game, event: { type: "invalid", message } };
  const winningWord = action.word.trim().toLocaleUpperCase("tr-TR");
  return {
    game: { ...game, winnerSlot: slot, winningWord },
    event: { type: "win", winnerSlot: slot, detail: winningWord },
  };
}
