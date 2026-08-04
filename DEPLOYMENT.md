# Deploying BioLIMS

BioLIMS is a standard Next.js app plus a Postgres database. This guide covers Vercel +
Supabase; any Node host and Postgres will work the same way.

---

## Vercel + Supabase

### 1. Create the database

In [supabase.com](https://supabase.com) create a project, then from **Project Settings →
Database → Connection string** copy the **Transaction pooler** URI (port `6543`).

Serverless functions open a connection per invocation, so the pooler is not optional — the
direct connection (port 5432) will exhaust its connection limit under load. BioLIMS detects a
pooled URL and automatically disables prepared statements and caps the pool at one connection
per invocation (`src/db/index.ts`).

### 2. Enable attachments (optional)

Serverless filesystems are ephemeral, so uploads need object storage. In Supabase go to
**Storage** and create a bucket named `attachments` (keep it private). Then take
`SUPABASE_URL` and the **service role** key from **Project Settings → API**.

Without these variables the app runs fine — uploads just return a clear "storage not
configured" message instead of failing at runtime.

### 3. Deploy

```bash
npx vercel login          # interactive
npx vercel link           # create or link the project

# Set environment variables (repeat for preview/development if you want them there)
npx vercel env add DATABASE_URL production
npx vercel env add BETTER_AUTH_SECRET production      # openssl rand -base64 32
npx vercel env add SUPABASE_URL production            # optional
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production  # optional

npx vercel --prod
```

`BETTER_AUTH_URL` can be left unset: the app derives its public URL from Vercel's
`VERCEL_PROJECT_PRODUCTION_URL`, and preview hostnames are trusted automatically. Set it
explicitly if you put the app behind a custom domain.

### 4. Create the tables

Migrations run from your machine against the cloud database. Use the **direct** connection
string (port `5432`) here rather than the pooler — DDL over a transaction pooler is unreliable.

```bash
DATABASE_URL='postgres://...:5432/postgres' npm run db:migrate
```

### 5. Seed a demo lab (optional)

Gives reviewers a populated app and a shared login instead of an empty sign-up form:

```bash
DATABASE_URL='postgres://...:5432/postgres' \
BETTER_AUTH_SECRET='<same secret as production>' \
npm run db:seed:demo
```

This creates `demo@biolims.dev` / `biolims-demo` owning a "Demo Biotech Lab" with ~20 records,
storage boxes, lineage links and low-stock alerts. It is a no-op if the user already exists.
**Delete this account before any real use** — the credentials are public.

---

## Self-hosting with Docker

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
docker compose --profile prod up -d --build
docker compose exec app npm run db:migrate
```

Attachments are written to the `uploads` volume on local disk — no object storage needed.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Signs session cookies — must be stable across deploys |
| `BETTER_AUTH_URL` | no | Public URL; inferred on Vercel |
| `UPLOAD_DIR` | no | Local attachment directory (default `./uploads`) |
| `SUPABASE_URL` | no | Enables Supabase Storage for attachments |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Paired with `SUPABASE_URL` |
| `SUPABASE_STORAGE_BUCKET` | no | Bucket name (default `attachments`) |
| `DATABASE_POOLED` | no | Force pooled-connection mode if autodetection misses your pooler |

Rotating `BETTER_AUTH_SECRET` invalidates every active session.
