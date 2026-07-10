# Architecture

This app uses feature modules with internal layers. App Router routes should
stay thin and delegate product behavior to modules in
`src/features`.

## Modules

Create a module only when it has real behavior. Do not create empty folders for
future scope.

Default structure:

```text
src/features/<feature>/
  domain/
  application/
  infrastructure/
  server/
  ui/
```

- `domain`: pure types and rules for the product concept.
- `application`: use cases, repository/provider ports, and Result types.
- `infrastructure`: IO adapters, such as Drizzle or external APIs.
- `server`: Next.js adapters, Server Actions, and authenticated helpers.
- `ui`: feature-specific components.

`src/components/ui` remains reserved for shared primitives. Route layouts may
live in `src/app` when they compose navigation, not product behavior.

## Language

Identifiers and folders use English: `profile`, `watchlist`, `alertRule`,
`alert`, `asset`.

Visible text uses Brazilian Portuguese and the terms from `CONTEXT.md`:
`Perfil`, `Ativo`, `Lista de acompanhamento`, `Regra de alerta`, and `Alerta`.

## Dependencies

Routes and `server` files may import Next.js, Auth.js, actions, and
infrastructure adapters.

Use cases in `application` do not import React, Next.js, Auth.js, Drizzle, or
environment variables. They receive business input and dependencies
explicitly.

Domains in `domain` do not import IO, frameworks, or UI.

## Use Cases

Use cases export functions with this signature:

```ts
useCase(command, deps);
```

`command` contains business input, including authenticated `Perfil` identifiers
when needed. `deps` contains ports such as repositories and providers.

Expected failures return typed Results. Unexpected infrastructure errors may be
thrown.

## Repositories

Repository ports live in the `application` layer. Drizzle implementations live
in `infrastructure`.

Repositories return DTOs or domain objects defined by the module, never Drizzle
rows directly.

Resources that belong to a `Perfil` must require `profileId` in repository
methods. The repository applies that filter to prevent access across profiles.
Use cases still express business policy and authorization.

## Validation

Use Zod to validate untrusted input:

- `FormData` received by Server Actions.
- responses from external providers.
- route params or Route Handler payloads.

Data should be parsed at the boundary before reaching use cases.

## App Router

Read the guides in `node_modules/next/dist/docs/` before changing Next.js APIs.
This project uses the Next.js 16 App Router.

Pages and layouts are Server Components by default. Use Client Components only
for state, events, hooks, or browser APIs.

Server Actions are reachable by direct POST. Every Server Action must
authenticate, validate input, call use cases, and revalidate or redirect only at
the boundary.

## Market Data and Alerts

Market data should pass through a provider port and external adapters. Use cases
consume normalized data, not `fetch` or provider details.

Alert rule evaluation should be a use case independent from UI and Next.js,
callable in the future by cron, worker, or Route Handler.

An `Alerta` is the domain occurrence. Email is an infrastructure delivery
channel, not a canonical product concept at this time.

## Tests

New modules should have use case tests with fake repositories. Server Action
adapters should be tested when authentication, validation, or revalidation are
relevant.

UI should have tests focused on routed behavior and user flow.
