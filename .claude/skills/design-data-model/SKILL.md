---
name: design-data-model
description: Write the data model for a 01scale service module - its entities, how they relate, the life of each record, what every field means, and the business rules. Use when asked to design or explain a module's data, or as step 2 of design-module. For the SQL itself use design-schema.
---

# Design a data model

The data model explains the data to someone who needs to understand it. The SQL is a separate document (`design-schema`).

## Read first

`docs/process/DESIGN-RULES.md`, `docs/architecture/DATABASE-DESIGN.md`, the module's stories (their "Database design" lines), and `docs/services/identity/DATA-MODEL.md` as the example.

## Write

1. **Entities**: each thing the service keeps, in one sentence, with the table that holds it and how it relates to the others ("a user has many sessions").
2. **Life of each record**: when it is created, what changes it, when it ends. Include things that are deliberately never stored.
3. **Fields**, table by table: name, type, whether it can be empty, default, constraints in words, and what it means and why it exists.
4. **Business rules** the service guarantees that the database alone cannot ("a session is valid only if not revoked and not expired").
5. **What is deliberately not stored**, and why.

## Rules that are easy to get wrong

- A table belongs to exactly one service, in that service's schema. A record owned by another service is a plain ID with no foreign key.
- Every user-owned table has `owner_id` (in Identity, `user_id`).
- When a service needs another service's data, it keeps its own copy received through an API call or an event. It never reads the other's table.
- Money is integer minor units plus a currency. Status is text with a fixed list of values.
- Secrets are stored as hashes only. Say which hash.
- Every field gets a reason. If you cannot say why a field exists, remove it.
- State limits with their source (for example, an email is at most 254 characters because that is the longest a mail server accepts).

## Checks

- Every table in the stories' "Database design" lines is present. Extra tables or fields are listed as refinements.
- Each acceptance criterion that implies stored data is covered.
- Deleting a user is accounted for: what is deleted, what is anonymized.

## Output

The entity, lifecycle, table and rule data in `scripts/site/<service>_design.py`; `DATA-MODEL.md` is generated from it.
