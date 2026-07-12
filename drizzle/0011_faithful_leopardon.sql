ALTER TABLE "watchlist_items" RENAME COLUMN "display_name" TO "short_name";
UPDATE "watchlist_items" SET "short_name" = NULL;
