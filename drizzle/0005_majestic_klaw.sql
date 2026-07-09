CREATE TABLE "indicator_snapshots" (
	"symbol" text NOT NULL,
	"market_date" date NOT NULL,
	"source" text NOT NULL,
	"close" double precision NOT NULL,
	"ema6" double precision,
	"ema13" double precision,
	"ema42" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_snapshots_symbol_market_date_pk" PRIMARY KEY("symbol","market_date")
);
--> statement-breakpoint
CREATE INDEX "indicator_snapshots_symbol_market_date_index" ON "indicator_snapshots" USING btree ("symbol","market_date");