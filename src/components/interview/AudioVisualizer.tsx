"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isAiSpeaking: boolean;
  isUserSpeaking: boolean;
  statusText?: string;
}

export function AudioVisualizer({ isAiSpeaking, isUserSpeaking, statusText }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // 背景の薄い円環
      const gradient = ctx.createRadialGradient(
        width / 2,
        centerY,
        10,
        width / 2,
        centerY,
        width / 2
      );
      if (isAiSpeaking) {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.2)");
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
      } else if (isUserSpeaking) {
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
      } else {
        gradient.addColorStop(0, "rgba(148, 163, 184, 0.05)");
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // サイン波形の描画
      const waveCount = isAiSpeaking || isUserSpeaking ? 4 : 2;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.lineWidth = 2.5 - i * 0.4;
        
        let strokeColor = "rgba(100, 116, 139, 0.4)";
        if (isAiSpeaking) {
          strokeColor = i === 0 ? "rgba(96, 165, 250, 0.9)" : `rgba(59, 130, 246, ${0.7 - i * 0.15})`;
        } else if (isUserSpeaking) {
          strokeColor = i === 0 ? "rgba(52, 211, 153, 0.9)" : `rgba(16, 185, 129, ${0.7 - i * 0.15})`;
        }
        ctx.strokeStyle = strokeColor;

        const amplitude = isAiSpeaking ? 30 - i * 5 : isUserSpeaking ? 22 - i * 4 : 4;
        const frequency = 0.015 + i * 0.005;

        for (let x = 0; x < width; x++) {
          const y =
            centerY +
            Math.sin(x * frequency + phase + (i * Math.PI) / 3) *
              amplitude *
              Math.sin((x / width) * Math.PI); // 端をフェードアウト
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += isAiSpeaking ? 0.08 : isUserSpeaking ? 0.06 : 0.02;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAiSpeaking, isUserSpeaking]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full max-w-[400px] h-[200px] rounded-2xl"
      />
      {statusText && (
        <div className="mt-2 text-xs font-medium tracking-wide text-slate-400">
          {statusText}
        </div>
      )}
    </div>
  );
}
