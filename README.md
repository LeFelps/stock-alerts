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

Future MVP integrations will likely need:

```bash
MARKET_DATA_API_KEY=
```

Keep local values in `.env.local`; `.env*` files are ignored by git. Run
`pnpm db:migrate` against a reachable Postgres `DATABASE_URL` before using auth
locally.

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
