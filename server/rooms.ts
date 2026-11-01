import type { Server, Socket } from "socket.io";
import type {
  Ack,
  ClientState,
  GameAction,
  GameId,
  Phase,
  ServerGame,
  Slot,
} from "../types";
import { gameById } from "../games/logic/catalog";
import {
  applyGameAction,
  clientGameView,
  continueIntermission,
  createGame,
} from "../games/logic/engine";
import { cleanCode, cleanNickname, cleanPlayerId } from "../games/logic/util";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DISCONNECT_GRACE_MS = 45_000;
const FOUND_PAUSE_MS = 800;

interface Player {
  id: string;
  nickname: string;
  socketId: string;
  slot: Slot;
  connected: boolean;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

interface Room {
  code: string;
  players: Player[];
  scores: [number, number];
  phase: Phase;
  selectedGame: GameId | null;
  countdown: number | null;
  paused: boolean;
  game: ServerGame | null;
  result: ClientState["result"];
  timer?: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
}

const rooms = new Map<string, Room>();

export function attachRooms(io: Server) {
  io.on("connection", (socket) => {
    socket.on("room:create", (payload, ack) => {
      const nickname = cleanNickname(payload?.nickname);
      const playerId = cleanPlayerId(payload?.playerId);
      if (!nickname || !playerId) {
        reply(ack, { ok: false, message: "Nickname must be 1–16 characters.", reason: "invalid" });
        return;
      }
      removePlayerById(io, playerId);
      const room = createRoom(nickname, playerId, socket);
      reply(ack, { ok: true, code: room.code, state: view(room, playerId) });
      broadcast(io, room);
    });

    socket.on("room:join", (payload, ack) => {
      const nickname = cleanNickname(payload?.nickname);
      const playerId = cleanPlayerId(payload?.playerId);
      const code = cleanCode(payload?.code);
      if (!nickname || !playerId) {
        reply(ack, { ok: false, message: "Nickname must be 1–16 characters.", reason: "invalid" });
        return;
      }
      if (!code) {
        reply(ack, { ok: false, message: "Enter a 6-character room code.", reason: "invalid" });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        reply(ack, { ok: false, message: "Room not found.", reason: "not-found" });
        return;
      }
      const existing = room.players.find((player) => player.id === playerId);
      if (existing) {
        attachPlayer(socket, room, existing);
        reply(ack, { ok: true, code, state: view(room, playerId) });
        broadcast(io, room);
        return;
      }
      if (room.players.length >= 2) {
        reply(ack, { ok: false, message: "This room is full.", reason: "full" });
        return;
      }
      removePlayerById(io, playerId);
      const slot: Slot = room.players.some((player) => player.slot === 0) ? 1 : 0;
      const player: Player = {
        id: playerId,
        nickname,
        socketId: socket.id,
        slot,
        connected: true,
      };
      room.players.push(player);
      room.players.sort((a, b) => a.slot - b.slot);
      attachPlayer(socket, room, player);
      if (room.players.length === 2 && room.phase === "waiting") {
        room.phase = "lobby";
      }
      room.paused = room.players.some((item) => !item.connected);
      reply(ack, { ok: true, code, state: view(room, playerId) });
      broadcast(io, room);
    });

    socket.on("room:reconnect", (payload, ack) => {
      const playerId = cleanPlayerId(payload?.playerId);
      const code = cleanCode(payload?.code);
      if (!playerId || !code) {
        reply(ack, { ok: false, message: "You're not in this room.", reason: "not-member" });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        reply(ack, { ok: false, message: "Room not found.", reason: "not-found" });
        return;
      }
      const player = room.players.find((item) => item.id === playerId);
      if (!player) {
        reply(ack, { ok: false, message: "You're not in this room.", reason: "not-member" });
        return;
      }
      attachPlayer(socket, room, player);
      reply(ack, { ok: true, code, state: view(room, playerId) });
      broadcast(io, room);
    });

    socket.on("room:leave", (_payload, ack) => {
      const playerId = socket.data.playerId as string | undefined;
      const code = socket.data.roomCode as string | undefined;
      if (playerId && code) {
        const room = rooms.get(code);
        if (room) removePlayer(io, room, playerId);
      }
      socket.data.playerId = undefined;
      socket.data.roomCode = undefined;
      reply(ack, { ok: true });
    });

    socket.on("lobby:select", (payload, ack) => {
      const room = currentRoom(socket);
      const playerId = socket.data.playerId as string | undefined;
      if (!room || !playerId) {
        reply(ack, { ok: false, message: "You're not in this room.", reason: "not-member" });
        return;
      }
      const game = gameById(payload?.gameId ?? null);
      if (!game || room.phase !== "lobby") {
        reply(ack, { ok: false, message: "Choose a game from the lobby.", reason: "invalid" });
        return;
      }
      room.selectedGame = game.id;
      reply(ack, { ok: true, state: view(room, playerId) });
      broadcast(io, room);
    });

    socket.on("lobby:start", (_payload, ack) => {
      const room = currentRoom(socket);
      const playerId = socket.data.playerId as string | undefined;
      if (!room || !playerId) {
        reply(ack, { ok: false, message: "You're not in this room.", reason: "not-member" });
        return;
      }
      if (!canPlay(room) || !room.selectedGame) {
        reply(ack, {
          ok: false,
          message: room.selectedGame ? "Wait for your friend to reconnect." : "Choose a game to start.",
          reason: "invalid",
        });
        return;
      }
      const meta = gameById(room.selectedGame);
      reply(ack, { ok: true });
      if (meta?.competitive) startCountdown(io, room, () => beginGame(io, room));
      else beginGame(io, room);
    });

    socket.on("game:action", (action: GameAction, ack) => {
      const room = currentRoom(socket);
      const player = currentPlayer(socket, room);
      if (!room || !player || !room.game) {
        reply(ack, { ok: false, message: "The game is not running.", reason: "invalid" });
        return;
      }
      if (room.phase !== "playing" || room.paused) {
        reply(ack, { ok: false, message: "Wait for your friend to reconnect.", reason: "invalid" });
        return;
      }
      if (!action || typeof action !== "object" || typeof action.type !== "string") {
        reply(ack, { ok: false, message: "That move is not valid.", reason: "invalid" });
        return;
      }
      const outcome = applyGameAction(room.game, player.slot, player.id, action);
      if (outcome.event.type === "invalid") {
        reply(ack, { ok: false, message: outcome.event.message, reason: "invalid" });
        return;
      }
      room.game = outcome.game;
      reply(ack, { ok: true });
      if (outcome.relay) socket.to(`room:${room.code}`).emit("color:op", outcome.relay);
      if (outcome.quiet) return;
      const event = outcome.event;
      if (event.type === "win") {
        const winner = room.players.find((item) => item.slot === event.winnerSlot);
        finish(io, room, {
          winnerSlot: event.winnerSlot,
          title: `${winner?.nickname ?? "Player"} Wins!`,
          detail: event.detail,
          scored: true,
        });
        return;
      }
      if (event.type === "done") {
        finish(io, room, {
          winnerSlot: null,
          title: event.title,
          detail: event.detail,
          scored: false,
        });
        return;
      }
      if (event.type === "intermission") {
        broadcast(io, room);
        clearRoomTimer(room);
        room.timer = setTimeout(() => {
          const live = rooms.get(room.code);
          if (!live || live.phase !== "playing" || !live.game) return;
          live.game = continueIntermission(live.game);
          broadcast(io, live);
        }, FOUND_PAUSE_MS);
        return;
      }
      broadcast(io, room);
    });

    socket.on("game:again", (_payload, ack) => {
      const room = currentRoom(socket);
      if (!room || room.phase !== "result" || !room.selectedGame) {
        reply(ack, { ok: false, message: "This game is still going.", reason: "invalid" });
        return;
      }
      if (!canPlay(room)) {
        reply(ack, { ok: false, message: "Wait for your friend to reconnect.", reason: "invalid" });
        return;
      }
      const meta = gameById(room.selectedGame);
      reply(ack, { ok: true });
      if (meta?.competitive) startCountdown(io, room, () => beginGame(io, room));
      else beginGame(io, room);
    });

    socket.on("game:lobby", (_payload, ack) => {
      const room = currentRoom(socket);
      const playerId = socket.data.playerId as string | undefined;
      if (!room || !playerId) {
        reply(ack, { ok: false, message: "You're not in this room.", reason: "not-member" });
        return;
      }
      returnToLobby(room);
      reply(ack, { ok: true, state: view(room, playerId) });
      broadcast(io, room);
    });

    socket.on("disconnect", () => {
      const code = socket.data.roomCode as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      if (!code || !playerId) return;
      const room = rooms.get(code);
      const player = room?.players.find((item) => item.id === playerId);
      if (!room || !player || player.socketId !== socket.id) return;
      player.connected = false;
      room.paused = true;
      player.disconnectTimer = setTimeout(() => {
        const live = rooms.get(code);
        const still = live?.players.find((item) => item.id === playerId);
        if (!live || !still || still.connected) return;
        removePlayer(io, live, playerId);
      }, DISCONNECT_GRACE_MS);
      broadcast(io, room);
    });
  });
}

function createRoom(nickname: string, playerId: string, socket: Socket) {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  const player: Player = {
    id: playerId,
    nickname,
    socketId: socket.id,
    slot: 0,
    connected: true,
  };
  const room: Room = {
    code,
    players: [player],
    scores: [0, 0],
    phase: "waiting",
    selectedGame: null,
    countdown: null,
    paused: false,
    game: null,
    result: null,
  };
  rooms.set(code, room);
  attachPlayer(socket, room, player);
  return room;
}

function attachPlayer(socket: Socket, room: Room, player: Player) {
  const previousCode = socket.data.roomCode as string | undefined;
  if (previousCode && previousCode !== room.code) socket.leave(`room:${previousCode}`);
  player.socketId = socket.id;
  player.connected = true;
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = undefined;
  }
  room.paused = room.players.some((item) => !item.connected);
  socket.data.playerId = player.id;
  socket.data.roomCode = room.code;
  socket.join(`room:${room.code}`);
}

function currentRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  return code ? rooms.get(code) : undefined;
}

function currentPlayer(socket: Socket, room: Room | undefined) {
  const playerId = socket.data.playerId as string | undefined;
  return room?.players.find((player) => player.id === playerId);
}

function canPlay(room: Room) {
  return room.players.filter((player) => player.connected).length >= 2;
}

function beginGame(io: Server, room: Room) {
  if (!room.selectedGame) return;
  clearRoomTimer(room);
  room.game = createGame(room.selectedGame);
  room.result = null;
  room.countdown = null;
  room.phase = "playing";
  broadcast(io, room);
}

function startCountdown(io: Server, room: Room, onDone: () => void) {
  clearRoomTimer(room);
  room.phase = "countdown";
  room.countdown = 3;
  room.game = null;
  room.result = null;
  broadcast(io, room);
  const handle = setInterval(() => {
    const live = rooms.get(room.code);
    if (!live || live.phase !== "countdown") {
      clearInterval(handle);
      return;
    }
    live.countdown = (live.countdown ?? 1) - 1;
    if ((live.countdown ?? 0) <= 0) {
      clearRoomTimer(live);
      live.countdown = null;
      onDone();
      return;
    }
    broadcast(io, live);
  }, 1000);
  room.timer = handle;
}

function finish(io: Server, room: Room, result: NonNullable<ClientState["result"]>) {
  clearRoomTimer(room);
  if (result.scored && result.winnerSlot !== null) room.scores[result.winnerSlot] += 1;
  room.result = result;
  room.phase = "result";
  broadcast(io, room);
}

