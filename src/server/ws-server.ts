import type { IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "../lib/prisma";

const GEMINI_LIVE_MODEL = "models/gemini-3.8-live";
const MAX_INTERVIEW_DURATION_MS = 15 * 60 * 1000; // 15分上限

interface ProxySessionContext {
  sessionId: string;
  clientWs: WebSocket;
  geminiWs?: WebSocket;
  transcript: { role: "interviewer" | "user"; text: string; timestamp: number }[];
  startTime: number;
  timerId?: NodeJS.Timeout;
}

const activeSessions = new Map<string, ProxySessionContext>();

/**
 * WebSocketサーバーの初期化およびリクエストのルーティング
 */
export function setupWebSocketServer(wss: WebSocketServer) {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    try {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const sessionId = url.searchParams.get("sessionId");
      const guestToken = url.searchParams.get("guestToken");

      if (!sessionId) {
        ws.send(JSON.stringify({ type: "error", message: "Missing sessionId parameter" }));
        ws.close(1008, "Session ID required");
        return;
      }

      // セッションの存在と認可チェック
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        ws.send(JSON.stringify({ type: "error", message: "Interview session not found" }));
        ws.close(1008, "Session not found");
        return;
      }

      if (session.guestToken && guestToken && session.guestToken !== guestToken) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized access to interview session" }));
        ws.close(1008, "Unauthorized");
        return;
      }

      console.log(`[WS Server] Client connected for sessionId: ${sessionId}, guestToken: ${guestToken || "none"}`);

      // 既存セッションがあればクリーンアップ
      if (activeSessions.has(sessionId)) {
        console.log(`[WS Server] Cleaning up previous session for ${sessionId}`);
        const old = activeSessions.get(sessionId);
        old?.clientWs?.close();
        old?.geminiWs?.close();
        if (old?.timerId) clearTimeout(old.timerId);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.includes("DummyKey")) {
        console.error(`[WS Server Error] GEMINI_API_KEY is missing or invalid: ${apiKey ? "DummyKey detected" : "undefined"}`);
        ws.send(JSON.stringify({ type: "error", message: "サーバー側の GEMINI_API_KEY が未設定または無効です。.env の設定をご確認ください。" }));
        ws.close(1011, "API Key missing or invalid");
        return;
      }

      const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      console.log(`[WS Server] Connecting to Gemini Live API...`);
      const geminiWs = new WebSocket(geminiUrl);

      const sessionContext: ProxySessionContext = {
        sessionId,
        clientWs: ws,
        geminiWs,
        transcript: [],
        startTime: Date.now(),
      };

      activeSessions.set(sessionId, sessionContext);

      // 15分強制切断タイマー (レート制限保護)
      sessionContext.timerId = setTimeout(() => {
        ws.send(JSON.stringify({ type: "info", message: "15分間の面接時間上限に達したため終了します。" }));
        terminateSession(sessionId);
      }, MAX_INTERVIEW_DURATION_MS);

      // Gemini Live 接続ハンドラ
      geminiWs.on("open", () => {
        console.log(`[Gemini Live] Connected for session: ${sessionId}`);

        // 初期設定 (Setup) 送信
        const systemInstruction = session.personaInstruction || "あなたは優秀な面接官です。深掘り質問を行ってください。";
        const setupMessage = {
          setup: {
            model: GEMINI_LIVE_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        };

        geminiWs.send(JSON.stringify(setupMessage));
        ws.send(JSON.stringify({ type: "ready", message: "Gemini Live Connected" }));

        // AI面接官の最初の発話（オープニングリマーク）を自発的にスタートさせるトリガー
        setTimeout(() => {
          if (geminiWs.readyState === WebSocket.OPEN) {
            console.log(`[Gemini Live] Sending initial opening trigger for session: ${sessionId}`);
            const initialPrompt = {
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: "面接を開始します。応募者が面接室に入室しました。面接官として自己紹介と挨拶を行い、リラックスさせつつ最初の質問（簡単な自己紹介や志望動機など）を口頭で発話してください。",
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            };
            geminiWs.send(JSON.stringify(initialPrompt));
          }
        }, 500);
      });

      geminiWs.on("message", (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());

          // Geminiからの応答 (音声データ & テキスト) をクライアントに中継
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "gemini_response", payload: parsed }));
          }

          // トランスクリプトの集積
          if (parsed.serverContent?.modelTurn?.parts) {
            for (const part of parsed.serverContent.modelTurn.parts) {
              if (part.text) {
                sessionContext.transcript.push({
                  role: "interviewer",
                  text: part.text,
                  timestamp: Date.now(),
                });
              }
            }
          }
        } catch (err) {
          console.error("[Gemini Live] Parse error:", err);
        }
      });

      geminiWs.on("error", (err) => {
        console.error(`[Gemini Live Error] Session ${sessionId}:`, err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: `Gemini API 接続エラー: ${err.message}` }));
        }
      });

      geminiWs.on("close", (code, reason) => {
        const reasonStr = reason?.toString() || "";
        console.warn(`[Gemini Live WS Closed] Session: ${sessionId}, Code: ${code}, Reason: ${reasonStr}`);
        if (ws.readyState === WebSocket.OPEN && code !== 1000) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Gemini Live API 切断 (Code: ${code}, 理由: ${reasonStr || "不明"})。APIキーの権限・有効性をご確認ください。`,
            })
          );
        }
        terminateSession(sessionId);
      });

      // クライアントからのメッセージハンドラ
      ws.on("message", (messageData: any) => {
        try {
          const parsed = JSON.parse(messageData.toString());

          if (parsed.type === "audio_chunk") {
            // クライアントPCM音声 (16kHz base64) を Gemini Live へ転送
            if (geminiWs.readyState === WebSocket.OPEN) {
              const realtimeMsg = {
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: "audio/pcm;rate=16000",
                      data: parsed.data,
                    },
                  ],
                },
              };
              geminiWs.send(JSON.stringify(realtimeMsg));
            }
          } else if (parsed.type === "user_transcript") {
            // ユーザー発言の記録
            if (parsed.text) {
              sessionContext.transcript.push({
                role: "user",
                text: parsed.text,
                timestamp: Date.now(),
              });
            }
          } else if (parsed.type === "end_interview") {
            terminateSession(sessionId);
          }
        } catch (err) {
          console.error("[WS Proxy] Client message error:", err);
        }
      });

      ws.on("close", () => {
        terminateSession(sessionId);
      });
    } catch (err: any) {
      console.error("[WS Server] Connection error:", err);
      ws.close(1011, err.message || "Internal error");
    }
  });
}

/**
 * セッション終了処理 (DB永続化 & クリーンアップ)
 */
async function terminateSession(sessionId: string) {
  const ctx = activeSessions.get(sessionId);
  if (!ctx) return;

  if (ctx.timerId) clearTimeout(ctx.timerId);

  try {
    if (ctx.clientWs.readyState === WebSocket.OPEN) {
      ctx.clientWs.send(JSON.stringify({ type: "session_ended", message: "面接が終了しました。" }));
      ctx.clientWs.close();
    }
    if (ctx.geminiWs && ctx.geminiWs.readyState === WebSocket.OPEN) {
      ctx.geminiWs.close();
    }

    const durationSeconds = Math.round((Date.now() - ctx.startTime) / 1000);

    // トランスクリプトと経過時間をDBに保存
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        transcript: JSON.stringify(ctx.transcript),
        durationSeconds,
        status: "COMPLETED",
      },
    });
  } catch (err) {
    console.error(`[WS Server] Error persisting session ${sessionId}:`, err);
  } finally {
    activeSessions.delete(sessionId);
  }
}

