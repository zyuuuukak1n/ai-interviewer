"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, MicOff, PhoneOff, AlertCircle, Building2, User, Send } from "lucide-react";
import { AudioVisualizer } from "@/components/interview/AudioVisualizer";
import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { LiveCaptions } from "@/components/interview/LiveCaptions";
import { localDb } from "@/lib/db-indexed";

export default function InterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const searchParams = useSearchParams();
  const guestToken = searchParams.get("guestToken") || undefined;
  const router = useRouter();

  const [companyName, setCompanyName] = useState<string>("志望企業");
  const [interviewerName, setInterviewerName] = useState<string>("面接官");
  const [interviewerRole, setInterviewerRole] = useState<string>("面接担当");
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false); // 本番緊張感維持のためデフォルトOFF
  const [lastInterviewerText, setLastInterviewerText] = useState("");
  const [lastUserText, setLastUserText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeechTextRef = useRef<string>("");

  // 1. セッション情報の読み込み
  useEffect(() => {
    async function loadSession() {
      try {
        const local = await localDb.interviews.get(sessionId);
        if (local) {
          setCompanyName(local.companyName);
          if (local.companyAnalysis?.interviewerPersona) {
            setInterviewerName(local.companyAnalysis.interviewerPersona.name);
            setInterviewerRole(local.companyAnalysis.interviewerPersona.roleTitle);
          }
        }
      } catch (e) {
        console.warn("Could not load local session info", e);
      }
    }
    loadSession();
  }, [sessionId]);

  // 2. WebSocket & オーディオパイプラインの初期化
  useEffect(() => {
    let ws: WebSocket;

    async function initAudioAndWs() {
      try {
        // マイクストリーム取得
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = stream;

        // Web Audio Context (再生用 24kHz)
        const playbackAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
        audioContextRef.current = playbackAudioCtx;

        // 入力用 AudioContext (16kHz PCM)
        const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });

        // WebSocket 接続
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const wsUrl = `${protocol}//${window.location.host}${basePath}/api/live-interview?sessionId=${sessionId}${
          guestToken ? `&guestToken=${guestToken}` : ""
        }`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          startMicStreaming(stream, inputAudioCtx, ws);
          startSpeechRecognition();
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "gemini_response") {
              handleGeminiMessage(data.payload);
            } else if (data.type === "session_ended") {
              handleInterviewComplete();
            } else if (data.type === "error") {
              console.error("[WS Server Error Message]:", data.message);
              setError(data.message);
            }
          } catch (err) {
            console.error("WS Message error:", err);
          }
        };

        ws.onerror = (e) => {
          console.error("WebSocket error:", e);
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          console.warn(`[Client WS Closed] code: ${event.code}, reason: ${event.reason}`);
          if (event.code !== 1000 && event.code !== 1005) {
            setError((prev) =>
              prev ||
              `リアルタイム面接サーバーとの接続に失敗しました (Code: ${event.code}${
                event.reason ? `, 理由: ${event.reason}` : ""
              })。`
            );
          }
        };
      } catch (err: any) {
        console.error("Init Error:", err);
        setError(
          err.name === "NotAllowedError"
            ? "マイクへのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。"
            : "音声対話環境の初期化に失敗しました。"
        );
      }
    }

    initAudioAndWs();

    // クリーンアップ
    return () => {
      cleanupResources();
    };
  }, [sessionId, guestToken]);

  // クライアント側 Web Speech API によるユーザー発話のリアルタイム字幕化
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        const trimmed = text.trim();
        if (trimmed) {
          setLastUserText(trimmed);
          currentSpeechTextRef.current = trimmed;

          // 発話が途切れて1.5秒経過したらターン完了としてサーバーへ送信
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
          }
          speechTimeoutRef.current = setTimeout(() => {
            if (
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN &&
              currentSpeechTextRef.current
            ) {
              console.log("[Client] Sending turn complete to AI:", currentSpeechTextRef.current);
              wsRef.current.send(
                JSON.stringify({
                  type: "user_turn_complete",
                  text: currentSpeechTextRef.current,
                })
              );
              currentSpeechTextRef.current = "";
            }
          }, 1500);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition warning:", e.error);
        }
      };

      // 途中で切断されても面接中は再開
      recognition.onend = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isFinishing) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("SpeechRecognition init error:", err);
    }
  };

  // マイク音声のキャプチャ & PCM 16kHz 送信
  const startMicStreaming = (
    stream: MediaStream,
    audioCtx: AudioContext,
    ws: WebSocket
  ) => {
    try {
      const source = audioCtx.createMediaStreamSource(stream);
      // バッファサイズ 4096 (低遅延送信)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMicMuted || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // 音量判定 (ユーザー発話検知)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setIsUserSpeaking(rms > 0.02);

        // Float32 -> Int16 PCM 変換
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 エンコードして送信
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Audio = btoa(binary);

        ws.send(
          JSON.stringify({
            type: "audio_chunk",
            data: base64Audio,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.error("Mic processing error:", err);
    }
  };

  // Gemini からの応答メッセージ処理
  const handleGeminiMessage = (payload: any) => {
    if (payload.serverContent?.modelTurn?.parts) {
      for (const part of payload.serverContent.modelTurn.parts) {
        // テキスト文字起こし
        if (part.text) {
          setLastInterviewerText((prev) => prev + " " + part.text);
        }

        // PCM 24kHz 音声再生
        if (part.inlineData?.data) {
          playAudioChunk(part.inlineData.data);
        }
      }
    }
  };

  // 音声チャンクの再生キュー処理
  const playAudioChunk = (base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // PCM 16bit 24kHz -> Float32 AudioBuffer
      const int16Array = new Int16Array(bytes.buffer);
      const audioCtx = audioContextRef.current;
      if (!audioCtx) return;

      const audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      playbackQueueRef.current.push(audioBuffer as any);
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const playNextInQueue = () => {
    if (playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAiSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsAiSpeaking(true);

    const buffer = playbackQueueRef.current.shift() as unknown as AudioBuffer;
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      playNextInQueue();
    };
    source.start();
  };

  const cleanupResources = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  };

  const handleSendTurnComplete = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    const textToSend = currentSpeechTextRef.current || lastUserText;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && textToSend) {
      console.log("[Client] Sending turn complete to AI:", textToSend);
      wsRef.current.send(
        JSON.stringify({
          type: "user_turn_complete",
          text: textToSend,
        })
      );
      currentSpeechTextRef.current = "";
    }
  };

  const handleFinishInterview = () => {
    setIsFinishing(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_interview" }));
    }
    // 少し待機後にフィードバック画面へ遷移
    setTimeout(() => {
      handleInterviewComplete();
    }, 1500);
  };

  const handleInterviewComplete = () => {
    cleanupResources();
    router.push(`/interview/feedback/${sessionId}${guestToken ? `?guestToken=${guestToken}` : ""}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-8 justify-between">
      {/* 上部ヘッダー情報 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{companyName} 模擬面接</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="h-3 w-3" />
              <span>面接官: {interviewerName} ({interviewerRole})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <InterviewTimer onTimeLimitReached={handleFinishInterview} />
          <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>{isConnected ? "接続中" : "接続待機中"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="my-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 中央: AI面接官波形ビジュアライザー */}
      <div className="flex flex-col items-center justify-center my-8">
        <div className="relative">
          <div className="h-44 w-44 sm:h-56 sm:w-56 rounded-full border-2 border-blue-500/30 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center shadow-2xl shadow-blue-500/10 overflow-hidden">
            <AudioVisualizer
              isAiSpeaking={isAiSpeaking}
              isUserSpeaking={isUserSpeaking}
              statusText={
                isAiSpeaking
                  ? "面接官が質問中..."
                  : isUserSpeaking
                  ? "あなたが回答中..."
                  : "面接官が傾聴しています"
              }
            />
          </div>
        </div>
      </div>

      {/* 下部: 字幕 & コントロールバー */}
      <div className="space-y-6">
        <LiveCaptions
          showCaptions={showCaptions}
          onToggleCaptions={() => setShowCaptions(!showCaptions)}
          lastInterviewerText={lastInterviewerText}
          lastUserText={lastUserText}
        />

        <div className="flex flex-wrap items-center justify-center gap-4 py-4">
          {/* マイクミュート */}
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
              isMicMuted
                ? "bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30"
                : "bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-emerald-400" />}
            <span>{isMicMuted ? "マイクOFF" : "マイクON"}</span>
          </button>

          {/* 回答完了送信ボタン */}
          <button
            onClick={handleSendTurnComplete}
            disabled={!lastUserText || isAiSpeaking}
            className="flex items-center gap-2 rounded-xl bg-blue-600/90 border border-blue-500/50 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            title="発話が終わったらクリックすると即座に面接官が返答します（自動でも1.5秒で送信されます）"
          >
            <Send className="h-4 w-4 text-blue-200" />
            <span>回答完了（面接官へ）</span>
          </button>

          {/* 面接終了ボタン */}
          <button
            onClick={handleFinishInterview}
            disabled={isFinishing}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <PhoneOff className="h-5 w-5" />
            <span>{isFinishing ? "評価集計中..." : "面接を終了して評価を見る"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

