import { NextRequest, NextResponse } from "next/server";
import {
  getRegistrationOptions,
  verifyAndSaveRegistration,
  getAuthenticationOptions,
  verifyPasskeyAuthentication,
} from "@/lib/passkey";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const verification = await verifyAndSaveRegistration(session.user.id, body.response);
      return NextResponse.json({ verified: verification.verified });
    }

    // 3. パスキー認証オプション生成
    if (action === "generate-authentication-options") {
      const result = await getAuthenticationOptions(body.email);
      return NextResponse.json(result);
    }

    // 4. パスキー認証検証 (ログイン)
    if (action === "verify-authentication") {
      const user = await verifyPasskeyAuthentication(body.response, body.challengeKey);
      return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Passkey API Error]:", err);
    return NextResponse.json({ error: err.message || "Passkey operation failed" }, { status: 400 });
  }
}

