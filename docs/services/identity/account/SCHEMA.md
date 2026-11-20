# Account management service — schema

> **Version 1 · Identity, second part.** Status: designed, not built. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

The SQL for Account management, added to the `identity` schema after Login's tables. What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.

```sql
-- Identity service, version 1, Account management. Schema: identity.
-- Loaded after Login's schema (docs/services/identity/schema.sql), which creates identity.users.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create table identity.api_keys (
  id           uuid        primary key,
  user_id      uuid        not null,
  name         text        not null,
  prefix       text        not null,
  key_hash     text        not null,
  scopes       text[]      not null,
  last_used_at timestamptz,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),

  constraint api_keys_user_id_fkey foreign key (user_id)
    references identity.users (id) on delete cascade,
  constraint api_keys_key_hash_key unique (key_hash),
  constraint api_keys_name_check check (length(name) between 1 and 100),
  constraint api_keys_prefix_check check (prefix ~ '^[A-Za-z0-9_-]{8}$'),
  constraint api_keys_key_hash_check check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint api_keys_scopes_check check (
    cardinality(scopes) >= 1
    and scopes <@ array['upload:read', 'upload:write', 'extraction:read', 'extraction:write', 'review:read', 'review:write', 'payment:read', 'payment:write', 'delivery:read', 'docflow:read', 'docflow:write']::text[]
  ),
  constraint api_keys_dates_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '1 year'
    and (revoked_at is null or revoked_at >= created_at)
  )
);

create index api_keys_user_id_idx on identity.api_keys (user_id, created_at desc);

grant select, insert, update, delete on identity.api_keys to identity_service;
```

## Constraints at the schema level

- A key belongs to an existing user and is deleted with them.
- Each key hash is unique and 64 hex characters.
- Every scope is from the allowed list; expiry within a year of creation.

## `identity.api_keys`

**Constraints and indexes**

- `api_keys_pkey`: primary key (`id`)
- `api_keys_user_id_fkey`: foreign key to `identity.users`, delete cascades
- `api_keys_key_hash_key`: unique (`key_hash`)
- `api_keys_name_check`, `api_keys_prefix_check`, `api_keys_key_hash_check`: lengths and formats
- `api_keys_scopes_check`: at least one scope, each from the allowed list
- `api_keys_dates_check`: expiry after creation and within a year; revocation not before creation
- `api_keys_user_id_idx`: index on (`user_id`, `created_at` desc), for the list and the 10-key limit

**Sample data**

| `id` | `user_id` | `name` | `prefix` | `key_hash` | `scopes` | `last_used_at` | `expires_at` | `revoked_at` | `created_at` |
|---|---|---|---|---|---|---|---|---|---|
| `0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `Claude Desktop` | `Hq7vT2mX` | `3b9f0c2d7e41a8c56f0e9d2b4a7c1e8f3d6b9a0c2e5f8a1b4c7d0e3f6a9b2c5d` | `{upload:write,extraction:read,docflow:read,docflow:write}` | `2026-11-17 10:02:11+00` | `2027-02-15 00:00:00+00` | (empty) | `2026-11-17 09:40:00+00` |
| `0193b201-2b3c-7d4e-8f5a-6b7c8d9e0f1a` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `Old script` | `pL4kZ9wE` | `7e2a5c8f1b4d7a0e3c6f9b2d5a8e1c4f7b0d3a6e9c2f5b8d1a4e7c0f3b6d9a2c` | `{docflow:read}` | (empty) | `2027-01-01 00:00:00+00` | `2026-11-17 09:55:00+00` | `2026-11-14 12:00:00+00` |

## Common queries

**Exchange a key**

```sql
select id, user_id, scopes
from identity.api_keys
where key_hash = $1
  and revoked_at is null
  and expires_at > now();
```

**Count active keys before creating one**

```sql
select count(*) from identity.api_keys
where user_id = $1 and revoked_at is null and expires_at > now();
```

**Delete an account**

```sql
delete from identity.users where id = $1;  -- sessions and api_keys cascade
```
