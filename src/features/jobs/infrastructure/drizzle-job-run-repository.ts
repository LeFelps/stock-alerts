import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { jobRuns } from "@/db/schema";

import type { JobRunRepository } from "../application/ports";
import { toJobRunId, type JobRun, type JobRunSummary } from "../domain/job-run";

type Database = typeof db;
type JobRunRow = typeof jobRuns.$inferSelect;

export function createDrizzleJobRunRepository(
  database: Database = db,
): JobRunRepository {
  return {
    async finish(command) {
      const [jobRun] = await database
        .update(jobRuns)
        .set({
          durationMs: command.durationMs,
          error: command.error ?? null,
          finishedAt: command.finishedAt,
          status: command.status,
          summary: command.summary,
          updatedAt: new Date(),
        })
        .where(eq(jobRuns.id, command.jobRunId))
        .returning();

      if (!jobRun) {
        throw new Error("Job run not found");
      }

      return toJobRun(jobRun);
    },

    async listRecent(limit) {
      const rows = await database
        .select()
        .from(jobRuns)
        .orderBy(desc(jobRuns.startedAt))
        .limit(limit);

      return rows.map(toJobRun);
    },

    async start(command) {
      const [jobRun] = await database
        .insert(jobRuns)
        .values({
          jobName: command.jobName,
          startedAt: command.startedAt,
          status: "RUNNING",
          summary: command.summary,
        })
        .returning();

      if (!jobRun) {
        throw new Error("Failed to create job run");
      }

      return toJobRun(jobRun);
    },
  };
}

function toJobRun(jobRun: JobRunRow): JobRun {
  return {
    createdAt: jobRun.createdAt,
    durationMs: jobRun.durationMs,
    error: jobRun.error,
    finishedAt: jobRun.finishedAt,
    id: toJobRunId(jobRun.id),
    jobName: jobRun.jobName as JobRun["jobName"],
    startedAt: jobRun.startedAt,
    status: jobRun.status as JobRun["status"],
    summary: jobRun.summary as JobRunSummary,
    updatedAt: jobRun.updatedAt,
  };
}
