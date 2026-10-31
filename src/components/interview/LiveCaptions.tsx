"use client";

import { Eye, EyeOff } from "lucide-react";

interface LiveCaptionsProps {
  showCaptions: boolean;
  onToggleCaptions: () => void;
  lastInterviewerText: string;
  lastUserText: string;
}

export function LiveCaptions({
  showCaptions,
  onToggleCaptions,
  lastInterviewerText,
  lastUserText,
}: LiveCaptionsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <button
        onClick={onToggleCaptions}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors mb-3"
      >
        {showCaptions ? (
          <>
            <EyeOff className="h-3.5 w-3.5 text-blue-400" />
            <span>字幕を非表示にする</span>
          </>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span>字幕を表示する (本番練習はOFF推奨)</span>
          </>
        )}
      </button>

      {showCaptions && (
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md shadow-lg space-y-3 min-h-[90px] transition-all">
          {lastInterviewerText && (
            <div className="flex gap-2">
              <span className="shrink-0 text-xs font-bold text-blue-400 mt-0.5">面接官:</span>
              <p className="text-sm text-slate-200 leading-relaxed">{lastInterviewerText}</p>
            </div>
          )}
          {lastUserText && (
            <div className="flex gap-2">
              <span className="shrink-0 text-xs font-bold text-emerald-400 mt-0.5">あなた:</span>
              <p className="text-sm text-slate-300 leading-relaxed">{lastUserText}</p>
            </div>
          )}
          {!lastInterviewerText && !lastUserText && (
            <p className="text-xs text-slate-500 text-center py-2">発言があるとここに字幕が表示されます</p>
          )}
        </div>
      )}
    </div>
  );
}

