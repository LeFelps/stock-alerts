# Stock Alerts

Stock Alerts is a Next.js App Router application for tracking watchlists and
alert rules around stock price movements.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The root route shows the
Google sign-in entry. Signed-in users continue to the protected dashboard at
`/dashboard`.

## Scripts

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm format
pnpm db:generate
pnpm db:migrate
pnpm db:push
```

## Environment Variables

Auth and database-backed sessions require:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=
```

Optional sign-in restriction:

```bash
ALLOWED_EMAILS=
```

`ALLOWED_EMAILS` accepts comma or newline-separated exact email addresses. If it
is unset or blank, any Google account with an email address can sign in.

Configure this Google OAuth callback URL for local development:

```text
http://localhost:3000/api/auth/callback/google
```

Market data is updated exclusively by the scheduled alert-check job; signed-in
users cannot trigger provider requests. The job fetches each distinct enabled
ticker once per run. The MVP currently supports brapi.dev. A brapi token is
required for tickers outside brapi's unrestricted test set:

```bash
MARKET_DATA_PROVIDER=brapi
BRAPI_API_TOKEN=
```

BUY signal digest delivery uses Resend. A run sends at most one digest per
eligible Perfil, containing only signals for the expected market date. Delivery
attempts remain recorded per signal and recipient email, including skipped
sends when a Perfil has email alerts disabled.

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=
ALERT_EMAIL_FROM="Stock Alerts <noreply.stock-alerts@fellcor.com>"
```

Before deployment, verify the root `fellcor.com` domain in the shared Resend
account and wait for it to reach the verified state. Create a new API key for
Stock Alerts with sending-only permission; do not reuse the Unseal project key.
Store that key as `RESEND_API_KEY` in the deployment environment.
The application rejects missing keys and values that do not use Resend's `re_`
prefix.

`ALERT_EMAIL_FROM` accepts either a bare address or Resend's friendly-name
format, such as `Stock Alerts <noreply.stock-alerts@fellcor.com>`. The mailbox
domain must be exactly `fellcor.com`; subdomains such as
`alerts@mail.fellcor.com` are rejected by runtime validation. Quote a
friendly-name value in environment files because it contains spaces.
`EMAIL_PROVIDER` may be omitted because it defaults to `resend`.

Stock Alerts shares the Resend account's sending quotas and domain reputation
with the account's other projects. Monitor usage, bounces, complaints, and
reputation across the account before increasing alert volume; a project-specific
API key isolates credentials but does not isolate those shared limits.

The scheduled alert check route is available at
`/api/cron/check-alerts`. `CRON_SECRET` is required in every environment that
invokes the route. Vercel includes it as
`Authorization: Bearer <CRON_SECRET>` when invoking the route. Requests are
rejected when the secret is missing or does not match.

```bash
CRON_SECRET=
```

Production configures Vercel Cron with `0 11 * * 2-6`. Vercel evaluates cron
expressions in UTC, so the job runs Tuesday through Saturday at 11:00 UTC,
corresponding to 08:00 in `America/Sao_Paulo` while São Paulo remains UTC−03:00.
Tuesday evaluates Monday's market data and Saturday evaluates Friday's. Only a
signal whose market date exactly matches the previous São Paulo calendar day is
eligible for email; delayed or historical signals are stored without being
emailed. Vercel does not invoke cron jobs for preview deployments.

Keep local values in `.env.local`; `.env*` files are ignored by git. Run
`pnpm db:migrate` against a reachable Postgres `DATABASE_URL` before using auth
locally.

## Automated Checks

Opening or updating a pull request runs the unit and browser test suites in
GitHub Actions. The workflow provisions PostgreSQL and applies the checked-in
migrations before running the browser tests. Configure the `Automated tests`
check as required in the repository's branch rules so failed runs block merges.

Installing dependencies enables the Husky-managed Git hooks. The pre-push hook
runs `pnpm test`, and `pnpm build` automatically runs `pnpm db:migrate` first.
Set `DATABASE_URL` to the database that should be migrated before building.

## Project Conventions

- Application code lives under `src/`.
- App Router routes live in `src/app`.
- Product behavior lives in feature modules under `src/features`; see
  `docs/architecture.md`.
- Drizzle schema lives in `src/db/schema.ts`, with generated SQL migrations in
  `drizzle/`.
- Shared UI primitives live in `src/components/ui`.
- Shared utilities live in `src/lib`.
- Import app code through the `@/*` alias, which resolves to `src/*`.
- Tailwind CSS v4 is loaded from `src/app/globals.css`.
- shadcn/ui is initialized through `components.json` with CSS variables and the
  `new-york` style.
- Formatting uses Prettier with the checked-in `.prettierrc`.

## Planned MVP Scope

- Authenticated dashboard routes.
- Watchlist management for tracked assets.
- Alert rules for threshold-based price movements.
- Market data provider integration.
- Notification delivery hooks for triggered alerts.
