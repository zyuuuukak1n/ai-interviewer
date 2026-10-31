import { describe, it, expect } from "vitest";
import { z } from "zod";

const feedbackSchema = z.object({
  overallGrade: z.enum(["S", "A", "B", "C"]),
  scores: z.object({
    scoreLogical: z.number().min(0).max(100),
    scoreCompanyFit: z.number().min(0).max(100),
    scoreInitiative: z.number().min(0).max(100),
    scoreCommunication: z.number().min(0).max(100),
    scoreCultureFit: z.number().min(0).max(100),
  }),
  overallSummary: z.string().min(1),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  detailedReviews: z.array(
    z.object({
      question: z.string(),
      studentAnswer: z.string(),
      shallowReason: z.string(),
      interviewerConcern: z.string(),
      betterAnswer: z.string(),
    })
  ),
  followUpResistance: z.object({
    overallEvaluation: z.string(),
    items: z.array(
      z.object({
        topic: z.string(),
        initialAnswer: z.string(),
        drillDownQuestion: z.string(),
        responseToDrillDown: z.string(),
        consistencyScore: z.number().min(0).max(100),
        evaluation: z.string(),
      })
    ),
  }),
});

describe("Gemini Feedback Structured Outputs Schema", () => {
  it("should validate a compliant structured feedback payload", () => {
    const mockFeedback = {
      overallGrade: "A",
      scores: {
        scoreLogical: 85,
        scoreCompanyFit: 80,
        scoreInitiative: 90,
        scoreCommunication: 75,
        scoreCultureFit: 88,
      },
      overallSummary: "全体として主体性と行動力が高く評価できます。一方で結論ファーストの徹底が課題です。",
      strengths: ["具体的な数値を用いたエピソード展開", "困難な状況での当事者意識"],
      weaknesses: ["質問に対する導入の前置きが長い"],
      detailedReviews: [
        {
          question: "学生時代に最も注力したことは何ですか？",
          studentAnswer: "サークルの新歓活動で人数を増やそうと頑張りました。",
          shallowReason: "具体策や担当した役割、成果の数値が欠落している",
          interviewerConcern: "他人の成果に乗っかっただけではないかという懸念",
          betterAnswer: "サークルの新歓代表として新入生獲得数前年比150%を達成しました。具体的には...",
        },
      ],
      followUpResistance: {
        overallEvaluation: "突っ込み質問に対しても軸がぶれずに回答できていました。",
        items: [
          {
            topic: "新歓活動の課題設定",
            initialAnswer: "SNSを活用しました。",
            drillDownQuestion: "なぜ既存のビラ配りではなくSNSを選んだのですか？",
            responseToDrillDown: "ターゲット層の接触時間を計測した結果、ビラ受取率が3%未満だったためです。",
            consistencyScore: 95,
            evaluation: "客観的データに基づいて意思決定した理由を論理的に説明できています。",
          },
        ],
      },
    };

    const result = feedbackSchema.safeParse(mockFeedback);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid grade or missing score", () => {
    const invalidFeedback = {
      overallGrade: "F", // 不正なグレード
      scores: {
        scoreLogical: 150, // 100超過
      },
    };

    const result = feedbackSchema.safeParse(invalidFeedback);
    expect(result.success).toBe(false);
  });
});
