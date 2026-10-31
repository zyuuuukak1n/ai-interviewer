import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  getRegistrationOptions,
  verifyAndSaveRegistration,
  getAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/lib/passkey";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers, cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. パスキー登録オプション生成 (要ログイン)
    if (action === "generate-registration-options") {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) {
        return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
      }

      const options = await getRegistrationOptions(session.user.id, session.user.email);
      return NextResponse.json(options);
    }

    // 2. パスキー登録検証 (要ログイン)
    if (action === "verify-registration") {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) {
        return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
      }

      const verification = await verifyAndSaveRegistration(session.user.id, body.response);
      return NextResponse.json({ verified: verification.verified });
    }

    // 3. パスキー認証オプション生成
    if (action === "generate-authentication-options") {
      const result = await getAuthenticationOptions(body.email);
      return NextResponse.json(result);
    }

    // 4. パスキー認証検証 (ログイン成功時のセッション発行)
    if (action === "verify-authentication") {
      const user = await verifyPasskeyAuthentication(body.response, body.challengeKey);

      // Better Auth 互換セッショントークン生成とDB永続化
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30日有効

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        },
      });

      // クッキーの設定
      const cookieStore = await cookies();
      const isHttps = req.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";
      cookieStore.set("better-auth.session_token", token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Passkey API Error]:", err);
    return NextResponse.json({ error: err.message || "Passkey operation failed" }, { status: 400 });
  }
}

