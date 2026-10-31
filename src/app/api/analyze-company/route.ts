import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scrapeUrlSafely } from "@/lib/ssrf";
import { analyzeCompanyAndBuildPersona } from "@/lib/gemini-flash";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "node:crypto";

const requestSchema = z.object({
  companyName: z.string().min(1, "企業名は必須です").max(100),
  targetUrl: z.string().url("有効なURL形式で入力してください").optional().or(z.literal("")),
  targetRole: z.string().min(1, "志望職種は必須です").max(100),
  interviewPhase: z.enum(["FIRST_HR", "SECOND_MANAGER", "FINAL_EXECUTIVE"]),
  jobDescription: z.string().max(5000).optional(),
  studentProfile: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = requestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation Error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { companyName, targetUrl, targetRole, interviewPhase, jobDescription, studentProfile } = parsed.data;

    // 1. URLがある場合はSSRF対策スクレイパーで安全にテキスト取得
    let scrapedContent: string | undefined = undefined;
    if (targetUrl) {
      try {
        const scrapeResult = await scrapeUrlSafely(targetUrl);
        scrapedContent = `【タイトル】${scrapeResult.title}\n【概要】${scrapeResult.description}\n【本文】${scrapeResult.textContent}`;
      } catch (scrapeErr: any) {
        console.warn(`[Scrape Warning]: Failed to scrape ${targetUrl}: ${scrapeErr.message}`);
        // スクレイピング失敗時もユーザーにエラーを返さず、企業名のみでGeminiに補完フォールバック
      }
    }

    // 2. Gemini 3.8 Flash で企業分析＆面接官ペルソナ生成
    const personaResult = await analyzeCompanyAndBuildPersona({
      companyName,
      targetRole,
      interviewPhase,
      scrapedContent,
      jobDescription,
      studentProfile,
    });

    // 3. ログインユーザー確認 (未ログインの場合はゲストトークン発行)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const guestToken = session?.user?.id ? undefined : crypto.randomBytes(16).toString("hex");

    // 4. DB に InterviewSession 作成
    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId: session?.user?.id || null,
        guestToken: guestToken || null,
        companyName,
        targetUrl: targetUrl || null,
        targetRole,
        interviewPhase,
        jobDescription: jobDescription || null,
        studentProfile: studentProfile || null,
        companyAnalysis: JSON.stringify(personaResult),
        personaInstruction: personaResult.systemInstruction,
        status: "SETUP",
      },
    });

    return NextResponse.json({
      sessionId: interviewSession.id,
      guestToken,
      persona: personaResult.interviewerPersona,
      cultureKeywords: personaResult.cultureKeywords,
      missionVision: personaResult.missionVision,
      openingRemark: personaResult.interviewerPersona.openingRemark,
    });
  } catch (err: any) {
    console.error("[Analyze Company API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze company and generate persona" },
      { status: 500 }
    );
  }
}

