/**
 * Applies backend/db/schema.sql to the Supabase Postgres database.
 *
 * Requires one of:
 *   DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
 *   SUPABASE_DB_PASSWORD=...  (with SUPABASE_URL set)
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

require("../src/config");

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = projectRefFromUrl(process.env.SUPABASE_URL || "");
  if (!password || !ref) return null;

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      "Missing database connection. Add to backend/.env either:\n" +
        "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres\n" +
        "  SUPABASE_DB_PASSWORD=your_database_password\n" +
        "(Find/reset password in Supabase -> Project Settings -> Database)"
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log("[db] Connecting to Supabase Postgres...");
  await client.connect();
  console.log("[db] Applying schema.sql...");

  try {
    await client.query(sql);
  } catch (err) {
    const msg = String(err.message || "");
    if (!/already exists/i.test(msg)) throw err;
    console.warn("[db] Some objects already exist — verifying schema...");
  }

  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`[db] Applying migration ${file}...`);
      try {
        await client.query(migrationSql);
      } catch (err) {
        const msg = String(err.message || "");
        if (!/already exists|duplicate column/i.test(msg)) throw err;
        console.warn(`[db] Skipped ${file} (already applied)`);
      }
    }
  }

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('app_users','app_admins','knowledge_base','document_chunks','leads_campaign','user_demo_recipients')
    order by table_name
  `);

  const names = tables.rows.map((r) => r.table_name);
  const expected = ["app_admins", "app_users", "document_chunks", "knowledge_base", "leads_campaign", "user_demo_recipients"];
  const missing = expected.filter((t) => !names.includes(t));

  if (missing.length) {
    throw new Error(`Schema incomplete. Missing tables: ${missing.join(", ")}`);
  }

  const fn = await client.query(`
    select routine_name
    from information_schema.routines
    where routine_schema = 'public' and routine_name = 'match_document_chunks'
  `);

  if (!fn.rows.length) {
    throw new Error("Missing RPC function: match_document_chunks");
  }

  const llmCol = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_users'
      and column_name = 'llm_provider'
  `);

  if (!llmCol.rows.length) {
    throw new Error("Missing column: app_users.llm_provider");
  }

  await client.end();
  console.log("[db] OK — tables:", names.join(", "));
  console.log("[db] OK — RPC: match_document_chunks");
  console.log("[db] OK — column: app_users.llm_provider");
}

main().catch((err) => {
  console.error("[db] Migration failed:", err.message);
  process.exit(1);
});
