import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { setupWebSocketServer } from "./src/server/ws-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3080", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // WebSocket Server の初期化 (noServer: true で HTTP Upgrade をインターセプト)
  const wss = new WebSocketServer({ noServer: true });
  setupWebSocketServer(wss);

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "", true);

    // /api/live-interview またはサブディレクトリ付き /tools/ai-interviewer/api/live-interview を許容
    if (
      pathname === "/api/live-interview" ||
      pathname === "/tools/ai-interviewer/api/live-interview"
    ) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Subdirectory Base Path: ${process.env.BASE_PATH || "/tools/ai-interviewer"}`);
  });
});

