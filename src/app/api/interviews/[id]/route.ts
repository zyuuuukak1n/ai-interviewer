import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const guestToken = url.searchParams.get("guestToken");

    const interview = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        feedbackReport: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 認可チェック: ログインユーザーのID一致、またはゲストトークンの一致
    const isOwner = session?.user?.id && session.user.id === interview.userId;
    const isGuestOwner = interview.guestToken && guestToken === interview.guestToken;

    if (interview.userId && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!interview.userId && interview.guestToken && !isGuestOwner && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ interview });
  } catch (err: any) {
    console.error("[Get Single Interview Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

