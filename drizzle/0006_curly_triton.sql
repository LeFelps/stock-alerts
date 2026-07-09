CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"symbol" text NOT NULL,
	"signal_type" text NOT NULL,
	"reason" text NOT NULL,
	"market_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "signals_profile_symbol_type_date_unique" ON "signals" USING btree ("profile_id","symbol","signal_type","market_date");--> statement-breakpoint
CREATE INDEX "signals_profile_id_created_at_index" ON "signals" USING btree ("profile_id","created_at");