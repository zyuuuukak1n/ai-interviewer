import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateInterviewFeedback } from "@/lib/gemini-flash";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const feedbackRequestSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  guestToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = feedbackRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { sessionId, guestToken } = parsed.data;

    // セッション取得
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { feedbackReport: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 認可チェック
    const userAuth = await auth.api.getSession({
      headers: await headers(),
    });

    if (session.userId && (!userAuth?.user || userAuth.user.id !== session.userId)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    if (session.guestToken && guestToken && session.guestToken !== guestToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // 既にフィードバックが存在する場合はそれを返す
    if (session.feedbackReport) {
      return NextResponse.json({
        report: {
          overallGrade: session.feedbackReport.overallGrade,
          scores: {
            scoreLogical: session.feedbackReport.scoreLogical,
            scoreCompanyFit: session.feedbackReport.scoreCompanyFit,
            scoreInitiative: session.feedbackReport.scoreInitiative,
            scoreCommunication: session.feedbackReport.scoreCommunication,
            scoreCultureFit: session.feedbackReport.scoreCultureFit,
          },
          overallSummary: session.feedbackReport.overallSummary,
          detailedReviews: JSON.parse(session.feedbackReport.detailedReviews || "[]"),
          followUpResistance: JSON.parse(session.feedbackReport.followUpResistance || "{}"),
        },
      });
    }

    // トランスクリプトの取得
    let transcript: { role: string; text: string }[] = [];
    if (session.transcript) {
      try {
        transcript = JSON.parse(session.transcript);
      } catch {
        transcript = [];
      }
    }

    // Gemini 3.8 Flash でフィードバックを構造化生成
    const feedbackResult = await generateInterviewFeedback({
      companyName: session.companyName,
      targetRole: session.targetRole,
      interviewPhase: session.interviewPhase,
      personaInstruction: session.personaInstruction || "",
      transcript,
    });

    // DB に FeedbackReport を保存
    await prisma.feedbackReport.create({
      data: {
        interviewSessionId: session.id,
        overallGrade: feedbackResult.overallGrade,
        scoreLogical: feedbackResult.scores.scoreLogical,
        scoreCompanyFit: feedbackResult.scores.scoreCompanyFit,
        scoreInitiative: feedbackResult.scores.scoreInitiative,
        scoreCommunication: feedbackResult.scores.scoreCommunication,
        scoreCultureFit: feedbackResult.scores.scoreCultureFit,
        overallSummary: feedbackResult.overallSummary,
        detailedReviews: JSON.stringify(feedbackResult.detailedReviews),
        followUpResistance: JSON.stringify(feedbackResult.followUpResistance),
      },
    });

    return NextResponse.json({ report: feedbackResult });
  } catch (err: any) {
    console.error("[Feedback API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate interview feedback" },
      { status: 500 }
    );
  }
}

