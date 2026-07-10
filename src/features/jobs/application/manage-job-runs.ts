import type { JobRunRepository } from "./ports";

export async function listRecentJobRuns(
  command: { limit?: number },
  { jobRunRepository }: { jobRunRepository: JobRunRepository },
) {
  return jobRunRepository.listRecent(command.limit ?? 20);
}
