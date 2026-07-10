import { eq } from "drizzle-orm";

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
    async createSkipped(command) {
      const [delivery] = await database
        .insert(alertEmailDeliveries)
        .values({
          recipientEmail: command.recipientEmail,
          signalId: command.signalId,
          skippedReason: command.skippedReason,
          status: "SKIPPED",
        })
        .onConflictDoNothing({
          target: [
            alertEmailDeliveries.signalId,
            alertEmailDeliveries.recipientEmail,
          ],
        })
        .returning();

      return delivery ? toAlertEmailDelivery(delivery) : null;
    },

    async markFailed(command) {
      const [delivery] = await database
        .update(alertEmailDeliveries)
        .set({
          providerError: command.providerError,
          status: "FAILED",
          updatedAt: new Date(),
        })
        .where(eq(alertEmailDeliveries.id, command.deliveryId))
        .returning();

      if (!delivery) {
        throw new Error("Alert email delivery record not found");
      }

      return toAlertEmailDelivery(delivery);
    },

    async markSent(command) {
      const [delivery] = await database
        .update(alertEmailDeliveries)
        .set({
          providerMessageId: command.providerMessageId,
          sentAt: command.sentAt,
          status: "SENT",
          updatedAt: new Date(),
        })
        .where(eq(alertEmailDeliveries.id, command.deliveryId))
        .returning();

      if (!delivery) {
        throw new Error("Alert email delivery record not found");
      }

      return toAlertEmailDelivery(delivery);
    },

    async reserve(command) {
      const [delivery] = await database
        .insert(alertEmailDeliveries)
        .values({
          provider: command.provider,
          recipientEmail: command.recipientEmail,
          signalId: command.signalId,
          status: "PENDING",
        })
        .onConflictDoNothing({
          target: [
            alertEmailDeliveries.signalId,
            alertEmailDeliveries.recipientEmail,
          ],
        })
        .returning();

      return delivery ? toAlertEmailDelivery(delivery) : null;
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
