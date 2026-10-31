export type InterviewPhaseType = "FIRST_HR" | "SECOND_MANAGER" | "FINAL_EXECUTIVE";

export interface CompanyAnalysisResult {
  companyName: string;
  industry: string;
  missionVision: string;
  businessSummary: string;
  idealCandidateProfile: string;
  cultureKeywords: string[];
  interviewerPersona: {
    name: string;
    roleTitle: string;
    interviewStyle: string;
    evaluationFocus: string[];
    openingRemark: string;
  };
  customQuestionThemes: string[];
  systemInstruction: string;
}

export interface ChatMessage {
  role: "interviewer" | "user";
  text: string;
  timestamp: number;
}

