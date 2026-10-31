"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Mail, Lock, User, UserPlus, Loader2 } from "lucide-react";
import { syncLocalInterviewsToServer } from "@/lib/sync-service";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      setLoading(false);
      return;
    }

    try {
      const res = await signUp.email({
        email,
        password,
        name,
      });

      if (res?.error) {
        const msg = res.error.message || "";
        if (msg.includes("already exists") || msg.includes("Unique constraint")) {
          throw new Error("このメールアドレスは既に登録されています。ログイン画面からログインしてください。");
        }
        throw new Error(msg || "アカウント作成に失敗しました。");
      }

      await syncLocalInterviewsToServer();
      router.push("/history");
      router.refresh();
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "新規登録に失敗しました。入力内容をご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">アカウント新規登録</h1>
          <p className="mt-1 text-xs text-slate-400">
            登録すると面接履歴をサーバーに無制限保存できます
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">お名前（ニックネーム可）</label>
              <span className="text-[11px] text-blue-400">匿名・仮名OK</span>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="就活太郎 / ニックネーム"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              ※ 個人情報保護のため本名を入力する必要はありません。AI面接官からの呼びかけ用の名前として自由にご設定ください。
            </p>
          </div>

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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">パスワード (8文字以上)</label>
              <span className="text-[11px] text-slate-400">半角英数字・記号対応</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-normal">
              ※ 半角英字（大文字・小文字）、半角数字、および一般的な半角記号（<code className="text-blue-300">!@#$%^&*()_+-=</code> 等）を自由にご利用いただけます。
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            <span>アカウントを作成</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          既にアカウントをお持ちですか？{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}

