CREATE TABLE "price_snapshots" (
	"symbol" text NOT NULL,
	"market_date" date NOT NULL,
	"source" text NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"open" double precision,
	"high" double precision,
	"low" double precision,
	"close" double precision NOT NULL,
	"adjusted_close" double precision,
	"volume" bigint,
	"raw_payload" jsonb NOT NULL,
	"fetched_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_snapshots_symbol_market_date_source_pk" PRIMARY KEY("symbol","market_date","source")
);
--> statement-breakpoint
CREATE INDEX "price_snapshots_symbol_market_date_index" ON "price_snapshots" USING btree ("symbol","market_date");