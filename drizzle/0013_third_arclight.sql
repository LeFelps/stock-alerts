CREATE TYPE "public"."profile_role" AS ENUM('USER', 'SUPER');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "profile_role" DEFAULT 'USER' NOT NULL;