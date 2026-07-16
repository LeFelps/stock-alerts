import { describe, expect, it, vi } from "vitest";

import type { AlertEmailDeliveryRepository } from "@/features/alerts/application/ports";
import {
  toAlertEmailDeliveryId,
  type AlertEmailDeliveryId,
} from "@/features/alerts/domain/email-delivery";
import type { IndicatorSnapshotRepository } from "@/features/indicators/application/ports";
import type {
  MarketDataProvider,
  PriceSnapshotRepository,
} from "@/features/market-data/application/ports";
import { toProfileId } from "@/features/profiles/domain/profile";
import type { SignalRepository } from "@/features/signals/application/ports";
import {
  toSignalId,
  type Signal,
  type SignalId,
} from "@/features/signals/domain/signal";

import { emptyJobRunSummary, toJobRunId, type JobRun } from "../domain/job-run";
import { runAlertChecks } from "./run-alert-checks";
import type {
  AlertCheckCheckpointRepository,
  AlertCheckTarget,
  AlertCheckTargetRepository,
  JobRunRepository,
} from "./ports";

describe("runAlertChecks", () => {
  it("replays the original eligible market date when a failed Friday run is retried on Monday", async () => {
    const deps = createDependencies();
    const signal = createSignal("signal-1", "profile-1", "PETR4", "2026-07-17");
    vi.mocked(deps.now)
      .mockReset()
      .mockReturnValueOnce(new Date("2026-07-20T11:00:00.000Z"))
      .mockReturnValue(new Date("2026-07-20T11:00:01.000Z"));
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-17", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([signal]);

    const result = await runAlertChecks(
      { eligibleMarketDate: "2026-07-17" },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.jobRunRepository.start).toHaveBeenCalledWith(
      expect.objectContaining({ eligibleMarketDate: "2026-07-17" }),
    );
    expect(deps.emailDeliveryProvider.sendBuySignalDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: [
          expect.objectContaining({ currentPrice: 220, symbol: "PETR4" }),
        ],
        marketDate: "2026-07-17",
        signals: [signal],
      }),
    );
  });

  it("fetches each symbol once and sends one digest across symbols for a profile", async () => {
    const deps = createDependencies();
    const targets = [
      createTarget("profile-1", "PETR4"),
      createTarget("profile-1", "VALE3"),
    ];
    const petrSignal = createSignal("signal-1", "profile-1", "PETR4");
    const valeSignal = createSignal("signal-2", "profile-1", "VALE3");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue(targets);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockImplementation(
      async (symbol) => createSnapshots("2026-07-13", symbol),
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([petrSignal])
      .mockResolvedValueOnce([valeSignal]);

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(true);
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledTimes(2);
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).toHaveBeenCalledTimes(1);
    expect(deps.emailDeliveryProvider.sendBuySignalDigest).toHaveBeenCalledWith(
      {
        assets: [
          {
            currency: "BRL",
            currentPrice: 220,
            logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
            longName: "PETR4 S.A.",
            symbol: "PETR4",
          },
          {
            currency: "BRL",
            currentPrice: 220,
            logoUrl: "https://icons.brapi.dev/icons/VALE3.svg",
            longName: "VALE3 S.A.",
            symbol: "VALE3",
          },
        ],
        marketDate: "2026-07-13",
        recipientEmail: "profile-1@example.com",
        signals: [petrSignal, valeSignal],
      },
    );
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        summary: expect.objectContaining({
          createdSignals: 2,
          refreshedSymbols: 2,
          sentEmails: 1,
          uniqueSymbols: 2,
        }),
      }),
    );
  });

  it("fetches a shared symbol once and creates one digest per profile", async () => {
    const deps = createDependencies();
    const firstSignal = createSignal("signal-1", "profile-1", "PETR4");
    const secondSignal = createSignal("signal-2", "profile-2", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      createTarget("profile-1", "PETR4"),
      createTarget("profile-2", "PETR4"),
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([firstSignal])
      .mockResolvedValueOnce([secondSignal]);

    await runAlertChecks({}, deps);

    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledTimes(1);
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).toHaveBeenCalledTimes(2);
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ sentEmails: 2 }),
      }),
    );
  });

  it("requests six months of prices when bootstrapping a symbol", async () => {
    const deps = createDependencies();
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue([]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockImplementation(
      async (symbol, window) =>
        createSnapshots(window?.endDate ?? "2026-07-13", symbol),
    );
    vi.mocked(
      deps.alertCheckCheckpointRepository.latestProcessedMarketDate,
    ).mockResolvedValue("2026-07-13");

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(true);
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenNthCalledWith(
      1,
      "PETR4",
      { endDate: "2026-07-13", startDate: "2026-01-13" },
    );
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledTimes(1);
  });

  it("merges the fetched window with stored prices before calculating indicators", async () => {
    const deps = createDependencies();
    const history = createSnapshots("2026-07-13", "PETR4", 182);
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      history.slice(-2),
    );
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue(
      history.slice(0, -1),
    );
    vi.mocked(
      deps.alertCheckCheckpointRepository.latestProcessedMarketDate,
    ).mockResolvedValue("2026-07-13");

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(true);
    expect(deps.priceSnapshotRepository.listForSymbol).toHaveBeenCalledWith(
      "PETR4",
    );
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledWith(
      "PETR4",
      { endDate: "2026-07-13", startDate: "2026-07-12" },
    );
    expect(
      vi.mocked(deps.indicatorSnapshotRepository.upsertMany).mock.calls[0]?.[0],
    ).toHaveLength(182);
    expect(
      vi
        .mocked(deps.indicatorSnapshotRepository.upsertMany)
        .mock.calls[0]?.[0].at(41),
    ).toEqual(expect.objectContaining({ ema42: expect.any(Number) }));
  });

  it("reuses stored prices when a retry already has the eligible market date", async () => {
    const deps = createDependencies();
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4", 182),
    );
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockRejectedValue(
      new Error("Redundant repeat-run fetch"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([
      createSignal("signal-1", "profile-1", "PETR4"),
    ]);

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(true);
    expect(deps.marketDataProvider.fetchDailyPrices).not.toHaveBeenCalled();
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledWith({
      marketDate: "2026-07-13",
      profileId: "profile-1",
      symbol: "PETR4",
    });
  });

  it("bounds stored prices to the original eligible date on retry", async () => {
    const deps = createDependencies();
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue(
      createSnapshots("2026-07-14", "PETR4", 183),
    );
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockRejectedValue(
      new Error("Retry should not request newer prices"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([]);

    const result = await runAlertChecks(
      { eligibleMarketDate: "2026-07-13" },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.marketDataProvider.fetchDailyPrices).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(deps.indicatorSnapshotRepository.upsertMany)
        .mock.calls[0]?.[0].at(-1),
    ).toEqual(expect.objectContaining({ marketDate: "2026-07-13" }));
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledWith({
      marketDate: "2026-07-13",
      profileId: "profile-1",
      symbol: "PETR4",
    });
  });

  it("fails when a requested backfill returns no usable prices", async () => {
    const deps = createDependencies();
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue([]);

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual(
      expect.objectContaining({
        error: "PETR4: Market data response contained no daily prices",
        ok: false,
      }),
    );
    expect(deps.marketDataProvider.fetchDailyPrices).toHaveBeenCalledOnce();
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).not.toHaveBeenCalled();
  });

  it("persists historical signals and advances the checkpoint without emailing stale data", async () => {
    const deps = createDependencies();
    const historicalSignal = createSignal(
      "signal-1",
      "profile-1",
      "PETR4",
      "2026-07-10",
    );
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.priceSnapshotRepository.listForSymbol).mockResolvedValue(
      createSnapshots("2026-07-09", "PETR4", 181),
    );
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-10", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([
      historicalSignal,
    ]);

    await runAlertChecks({}, deps);

    expect(deps.signalRepository.upsertMany).toHaveBeenCalled();
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).not.toHaveBeenCalled();
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledWith({
      marketDate: "2026-07-10",
      profileId: "profile-1",
      symbol: "PETR4",
    });
  });

  it("includes only the eligible date when a backfill records historical signals", async () => {
    const deps = createDependencies();
    const historicalSignal = createSignal(
      "signal-1",
      "profile-1",
      "PETR4",
      "2026-07-10",
    );
    const eligibleSignal = createSignal("signal-2", "profile-1", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([
      historicalSignal,
      eligibleSignal,
    ]);

    await runAlertChecks({}, deps);

    expect(deps.emailDeliveryProvider.sendBuySignalDigest).toHaveBeenCalledWith(
      expect.objectContaining({ signals: [eligibleSignal] }),
    );
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ createdSignals: 2, sentEmails: 1 }),
      }),
    );
  });

  it("sends valid digests but fails the job when another symbol refresh fails", async () => {
    const deps = createDependencies();
    const validSignal = createSignal("signal-1", "profile-2", "VALE3");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      createTarget("profile-1", "PETR4"),
      createTarget("profile-2", "VALE3"),
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices)
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce(createSnapshots("2026-07-13", "VALE3"));
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([
      validSignal,
    ]);

    const result = await runAlertChecks({}, deps);

    expect(result).toEqual(
      expect.objectContaining({
        error: "PETR4: Provider unavailable",
        ok: false,
      }),
    );
    expect(deps.emailDeliveryProvider.sendBuySignalDigest).toHaveBeenCalledWith(
      expect.objectContaining({ signals: [validSignal] }),
    );
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        summary: expect.objectContaining({ failedSymbols: 1, sentEmails: 1 }),
      }),
    );
  });

  it("skips targets whose latest market date was already processed", async () => {
    const deps = createDependencies();
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(
      deps.alertCheckCheckpointRepository.latestProcessedMarketDate,
    ).mockResolvedValue("2026-07-13");

    await runAlertChecks({}, deps);

    expect(deps.signalRepository.upsertMany).not.toHaveBeenCalled();
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).not.toHaveBeenCalled();
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ staleTargets: 1 }),
      }),
    );
  });

  it("records disabled recipient digests as skipped", async () => {
    const deps = createDependencies();
    const signal = createSignal("signal-1", "profile-1", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4", false)]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany).mockResolvedValue([signal]);
    vi.mocked(
      deps.alertEmailDeliveryRepository.createSkippedMany,
    ).mockResolvedValue([createDelivery(signal.id, "SKIPPED")]);

    await runAlertChecks({}, deps);

    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).not.toHaveBeenCalled();
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ skippedEmails: 1 }),
      }),
    );
  });

  it("continues with another recipient after an email failure", async () => {
    const deps = createDependencies();
    const firstSignal = createSignal("signal-1", "profile-1", "PETR4");
    const secondSignal = createSignal("signal-2", "profile-2", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([
      createTarget("profile-1", "PETR4"),
      createTarget("profile-2", "PETR4"),
    ]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([firstSignal])
      .mockResolvedValueOnce([secondSignal]);
    vi.mocked(deps.emailDeliveryProvider.sendBuySignalDigest)
      .mockRejectedValueOnce(new Error("Resend unavailable"))
      .mockResolvedValueOnce({ providerMessageId: "message-2" });
    vi.mocked(
      deps.alertEmailDeliveryRepository.markFailedMany,
    ).mockImplementation(async ({ deliveryIds }) =>
      deliveryIds.map((deliveryId: AlertEmailDeliveryId) =>
        createDelivery(
          toSignalId(deliveryId.replace("delivery-", "")),
          "FAILED",
          {
            providerError: "Resend unavailable",
          },
        ),
      ),
    );

    const result = await runAlertChecks({}, deps);

    expect(result.ok).toBe(false);
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).toHaveBeenCalledTimes(2);
    expect(deps.jobRunRepository.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ failedEmails: 1, sentEmails: 1 }),
      }),
    );
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledOnce();
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledWith({
      marketDate: "2026-07-13",
      profileId: toProfileId("profile-2"),
      symbol: "PETR4",
    });
  });

  it("retries a failed email delivery before advancing its checkpoint", async () => {
    const deps = createDependencies();
    const signal = createSignal("signal-1", "profile-1", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([signal])
      .mockResolvedValueOnce([]);
    vi.mocked(deps.signalRepository.findMatching).mockResolvedValue([signal]);
    vi.mocked(deps.emailDeliveryProvider.sendBuySignalDigest)
      .mockRejectedValueOnce(new Error("Resend unavailable"))
      .mockResolvedValueOnce({ providerMessageId: "message-2" });
    vi.mocked(
      deps.alertEmailDeliveryRepository.markFailedMany,
    ).mockResolvedValueOnce([
      createDelivery(signal.id, "FAILED", {
        providerError: "Resend unavailable",
      }),
    ]);

    const failedAttempt = await runAlertChecks({}, deps);

    expect(failedAttempt.ok).toBe(false);
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).not.toHaveBeenCalled();

    const retry = await runAlertChecks({}, deps);

    expect(retry.ok).toBe(true);
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).toHaveBeenCalledTimes(2);
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledOnce();
  });

  it("retries persisted eligible signals when digest reservation fails before checkpointing", async () => {
    const deps = createDependencies();
    const signal = createSignal("signal-1", "profile-1", "PETR4");
    vi.mocked(
      deps.alertCheckTargetRepository.listEnabledTargets,
    ).mockResolvedValue([createTarget("profile-1", "PETR4")]);
    vi.mocked(deps.marketDataProvider.fetchDailyPrices).mockResolvedValue(
      createSnapshots("2026-07-13", "PETR4"),
    );
    vi.mocked(deps.signalRepository.upsertMany)
      .mockResolvedValueOnce([signal])
      .mockResolvedValueOnce([]);
    vi.mocked(deps.signalRepository.findMatching).mockResolvedValue([signal]);
    vi.mocked(
      deps.alertEmailDeliveryRepository.reserveMany,
    ).mockRejectedValueOnce(new Error("Database unavailable"));

    const failedAttempt = await runAlertChecks({}, deps);

    expect(failedAttempt.ok).toBe(false);
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).not.toHaveBeenCalled();
    expect(
      deps.emailDeliveryProvider.sendBuySignalDigest,
    ).not.toHaveBeenCalled();

    const retry = await runAlertChecks({}, deps);

    expect(retry.ok).toBe(true);
    expect(deps.signalRepository.findMatching).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          marketDate: "2026-07-13",
          profileId: "profile-1",
          symbol: "PETR4",
        }),
      ]),
    );
    expect(deps.emailDeliveryProvider.sendBuySignalDigest).toHaveBeenCalledWith(
      expect.objectContaining({ signals: [signal] }),
    );
    expect(
      deps.alertCheckCheckpointRepository.markProcessed,
    ).toHaveBeenCalledWith({
      marketDate: "2026-07-13",
      profileId: "profile-1",
      symbol: "PETR4",
    });
  });
});

