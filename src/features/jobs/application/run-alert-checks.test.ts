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
import type { AlertCheckCheckpointRepository } from "./ports";

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
          failedSymbols: 0,
          failedTargets: 0,
          refreshedSymbols: 1,
          sentEmails: 1,
          skippedEmails: 1,
          staleTargets: 0,
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

  it("continues with later symbols and records a failed run when one symbol fails", async () => {
    const deps = createDependencies();
    const startedRun = createJobRun();
    const failedRun = createJobRun({
      error: "PETR4: Provider unavailable",
      status: "FAILED",
    });
    const snapshots = Array.from({ length: 43 }, (_, index) =>
      createSnapshot(dateFromDayOffset(index), index < 42 ? 100 : 120, "VALE3"),
    );
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
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-2"),
        recipientEmail: "second@example.com",
        symbol: "VALE3",
      },
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices)
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce(snapshots);
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([]);

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual({
      error: "PETR4: Provider unavailable",
      jobRun: failedRun,
      ok: false,
    });
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledTimes(2);
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenNthCalledWith(
      2,
      "VALE3",
    );
    expect(deps.priceSnapshotRepository.upsertMany).toHaveBeenCalledWith(
      snapshots,
    );
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "PETR4: Provider unavailable",
        status: "FAILED",
        summary: expect.objectContaining({
          enabledTargets: 2,
          refreshedSymbols: 1,
          uniqueSymbols: 2,
        }),
      }),
    );
  });

  it("captures provider response metadata in the failed job", async () => {
    const deps = createDependencies();
    const providerError = Object.assign(
      new Error("Failed to fetch market data"),
      {
        metadata: { body: "rate limit exceeded", status: 429 },
      },
    );
    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(createJobRun());
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(
      createJobRun({ status: "FAILED" }),
    );
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-1"),
        recipientEmail: "user@example.com",
        symbol: "PETR4",
      },
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockRejectedValue(
      providerError,
    );

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual(
      expect.objectContaining({
        error:
          "PETR4: Failed to fetch market data (status 429, body rate limit exceeded)",
        ok: false,
      }),
    );
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        error:
          "PETR4: Failed to fetch market data (status 429, body rate limit exceeded)",
        summary: expect.objectContaining({ failedSymbols: 1 }),
      }),
    );
  });

  it("skips a target when its latest market date was already processed", async () => {
    const deps = createDependencies();
    const finishedRun = createJobRun({ status: "SUCCESS" });
    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(createJobRun());
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(finishedRun);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-1"),
        recipientEmail: "user@example.com",
        symbol: "PETR4",
      },
    ]);
    const snapshots = Array.from({ length: 43 }, (_, index) =>
      createSnapshot(dateFromDayOffset(index), index < 42 ? 100 : 120),
    );
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      snapshots,
    );
    vi.mocked(
      deps.alertCheckCheckpointRepository.latestProcessedMarketDate,
    ).mockResolvedValue(snapshots.at(-1)!.marketDate);

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(true);
    expect(deps.signalRepository.upsertMany).not.toHaveBeenCalled();
    expect(
      deps.emailDeliveryProvider.sendBuySignalAlert,
    ).not.toHaveBeenCalled();
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).not.toHaveBeenCalled();
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ staleTargets: 1 }),
      }),
    );
  });

  it("continues with another target after an email failure and records the failure", async () => {
    const deps = createDependencies();
    const failedRun = createJobRun({ status: "FAILED" });
    const firstSignal = createSignal("signal-1", "profile-1");
    const secondSignal = createSignal("signal-2", "profile-2");
    const snapshots = Array.from({ length: 43 }, (_, index) =>
      createSnapshot(dateFromDayOffset(index), index < 42 ? 100 : 120),
    );
    vi.mocked(deps.jobRunRepository.start).mockResolvedValue(createJobRun());
    vi.mocked(deps.jobRunRepository.finish).mockResolvedValue(failedRun);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-1"),
        recipientEmail: "first@example.com",
        symbol: "PETR4",
      },
      {
        emailAlertsEnabled: true,
        profileId: toProfileId("profile-2"),
        recipientEmail: "second@example.com",
        symbol: "PETR4",
      },
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      snapshots,
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([firstSignal])
      .mockResolvedValueOnce([secondSignal]);
    vi.mocked(deps.alertEmailDeliveryRepository.reserve)
      .mockResolvedValueOnce(createDelivery(firstSignal, "PENDING"))
      .mockResolvedValueOnce(createDelivery(secondSignal, "PENDING"));
    vi.mocked(deps.alertEmailDeliveryRepository.markFailed).mockResolvedValue({
      ...createDelivery(firstSignal, "PENDING"),
      providerError: "SES unavailable",
      status: "FAILED",
    });
    vi.mocked(deps.alertEmailDeliveryRepository.markSent).mockResolvedValue(
      createDelivery(secondSignal, "SENT"),
    );
    vi.mocked(deps.emailDeliveryProvider.sendBuySignalAlert)
      .mockRejectedValueOnce(new Error("SES unavailable"))
      .mockResolvedValueOnce({ providerMessageId: "ses-message-2" });

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual(
      expect.objectContaining({
        error: "PETR4: email: SES unavailable",
        ok: false,
      }),
    );
    expect(deps.emailDeliveryProvider.sendBuySignalAlert).toHaveBeenCalledTimes(
      2,
    );
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledTimes(2);
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        summary: expect.objectContaining({ failedEmails: 1, sentEmails: 1 }),
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
    alertCheckCheckpointRepository: {
      latestProcessedMarketDate: vi.fn().mockResolvedValue(null),
      markProcessed: vi.fn(),
    } satisfies AlertCheckCheckpointRepository,
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

function createSnapshot(marketDate: string, close = 10, symbol = "PETR4") {
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
    symbol,
    volume: 1000,
  };
}
