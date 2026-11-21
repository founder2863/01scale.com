-- Generated from the design. Do not edit by hand; see SCHEMA.md.
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