function createDependencies() {
  const startedRun = createJobRun();
  const finishedRun = createJobRun({ status: "SUCCESS" });

  return {
    alertCheckCheckpointRepository: {
      latestProcessedMarketDate: vi.fn().mockResolvedValue(null),
      markProcessed: vi.fn(),
    } satisfies AlertCheckCheckpointRepository,
    alertCheckTargetRepository: {
      listEnabledTargets: vi.fn(),
    } satisfies AlertCheckTargetRepository,
    alertEmailDeliveryRepository: {
      createSkippedMany: vi.fn(),
      markFailedMany: vi.fn(),
      markSentMany: vi
        .fn()
        .mockImplementation(async ({ deliveryIds }) =>
          deliveryIds.map((deliveryId: AlertEmailDeliveryId) =>
            createDelivery(
              toSignalId(deliveryId.replace("delivery-", "")),
              "SENT",
            ),
          ),
        ),
      reserveMany: vi
        .fn()
        .mockImplementation(async ({ signalIds }) =>
          signalIds.map((signalId: SignalId) =>
            createDelivery(signalId, "PENDING"),
          ),
        ),
    } satisfies AlertEmailDeliveryRepository,
    emailDeliveryProvider: {
      name: "resend" as const,
      sendBuySignalDigest: vi.fn().mockResolvedValue({
        providerMessageId: "resend-message-1",
      }),
    },
    indicatorSnapshotRepository: {
      latestBySymbol: vi.fn(),
      listForSymbol: vi.fn(),
      upsertMany: vi.fn(),
    } satisfies IndicatorSnapshotRepository,
    jobRunRepository: {
      finish: vi.fn().mockResolvedValue(finishedRun),
      listRecent: vi.fn(),
      start: vi.fn().mockResolvedValue(startedRun),
    } satisfies JobRunRepository,
    marketDataProvider: {
      fetchDailyPrices: vi.fn(),
    } satisfies MarketDataProvider,
    now: vi
      .fn()
      .mockReturnValueOnce(new Date("2026-07-14T11:00:00.000Z"))
      .mockReturnValue(new Date("2026-07-14T11:00:01.000Z")),
    priceSnapshotRepository: {
      listForSymbol: vi
        .fn()
        .mockImplementation(async (symbol) =>
          createSnapshots("2026-07-12", symbol, 181),
        ),
      upsertMany: vi.fn(),
    } satisfies PriceSnapshotRepository,
    signalRepository: {
      findMatching: vi.fn(),
      listForProfile: vi.fn(),
      upsertMany: vi.fn(),
    } satisfies SignalRepository,
  };
}

