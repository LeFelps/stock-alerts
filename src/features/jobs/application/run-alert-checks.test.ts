import { describe, expect, it, vi } from "vitest";

import type { AlertEmailDeliveryRepository } from "@/features/alerts/application/ports";
import { toAlertEmailDeliveryId } from "@/features/alerts/domain/email-delivery";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import type {
  MarketDataProvider,
  PriceSnapshotRepository,
} from "@/features/market-data/application/ports";
import { toProfileId } from "@/features/profiles/domain/profile";
import type { SignalRepository } from "@/features/signals/application/ports";
import { toSignalId, type Signal } from "@/features/signals/domain/signal";

import { emptyJobRunSummary, toJobRunId, type JobRun } from "../domain/job-run";
import { runAlertChecks } from "./run-alert-checks";
import type { AlertCheckTargetRepository, JobRunRepository } from "./ports";

describe("runAlertChecks", () => {
  it("refreshes each enabled symbol once and creates per-profile deliveries", async () => {
    const deps = createDependencies();
    const startedRun = createJobRun();
    const finishedRun = createJobRun({ status: "SUCCESS" });
    const sentSignal = createSignal("signal-1", "profile-1");
    const skippedSignal = createSignal("signal-2", "profile-2");
    const snapshots = Array.from({ length: 43 }, (_, index) =>
      createSnapshot(dateFromDayOffset(index), index < 42 ? 100 : 120),
    );

    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(startedRun);
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(finishedRun);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-1"),
        recipientEmail: "enabled@example.com",
        symbol: "PETR4",
      },
      {
        emailAlertsEnabled: false,
        profileId: toProfileId("profile-2"),
        recipientEmail: "disabled@example.com",
        symbol: "PETR4",
      },
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      snapshots,
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([sentSignal])
      .mockResolvedValueOnce([skippedSignal]);
    vi.mocked(deps.alertEmailDeliveryRepository.reserve).mockResolvedValue(
      createDelivery(sentSignal, "PENDING"),
    );
    vi.mocked(deps.alertEmailDeliveryRepository.markSent).mockResolvedValue(
      createDelivery(sentSignal, "SENT"),
    );
    vi.mocked(
      deps.alertEmailDeliveryRepository.createSkipped,
    ).mockResolvedValue(createDelivery(skippedSignal, "SKIPPED"));

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual({ jobRun: finishedRun, ok: true });
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledTimes(1);
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledWith(
      "PETR4",
    );
    expect(deps.priceSnapshotRepository.upsertMany).toHaveBeenCalledWith(
      snapshots,
    );
    expect(deps.signalRepository.upsertMany).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ profileId: "profile-1", symbol: "PETR4" }),
      ]),
    );
    expect(deps.signalRepository.upsertMany).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({ profileId: "profile-2", symbol: "PETR4" }),
      ]),
    );
    expect(deps.emailDeliveryProvider.sendBuySignalAlert).toHaveBeenCalledWith({
      recipientEmail: "enabled@example.com",
      signal: sentSignal,
    });
    expect(
      deps.alertEmailDeliveryRepository.createSkipped,
    ).toHaveBeenCalledWith({
      recipientEmail: "disabled@example.com",
      signalId: skippedSignal.id,
      skippedReason: "EMAIL_ALERTS_DISABLED",
    });
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMs: 1000,
        error: null,
        jobRunId: startedRun.id,
        status: "SUCCESS",
        summary: {
          createdSignals: 2,
          enabledTargets: 2,
          failedEmails: 0,
          refreshedSymbols: 1,
          sentEmails: 1,
          skippedEmails: 1,
          uniqueSymbols: 1,
        },
      }),
    );
  });

  it("records a successful empty run when there are no enabled targets", async () => {
    const deps = createDependencies();
    const startedRun = createJobRun();
    const finishedRun = createJobRun({ status: "SUCCESS" });
    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(startedRun);
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(finishedRun);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([]);

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual({ jobRun: finishedRun, ok: true });
    expect(deps.marketDataProvider.fetchDailyPrices).not.toHaveBeenCalled();
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        summary: emptyJobRunSummary(),
      }),
    );
  });

  it("records a failed job run when refresh fails", async () => {
    const deps = createDependencies();
    const startedRun = createJobRun();
    const failedRun = createJobRun({
      error: "Provider unavailable",
      status: "FAILED",
    });
    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(startedRun);
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(failedRun);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-1"),
        recipientEmail: "enabled@example.com",
        symbol: "PETR4",
      },
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockRejectedValue(
      new Error("Provider unavailable"),
    );

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual({
      error: "Provider unavailable",
      jobRun: failedRun,
      ok: false,
    });
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Provider unavailable",
        status: "FAILED",
        summary: expect.objectContaining({
          enabledTargets: 1,
          refreshedSymbols: 0,
          uniqueSymbols: 1,
        }),
      }),
    );
  });
});

