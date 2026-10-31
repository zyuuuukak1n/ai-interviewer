"use client";

import type { TurnReview } from "@/types/feedback";
import { MessageSquareQuote, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

interface TurnByTurnReviewProps {
  reviews: TurnReview[];
}

export function TurnByTurnReview({ reviews }: TurnByTurnReviewProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
        詳細な回答ログはありません。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((item, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm transition-all hover:border-slate-700"
        >
          {/* 面接官の質問 */}
          <div className="flex items-start gap-2.5 mb-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400 border border-blue-500/20">
              Q{idx + 1}
            </span>
            <h4 className="text-base font-semibold text-white leading-snug">{item.question}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 学生の回答 & 課題分析 */}
            <div className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
                  <MessageSquareQuote className="h-4 w-4" />
                  <span>あなたの回答</span>
                </div>
                <p className="text-sm text-slate-200 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 leading-relaxed italic">
                  "{item.studentAnswer}"
                </p>
              </div>

              <div className="space-y-2 border-t border-rose-500/10 pt-3">
                <div className="flex items-start gap-1.5 text-xs text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <span><strong>浅く聞こえた理由:</strong> {item.shallowReason}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span><strong>面接官の懸念:</strong> {item.interviewerConcern}</span>
                </div>
              </div>
            </div>

            {/* 合格レベルの改善回答例 */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>通過率が上がる改善回答例</span>
                </div>
                <p className="text-sm text-slate-100 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 leading-relaxed font-medium">
                  {item.betterAnswer}
                </p>
              </div>

              <div className="text-xs text-emerald-300/80 border-t border-emerald-500/10 pt-2 flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                <span>結論ファースト（PREP法）と具体的な行動・数値根拠を明確に</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
