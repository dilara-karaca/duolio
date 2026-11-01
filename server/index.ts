import { createServer } from "node:http";
import { Server } from "socket.io";
import { attachRooms } from "./rooms";

const port = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("ok");
    return;
  }
  response.writeHead(404);
  response.end();
});

const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

attachRooms(io);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Duolio socket server listening on :${port}`);
});
