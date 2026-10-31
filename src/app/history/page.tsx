"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Calendar, Clock, ArrowRight, Building2, PlusCircle, CheckCircle, RefreshCw } from "lucide-react";
import { localDb, type LocalInterviewRecord } from "@/lib/db-indexed";
import { syncLocalInterviewsToServer } from "@/lib/sync-service";
import { useSession } from "@/lib/auth-client";

export default function HistoryPage() {
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<LocalInterviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadAllHistory = async () => {
    setIsLoading(true);
    try {
      // ログイン時は未同期レコードの自動同期を実行
      if (session?.user) {
        setIsSyncing(true);
        await syncLocalInterviewsToServer();
        setIsSyncing(false);
      }

      // IndexedDB から全履歴をロード
      const localRecords = await localDb.interviews.orderBy("createdAt").reverse().toArray();

      // ログイン中の場合はサーバー側の履歴も取得してマージ
      if (session?.user) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/api/interviews`);
        if (res.ok) {
          const data = await res.json();
          const serverList: LocalInterviewRecord[] = data.interviews.map((item: any) => ({
            id: item.id,
            companyName: item.companyName,
            targetRole: item.targetRole,
            interviewPhase: item.interviewPhase,
            targetUrl: item.targetUrl,
            durationSeconds: item.durationSeconds,
            status: item.status,
            syncedToServer: true,
            createdAt: new Date(item.createdAt).getTime(),
            updatedAt: new Date(item.updatedAt).getTime(),
            feedback: item.feedbackReport
              ? {
                  overallGrade: item.feedbackReport.overallGrade,
                  scores: {
                    scoreLogical: item.feedbackReport.scoreLogical,
                    scoreCompanyFit: item.feedbackReport.scoreCompanyFit,
                    scoreInitiative: item.feedbackReport.scoreInitiative,
                    scoreCommunication: item.feedbackReport.scoreCommunication,
                    scoreCultureFit: item.feedbackReport.scoreCultureFit,
                  },
                }
              : undefined,
          }));

          // ID重複排除してマージ
          const map = new Map<string, LocalInterviewRecord>();
          for (const s of serverList) map.set(s.id, s);
          for (const l of localRecords) {
            if (!map.has(l.id)) map.set(l.id, l);
          }
          setInterviews(Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt));
          setIsLoading(false);
          return;
        }
      }

      setInterviews(localRecords);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, [session]);

  const phaseNames: Record<string, string> = {
    FIRST_HR: "1次面接 (人事)",
    SECOND_MANAGER: "2次面接 (現場マネージャー)",
    FINAL_EXECUTIVE: "最終面接 (役員・代表)",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="h-7 w-7 text-blue-400" />
            <span>模擬面接 履歴一覧</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            過去に受けた模擬面接のフィードバックやスコアを振り返ることができます。
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <button
              onClick={loadAllHistory}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
              <span>同期</span>
            </button>
          )}

          <Link
            href="/interview/setup"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>新しく面接を受ける</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-400">履歴を読み込み中...</div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-md mx-auto">
          <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">受講履歴がありません</h3>
          <p className="text-xs text-slate-400 mb-6">
            企業情報を入力して、AI面接官による実践的な模擬面接を体験してみましょう。
          </p>
          <Link
            href="/interview/setup"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <span>模擬面接を始める</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((item) => (
            <Link
              key={item.id}
              href={`/interview/feedback/${item.id}${item.guestToken ? `?guestToken=${item.guestToken}` : ""}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/90"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-blue-400 shrink-0">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{item.companyName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>職種: {item.targetRole}</span>
                      <span>•</span>
                      <span className="text-blue-400">{phaseNames[item.interviewPhase] || item.interviewPhase}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                      {item.durationSeconds > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(item.durationSeconds / 60)}分{item.durationSeconds % 60}秒
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {item.feedback?.overallGrade ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">判定:</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-base font-black text-blue-400">
                        {item.feedback.overallGrade}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
                      面接中/未完了
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

