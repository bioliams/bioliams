# Backups and restores

Everything BioLIMS knows lives in one PostgreSQL database. Back that up and you have
your lab; lose it and no amount of application code helps. Attachments are the one
exception — they live in object storage or on disk, and are covered at the end.

**The rule that matters: a backup you have never restored is not a backup.** Restoring is
the only test that proves the file is complete, the version matches, and you know the
steps. Do it once now, and once a year after.

---

## Taking a backup

### Docker Compose (self-hosted)

```bash
docker compose exec -T db pg_dump -U labkit -d labkit --format=custom \
  > biolims-$(date +%F).dump
```

### A managed database (Supabase, RDS, Neon)

```bash
pg_dump "$DATABASE_URL" --format=custom > biolims-$(date +%F).dump
```

`--format=custom` is compressed and lets you restore selectively. A plain `.sql` dump
(drop `--format=custom`) is readable in a text editor, which is reassuring but larger.

Managed providers also take their own automatic backups — Supabase keeps daily ones on
paid plans. **Take your own anyway.** A provider's backup lives inside the account you
might lose access to, and disappears with the project if it's ever deleted.

### Every night, without remembering to

On any Linux machine with `psql` installed, `crontab -e`:

```cron
0 2 * * * pg_dump "$DATABASE_URL" --format=custom > /backups/biolims-$(date +\%F).dump
5 2 * * * find /backups -name 'biolims-*.dump' -mtime +30 -delete
```

The second line keeps a month and deletes the rest. Point `/backups` at a directory that
syncs off the machine — a mounted network drive, S3, a university file store. A backup on
the same disk as the database survives a mistake but not a dead disk.

---

## Restoring

Into a new, empty database:

```bash
createdb biolims_restored
pg_restore --dbname=biolims_restored --clean --if-exists biolims-2026-08-14.dump
```

Then point the app at it by changing `DATABASE_URL`, and start it. If migrations were
applied after the dump was taken, run `npm run db:migrate` — it's safe to run when there
is nothing to do.

**Practise on a copy first.** Restore into `biolims_restored` rather than over the live
database, look around the app, and only then swap. `--clean` drops existing objects, so
running it against the wrong database destroys it.

---

## What a good drill looks like

Once, deliberately, before you need it:

1. Take a dump.
2. Restore it into a scratch database on your own machine.
3. Start the app against that database.
4. Sign in and check three things: a sample you recognise, its storage location, and its
   audit history.
5. Write down how long it took. That number is your real recovery time.

If any step surprised you, fix it now while nothing is on fire.

---

## Attachments

Files attached to records are not in the database — only their metadata is.

- **Local storage** (`UPLOAD_DIR`, the default for Docker): back up that directory
  alongside the dump. `tar -czf attachments-$(date +%F).tar.gz "$UPLOAD_DIR"`.
- **Supabase Storage or S3**: covered by that provider's own replication, but export a
  copy if the files matter as much as the records.

A database restore without the matching files leaves records that point at attachments
that aren't there. Keep the two backups from the same night together.

---

## Moving to another server

The same dump is how you migrate. Restore into the new database, set `DATABASE_URL`,
copy the attachments directory, and start the app. Nothing else is stored on the machine —
which is the point of keeping everything in Postgres.

## What is not covered yet

Point-in-time recovery (replaying to the exact minute before a mistake) needs WAL
archiving or a managed provider that offers it. Continuous replication, automated restore
testing and encrypted off-site rotation are on the roadmap. Until then, a nightly dump
you have practised restoring is a genuinely solid position for an academic lab — far
better than the shared spreadsheet it replaced.
