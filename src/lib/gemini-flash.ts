import type { CompanyAnalysisResult, InterviewPhaseType } from "@/types/interview";
import type { StructuredFeedbackData } from "@/types/feedback";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_FLASH_MODEL = "gemini-3.8-flash";

/**
 * 企業情報と学生情報から、面接官ペルソナとGemini Live用システムインストラクションを生成
 */
export async function analyzeCompanyAndBuildPersona(params: {
  companyName: string;
  targetRole: string;
  interviewPhase: InterviewPhaseType;
  scrapedContent?: string;
  jobDescription?: string;
  studentProfile?: string;
}): Promise<CompanyAnalysisResult> {
  const { companyName, targetRole, interviewPhase, scrapedContent, jobDescription, studentProfile } = params;

  const phaseLabelMap: Record<InterviewPhaseType, string> = {
    FIRST_HR: "1次面接（人事担当者：基本的なコミュニケーション、結論ファースト、学生時代に力を入れたこと（ガクチカ）の深掘り中心）",
    SECOND_MANAGER: "2次面接（現場リーダー・エース社員：職種特有のスキル、課題解決の再現性、自社事業・プロダクトへの解像度中心）",
    FINAL_EXECUTIVE: "最終面接（役員・社長：企業理念・カルチャーへの共感、中長期ビジョン、覚悟・熱量・社風とのフィット感中心）",
  };

  const prompt = `
あなたは日本のトップ企業の人事責任者および面接設計の専門家です。
以下の企業情報・求人情報・学生プロフィール・面接フェーズに基づき、志望企業専属の面接官ペルソナと、リアルタイム音声面接AI用のシステムインストラクション（System Instruction）を生成してください。

【対象企業名】: ${companyName}
【志望職種】: ${targetRole}
【面接フェーズ】: ${phaseLabelMap[interviewPhase]}
【企業サイト/採用ページ抽出テキスト】:
${scrapedContent ? scrapedContent.slice(0, 4000) : "（情報なし：企業名の一般的な認知に基づいて分析してください）"}

【求人票・募集要項】:
${jobDescription ? jobDescription.slice(0, 2000) : "（特になし）"}

【学生の自己PR・ガクチカ】:
${studentProfile ? studentProfile.slice(0, 2000) : "（未入力）"}

【面接官ペルソナ設計ルール】:
1. 面接官の名前、役職、口調・トーン、重視する評価軸を具体的に定義すること。
2. 一般論の質問にとどまらず、対象企業固有の事業課題やカルチャーに切り込む質問を設計すること。
3. 学生の回答が抽象的・結論ファーストでない・具体例に欠ける場合は、「なぜ（Why）」「どのように（How）」を3段階で厳しく深掘りするよう設定すること。
4. systemInstruction は、リアルタイム面接AI（gemini-3.8-live）が音声会話時に厳格に従うシステムプロンプトとして完全な文章で記述すること。
`;

  const schema = {
    type: "OBJECT",
    properties: {
      companyName: { type: "STRING" },
      industry: { type: "STRING" },
      missionVision: { type: "STRING" },
      businessSummary: { type: "STRING" },
      idealCandidateProfile: { type: "STRING" },
      cultureKeywords: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      interviewerPersona: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          roleTitle: { type: "STRING" },
          interviewStyle: { type: "STRING" },
          evaluationFocus: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          openingRemark: { type: "STRING" },
        },
        required: ["name", "roleTitle", "interviewStyle", "evaluationFocus", "openingRemark"],
      },
      customQuestionThemes: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      systemInstruction: { type: "STRING" },
    },
    required: [
      "companyName",
      "industry",
      "missionVision",
      "businessSummary",
      "idealCandidateProfile",
      "cultureKeywords",
      "interviewerPersona",
      "customQuestionThemes",
      "systemInstruction",
    ],
  };

  const result = await callGeminiFlashStructured<CompanyAnalysisResult>(prompt, schema);
  return result;
}

/**
 * 面接トランスクリプト全体を解析し、5軸スコア・改善対比・深掘り耐性レビューを構造化出力
 */
