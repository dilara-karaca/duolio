export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const next = items.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

export function cleanNickname(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const nickname = input.replace(/\s+/g, " ").trim();
  if (nickname.length < 1 || nickname.length > 16) return null;
  if (/[\u0000-\u001f]/.test(nickname)) return null;
  return nickname;
}

export function cleanCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 6 ? code : null;
}

export function cleanPlayerId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    input,
  )
    ? input
    : null;
}
