"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { PasskeyButton } from "@/components/auth/PasskeyButton";
import { Mail, Lock, LogIn, Loader2, ArrowRight } from "lucide-react";
import { syncLocalInterviewsToServer } from "@/lib/sync-service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        throw new Error(res.error.message || "ログインに失敗しました。");
      }

      // 未同期履歴の自動マージ
      await syncLocalInterviewsToServer();
      router.push("/history");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "メールアドレスまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: `${basePath}/history`,
      });

      if (res?.error) {
        const errorDetail = res.error.message || `ステータス: ${res.error.status || "不明"}`;
        throw new Error(`Googleログインエラー: ${errorDetail}`);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(
        err.message ||
          "Googleログインが利用できません。サーバー側でGoogle OAuthが未設定の場合は、メールアドレスまたはパスキー認証をご利用ください。"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">ログイン</h1>
          <p className="mt-1 text-xs text-slate-400">
            面接履歴のクラウド保存やマルチデバイス連携が利用できます
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* パスキー生体認証 */}
        <div className="mb-6">
          <PasskeyButton
            mode="login"
            email={email || undefined}
            onSuccess={async () => {
              await syncLocalInterviewsToServer();
              router.push("/history");
              router.refresh();
            }}
          />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-400">またはメールアドレスでログイン</span>
          </div>
        </div>

        {/* メール・パスワードログインフォーム */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">メールアドレス</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">パスワード</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            <span>ログイン</span>
          </button>
        </form>

        {/* Googleログイン */}
        <div className="mt-4">
          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? "Google認証へ接続中..." : "Googleでログイン"}</span>
          </button>
          <p className="mt-1 text-center text-[11px] text-slate-500">
            ※ Googleログインのご利用にはサーバー側OAuth設定（GOOGLE_CLIENT_ID等）が必要です。未設定時はメールまたはパスキーをご利用ください。
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          アカウントをお持ちでないですか？{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}

