# BioLIMS

An open-source Laboratory Information Management System — a self-hostable alternative to
commercial lab platforms like Scispot, Benchling and LabWare.

BioLIMS is built around one idea: **you define what your lab tracks.** Instead of shipping a
fixed "Sample" table, it lets you create record types with your own fields — no code, no
consultant, no per-seat licence. Samples, reagents, primers, cell lines, mouse colonies,
whatever your science actually needs.

> **Status:** v0.1 — the LIMS core is complete and tested. ELN, workflow automation and
> instrument integrations are on the roadmap below.

---

## What's in v0.1

**Custom record types.** Build a schema in the browser: add fields of type text, number, date,
select, multi-select or boolean; mark them required; set units. Every type gets its own
auto-incrementing ID series (`SMP-000001`, `RGT-000042`).

**Sample registry.** A searchable, filterable table per record type with columns driven by your
schema. CSV import with per-row validation errors, and CSV export.

**Storage management.** Model your physical lab as a tree — site → room → freezer → shelf →
rack → box. Boxes render as an interactive grid; click a well to free it, or place a sample
into a specific position. Every sample's full storage path is one click away.

**Inventory.** Mark a record type as inventory-tracked and it gains quantity, unit, lot and
expiry. Set a minimum threshold and low-stock items surface on the dashboard. Quantities are
editable inline for fast bench updates.

**Sample lineage.** Records can derive from other records, so aliquots and extractions keep a
link back to the parent. The detail page shows both directions.

**Attachments.** Upload files against any record — instrument outputs, gel images, CoAs.

**Audit trail.** Every create, update, move and delete is written to an append-only log with
actor, timestamp and a before/after diff. Viewable lab-wide or per record.

**Multi-tenancy.** Organizations ("labs") with member roles and email invitations. Every query
is scoped by organization at the service layer, so one lab can never read another's data —
including through the API.

**REST API.** Full CRUD over records, record types and locations, authenticated with
per-lab API keys. OpenAPI spec at `/api/v1/openapi.json`.

---

## Quick start

Requires **Node 20+** and **Docker** (for Postgres).

```bash
git clone git@github.com:bioliams/bioliams.git
cd bioliams
npm install

cp .env.example .env
# Set a real secret:
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

docker compose up -d db     # Postgres on :5432
npm run db:migrate          # create tables
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000, create an account, and name your lab. You'll be set up with
starter record types (Sample, Reagent, Primer) and a demo freezer → rack → box tree.

To load example records and print an API key:

```bash
npm run db:seed -- your-lab-slug
```

### Deploying with Docker

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
docker compose --profile prod up -d --build
```

The app runs on port 3000 with Postgres and an uploads volume alongside it. Run
`npm run db:migrate` once against the database before first use.

---

## Using the API

Create a key in **Settings → API keys**, then:

```bash
export BIOLIMS_KEY=lk_...

# List all samples
curl -H "Authorization: Bearer $BIOLIMS_KEY" \
  "http://localhost:3000/api/v1/entities?type=sample"

# Register a new sample
curl -X POST -H "Authorization: Bearer $BIOLIMS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"sample","name":"Patient 042 gDNA",
       "data":{"sample_type":"DNA","organism":"Homo sapiens","concentration":88.1}}' \
  "http://localhost:3000/api/v1/entities"

# Move a sample into well B3 of a box
curl -X PATCH -H "Authorization: Bearer $BIOLIMS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"<box-id>","position_row":1,"position_col":2}' \
  "http://localhost:3000/api/v1/entities/SMP-000042"
```

Validation errors come back per field, so scripted imports can report exactly what's wrong:

```json
{ "error": "Validation failed",
  "fieldErrors": { "sample_type": "Invalid option: expected one of \"Blood\"|\"DNA\"|…" } }
```

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/v1/entities` | `GET`, `POST` | List and register records |
| `/api/v1/entities/{id}` | `GET`, `PATCH`, `DELETE` | Fetch, update, archive — accepts internal ID or display ID |
| `/api/v1/entity-types` | `GET`, `POST` | Inspect and create record types |
| `/api/v1/locations` | `GET`, `POST` | Storage hierarchy |
| `/api/v1/openapi.json` | `GET` | Machine-readable spec |

---

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
```

Two design decisions worth knowing:

**Every mutation goes through `lib/services/`.** The UI calls these via server actions; the
REST API calls the same functions. There is exactly one code path that can create a sample, so
validation, ID generation and audit logging can't drift apart between the two entry points.

**Organization scoping is a function argument, not middleware.** Every service function takes
`orgId` as its first parameter and every query filters on it. A missing tenant check becomes a
type error rather than a silent data leak.

Custom field values live in a `jsonb` column validated at write time by a Zod schema built
from the record type's field definitions (`buildEntitySchema`). You get schema flexibility
without giving up validation.

**Stack:** Next.js 16 · TypeScript · PostgreSQL 16 · Drizzle ORM · better-auth · Tailwind CSS ·
shadcn/ui · Zod · Vitest

---

## Development

```bash
npm run dev          # dev server
npm run build        # production build (also typechecks)
npm test             # unit tests
npm run lint         # eslint
npm run db:generate  # generate a migration after editing src/db/schema
npm run db:migrate   # apply migrations
npm run db:studio    # browse the database
```

---

## Roadmap

- **ELN** — rich-text experiment notebooks with protocol templates, linked to samples
- **Workflow automation** — multi-step lab processes with task assignment and sample state
- **Instrument integrations** — parsers that turn plate readers, sequencers and qPCR output
  into structured records
- **Barcode / label printing** — scan-to-find and Zebra label support
- **Python client** — a `biolims` package for notebook users
- **Electronic signatures** — 21 CFR Part 11 style sign-off on records
- **S3-compatible attachment storage**

Contributions are very welcome — especially from people who actually run a lab and can say
which of the above matters most.

## License

MIT — see [LICENSE](LICENSE).
