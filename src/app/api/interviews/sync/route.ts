import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const syncPayloadSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      companyName: z.string(),
      targetRole: z.string(),
      interviewPhase: z.string(),
      targetUrl: z.string().optional().nullable(),
      jobDescription: z.string().optional().nullable(),
      studentProfile: z.string().optional().nullable(),
      companyAnalysis: z.any().optional(),
      personaInstruction: z.string().optional().nullable(),
      transcript: z.any().optional(),
      durationSeconds: z.number().default(0),
      status: z.string().default("COMPLETED"),
      feedback: z.any().optional(),
      createdAt: z.number().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = syncPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
    }

    const userId = session.user.id;
    const syncedIds: string[] = [];

    for (const item of parsed.data.sessions) {
      try {
        const existing = await prisma.interviewSession.findUnique({
          where: { id: item.id },
        });

        if (existing) {
          // 既存セッションの所有者をログインユーザーに更新
          await prisma.interviewSession.update({
            where: { id: item.id },
            data: { userId },
          });
        } else {
          // 未存在の場合は新規登録
          await prisma.interviewSession.create({
            data: {
              id: item.id,
              userId,
              companyName: item.companyName,
              targetRole: item.targetRole,
              interviewPhase: item.interviewPhase,
              targetUrl: item.targetUrl,
              jobDescription: item.jobDescription,
              studentProfile: item.studentProfile,
              companyAnalysis: item.companyAnalysis ? JSON.stringify(item.companyAnalysis) : null,
              personaInstruction: item.personaInstruction,
              transcript: item.transcript ? JSON.stringify(item.transcript) : null,
              durationSeconds: item.durationSeconds,
              status: item.status,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            },
          });
        }

        // フィードバック情報があれば同期
        if (item.feedback) {
          const fb = item.feedback;
          await prisma.feedbackReport.upsert({
            where: { interviewSessionId: item.id },
            update: {
              overallGrade: fb.overallGrade,
              scoreLogical: fb.scores?.scoreLogical ?? 70,
              scoreCompanyFit: fb.scores?.scoreCompanyFit ?? 70,
              scoreInitiative: fb.scores?.scoreInitiative ?? 70,
              scoreCommunication: fb.scores?.scoreCommunication ?? 70,
              scoreCultureFit: fb.scores?.scoreCultureFit ?? 70,
              overallSummary: fb.overallSummary || "",
              detailedReviews: JSON.stringify(fb.detailedReviews || []),
              followUpResistance: JSON.stringify(fb.followUpResistance || {}),
            },
            create: {
              interviewSessionId: item.id,
              overallGrade: fb.overallGrade || "B",
              scoreLogical: fb.scores?.scoreLogical ?? 70,
              scoreCompanyFit: fb.scores?.scoreCompanyFit ?? 70,
              scoreInitiative: fb.scores?.scoreInitiative ?? 70,
              scoreCommunication: fb.scores?.scoreCommunication ?? 70,
              scoreCultureFit: fb.scores?.scoreCultureFit ?? 70,
              overallSummary: fb.overallSummary || "",
              detailedReviews: JSON.stringify(fb.detailedReviews || []),
              followUpResistance: JSON.stringify(fb.followUpResistance || {}),
            },
          });
        }

        syncedIds.push(item.id);
      } catch (itemErr) {
        console.warn(`[Sync Error for Session ${item.id}]:`, itemErr);
      }
    }

    return NextResponse.json({ success: true, syncedIds });
  } catch (err: any) {
    console.error("[Interviews Sync Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
