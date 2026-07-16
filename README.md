# Stock Alerts

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-087EA4?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

Stock Alerts is a study project for monitoring a personal list of assets traded on the Brazilian market. It was built to explore the Next.js App Router, feature-oriented application architecture, scheduled background work, external data providers, and email delivery.

The application stores daily market data, calculates exponential moving averages, records technical buy signals, and displays the results in an authenticated dashboard. It is not intended to provide investment advice.

## Index

- [Screenshots](#screenshots)
- [Features](#features)
- [The `SUPER` role](#the-super-role)
- [How the monitoring job works](#how-the-monitoring-job-works)
- [Hosting](#hosting)
  - [Required dependencies](#required-dependencies)
  - [Setup](#setup)
  - [Scheduled routes](#scheduled-routes)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Scripts](#scripts)

## Screenshots

### Monitoring

The main screen shows the latest stored price, current EMA-based suggestion, market-data date, and monitoring status for each asset.

![Monitoring screen](./docs/assets/readme/dashboard.png)

### Asset details

Each monitored asset has a detail page with its latest price, EMA 6/13/42 values, a 60-session EMA chart, and an OHLC candlestick chart.

![PETR4 detail screen](./docs/assets/readme/ticker-detail.png)

The account email was replaced with `email@example.com` while capturing these screenshots. The remaining data comes from the running production application.

## Features

- Google authentication with an optional exact-email allowlist.
- Profile-owned watchlists with symbol validation through [brapi.dev](https://brapi.dev/docs).
- Asset names, logos, notes, and per-asset pause/resume controls.
- Daily OHLC price snapshots and EMA 6, 13, and 42 calculations.
- Current technical classification: buy, hold, sell, or insufficient data.
- Buy-signal history based on EMA crossovers.
- Per-profile email preference and Resend signal digests.
- Protected Vercel Cron routes for market checks and missing-logo refreshes.
- Persisted job history, checkpoints, and email delivery attempts.
- Unit, component, server-action, and Playwright browser tests.

## The `SUPER` role

The project includes a small hidden maintainer flow:

1. Sign in normally.
2. Click the email address in the dashboard header five times within two seconds.
3. Enter the value configured in `ROLE_ACCESS_PASSWORD`.

The profile is promoted to `SUPER` and the **Execuções** section becomes available. Server-side authorization also protects the route and retry action.

The execution screen shows recent job results, duration, processed assets, generated signals, email outcomes, and provider errors. A `SUPER` profile can retry the latest failed alert-check run.

![SUPER execution history](./docs/assets/readme/jobs.png)

`ROLE_ACCESS_PASSWORD` is a shared promotion secret. Use a long, unique value and restrict `ALLOWED_EMAILS` in production. The promoted role is stored on the application profile.

## How the monitoring job works

The scheduled alert check:

1. Finds enabled profile/asset pairs.
2. Fetches each distinct symbol from brapi.dev once per run.
3. Stores new price history and recalculates EMA snapshots.
4. Detects buy-signal crossovers for each profile.
5. Sends at most one eligible signal digest per profile and market date.
6. Records checkpoints, delivery results, and the overall job summary.

The current dashboard suggestion is based on EMA alignment:

| Alignment                        | Suggestion        |
| -------------------------------- | ----------------- |
| `EMA 6 > EMA 13 > EMA 42`        | Buy               |
| `EMA 6 < EMA 13 < EMA 42`        | Sell              |
| Any other complete alignment     | Hold              |
| One or more averages unavailable | Insufficient data |

Recorded buy signals use two crossover rules:

- EMA 6 crosses above EMA 42.
- EMA 6 crosses above EMA 13 while EMA 6 is above EMA 42.

## Hosting

The repository is configured for Vercel and PostgreSQL. Another Node.js host can run the application, but it must provide equivalent scheduled HTTPS requests for the two cron routes.

### Required dependencies

#### Local software

| Dependency                     | Requirement                               |
| ------------------------------ | ----------------------------------------- |
| [Git](https://git-scm.com/)    | Current stable version                    |
| [Node.js](https://nodejs.org/) | `20.9` or newer                           |
| [pnpm](https://pnpm.io/)       | `11.8.0`                                  |
| PostgreSQL client tools        | Recommended for local database management |

Enable the package-manager version declared by the repository:

```bash
corepack enable
corepack prepare pnpm@11.8.0 --activate
```

If Corepack is unavailable in the installed Node.js distribution, install it first with `npm install --global corepack`.

#### External services

| Service                                                           | Use                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| PostgreSQL                                                        | Application data, Auth.js sessions, and job history |
| [Google Cloud](https://console.cloud.google.com/apis/credentials) | OAuth 2.0 web client                                |
| [brapi.dev](https://brapi.dev/dashboard)                          | B3 asset metadata and historical prices             |
| [Resend](https://resend.com/)                                     | Signal digest delivery                              |
| [Vercel](https://vercel.com/)                                     | Hosting and scheduled route invocation              |

The current email-provider validation requires a sender on the exact `fellcor.com` domain. A fork using another domain must update `src/features/alerts/infrastructure/email-delivery-provider-factory.ts`.

### Setup

#### 1. Clone and install

```bash
git clone https://github.com/LeFelps/stock-alerts.git
cd stock-alerts
pnpm install --frozen-lockfile
```

#### 2. Create a PostgreSQL database

For a locally running PostgreSQL server:

```bash
createdb stock_alerts
```

For Vercel, provision a managed PostgreSQL database through the [Storage Marketplace](https://vercel.com/docs/marketplace-storage) or another provider. Use a pooled connection string for serverless deployments when the provider offers one.

Use separate databases for production and preview deployments. The `prebuild` script runs `pnpm db:migrate`, so each build migrates the database configured for that environment.

#### 3. Create Google OAuth credentials

In the [Google Auth Platform](https://console.cloud.google.com/auth/overview):

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 client with type **Web application**.
4. Add the exact callback URLs that will be used:

```text
http://localhost:3000/api/auth/callback/google
https://<your-production-domain>/api/auth/callback/google
```

Save the client ID and secret as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

#### 4. Configure brapi.dev and Resend

Create a token in the [brapi dashboard](https://brapi.dev/dashboard). Some test symbols work without authentication, but normal production coverage requires `BRAPI_API_TOKEN`.

For email delivery:

1. Add `fellcor.com` to the [Resend Domains dashboard](https://resend.com/domains).
2. Publish the supplied SPF and DKIM records.
3. Wait for the domain status to become **Verified**.
4. Create a project-specific API key with **Sending access**.

#### 5. Configure environment variables

```bash
cp .env.example .env.local
```

Generate separate secrets for Auth.js, cron requests, and role promotion:

```bash
openssl rand -base64 32
```

Complete `.env.local`:

```dotenv
AUTH_SECRET=<random-auth-secret>
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>

DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/stock_alerts

# Optional. Blank allows any Google account with an email address.
ALLOWED_EMAILS=you@example.com

ROLE_ACCESS_PASSWORD=<random-role-password>

MARKET_DATA_PROVIDER=brapi
BRAPI_API_TOKEN=<brapi-token>

EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend-key-starting-with-re_>
ALERT_EMAIL_FROM="Stock Alerts <noreply.stock-alerts@fellcor.com>"
APP_BASE_URL=http://localhost:3000

CRON_SECRET=<random-cron-secret>
```

| Variable               | Requirement                                            |
| ---------------------- | ------------------------------------------------------ |
| `AUTH_SECRET`          | Required by Auth.js                                    |
| `AUTH_GOOGLE_ID`       | Required Google OAuth client ID                        |
| `AUTH_GOOGLE_SECRET`   | Required Google OAuth client secret                    |
| `DATABASE_URL`         | Required PostgreSQL connection string                  |
| `ALLOWED_EMAILS`       | Optional comma/newline-separated allowlist             |
| `ROLE_ACCESS_PASSWORD` | Required to unlock the `SUPER` role                    |
| `MARKET_DATA_PROVIDER` | Optional; defaults to `brapi`                          |
| `BRAPI_API_TOKEN`      | Required for normal production coverage                |
| `EMAIL_PROVIDER`       | Optional; defaults to `resend`                         |
| `RESEND_API_KEY`       | Required for email delivery and must start with `re_`  |
| `ALERT_EMAIL_FROM`     | Required and currently restricted to `fellcor.com`     |
| `APP_BASE_URL`         | Optional on Vercel; base URL for links in alert emails |
| `CRON_SECRET`          | Required by both scheduled routes                      |

Environment files are ignored by Git except for `.env.example`. None of these variables should use a `NEXT_PUBLIC_` prefix.

#### 6. Migrate and run locally

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

The alert-check route can be invoked manually with the cron secret:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/check-alerts
```

This performs real provider requests and database writes.

#### 7. Run the checks

```bash
pnpm lint
pnpm format
pnpm test
pnpm build
```

`pnpm build` applies migrations first and requires a reachable `DATABASE_URL`.

For the browser suite:

```bash
pnpm exec playwright install
pnpm test:e2e
```

#### 8. Deploy to Vercel

1. Import the Git repository into a new Vercel project.
2. Connect the production PostgreSQL database and expose its connection string as `DATABASE_URL`.
3. Add the environment variables above to the Production environment.
4. If previews are enabled, add their variables separately and use an isolated preview database.
5. Deploy the project.
6. Add the final production callback URL to the Google OAuth client.
7. Confirm both jobs under **Project → Settings → Cron Jobs**.
8. Sign in, add an asset, and invoke the alert-check route once to populate initial history.
9. Unlock `SUPER` and inspect the resulting execution.

Environment-variable changes apply only to new Vercel deployments, so redeploy after editing them.

### Scheduled routes

[`vercel.json`](./vercel.json) registers:

| Schedule       | Route                           | Purpose                                        |
| -------------- | ------------------------------- | ---------------------------------------------- |
| `30 10 * * *`  | `/api/cron/refresh-asset-logos` | Refresh missing or generic logos               |
| `0 11 * * 2-6` | `/api/cron/check-alerts`        | Update prices, indicators, signals, and emails |

Vercel evaluates both schedules in UTC. The alert check runs Tuesday through Saturday at 11:00 UTC, currently 08:00 in São Paulo. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

## Architecture

The App Router composes the feature modules, while scheduled routes reuse the same application services used by the protected maintainer actions.

```mermaid
flowchart LR
  Browser[Authenticated browser] --> Auth[Google OAuth / Auth.js]
  Auth --> UI[Next.js App Router]
  UI --> Profiles[(Profiles and watchlists)]

  Cron[Vercel Cron] --> Routes[Protected cron routes]
  Routes --> Job[Alert-check job]
  Job --> Brapi[brapi.dev]
  Brapi --> Prices[(Price snapshots)]
  Prices --> Indicators[EMA 6 / 13 / 42]
  Indicators --> Signals[(Profile signals)]
  Signals --> Digest[Daily signal digest]
  Digest --> Resend[Resend]

  Super[SUPER profile] --> Runs[Job history and retry]
  Runs --> Job
```

## Project structure

```text
src/
├── app/                    # App Router pages, layouts, actions, and routes
├── components/ui/          # Shared UI primitives
├── db/                     # Drizzle client and PostgreSQL schema
├── features/
│   ├── alerts/             # Email digest delivery
│   ├── indicators/         # EMA calculations and persistence
│   ├── jobs/               # Scheduled orchestration and execution history
│   ├── market-data/        # brapi adapter and market UI
│   ├── profiles/           # Product profiles and preferences
│   ├── role-access/        # SUPER promotion flow
│   ├── signals/            # Signal detection and history
│   └── watchlist/          # Watchlist and asset catalog behavior
└── lib/                    # Shared helpers and authentication policies
```

See [`docs/architecture.md`](./docs/architecture.md) and [`docs/adr/`](./docs/adr) for the architectural rules and accepted decisions.

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start the development server     |
| `pnpm build`       | Migrate and build for production |
| `pnpm start`       | Start the production build       |
| `pnpm lint`        | Run ESLint                       |
| `pnpm format`      | Check formatting                 |
| `pnpm test`        | Run Vitest once                  |
| `pnpm test:e2e`    | Run Playwright tests             |
| `pnpm db:generate` | Generate a Drizzle migration     |
| `pnpm db:migrate`  | Apply checked-in migrations      |
| `pnpm db:push`     | Push the schema directly         |
