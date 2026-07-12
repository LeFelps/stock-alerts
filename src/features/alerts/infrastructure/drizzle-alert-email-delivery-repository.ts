import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { alertEmailDeliveries } from "@/db/schema";

import type { AlertEmailDeliveryRepository } from "../application/ports";
import {
  toAlertEmailDeliveryId,
  type AlertEmailDelivery,
} from "../domain/email-delivery";

type Database = typeof db;
type AlertEmailDeliveryRow = typeof alertEmailDeliveries.$inferSelect;

export function createDrizzleAlertEmailDeliveryRepository(
  database: Database = db,
): AlertEmailDeliveryRepository {
  return {
    async createSkippedMany(command) {
      if (command.signalIds.length === 0) return [];

      const deliveries = await database
        .insert(alertEmailDeliveries)
        .values(
          command.signalIds.map((signalId) => ({
            recipientEmail: command.recipientEmail,
            signalId,
            skippedReason: command.skippedReason,
            status: "SKIPPED",
          })),
        )
        .onConflictDoNothing({
          target: [
            alertEmailDeliveries.signalId,
            alertEmailDeliveries.recipientEmail,
          ],
        })
        .returning();

      return deliveries.map(toAlertEmailDelivery);
    },

    async markFailedMany(command) {
      if (command.deliveryIds.length === 0) return [];

      const deliveries = await database
        .update(alertEmailDeliveries)
        .set({
          providerError: command.providerError,
          status: "FAILED",
          updatedAt: new Date(),
        })
        .where(inArray(alertEmailDeliveries.id, command.deliveryIds))
        .returning();

      if (deliveries.length !== command.deliveryIds.length) {
        throw new Error(
          "One or more alert email delivery records were not found",
        );
      }

      return deliveries.map(toAlertEmailDelivery);
    },

    async markSentMany(command) {
      if (command.deliveryIds.length === 0) return [];

      const deliveries = await database
        .update(alertEmailDeliveries)
        .set({
          providerMessageId: command.providerMessageId,
          sentAt: command.sentAt,
          status: "SENT",
          updatedAt: new Date(),
        })
        .where(inArray(alertEmailDeliveries.id, command.deliveryIds))
        .returning();

      if (deliveries.length !== command.deliveryIds.length) {
        throw new Error(
          "One or more alert email delivery records were not found",
        );
      }

      return deliveries.map(toAlertEmailDelivery);
    },

    async reserveMany(command) {
      if (command.signalIds.length === 0) return [];

      const deliveries = await database
        .insert(alertEmailDeliveries)
        .values(
          command.signalIds.map((signalId) => ({
            provider: command.provider,
            recipientEmail: command.recipientEmail,
            signalId,
            status: "PENDING",
          })),
        )
        .onConflictDoNothing({
          target: [
            alertEmailDeliveries.signalId,
            alertEmailDeliveries.recipientEmail,
          ],
        })
        .returning();

      return deliveries.map(toAlertEmailDelivery);
    },
  };
}

function toAlertEmailDelivery(
  delivery: AlertEmailDeliveryRow,
): AlertEmailDelivery {
  return {
    createdAt: delivery.createdAt,
    id: toAlertEmailDeliveryId(delivery.id),
    provider: delivery.provider as AlertEmailDelivery["provider"],
    providerError: delivery.providerError,
    providerMessageId: delivery.providerMessageId,
    recipientEmail: delivery.recipientEmail,
    sentAt: delivery.sentAt,
    signalId: delivery.signalId as AlertEmailDelivery["signalId"],
    skippedReason:
      delivery.skippedReason as AlertEmailDelivery["skippedReason"],
    status: delivery.status as AlertEmailDelivery["status"],
    updatedAt: delivery.updatedAt,
  };
}
