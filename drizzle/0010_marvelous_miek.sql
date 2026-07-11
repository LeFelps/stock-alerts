CREATE TABLE "alert_checkpoints" (
	"profile_id" text NOT NULL,
	"symbol" text NOT NULL,
	"last_processed_market_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_checkpoints_profile_id_symbol_pk" PRIMARY KEY("profile_id","symbol")
);
--> statement-breakpoint
ALTER TABLE "alert_checkpoints" ADD CONSTRAINT "alert_checkpoints_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_checkpoints_symbol_index" ON "alert_checkpoints" USING btree ("symbol");