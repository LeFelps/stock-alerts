# UI Guidelines

The Stock Alerts interface uses Brazilian Portuguese and should maintain a
professional, minimal, and functional appearance.

## Language

- Use Brazilian Portuguese for all visible text.
- Prefer short, direct, action-oriented text.
- Use the terms defined in `CONTEXT.md` for product concepts.
- Never use `pregão` in product copy. Prefer `data de mercado`, `dia de
mercado`, or the formatted date directly, according to context.

## Composition

- Use generous spacing as the default visual separator.
- Use borders only on controls, tables, inputs, highlighted panels, or
  separations required for readability.
- Avoid turning entire sections into cards by default.
- Parent containers control child layout with `padding`, `gap`, `space-y-*`,
  `space-x-*`, grid, and flex.
- Avoid margins on child elements except for local typographic micro-spacing.
- Every element with its own border or background should have appropriate
  padding.

## Colors

- Use a neutral palette for structure and content.
- Use blue as the main accent for active navigation and primary actions.
- Reserve green and red for financial or semantic states.
- Badges should be subtle by default.

## Components

- Use clean tables for comparable data.
- Use light dividers in tables only when they improve readability.
- Use shadcn/Radix primitives for overlays, drawers, and interactive
  components.
- Do not nest cards inside cards.

## Async interactions

- Every async control exposes a local pending state and prevents duplicate
  submission without blocking unrelated controls.
- Apply optimistic changes only when the client can truthfully project the
  result, and roll them back when the server rejects the mutation.
- Keep existing values visible while external market data refreshes; never
  invent prices, dates, or successful provider results.
- Confirm destructive optimistic actions before applying them.
- Announce mutation success and failure with concise Brazilian Portuguese
  toasts. Pending controls and loading regions use appropriate `aria-busy`,
  status, or live-region semantics.
