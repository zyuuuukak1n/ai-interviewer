import Link from "next/link";
import { Sparkles, Mic, FileText, ArrowRight, ShieldCheck, Zap, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gemini 3.8 Live 搭載・超低遅延リアルタイム音声対話</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          志望企業専属の面接官が、
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            本気の深掘り面接
          </span>
          を展開。
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
          企業URLや求人票を入力するだけで、AIが求める人物像やカルチャーを即座に解析。
          音声による本番さながらの1次・2次・最終模擬面接と、5軸スコアリングによる鋭いフィードバックを提供します。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/interview/setup"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>模擬面接を始める</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/history"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <span>面接履歴を見る</span>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ログイン不要ですぐに体験可能
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            URL自動スクレイピング・解析
          </span>
        </div>
      </section>

      {/* 3つのコア機能 */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            圧倒的な内定率向上をもたらす3つの革新性
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            定型文のやりとりではなく、志望企業の実態に踏み込んだ本気の模擬面接
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-5">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">企業専属ペルソナ動的生成</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              コーポレートサイトや採用URLから企業理念・事業課題・求める人物像を安全にスクレイピング。1次・2次・最終のフェーズに合わせた面接官をAIが自動構築します。
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-5">
              <Mic className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Gemini 3.8 Live 音声対話</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              超低遅延のリアルタイム双方向音声で、本番さながらの緊迫感を再現。学生の曖昧な受け答えに対して「Why / How」の容赦ない3段階深掘りを実行します。
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-400 mb-5">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">5軸スコア＆回答別改善対比</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              論理的思考力・企業理解度など5軸レーダーチャートで総合評価。実際の発言を引用し、「なぜ浅く聞こえたか」「プロならどう言い換えるか」を提示します。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
