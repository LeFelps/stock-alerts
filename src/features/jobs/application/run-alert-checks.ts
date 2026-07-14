import { deliverBuySignalDigest } from "@/features/alerts/application/deliver-buy-signal-digest";
import type {
  AlertEmailDeliveryRepository,
  EmailDeliveryProvider,
} from "@/features/alerts/application/ports";
import { calculateIndicatorSnapshotsFromPrices } from "@/features/indicators/application/calculate-indicators";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import type {
  MarketDataDateWindow,
  MarketDataProvider,
  PriceSnapshotRepository,
} from "@/features/market-data/application/ports";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";
import { detectBuySignalsForProfile } from "@/features/signals/application/detect-buy-signals";
import type { SignalRepository } from "@/features/signals/application/ports";
import type { Signal } from "@/features/signals/domain/signal";

import { eligibleMarketDateForAlertCheck } from "../domain/eligible-market-date";
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

type RunAlertChecksCommand = {
  eligibleMarketDate?: string;
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
  command: RunAlertChecksCommand,
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
  const eligibleMarketDate =
    command.eligibleMarketDate ?? eligibleMarketDateForAlertCheck(startedAt);
  const summary = emptyJobRunSummary();
  const jobRun = await jobRunRepository.start({
    eligibleMarketDate,
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
    const digestCandidates = new Map<
      string,
      {
        checkpoints: Array<{
          marketDate: string;
          profileId: AlertCheckTarget["profileId"];
          symbol: string;
        }>;
        signals: Signal[];
        target: AlertCheckTarget;
      }
    >();

    for (const [symbol, symbolTargets] of targetsBySymbol) {
      try {
        const storedSnapshots =
          await priceSnapshotRepository.listForSymbol(symbol);
        const fetchWindows = marketDataFetchWindows(
          storedSnapshots,
          eligibleMarketDate,
        );
        const fetchedSnapshots: PriceSnapshot[] = [];

        for (const window of fetchWindows) {
          fetchedSnapshots.push(
            ...(await marketDataProvider.fetchDailyPrices(symbol, window)),
          );
        }

        const latestSnapshot = fetchedSnapshots.at(-1);

        if (!latestSnapshot) {
          throw new Error("Market data response contained no daily prices");
        }

        const snapshots = mergePriceHistory(storedSnapshots, fetchedSnapshots);
        const indicatorSnapshots =
          calculateIndicatorSnapshotsFromPrices(snapshots);

        await priceSnapshotRepository.upsertMany(fetchedSnapshots);
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

            const eligibleDetectedSignals =
              latestSnapshot.marketDate === eligibleMarketDate
                ? detectedSignals.filter(
                    (signal) => signal.marketDate === eligibleMarketDate,
                  )
                : [];

            if (eligibleDetectedSignals.length > 0) {
              const recordedEligibleSignals = recordedSignals.filter(
                (signal) => signal.marketDate === eligibleMarketDate,
              );
              const eligibleSignals =
                recordedEligibleSignals.length ===
                eligibleDetectedSignals.length
                  ? recordedEligibleSignals
                  : await signalRepository.findMatching(
                      eligibleDetectedSignals,
                    );

              if (eligibleSignals.length !== eligibleDetectedSignals.length) {
                throw new Error("Eligible signals were not persisted");
              }

              const group = digestCandidates.get(target.profileId) ?? {
                checkpoints: [],
                signals: [],
                target,
              };
              group.signals.push(...eligibleSignals);
              group.checkpoints.push({
                marketDate: latestSnapshot.marketDate,
                profileId: target.profileId,
                symbol,
              });
              digestCandidates.set(target.profileId, group);
            } else {
              await alertCheckCheckpointRepository.markProcessed({
                marketDate: latestSnapshot.marketDate,
                profileId: target.profileId,
                symbol,
              });
            }
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

    for (const { checkpoints, signals, target } of digestCandidates.values()) {
      try {
        const outcome = await deliverBuySignalDigest(
          {
            emailAlertsEnabled: target.emailAlertsEnabled,
            marketDate: eligibleMarketDate,
            recipientEmail: target.recipientEmail,
            signals,
          },
          {
            alertEmailDeliveryRepository,
            emailDeliveryProvider,
            now,
          },
        );

        if (outcome.type === "sent") summary.sentEmails += 1;
        if (outcome.type === "skipped") summary.skippedEmails += 1;

        if (outcome.type === "failed") {
          summary.failedEmails += 1;
          errors.push(
            `${target.profileId}: email: ${outcome.deliveries[0]?.providerError ?? "Unknown delivery failure"}`,
          );
          continue;
        }

        for (const checkpoint of checkpoints) {
          try {
            await alertCheckCheckpointRepository.markProcessed(checkpoint);
          } catch (error) {
            summary.failedTargets += 1;
            errors.push(
              `${checkpoint.symbol}: checkpoint: ${formatError(error)}`,
            );
          }
        }
      } catch (error) {
        summary.failedEmails += 1;
        errors.push(`${target.profileId}: email: ${formatError(error)}`);
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

function mergePriceHistory(
  storedSnapshots: PriceSnapshot[],
  fetchedSnapshots: PriceSnapshot[],
) {
  const latestFetchedSnapshot = fetchedSnapshots.at(-1);

  if (!latestFetchedSnapshot) {
    return [];
  }

  const snapshotsByMarketDate = new Map<string, PriceSnapshot>();

  for (const snapshot of storedSnapshots) {
    if (
      snapshot.source === latestFetchedSnapshot.source &&
      snapshot.symbol === latestFetchedSnapshot.symbol
    ) {
      snapshotsByMarketDate.set(snapshot.marketDate, snapshot);
    }
  }

  for (const snapshot of fetchedSnapshots) {
    snapshotsByMarketDate.set(snapshot.marketDate, snapshot);
  }

  return [...snapshotsByMarketDate.values()].sort((left, right) =>
    left.marketDate.localeCompare(right.marketDate),
  );
}

function marketDataFetchWindows(
  storedSnapshots: PriceSnapshot[],
  endDate: string,
): MarketDataDateWindow[] {
  const bootstrapStartDate = shiftCalendarMonths(endDate, -6);

  if (storedSnapshots.length === 0) {
    return [{ endDate, startDate: bootstrapStartDate }];
  }

  const storedDates = storedSnapshots
    .map((snapshot) => snapshot.marketDate)
    .sort();
  const earliestStoredDate = storedDates.at(0);
  const latestStoredDate = storedDates.at(-1);

  if (!earliestStoredDate || !latestStoredDate) {
    return [{ endDate, startDate: bootstrapStartDate }];
  }

  const windows: MarketDataDateWindow[] = [];

  if (earliestStoredDate > bootstrapStartDate) {
    windows.push({
      endDate: earliestStoredDate,
      startDate: bootstrapStartDate,
    });
  }

  const refreshStartDate =
    latestStoredDate < bootstrapStartDate
      ? bootstrapStartDate
      : latestStoredDate;

  if (refreshStartDate <= endDate) {
    windows.push({ endDate, startDate: refreshStartDate });
  }

  return windows;
}

function shiftCalendarMonths(calendarDate: string, months: number) {
  const [year, month, day] = calendarDate.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Invalid market data calendar date");
  }

  const firstOfTargetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = firstOfTargetMonth.getUTCFullYear();
  const targetMonth = firstOfTargetMonth.getUTCMonth();
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const targetDate = new Date(
    Date.UTC(targetYear, targetMonth, Math.min(day, lastDayOfTargetMonth)),
  );

  return targetDate.toISOString().slice(0, 10);
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
