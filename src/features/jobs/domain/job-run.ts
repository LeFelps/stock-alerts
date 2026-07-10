import type { Brand } from "@/lib/brand";

export type JobRunId = Brand<string, "JobRunId">;
export type JobRunName = "CHECK_ALERTS";
export type JobRunStatus = "RUNNING" | "SUCCESS" | "FAILED";

export type JobRunSummary = {
  createdSignals: number;
  enabledTargets: number;
  failedEmails: number;
  refreshedSymbols: number;
  sentEmails: number;
  skippedEmails: number;
  uniqueSymbols: number;
};

export type JobRun = {
  createdAt: Date;
  durationMs: number | null;
  error: string | null;
  finishedAt: Date | null;
  id: JobRunId;
  jobName: JobRunName;
  startedAt: Date;
  status: JobRunStatus;
  summary: JobRunSummary;
  updatedAt: Date;
};

export function emptyJobRunSummary(): JobRunSummary {
  return {
    createdSignals: 0,
    enabledTargets: 0,
    failedEmails: 0,
    refreshedSymbols: 0,
    sentEmails: 0,
    skippedEmails: 0,
    uniqueSymbols: 0,
  };
}

export function toJobRunId(value: string): JobRunId {
  return value as JobRunId;
}
