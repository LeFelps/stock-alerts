import { createDrizzleAlertEmailDeliveryRepository } from "@/features/alerts/infrastructure/drizzle-alert-email-delivery-repository";
import { createConfiguredEmailDeliveryProvider } from "@/features/alerts/infrastructure/email-delivery-provider-factory";
import { createDrizzleIndicatorSnapshotRepository } from "@/features/indicators/infrastructure/drizzle-indicator-snapshot-repository";
import { createConfiguredMarketDataProvider } from "@/features/market-data/infrastructure/market-data-provider-factory";
import { createDrizzlePriceSnapshotRepository } from "@/features/market-data/infrastructure/drizzle-price-snapshot-repository";
import { createDrizzleSignalRepository } from "@/features/signals/infrastructure/drizzle-signal-repository";

import { runAlertChecks } from "../application/run-alert-checks";
import { createDrizzleAlertCheckCheckpointRepository } from "../infrastructure/drizzle-alert-checkpoint-repository";
import { createDrizzleAlertCheckTargetRepository } from "../infrastructure/drizzle-alert-check-target-repository";
import { createDrizzleJobRunRepository } from "../infrastructure/drizzle-job-run-repository";

export async function runCheckAlertsJob(
  command: { eligibleMarketDate?: string } = {},
) {
  return runAlertChecks(command, {
    alertCheckCheckpointRepository:
      createDrizzleAlertCheckCheckpointRepository(),
    alertCheckTargetRepository: createDrizzleAlertCheckTargetRepository(),
    alertEmailDeliveryRepository: createDrizzleAlertEmailDeliveryRepository(),
    emailDeliveryProvider: createConfiguredEmailDeliveryProvider(),
    indicatorSnapshotRepository: createDrizzleIndicatorSnapshotRepository(),
    jobRunRepository: createDrizzleJobRunRepository(),
    marketDataProvider: createConfiguredMarketDataProvider(),
    priceSnapshotRepository: createDrizzlePriceSnapshotRepository(),
    signalRepository: createDrizzleSignalRepository(),
  });
}
