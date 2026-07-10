CREATE TABLE "alert_email_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"signal_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"status" text NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"provider_error" text,
	"skipped_reason" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_email_deliveries" ADD CONSTRAINT "alert_email_deliveries_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_email_deliveries_signal_recipient_unique" ON "alert_email_deliveries" USING btree ("signal_id","recipient_email");--> statement-breakpoint
CREATE INDEX "alert_email_deliveries_signal_id_index" ON "alert_email_deliveries" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "alert_email_deliveries_status_created_at_index" ON "alert_email_deliveries" USING btree ("status","created_at");