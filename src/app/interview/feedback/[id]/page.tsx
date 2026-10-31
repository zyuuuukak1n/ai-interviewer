"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Award, ArrowLeft, RefreshCw, CheckCircle, AlertCircle, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { RadarScoreChart } from "@/components/feedback/RadarScoreChart";
import { TurnByTurnReview } from "@/components/feedback/TurnByTurnReview";
import { localDb } from "@/lib/db-indexed";
import type { StructuredFeedbackData } from "@/types/feedback";

export default function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const searchParams = useSearchParams();
  const guestToken = searchParams.get("guestToken") || undefined;

  const [feedback, setFeedback] = useState<StructuredFeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeedback() {
      setIsLoading(true);
      setError(null);
      try {
        // まず IndexedDB に既にフィードバックがあるか確認
        const local = await localDb.interviews.get(sessionId);
        if (local?.feedback) {
          setFeedback(local.feedback);
          setIsLoading(false);
          return;
        }

        // サーバーにフィードバック生成を要求
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, guestToken }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "フィードバックの取得に失敗しました。");
        }

        const data = await res.json();
        setFeedback(data.report);

        // IndexedDB に保存更新
        if (local) {
          await localDb.interviews.update(sessionId, {
            feedback: data.report,
            status: "COMPLETED",
          });
        }
      } catch (err: any) {
        console.error("Feedback loading error:", err);
        setError(err.message || "フィードバックの取得中にエラーが発生しました。");
      } finally {
        setIsLoading(false);
      }
    }

    loadFeedback();
  }, [sessionId, guestToken]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Gemini 3.8 Flash が面接を分析中...</h2>
        <p className="text-sm text-slate-400 max-w-md">
          対話ログを精査し、論理的思考力・企業理解度など5軸のスコアリングと具体的な回答改善案を生成しています。
        </p>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4 text-center">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-rose-400" />
          <h3 className="text-lg font-bold mb-2">フィードバックを取得できませんでした</h3>
          <p className="text-sm mb-4">{error || "データが見つかりません。"}</p>
          <Link
            href="/interview/setup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            <span>新しく模擬面接を始める</span>
          </Link>
        </div>
      </div>
    );
  }

  const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
    S: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    A: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
    B: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
    C: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  };

  const currentGradeStyle = gradeColors[feedback.overallGrade] || gradeColors.B;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-10">
      {/* 画面上部ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>履歴一覧へ戻る</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">模擬面接 総合評価レポート</h1>
        </div>

        <Link
          href="/interview/setup"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>もう一度面接を受ける</span>
        </Link>
      </div>

      {/* 総合判定 & レーダーチャート */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左: 判定 & サマリー */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">総合評価判定</span>
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl font-extrabold shadow-lg ${currentGradeStyle.bg} ${currentGradeStyle.text} ${currentGradeStyle.border}`}
              >
                {feedback.overallGrade}
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-2">総合講評</h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 mb-6">
              {feedback.overallSummary}
            </p>

            {/* 強みと改善点 */}
            <div className="space-y-4">
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>高く評価された強み</span>
                </h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {feedback.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>さらに伸ばすべきポイント</span>
                </h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {feedback.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 右: レーダーチャート */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-slate-300 mb-2 text-center">5軸スキルバランス</h3>
          <RadarScoreChart scores={feedback.scores} />
        </div>
      </div>

      {/* 深掘り耐性レビュー */}
      {feedback.followUpResistance && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">深掘り質問耐性レビュー</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 mb-4">
            {feedback.followUpResistance.overallEvaluation}
          </p>

          <div className="space-y-3">
            {feedback.followUpResistance.items?.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>テーマ: {item.topic}</span>
                  <span className="text-blue-400 font-mono">一貫性スコア: {item.consistencyScore}/100</span>
                </div>
                <div className="text-slate-400"><strong>面接官の深掘り:</strong> "{item.drillDownQuestion}"</div>
                <div className="text-slate-300"><strong>評価:</strong> {item.evaluation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 回答別の改善提案（対比UI） */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Award className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">回答別の改善提案（プロの添削対比）</h3>
        </div>
        <TurnByTurnReview reviews={feedback.detailedReviews} />
      </div>
    </div>
  );
}

