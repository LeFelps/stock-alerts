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
  AlertCheckTarget,
  AlertCheckTargetRepository,
  JobRunRepository,
} from "./ports";

type RunAlertChecksDependencies = {
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

    for (const [symbol, symbolTargets] of targetsBySymbol) {
      const snapshots = await marketDataProvider.fetchDailyPrices(symbol);
      const indicatorSnapshots =
        calculateIndicatorSnapshotsFromPrices(snapshots);

      await priceSnapshotRepository.upsertMany(snapshots);
      await indicatorSnapshotRepository.upsertMany(indicatorSnapshots);
      summary.refreshedSymbols += 1;

      for (const target of symbolTargets) {
        const detectedSignals = detectBuySignalsForProfile({
          indicatorSnapshots,
          profileId: target.profileId,
        });
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
          if (outcome.type === "sent") {
            summary.sentEmails += 1;
          }

          if (outcome.type === "skipped") {
            summary.skippedEmails += 1;
          }

          if (outcome.type === "failed") {
            summary.failedEmails += 1;
          }
        }
      }
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
    return error.message;
  }

  return String(error);
}
