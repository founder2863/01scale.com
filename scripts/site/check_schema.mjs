// Loads every service's schema.sql and sample-data.sql into PGlite (Postgres
// running in-process) and reports whether the SQL runs and every sample row
// passes every constraint. Run with `npm run schema:check` after `npm run site:data`.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = "docs/services";
let failed = 0;

for (const service of readdirSync(root).sort()) {
  const schemaFile = join(root, service, "schema.sql");
  if (!existsSync(schemaFile)) continue;
  const db = new PGlite();
  const schema = readFileSync(schemaFile, "utf8");
  const name = (schema.match(/create schema if not exists (\w+)/) ?? [])[1] ?? service;
  // Stand-ins for what the service template (MVP1-E0-07) provides, so the grants run.
  const ownsAudit = new RegExp(`create table ${name}\\.audit_events`).test(schema);
  await db.exec(`
    create schema if not exists ${name};
    ${ownsAudit ? "" : `create table ${name}.audit_events (id uuid primary key);`}
    create role ${name}_service;
  `);
  try {
    await db.exec(schema);
    const samples = join(root, service, "sample-data.sql");
    const rows = existsSync(samples)
      ? readFileSync(samples, "utf8").split("\n").filter((line) => line.startsWith("insert"))
      : [];
    let rejected = 0;
    for (const row of rows) {
      try {
        await db.exec(row);
      } catch (error) {
        rejected += 1;
        console.log(`FAIL ${service}: sample row rejected: ${error.message}\n  ${row.slice(0, 160)}`);
      }
    }
    failed += rejected;
    console.log(
      rejected
        ? `FAIL ${service}: schema runs, but ${rejected} of ${rows.length} sample rows were rejected`
        : `ok   ${service}: schema runs, ${rows.length} sample rows checked`,
    );
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${service}: schema does not run: ${error.message}`);
  }
  await db.close();
}

process.exit(failed ? 1 : 0);
