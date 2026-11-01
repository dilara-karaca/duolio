"use client";

import { io, type Socket } from "socket.io-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Ack, ClientState, GameAction, GameId } from "@/types";
import { ensureSession, loadSession, saveSession } from "@/lib/session";

interface RoomContextValue {
  state: ClientState | null;
  connected: boolean;
  reconnect: (code: string) => Promise<Ack>;
  createRoom: (nickname: string) => Promise<Ack>;
  joinRoom: (code: string, nickname: string) => Promise<Ack>;
  leaveRoom: () => Promise<void>;
  selectGame: (gameId: GameId) => Promise<Ack>;
  startGame: () => Promise<Ack>;
  sendAction: (action: GameAction, wait?: boolean) => Promise<Ack>;
  playAgain: () => Promise<Ack>;
  backToLobby: () => Promise<Ack>;
  socket: Socket | null;
}

const RoomContext = createContext<RoomContextValue | null>(null);

function socketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window === "undefined") return "http://localhost:3001";
  const { protocol, hostname, port } = window.location;
  // Local / LAN: Next is on 3000, Socket.IO on 3001.
  if (hostname === "localhost" || hostname === "127.0.0.1" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return `${protocol}//${hostname}:3001`;
  }
  // Cursor / Codespaces style hosts often embed the port in the hostname.
  if (hostname.includes("-3000.") || hostname.includes(".3000.")) {
    return `${protocol}//${hostname.replace("3000", "3001")}`;
  }
  if (port === "3000") return `${protocol}//${hostname}:3001`;
  return `${protocol}//${hostname}`;
}

function emitAck(socket: Socket, event: string, payload: unknown) {
  return new Promise<Ack>((resolve) => {
    socket.timeout(8000).emit(event, payload, (error: Error | null, response: Ack) => {
      if (error) {
        resolve({ ok: false, message: "The room did not respond. Try again.", reason: "invalid" });
        return;
      }
      resolve(response);
    });
  });
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ClientState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const next = io(socketUrl(), { autoConnect: true });
    socketRef.current = next;
    const onConnect = () => {
      setSocket(next);
      setConnected(true);
    };
    const onDisconnect = () => setConnected(false);
    const onState = (incoming: ClientState) => {
      const session = loadSession();
      if (session?.code && session.code !== incoming.code) return;
      setState(incoming);
    };
    next.on("connect", onConnect);
    next.on("disconnect", onDisconnect);
    next.on("state", onState);
    return () => {
      next.off("connect", onConnect);
      next.off("disconnect", onDisconnect);
      next.off("state", onState);
      next.disconnect();
      socketRef.current = null;
    };
  }, []);

  const remember = useCallback((nickname: string, code: string) => {
    const session = ensureSession();
    saveSession({ playerId: session.playerId, nickname, code });
  }, []);

  const createRoom = useCallback(
    async (nickname: string) => {
      const current = socketRef.current;
      if (!current?.connected) {
        return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
      }
      const session = ensureSession();
      const ack = await emitAck(current, "room:create", { nickname, playerId: session.playerId });
      if (ack.ok && ack.state) {
        remember(ack.state.players.find((player) => player.slot === ack.state?.yourSlot)?.nickname || nickname, ack.state.code);
        setState(ack.state);
      }
      return ack;
    },
    [remember],
  );

  const joinRoom = useCallback(
    async (code: string, nickname: string) => {
      const current = socketRef.current;
      if (!current?.connected) {
        return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
      }
      const session = ensureSession();
      const ack = await emitAck(current, "room:join", {
        code,
        nickname,
        playerId: session.playerId,
      });
      if (ack.ok && ack.state) {
        remember(nickname, ack.state.code);
        setState(ack.state);
      }
      return ack;
    },
    [remember],
  );

  const reconnect = useCallback(async (code: string) => {
    const current = socketRef.current;
    const session = loadSession();
    if (!current?.connected || !session) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    const ack = await emitAck(current, "room:reconnect", { code, playerId: session.playerId });
    if (ack.ok && ack.state) setState(ack.state);
    if (!ack.ok && ack.reason === "not-found") {
      saveSession({ playerId: session.playerId, nickname: session.nickname });
      setState(null);
    }
    return ack;
  }, []);

  const leaveRoom = useCallback(async () => {
    const current = socketRef.current;
    const session = loadSession();
    if (session) saveSession({ playerId: session.playerId, nickname: session.nickname });
    setState(null);
    if (current?.connected) await emitAck(current, "room:leave", {});
  }, []);

  const selectGame = useCallback(async (gameId: GameId) => {
    const current = socketRef.current;
    if (!current?.connected) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    return emitAck(current, "lobby:select", { gameId });
  }, []);

  const startGame = useCallback(async () => {
    const current = socketRef.current;
    if (!current?.connected) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    return emitAck(current, "lobby:start", {});
  }, []);

  const sendAction = useCallback(async (action: GameAction, wait = false) => {
    const current = socketRef.current;
    if (!current?.connected) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    if (!wait) {
      current.emit("game:action", action);
      return { ok: true } as Ack;
    }
    return emitAck(current, "game:action", action);
  }, []);

  const playAgain = useCallback(async () => {
    const current = socketRef.current;
    if (!current?.connected) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    return emitAck(current, "game:again", {});
  }, []);

  const backToLobby = useCallback(async () => {
    const current = socketRef.current;
    if (!current?.connected) {
      return { ok: false, message: "Connecting to the game server…", reason: "invalid" } as Ack;
    }
    return emitAck(current, "game:lobby", {});
  }, []);

  const value = useMemo<RoomContextValue>(
    () => ({
      state,
      connected,
      reconnect,
      createRoom,
      joinRoom,
      leaveRoom,
      selectGame,
      startGame,
      sendAction,
      playAgain,
      backToLobby,
      socket,
    }),
    [
      state,
      connected,
      reconnect,
      createRoom,
      joinRoom,
      leaveRoom,
      selectGame,
      startGame,
      sendAction,
      playAgain,
      backToLobby,
      socket,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const value = useContext(RoomContext);
  if (!value) throw new Error("useRoom must be used inside SocketProvider");
  return value;
}