export async function generateInterviewFeedback(params: {
  companyName: string;
  targetRole: string;
  interviewPhase: string;
  personaInstruction: string;
  transcript: { role: string; text: string }[];
}): Promise<StructuredFeedbackData> {
  const { companyName, targetRole, interviewPhase, transcript } = params;

  const conversationText = transcript
    .map((m) => `${m.role === "interviewer" ? "【面接官】" : "【学生】"}: ${m.text}`)
    .join("\n\n");

  const prompt = `
あなたは新卒採用の超一流プロ面接官兼キャリアアドバイザーです。
以下の企業での模擬面接の全文対話ログを徹底的に分析し、学生のための実践的かつ厳しいフィードバックレポートを作成してください。

【対象企業名】: ${companyName}
【志望職種】: ${targetRole}
【面接フェーズ】: ${interviewPhase}

【面接対話ログ全文】:
${conversationText.length > 0 ? conversationText : "（対話ログなし）"}

【評価・分析の必須要件】:
1. 総合判定（S: 即内定レベル / A: 通過レベル / B: 改善で通過可能性あり / C: 懸念多数でお見送りレベル）
2. 5軸スコア（各0〜100点）:
   - 論理的思考力（scoreLogical）: 結論ファースト、因果関係、PREP法
   - 企業理解度・志望度（scoreCompanyFit）: 自社でなければならない理由、事業理解
   - 主体性・再現性（scoreInitiative）: 自ら課題を設定して動いたか、他社でも活かせるか
   - コミュニケーション（scoreCommunication）: 端的な受け答え、面接官との対話キャッチボール
   - カルチャーフィット度（scoreCultureFit）: 企業の理念・社風との親和性
3. 回答別の改善提案（detailedReviews）:
   - 学生の実際の発言をそのまま引用
   - なぜ浅く聞こえたか
   - その企業の面接官ならどのような懸念を持つか
   - どう言い換えれば通過率が跳ね上がるか（プロの具体的改善回答例）
4. 深掘り耐性レビュー（followUpResistance）:
   - 面接官の突っ込み（Why / How）に対して一貫性を保てていたか
`;

  const schema = {
    type: "OBJECT",
    properties: {
      overallGrade: {
        type: "STRING",
        enum: ["S", "A", "B", "C"],
      },
      scores: {
        type: "OBJECT",
        properties: {
          scoreLogical: { type: "INTEGER" },
          scoreCompanyFit: { type: "INTEGER" },
          scoreInitiative: { type: "INTEGER" },
          scoreCommunication: { type: "INTEGER" },
          scoreCultureFit: { type: "INTEGER" },
        },
        required: [
          "scoreLogical",
          "scoreCompanyFit",
          "scoreInitiative",
          "scoreCommunication",
          "scoreCultureFit",
        ],
      },
      overallSummary: { type: "STRING" },
      strengths: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      weaknesses: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      detailedReviews: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            studentAnswer: { type: "STRING" },
            shallowReason: { type: "STRING" },
            interviewerConcern: { type: "STRING" },
            betterAnswer: { type: "STRING" },
          },
          required: ["question", "studentAnswer", "shallowReason", "interviewerConcern", "betterAnswer"],
        },
      },
      followUpResistance: {
        type: "OBJECT",
        properties: {
          overallEvaluation: { type: "STRING" },
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                topic: { type: "STRING" },
                initialAnswer: { type: "STRING" },
                drillDownQuestion: { type: "STRING" },
                responseToDrillDown: { type: "STRING" },
                consistencyScore: { type: "INTEGER" },
                evaluation: { type: "STRING" },
              },
              required: [
                "topic",
                "initialAnswer",
                "drillDownQuestion",
                "responseToDrillDown",
                "consistencyScore",
                "evaluation",
              ],
            },
          },
        },
        required: ["overallEvaluation", "items"],
      },
    },
    required: [
      "overallGrade",
      "scores",
      "overallSummary",
      "strengths",
      "weaknesses",
      "detailedReviews",
      "followUpResistance",
    ],
  };

  const result = await callGeminiFlashStructured<StructuredFeedbackData>(prompt, schema);
  return result;
}

/**
 * Gemini 3.8 Flash に対して JSON Schema を適用した構造化出力を実行
 */
async function callGeminiFlashStructured<T>(prompt: string, schema: any): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API Error (${res.status} ${res.statusText}): ${errorText}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini Flash did not return valid text candidates.");
  }

  return JSON.parse(rawText) as T;
}

