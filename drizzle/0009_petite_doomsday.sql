CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"duration_ms" integer,
	"error" text,
	"summary" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "job_runs_started_at_index" ON "job_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "job_runs_status_started_at_index" ON "job_runs" USING btree ("status","started_at");