"use client";

import { useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";

interface PasskeyButtonProps {
  mode: "register" | "login";
  email?: string;
  onSuccess?: () => void;
}

export function PasskeyButton({ mode, email, onSuccess }: PasskeyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyAction = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        // 1. 認証オプション取得
        const optRes = await fetch("/api/auth/passkey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate-authentication-options", email }),
        });
        const { options, challengeKey } = await optRes.json();

        // 2. ブラウザ生体認証実行
        const authResponse = await startAuthentication({ optionsJSON: options });

        // 3. サーバー検証
        const verifyRes = await fetch("/api/auth/passkey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify-authentication",
            response: authResponse,
            challengeKey,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || "認証に失敗しました。");

        onSuccess?.();
      } else {
        // 登録モード
        const optRes = await fetch("/api/auth/passkey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate-registration-options" }),
        });
        const options = await optRes.json();

        const regResponse = await startRegistration({ optionsJSON: options });

        const verifyRes = await fetch("/api/auth/passkey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify-registration",
            response: regResponse,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || "登録に失敗しました。");

        onSuccess?.();
      }
    } catch (err: any) {
      console.error("Passkey error:", err);
      setError(err.message || "パスキーの操作に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePasskeyAction}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4 text-blue-400" />
        )}
        <span>{mode === "login" ? "パスキーでログイン (生体認証)" : "パスキーを登録する"}</span>
      </button>
      {error && <p className="mt-1.5 text-center text-xs text-rose-400">{error}</p>}
    </div>
  );
}
