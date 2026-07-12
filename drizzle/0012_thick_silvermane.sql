ALTER TABLE "watchlist_items" RENAME COLUMN "short_name" TO "long_name";--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD COLUMN "logo_url" text;