function createDependencies() {
  const calls = [
    new Date("2026-01-02T12:00:00.000Z"),
    new Date("2026-01-02T12:00:01.000Z"),
  ];

  return {
    alertCheckTargetRepository: {
      listEnabledTargets: vi.fn(),
    } satisfies AlertCheckTargetRepository,
    alertEmailDeliveryRepository: {
      createSkipped: vi.fn(),
      markFailed: vi.fn(),
      markSent: vi.fn(),
      reserve: vi.fn(),
    } satisfies AlertEmailDeliveryRepository,
    emailDeliveryProvider: {
      name: "ses" as const,
      sendBuySignalAlert: vi.fn().mockResolvedValue({
        providerMessageId: "ses-message-1",
      }),
    },
    indicatorSnapshotRepository: {
      latestBySymbol: vi.fn(),
      listForSymbol: vi.fn(),
      upsertMany: vi.fn(),
    } satisfies IndicatorSnapshotRepository,
    jobRunRepository: {
      finish: vi.fn(),
      listRecent: vi.fn(),
      start: vi.fn(),
    } satisfies JobRunRepository,
    marketDataProvider: {
      fetchDailyPrices: vi.fn(),
    } satisfies MarketDataProvider,
    now: vi.fn(() => calls.shift() ?? new Date("2026-01-02T12:00:01.000Z")),
    priceSnapshotRepository: {
      latestMarketDatesBySymbol: vi.fn(),
      listForSymbol: vi.fn(),
      upsertMany: vi.fn(),
    } satisfies PriceSnapshotRepository,
    signalRepository: {
      listForProfile: vi.fn(),
      upsertMany: vi.fn(),
    } satisfies SignalRepository,
  };
}

function createJobRun(fields: Partial<JobRun> = {}): JobRun {
  return {
    createdAt: new Date("2026-01-02T12:00:00.000Z"),
    durationMs: fields.status === "RUNNING" ? null : 1000,
    error: null,
    finishedAt:
      fields.status === "RUNNING" ? null : new Date("2026-01-02T12:00:01.000Z"),
    id: toJobRunId("job-run-1"),
    jobName: "CHECK_ALERTS",
    startedAt: new Date("2026-01-02T12:00:00.000Z"),
    status: "RUNNING",
    summary: emptyJobRunSummary(),
    updatedAt: new Date("2026-01-02T12:00:00.000Z"),
    ...fields,
  };
}

function createSignal(id: string, profileId: string): Signal {
  return {
    createdAt: new Date("2026-01-02T12:00:00.000Z"),
    id: toSignalId(id),
    marketDate: "2026-02-12",
    profileId: toProfileId(profileId),
    reason: "EMA6_CROSSED_ABOVE_EMA42",
    signalType: "BUY",
    symbol: "PETR4",
  };
}

function createDelivery(
  signal: Signal,
  status: "PENDING" | "SENT" | "SKIPPED",
) {
  return {
    createdAt: new Date("2026-01-02T12:00:00.000Z"),
    id: toAlertEmailDeliveryId(`delivery-${signal.id}`),
    provider: status === "SKIPPED" ? null : "ses",
    providerError: null,
    providerMessageId: status === "SENT" ? "ses-message-1" : null,
    recipientEmail: "user@example.com",
    sentAt: status === "SENT" ? new Date("2026-01-02T12:00:01.000Z") : null,
    signalId: signal.id,
    skippedReason: status === "SKIPPED" ? "EMAIL_ALERTS_DISABLED" : null,
    status,
    updatedAt: new Date("2026-01-02T12:00:00.000Z"),
  };
}

function dateFromDayOffset(dayOffset: number) {
  return new Date(Date.UTC(2026, 0, 1 + dayOffset)).toISOString().slice(0, 10);
}

function createSnapshot(marketDate: string, close = 10) {
  return {
    adjustedClose: close,
    close,
    currency: "BRL",
    fetchedAt: new Date("2026-01-03T12:00:00.000Z"),
    high: close + 1,
    low: close - 1,
    marketDate,
    open: close - 0.5,
    rawPayload: {},
    source: "brapi" as const,
    symbol: "PETR4",
    volume: 1000,
  };
}