function createTarget(
  profileId: string,
  symbol: string,
  emailAlertsEnabled = true,
): AlertCheckTarget {
  return {
    emailAlertsEnabled,
    logoUrl: `https://icons.brapi.dev/icons/${symbol}.svg`,
    longName: `${symbol} S.A.`,
    profileId: toProfileId(profileId),
    recipientEmail: `${profileId}@example.com`,
    symbol,
  };
}

function createSignal(
  id: string,
  profileId: string,
  symbol: string,
  marketDate = "2026-07-13",
): Signal {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toSignalId(id),
    marketDate,
    profileId: toProfileId(profileId),
    reason: "EMA6_CROSSED_ABOVE_EMA42",
    signalType: "BUY",
    symbol,
  };
}

function createDelivery(
  signalId: Signal["id"],
  status: "FAILED" | "PENDING" | "SENT" | "SKIPPED",
  fields: { providerError?: string | null } = {},
) {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    id: toAlertEmailDeliveryId(`delivery-${signalId}`),
    provider: status === "SKIPPED" ? null : ("resend" as const),
    providerError: fields.providerError ?? null,
    providerMessageId: status === "SENT" ? "resend-message-1" : null,
    recipientEmail: "user@example.com",
    sentAt: status === "SENT" ? new Date("2026-07-14T11:00:00.000Z") : null,
    signalId,
    skippedReason:
      status === "SKIPPED" ? ("EMAIL_ALERTS_DISABLED" as const) : null,
    status,
    updatedAt: new Date("2026-07-14T11:00:00.000Z"),
  };
}

