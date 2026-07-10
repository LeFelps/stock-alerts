import type { ProfileId } from "@/features/profiles/domain/profile";

import type {
  JobRun,
  JobRunId,
  JobRunName,
  JobRunStatus,
  JobRunSummary,
} from "../domain/job-run";

export type AlertCheckTarget = {
  emailAlertsEnabled: boolean;
  profileId: ProfileId;
  recipientEmail: string;
  symbol: string;
};

export type AlertCheckTargetRepository = {
  listEnabledTargets(): Promise<AlertCheckTarget[]>;
};

export type StartJobRunCommand = {
  jobName: JobRunName;
  startedAt: Date;
  summary: JobRunSummary;
};

export type FinishJobRunCommand = {
  durationMs: number;
  error?: string | null;
  finishedAt: Date;
  jobRunId: JobRunId;
  status: Exclude<JobRunStatus, "RUNNING">;
  summary: JobRunSummary;
};

export type JobRunRepository = {
  finish(command: FinishJobRunCommand): Promise<JobRun>;
  listRecent(limit: number): Promise<JobRun[]>;
  start(command: StartJobRunCommand): Promise<JobRun>;
};
