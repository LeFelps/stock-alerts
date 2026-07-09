CREATE TABLE "watchlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"symbol" text NOT NULL,
	"display_name" text,
	"notes" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_items_profile_id_symbol_unique" ON "watchlist_items" USING btree ("profile_id","symbol");--> statement-breakpoint
CREATE INDEX "watchlist_items_profile_id_index" ON "watchlist_items" USING btree ("profile_id");