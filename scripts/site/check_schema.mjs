// Loads every service's schema.sql and sample-data.sql into PGlite (Postgres
// running in-process) and reports whether the SQL runs and every sample row
// passes every constraint. Run with `npm run schema:check` after `npm run site:data`.
// A sub-folder (for example docs/services/identity/account) holds a later part of
// the same service: its schema.sql is loaded after the parent's, in the same database.
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
  const parts = [join(root, service)].concat(
    readdirSync(join(root, service), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(root, service, d.name, "schema.sql")))
      .map((d) => join(root, service, d.name))
      .sort(),
  );
  for (const folder of parts) {
    const label = folder.slice(root.length + 1);
    await checkPart(db, folder, label);
  }
  await db.close();
}

async function checkPart(db, folder, service) {
  const schema = readFileSync(join(folder, "schema.sql"), "utf8");
  try {
    await db.exec(schema);
    const samples = join(folder, "sample-data.sql");
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
}

process.exit(failed ? 1 : 0);
