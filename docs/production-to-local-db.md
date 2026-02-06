# Dumping Production Database to Local

## Prerequisites
- Docker running
- Local containers up (`docker compose up -d`)
- Railway Postgres connection strings

## Connection Strings

- **Portal DB:** `postgresql://postgres:<PASSWORD>@ballast.proxy.rlwy.net:23693/railway`
- **Lab Creator DB:** `postgresql://postgres:<PASSWORD>@tramway.proxy.rlwy.net:17350/railway`

(Get current passwords from Railway dashboard → Postgres service → Variables → `DATABASE_URL`)

## Step 1: Dump Production

Production runs Postgres 17, local runs 16. Use a Postgres 17 container for the dump.

```bash
# Portal
docker run --rm postgres:17 pg_dump "postgresql://postgres:PASSWORD@ballast.proxy.rlwy.net:23693/railway" --no-owner --clean > portal-dump.sql

# Lab Creator
docker run --rm postgres:17 pg_dump "postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:17350/railway" --no-owner --clean > lab-creator-dump.sql
```

## Step 2: Load Into Local Containers

```bash
# Portal (database name: portal)
docker exec -i portal-db psql -U postgres -d portal < portal-dump.sql

# Lab Creator (database name: lab-creator)
docker exec -i lab-creator-db psql -U postgres -d lab-creator < lab-creator-dump.sql
```

The `ERROR` lines about relations not existing are normal — that's the `--clean` flag trying to drop tables before recreating them.

## Step 3: Verify

```bash
docker exec portal-db psql -U postgres -d portal -c "\dt public.*"
docker exec lab-creator-db psql -U postgres -d lab-creator -c "\dt public.*"
```

## If You Need to Start Fresh

Drop and recreate the database, then re-import:

```bash
# Portal
docker exec portal-db psql -U postgres -c "DROP DATABASE portal; CREATE DATABASE portal;"
docker exec -i portal-db psql -U postgres -d portal < portal-dump.sql

# Lab Creator
docker exec lab-creator-db psql -U postgres -c "DROP DATABASE \"lab-creator\"; CREATE DATABASE \"lab-creator\";"
docker exec -i lab-creator-db psql -U postgres -d lab-creator < lab-creator-dump.sql
```

## Notes

- Local database files live on the host at `~/projects/databases/portal/` and `~/projects/databases/lab-creator/` (bind mounts, not Docker volumes)
- Changes made in Docker persist on the host and survive container restarts/recreations
- Delete dump files after importing — don't commit them to git
