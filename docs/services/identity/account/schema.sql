-- Generated from the design. Do not edit by hand; see SCHEMA.md.
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
