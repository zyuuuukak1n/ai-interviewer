export interface TurnReview {
  question: string;
  studentAnswer: string;
  shallowReason: string;
  interviewerConcern: string;
  betterAnswer: string;
}

export interface FollowUpReviewItem {
  topic: string;
  initialAnswer: string;
  drillDownQuestion: string;
  responseToDrillDown: string;
  consistencyScore: number; // 0-100
  evaluation: string;
}

export interface StructuredFeedbackData {
  overallGrade: "S" | "A" | "B" | "C";
  scores: {
    scoreLogical: number;        // 論理的思考力 (0-100)
    scoreCompanyFit: number;     // 企業理解度・志望度 (0-100)
    scoreInitiative: number;     // 主体性・再現性 (0-100)
    scoreCommunication: number;  // コミュニケーション・結論ファースト (0-100)
    scoreCultureFit: number;     // カルチャーフィット度 (0-100)
  };
  overallSummary: string;
  strengths: string[];
  weaknesses: string[];
  detailedReviews: TurnReview[];
  followUpResistance: {
    overallEvaluation: string;
    items: FollowUpReviewItem[];
  };
}
