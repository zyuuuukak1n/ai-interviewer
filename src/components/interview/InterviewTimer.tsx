"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface InterviewTimerProps {
  maxDurationSeconds?: number;
  onTimeLimitReached?: () => void;
}

export function InterviewTimer({
  maxDurationSeconds = 15 * 60,
  onTimeLimitReached,
}: InterviewTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) {
          clearInterval(timer);
          onTimeLimitReached?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [maxDurationSeconds, onTimeLimitReached]);

  const remaining = Math.max(0, maxDurationSeconds - elapsedSeconds);
  const remMinutes = Math.floor(remaining / 60);
  const remSec = remaining % 60;
  const formattedRemaining = `${remMinutes.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`;

  const isWarning = remaining <= 180; // 残り3分で警告表示

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md border ${
        isWarning
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300 animate-pulse"
          : "border-slate-700 bg-slate-800/60 text-slate-300"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>残り時間: {formattedRemaining}</span>
    </div>
  );
}
