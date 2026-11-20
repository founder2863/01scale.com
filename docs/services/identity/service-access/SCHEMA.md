# Service access service — schema

> **Version 1 · Identity, third part.** Status: designed, not built. Stories: `MVP1-E1-03`, `MVP1-E0-07`, `MVP1-E0-09`.

One table, added to the `identity` schema after Login's tables. What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.

```sql
-- Identity service, version 1, Service access. Schema: identity.
-- Loaded after Login's schema (docs/services/identity/schema.sql).
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create table identity.service_clients (
  id          text        primary key,
  secret_hash text        not null,
  scopes      text[]      not null default '{}',
  act_scopes  text[]      not null default '{}',
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz,
  revoked_at  timestamptz,

  constraint service_clients_secret_hash_key unique (secret_hash),
  constraint service_clients_id_check check (id ~ '^[a-z0-9-]{1,50}$'),
  constraint service_clients_secret_hash_check check (secret_hash ~ '^[0-9a-f]{64}$'),
  constraint service_clients_scopes_check check (
    array_to_string(scopes || act_scopes, ' ') ~ '^(((identity|upload|extraction|review|payment|delivery|docflow):[a-z_.]+)( |$))*$'
    and array_to_string(act_scopes, ' ') !~ '(^| )identity:'
  )
);

-- Clients are added by migrations only: the service's role may read them and record use, never insert.
grant select, update on identity.service_clients to identity_service;
```

## Constraints at the schema level

- Every scope names a platform service.
- No client may act for users with an Identity scope.
- Identity's role cannot add clients.

## `identity.service_clients`

**Constraints and indexes**

- `service_clients_pkey`: primary key (`id`)
- `service_clients_secret_hash_key`: unique (`secret_hash`)
- `service_clients_id_check`, `service_clients_secret_hash_check`: formats
- `service_clients_scopes_check`: every scope names a platform service; no act scope is an Identity scope

**Sample data**

| `id` | `secret_hash` | `scopes` | `act_scopes` | `created_at` | `rotated_at` | `revoked_at` |
|---|---|---|---|---|---|---|
| `docflow` | `1f4e7a0c3d6b9e2f5a8c1d4e7b0a3f6c9e2d5b8a1c4f7e0d3a6b9c2e5f8a1d4b` | `{payment:write,delivery:write}` | `{upload:read,upload:write,extraction:read,extraction:write,review:read,review:write,payment:read,payment:write,delivery:read}` | `2026-11-17 12:00:00+00` | (empty) | (empty) |
| `extraction` | `2a5d8b1e4c7f0a3d6b9e2c5f8a1d4b7e0c3f6a9d2b5e8c1f4a7d0b3e6c9f2a5d` | `{}` | `{upload:read}` | `2026-11-17 12:00:00+00` | (empty) | (empty) |
| `delivery` | `3b6e9c2f5a8d1b4e7c0f3a6d9b2e5c8f1a4d7b0e3c6f9a2d5b8e1c4f7a0d3b6e` | `{identity:users.read}` | `{}` | `2026-11-17 12:00:00+00` | (empty) | (empty) |

## Common queries

**Sign in a client**

```sql
select scopes, act_scopes from identity.service_clients
where id = $1 and secret_hash = $2 and revoked_at is null;
```
