import Dexie, { type Table } from "dexie";
import type { StructuredFeedbackData } from "@/types/feedback";
import type { CompanyAnalysisResult, ChatMessage } from "@/types/interview";

export interface LocalInterviewRecord {
  id: string; // セッションID (UUID / CUID)
  guestToken?: string;
  companyName: string;
  targetRole: string;
  interviewPhase: string;
  targetUrl?: string;
  jobDescription?: string;
  studentProfile?: string;
  companyAnalysis?: CompanyAnalysisResult;
  personaInstruction?: string;
  transcript: ChatMessage[];
  durationSeconds: number;
  status: "SETUP" | "IN_PROGRESS" | "COMPLETED" | "ABORTED";
  feedback?: StructuredFeedbackData;
  syncedToServer: boolean;
  createdAt: number;
  updatedAt: number;
}

export class AppIndexedDb extends Dexie {
  interviews!: Table<LocalInterviewRecord, string>;

  constructor() {
    super("AiInterviewerDb");
    this.version(1).stores({
      interviews: "id, companyName, status, syncedToServer, createdAt",
    });
  }
}

export const localDb = new AppIndexedDb();