function createSnapshots(
  latestMarketDate: string,
  symbol: string,
  length = 43,
) {
  const latest = new Date(`${latestMarketDate}T00:00:00.000Z`);

  return Array.from({ length }, (_, index) => {
    const date = new Date(latest);
    date.setUTCDate(latest.getUTCDate() - (length - 1 - index));
    const signalIndex = index - (length - 43);
    const close =
      signalIndex < 29
        ? 150
        : signalIndex < 36
          ? 100
          : signalIndex < 42
            ? 125
            : 220;

    return {
      adjustedClose: close,
      close,
      currency: "BRL",
      fetchedAt: new Date("2026-07-14T11:00:00.000Z"),
      high: close + 1,
      low: close - 1,
      marketDate: date.toISOString().slice(0, 10),
      open: close - 0.5,
      rawPayload: {},
      source: "brapi" as const,
      symbol,
      volume: 1000,
    };
  });
}

function createJobRun(fields: Partial<JobRun> = {}): JobRun {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    durationMs: null,
    eligibleMarketDate: "2026-07-13",
    error: null,
    finishedAt: null,
    id: toJobRunId("job-run-1"),
    jobName: "CHECK_ALERTS",
    startedAt: new Date("2026-07-14T11:00:00.000Z"),
    status: "RUNNING",
    summary: emptyJobRunSummary(),
    updatedAt: new Date("2026-07-14T11:00:00.000Z"),
    ...fields,
  };
}
