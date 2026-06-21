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

Open [http://localhost:3000](http://localhost:3000). The current root route
shows a protected-dashboard placeholder shell that later issues can connect to
authentication, persisted alert rules, and market data.

## Scripts

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm format
```

## Environment Variables

No environment variables are required for the placeholder shell.

Planned MVP integrations will likely need these values:

```bash
AUTH_SECRET=
AUTH_PROVIDER_CLIENT_ID=
AUTH_PROVIDER_CLIENT_SECRET=
MARKET_DATA_API_KEY=
DATABASE_URL=
```

Keep local values in `.env.local`; `.env*` files are ignored by git.

## Project Conventions

- Application code lives under `src/`.
- App Router routes live in `src/app`.
- Shared UI primitives live in `src/components/ui`.
- Shared utilities live in `src/lib`.
- Import app code through the `@/*` alias, which resolves to `src/*`.
- Tailwind CSS v4 is loaded from `src/app/globals.css`.
- shadcn/ui is initialized through `components.json` with CSS variables and the
  `new-york` style.
- Formatting uses Prettier with the checked-in `.prettierrc`.

## Planned MVP Scope

- Authenticated dashboard routes.
- Watchlist management for stock symbols.
- Alert rules for threshold-based price movements.
- Market data provider integration.
- Notification delivery hooks for triggered alerts.
