const KEY = "duolio-player";
const listeners = new Set<() => void>();

export interface Session {
  playerId: string;
  nickname: string;
  code?: string;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sessionNickname() {
  return loadSession()?.nickname ?? "";
}

export function sessionCode() {
  return loadSession()?.code ?? "";
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
  listeners.forEach((listener) => listener());
}

export function ensureSession(): Session {
  const existing = loadSession();
  if (existing) return existing;
  const session = { playerId: crypto.randomUUID(), nickname: "" };
  saveSession(session);
  return session;
}