function returnToLobby(room: Room) {
  clearRoomTimer(room);
  room.game = null;
  room.result = null;
  room.countdown = null;
  room.selectedGame = null;
  room.phase = room.players.filter((player) => player.connected).length >= 2 ? "lobby" : "waiting";
}

function removePlayerById(io: Server, playerId: string) {
  for (const room of [...rooms.values()]) {
    if (room.players.some((player) => player.id === playerId)) {
      removePlayer(io, room, playerId);
    }
  }
}

function removePlayer(io: Server, room: Room, playerId: string) {
  const leaving = room.players.find((player) => player.id === playerId);
  if (!leaving) return;
  if (leaving.disconnectTimer) clearTimeout(leaving.disconnectTimer);
  room.players = room.players.filter((player) => player.id !== playerId);
  clearRoomTimer(room);
  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }
  const staying = room.players[0];
  const stayingScore = room.scores[staying.slot];
  staying.slot = 0;
  room.scores = [stayingScore, 0];
  room.phase = "waiting";
  room.game = null;
  room.result = null;
  room.selectedGame = null;
  room.countdown = null;
  room.paused = !staying.connected;
  broadcast(io, room);
}

function broadcast(io: Server, room: Room) {
  for (const player of room.players) {
    if (!player.connected) continue;
    io.to(player.socketId).emit("state", view(room, player.id));
  }
}

function view(room: Room, playerId: string): ClientState {
  const you = room.players.find((player) => player.id === playerId);
  return {
    code: room.code,
    yourSlot: you?.slot ?? 0,
    players: room.players.map((player) => ({
      slot: player.slot,
      nickname: player.nickname,
      connected: player.connected,
    })),
    scores: [room.scores[0], room.scores[1]],
    phase: room.phase,
    selectedGame: room.selectedGame,
    countdown: room.countdown,
    paused: room.players.some((player) => !player.connected),
    game: room.game && you ? clientGameView(room.game, you.slot) : null,
    result: room.result,
  };
}

function clearRoomTimer(room: Room) {
  if (!room.timer) return;
  clearTimeout(room.timer);
  clearInterval(room.timer);
  room.timer = undefined;
}

function makeCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function reply(ack: ((response: Ack) => void) | undefined, response: Ack) {
  if (typeof ack === "function") ack(response);
}
