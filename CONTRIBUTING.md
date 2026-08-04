# Contributing to BioLIMS

Thanks for taking a look. Issues describing real lab workflows are as valuable as pull
requests — if something here doesn't match how your lab actually works, that's a bug worth
reporting.

## Development setup

Requires **Node 20+** and **Docker** (for Postgres).

```bash
git clone https://github.com/bioliams/bioliams.git
cd bioliams
npm install

cp .env.example .env
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

docker compose up -d db     # Postgres on :5432
npm run db:migrate          # create tables
npm run dev                 # http://localhost:3000
```

Sign up in the browser and name your lab; you'll get starter record types and a demo
freezer tree. To load a fuller dataset:

```bash
npm run db:seed:demo        # demo@biolims.dev / biolims-demo, ~20 records
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also typechecks) |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after editing `src/db/schema` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:seed:demo` | Seed a demo lab |

## Architecture

A single Next.js application — one process, one deployable.

```
src/
  app/
    (app)/            authenticated UI: dashboard, registries, storage, inventory, settings
    (auth)/           sign-in, sign-up
    api/v1/           REST API (API-key auth)
    api/auth/         better-auth handler
  db/schema/          Drizzle table definitions
  lib/
    services/         all business logic — shared by server actions AND the REST API
    tenant.ts         resolves session → active organization
    audit.ts          append-only audit writer
    entity-schema.ts  builds a Zod validator from user-defined field definitions
    storage.ts        attachment storage: local disk or Supabase Storage
```

**Stack:** Next.js 16 · TypeScript · PostgreSQL · Drizzle ORM · better-auth · Tailwind CSS ·
shadcn/ui · Zod · Vitest

### Three conventions worth knowing

**Every mutation goes through `lib/services/`.** The UI calls these via server actions; the
REST API calls the same functions. There is exactly one code path that can create a sample,
so validation, ID generation and audit logging can't drift apart between the two entry
points. If you add an endpoint, put the logic in a service and call it from both.

**Organization scoping is a function argument, not middleware.** Every service function
takes `orgId` as its first parameter and every query filters on it. A missing tenant check
becomes a type error rather than a silent cross-lab data leak. Never query a domain table
without an organization predicate.

**User-defined fields are validated at write time.** Custom field values live in a `jsonb`
column, and `buildEntitySchema(fields)` turns a record type's field definitions into a Zod
schema on the fly. Schema flexibility without giving up validation — so don't write to
`entities.data` without going through `validateEntityData`.

### Adding a field type

User-defined field types are declared in `src/db/schema/lims.ts` (`FieldType`) and need
handling in three places:

1. `src/lib/entity-schema.ts` — how it validates
2. `src/components/entity-field-input.tsx` — how it's edited
3. `src/lib/format-field.ts` — how it renders read-only

## Testing

`npm test` runs the unit tests. The dynamic validation layer in `src/lib/entity-schema.ts`
is the highest-leverage thing to keep covered, since every record write depends on it.

Before opening a PR, please make sure `npm run build`, `npm test` and `npm run lint` all
pass — the build includes a full typecheck.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for Vercel, Supabase and Docker deployment,
including the serverless connection-pooling and object-storage requirements.
