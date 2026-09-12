# Shared Board

Shared Board is a collaborative live board where Om and teammates can post ideas, questions, and updates, react to notes, and follow recent room activity.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/shared-board/src/App.tsx` — responsive board workspace and interaction flows
- `artifacts/shared-board/src/index.css` — shared board visual tokens, typography, animation, and responsive styling
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `artifacts/api-server/src/routes/board.ts` — board API routes
- `lib/db/src/schema/board.ts` — Drizzle schema for items, reactions, and activity

## Architecture decisions

- The board uses the existing shared Express API and PostgreSQL workspace rather than a client-only store, so posts and reactions survive reloads.
- `Om` is the current board identity for this first version; the API keeps the actor name explicit so auth can be added without changing item or activity shapes.
- Board activity is recorded as its own timeline so recent participation can be shown without reconstructing events from the current item state.
- The frontend invalidates item, activity, and summary queries after every mutation so each surface stays consistent.

## Product

- Browse seeded and newly created board notes
- Filter by idea, question, or update and search title, body, or author
- Create notes as Om
- React or remove a reaction from a note
- Remove notes with confirmation
- Review live summary counts and recent room activity

## User preferences

- Use Om as the displayed user name.

## Gotchas

- Generated API client code uses `Headers.entries()`, so the API client TypeScript config must include `dom.iterable`.
- Restart both the API and shared-board workflows after backend or frontend changes so the preview uses the current build.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
