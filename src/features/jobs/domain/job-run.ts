import type { Brand } from "@/lib/brand";

export type JobRunId = Brand<string, "JobRunId">;
export type JobRunName = "CHECK_ALERTS";
export type JobRunStatus = "RUNNING" | "SUCCESS" | "FAILED";

export type JobRunSummary = {
  createdSignals: number;
  enabledTargets: number;
  failedEmails: number;
  failedSymbols: number;
  failedTargets: number;
  refreshedSymbols: number;
  sentEmails: number;
  skippedEmails: number;
  staleTargets: number;
  uniqueSymbols: number;
};

export type JobRun = {
  createdAt: Date;
  durationMs: number | null;
  eligibleMarketDate: string | null;
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
    failedSymbols: 0,
    failedTargets: 0,
    refreshedSymbols: 0,
    sentEmails: 0,
    skippedEmails: 0,
    staleTargets: 0,
    uniqueSymbols: 0,
  };
}

export function toJobRunId(value: string): JobRunId {
  return value as JobRunId;
}
