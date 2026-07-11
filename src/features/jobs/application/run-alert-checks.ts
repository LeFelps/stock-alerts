import { deliverBuySignalAlerts } from "@/features/alerts/application/deliver-buy-signal-alerts";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "@/features/alerts/application/ports";
import { calculateIndicatorSnapshotsFromPrices } from "@/features/indicators/application/calculate-indicators";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import type {
  MarketDataProvider,
  PriceSnapshotRepository,
} from "@/features/market-data/application/ports";
import { detectBuySignalsForProfile } from "@/features/signals/application/detect-buy-signals";
import type { SignalRepository } from "@/features/signals/application/ports";

import {
  emptyJobRunSummary,
  type JobRun,
  type JobRunSummary,
} from "../domain/job-run";
import type {
  AlertCheckCheckpointRepository,
  AlertCheckTarget,
  AlertCheckTargetRepository,
  JobRunRepository,
} from "./ports";

type RunAlertChecksDependencies = {
  alertCheckCheckpointRepository: AlertCheckCheckpointRepository;
  alertCheckTargetRepository: AlertCheckTargetRepository;
  alertEmailDeliveryRepository: AlertEmailDeliveryRepository;
  emailDeliveryProvider: EmailDeliveryProvider;
  indicatorSnapshotRepository: IndicatorSnapshotRepository;
  jobRunRepository: JobRunRepository;
  marketDataProvider: MarketDataProvider;
  now?: () => Date;
  priceSnapshotRepository: PriceSnapshotRepository;
  signalRepository: SignalRepository;
};

export type RunAlertChecksResult =
  | {
      jobRun: JobRun;
      ok: true;
    }
  | {
      error: string;
      jobRun: JobRun;
      ok: false;
    };

export async function runAlertChecks(
  _command: Record<string, never>,
  {
    alertCheckCheckpointRepository,
    alertCheckTargetRepository,
    alertEmailDeliveryRepository,
    emailDeliveryProvider,
    indicatorSnapshotRepository,
    jobRunRepository,
    marketDataProvider,
    now = () => new Date(),
    priceSnapshotRepository,
    signalRepository,
  }: RunAlertChecksDependencies,
): Promise<RunAlertChecksResult> {
  const startedAt = now();
  const summary = emptyJobRunSummary();
  const jobRun = await jobRunRepository.start({
    jobName: "CHECK_ALERTS",
    startedAt,
    summary,
  });

  try {
    const targets = await alertCheckTargetRepository.listEnabledTargets();
    const targetsBySymbol = groupTargetsBySymbol(targets);

    summary.enabledTargets = targets.length;
    summary.uniqueSymbols = targetsBySymbol.size;
    const errors: string[] = [];

    for (const [symbol, symbolTargets] of targetsBySymbol) {
      try {
        const snapshots = await marketDataProvider.fetchDailyPrices(symbol);
        const latestSnapshot = snapshots.at(-1);

        if (!latestSnapshot) {
          throw new Error("Market data response contained no daily prices");
        }

        const indicatorSnapshots =
          calculateIndicatorSnapshotsFromPrices(snapshots);

        await priceSnapshotRepository.upsertMany(snapshots);
        await indicatorSnapshotRepository.upsertMany(indicatorSnapshots);
        summary.refreshedSymbols += 1;

        for (const target of symbolTargets) {
          try {
            const lastProcessedMarketDate =
              await alertCheckCheckpointRepository.latestProcessedMarketDate({
                profileId: target.profileId,
                symbol,
              });

            if (
              lastProcessedMarketDate &&
              latestSnapshot.marketDate <= lastProcessedMarketDate
            ) {
              summary.staleTargets += 1;
              continue;
            }

            const detectedSignals = detectBuySignalsForProfile({
              indicatorSnapshots,
              profileId: target.profileId,
            }).filter(
              (signal) =>
                !lastProcessedMarketDate ||
                signal.marketDate > lastProcessedMarketDate,
            );
            const recordedSignals =
              await signalRepository.upsertMany(detectedSignals);
            summary.createdSignals += recordedSignals.length;

            const deliveryOutcomes = await deliverBuySignalAlerts(
              {
                emailAlertsEnabled: target.emailAlertsEnabled,
                recipientEmail: target.recipientEmail,
                signals: recordedSignals,
              },
              {
                alertEmailDeliveryRepository,
                emailDeliveryProvider,
              },
            );

            for (const outcome of deliveryOutcomes) {
              if (outcome.type === "sent") summary.sentEmails += 1;
              if (outcome.type === "skipped") summary.skippedEmails += 1;

              if (outcome.type === "failed") {
                summary.failedEmails += 1;
                errors.push(
                  `${symbol}: email: ${outcome.delivery.providerError ?? "Unknown delivery failure"}`,
                );
              }
            }

            await alertCheckCheckpointRepository.markProcessed({
              marketDate: latestSnapshot.marketDate,
              profileId: target.profileId,
              symbol,
            });
          } catch (error) {
            summary.failedTargets += 1;
            errors.push(`${symbol}: target: ${formatError(error)}`);
          }
        }
      } catch (error) {
        summary.failedSymbols += 1;
        errors.push(`${symbol}: ${formatError(error)}`);
      }
    }

    if (errors.length > 0) {
      const message = errors.join("; ");

      return {
        error: message,
        jobRun: await finishJobRun({
          error: message,
          jobRunRepository,
          jobRun,
          now,
          startedAt,
          status: "FAILED",
          summary,
        }),
        ok: false,
      };
    }

    return {
      jobRun: await finishJobRun({
        jobRunRepository,
        jobRun,
        now,
        startedAt,
        status: "SUCCESS",
        summary,
      }),
      ok: true,
    };
  } catch (error) {
    const message = formatError(error);

    return {
      error: message,
      jobRun: await finishJobRun({
        error: message,
        jobRunRepository,
        jobRun,
        now,
        startedAt,
        status: "FAILED",
        summary,
      }),
      ok: false,
    };
  }
}

function groupTargetsBySymbol(targets: AlertCheckTarget[]) {
  return targets.reduce((groups, target) => {
    const existingTargets = groups.get(target.symbol) ?? [];
    existingTargets.push(target);
    groups.set(target.symbol, existingTargets);

    return groups;
  }, new Map<string, AlertCheckTarget[]>());
}

async function finishJobRun({
  error = null,
  jobRun,
  jobRunRepository,
  now,
  startedAt,
  status,
  summary,
}: {
  error?: string | null;
  jobRun: JobRun;
  jobRunRepository: JobRunRepository;
  now: () => Date;
  startedAt: Date;
  status: "FAILED" | "SUCCESS";
  summary: JobRunSummary;
}) {
  const finishedAt = now();

  return jobRunRepository.finish({
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    error,
    finishedAt,
    jobRunId: jobRun.id,
    status,
    summary,
  });
}

function formatError(error: unknown) {
  if (error instanceof Error && error.message) {
    const metadata = formatErrorMetadata(error);
    return metadata ? `${error.message} (${metadata})` : error.message;
  }

  return String(error);
}

function formatErrorMetadata(error: Error) {
  const metadata = (error as Error & { metadata?: unknown }).metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const values = metadata as { body?: unknown; status?: unknown };
  const parts: string[] = [];

  if (typeof values.status === "number") {
    parts.push(`status ${values.status}`);
  }

  if (typeof values.body === "string" && values.body.trim()) {
    parts.push(`body ${values.body.trim().slice(0, 500)}`);
  }

  return parts.join(", ") || null;
}
