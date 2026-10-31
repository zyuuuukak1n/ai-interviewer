"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe, Briefcase, UserCheck, Sparkles, Loader2, FileText } from "lucide-react";
import { localDb } from "@/lib/db-indexed";
import type { InterviewPhaseType } from "@/types/interview";

export default function InterviewSetupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetRole, setTargetRole] = useState("総合職");
  const [interviewPhase, setInterviewPhase] = useState<InterviewPhaseType>("FIRST_HR");
  const [jobDescription, setJobDescription] = useState("");
  const [studentProfile, setStudentProfile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          targetUrl: targetUrl || undefined,
          targetRole,
          interviewPhase,
          jobDescription: jobDescription || undefined,
          studentProfile: studentProfile || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "企業解析に失敗しました。");
      }

      // クライアント側 IndexedDB にもセッションを保存 (ゲスト利用完全サポート)
      await localDb.interviews.put({
        id: data.sessionId,
        guestToken: data.guestToken,
        companyName,
        targetRole,
        interviewPhase,
        targetUrl: targetUrl || undefined,
        jobDescription: jobDescription || undefined,
        studentProfile: studentProfile || undefined,
        transcript: [],
        durationSeconds: 0,
        status: "SETUP",
        syncedToServer: !data.guestToken,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 面接ルームへ移動
      router.push(`/interview/room/${data.sessionId}${data.guestToken ? `?guestToken=${data.guestToken}` : ""}`);
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました。");
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">面接条件の設定</h1>
        <p className="mt-2 text-sm text-slate-400">
          志望企業の情報と面接フェーズを入力すると、AIが専属の面接官ペルソナを動的に構築します。
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
        {/* 企業名 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-1.5">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span>志望企業名 <span className="text-rose-400">*</span></span>
          </label>
          <input
            type="text"
            required
            placeholder="例: 株式会社メルカリ、トヨタ自動車"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 企業サイト / 採用ページ URL */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-1.5">
            <Globe className="h-4 w-4 text-blue-400" />
            <span>企業URL または 採用ページURL (任意)</span>
          </label>
          <input
            type="url"
            placeholder="https://example.com/careers"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            ※AIがサイトの事業内容・理念・求める人物像を安全に抽出し、面接官の思考回路に注入します。
          </p>
        </div>

        {/* 志望職種 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-1.5">
            <Briefcase className="h-4 w-4 text-blue-400" />
            <span>応募・志望職種 <span className="text-rose-400">*</span></span>
          </label>
          <input
            type="text"
            required
            placeholder="例: ソフトウェアエンジニア、法人営業、新規事業企画"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 面接フェーズの選択 */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-3">
            <UserCheck className="h-4 w-4 text-blue-400" />
            <span>面接フェーズの選択 <span className="text-rose-400">*</span></span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setInterviewPhase("FIRST_HR")}
              className={`rounded-xl border p-4 text-left transition-all ${
                interviewPhase === "FIRST_HR"
                  ? "border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500"
                  : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="text-sm font-bold">1次面接</div>
              <div className="text-xs text-blue-400 mt-0.5">人事担当者</div>
              <div className="mt-2 text-xs leading-relaxed text-slate-400">
                コミュニケーション・結論ファースト・ガクチカ深掘り重視
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInterviewPhase("SECOND_MANAGER")}
              className={`rounded-xl border p-4 text-left transition-all ${
                interviewPhase === "SECOND_MANAGER"
                  ? "border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500"
                  : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="text-sm font-bold">2次面接</div>
              <div className="text-xs text-indigo-400 mt-0.5">現場リーダー・マネージャー</div>
              <div className="mt-2 text-xs leading-relaxed text-slate-400">
                専門スキル・課題解決の再現性・事業への解像度重視
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInterviewPhase("FINAL_EXECUTIVE")}
              className={`rounded-xl border p-4 text-left transition-all ${
                interviewPhase === "FINAL_EXECUTIVE"
                  ? "border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500"
                  : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="text-sm font-bold">最終面接</div>
              <div className="text-xs text-amber-400 mt-0.5">役員・代表取締役</div>
              <div className="mt-2 text-xs leading-relaxed text-slate-400">
                企業理念への共感・カルチャーフィット・中長期ビジョン重視
              </div>
            </button>
          </div>
        </div>

        {/* 求人票テキスト (任意) */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-1.5">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>求人票・募集要項テキスト (任意)</span>
          </label>
          <textarea
            rows={3}
            placeholder="募集背景、必須要件、歓迎要件などを貼り付けると、より精緻な質問が設計されます。"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 自己PR・ガクチカ (任意) */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200 mb-1.5">
            <UserCheck className="h-4 w-4 text-blue-400" />
            <span>自己PR・ガクチカ・志望動機 (任意)</span>
          </label>
          <textarea
            rows={3}
            placeholder="ESに記載した内容を入力しておくと、面接官がESを読み込んだ状態で鋭く突っ込みます。"
            value={studentProfile}
            onChange={(e) => setStudentProfile(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 送信ボタン */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>企業情報を解析＆面接官ペルソナ構築中...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>AI面接官を生成して模擬面接を開始</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
