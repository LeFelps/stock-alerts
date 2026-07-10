import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    displayName: text("display_name"),
    notes: text("notes"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (watchlistItem) => [
    uniqueIndex("watchlist_items_profile_id_symbol_unique").on(
      watchlistItem.profileId,
      watchlistItem.symbol,
    ),
    index("watchlist_items_profile_id_index").on(watchlistItem.profileId),
  ],
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    symbol: text("symbol").notNull(),
    marketDate: date("market_date").notNull(),
    source: text("source").notNull(),
    currency: text("currency").notNull().default("BRL"),
    open: doublePrecision("open"),
    high: doublePrecision("high"),
    low: doublePrecision("low"),
    close: doublePrecision("close").notNull(),
    adjustedClose: doublePrecision("adjusted_close"),
    volume: bigint("volume", { mode: "number" }),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp("fetched_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (priceSnapshot) => [
    primaryKey({
      columns: [
        priceSnapshot.symbol,
        priceSnapshot.marketDate,
        priceSnapshot.source,
      ],
    }),
    index("price_snapshots_symbol_market_date_index").on(
      priceSnapshot.symbol,
      priceSnapshot.marketDate,
    ),
  ],
);

export const indicatorSnapshots = pgTable(
  "indicator_snapshots",
  {
    symbol: text("symbol").notNull(),
    marketDate: date("market_date").notNull(),
    source: text("source").notNull(),
    close: doublePrecision("close").notNull(),
    ema6: doublePrecision("ema6"),
    ema13: doublePrecision("ema13"),
    ema42: doublePrecision("ema42"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (indicatorSnapshot) => [
    primaryKey({
      columns: [indicatorSnapshot.symbol, indicatorSnapshot.marketDate],
    }),
    index("indicator_snapshots_symbol_market_date_index").on(
      indicatorSnapshot.symbol,
      indicatorSnapshot.marketDate,
    ),
  ],
);

export const signals = pgTable(
  "signals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    signalType: text("signal_type").notNull(),
    reason: text("reason").notNull(),
    marketDate: date("market_date").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (signal) => [
    uniqueIndex("signals_profile_symbol_type_date_unique").on(
      signal.profileId,
      signal.symbol,
      signal.signalType,
      signal.marketDate,
      signal.reason,
    ),
    index("signals_profile_id_created_at_index").on(
      signal.profileId,
      signal.createdAt,
    ),
  ],
);

export const alertEmailDeliveries = pgTable(
  "alert_email_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "cascade" }),
    recipientEmail: text("recipient_email").notNull(),
    status: text("status").notNull(),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    providerError: text("provider_error"),
    skippedReason: text("skipped_reason"),
    sentAt: timestamp("sent_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (delivery) => [
    uniqueIndex("alert_email_deliveries_signal_recipient_unique").on(
      delivery.signalId,
      delivery.recipientEmail,
    ),
    index("alert_email_deliveries_signal_id_index").on(delivery.signalId),
    index("alert_email_deliveries_status_created_at_index").on(
      delivery.status,
      delivery.createdAt,
    ),
  ],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { mode: "date" }).notNull(),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    durationMs: integer("duration_ms"),
    error: text("error"),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (jobRun) => [
    index("job_runs_started_at_index").on(jobRun.startedAt),
    index("job_runs_status_started_at_index").on(
      jobRun.status,
      jobRun.startedAt,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);
