import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーの面接セッション一覧を取得 (N+1排除: feedbackReport を eager load)
    const interviews = await prisma.interviewSession.findMany({
      where: { userId: session.user.id },
      include: {
        feedbackReport: {
          select: {
            overallGrade: true,
            scoreLogical: true,
            scoreCompanyFit: true,
            scoreInitiative: true,
            scoreCommunication: true,
            scoreCultureFit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ interviews });
  } catch (err: any) {
    console.error("[Get Interviews Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
