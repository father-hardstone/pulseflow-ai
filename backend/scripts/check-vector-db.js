const { Client } = require("pg");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const ext = await client.query(
    "select extname from pg_extension where extname = 'vector'"
  );
  const col = await client.query(`
    select column_name, udt_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'document_chunks' and column_name = 'embedding'
  `);
  const indexes = await client.query(
    "select indexname from pg_indexes where tablename = 'document_chunks'"
  );
  const rpc = await client.query(
    "select proname from pg_proc where proname = 'match_document_chunks'"
  );
  const count = await client.query("select count(*)::int as n from document_chunks");

  console.log({
    pgvectorEnabled: ext.rows.length > 0,
    embeddingColumn: col.rows[0] || null,
    indexes: indexes.rows.map((r) => r.indexname),
    matchRpc: rpc.rows.length > 0,
    chunkCount: count.rows[0]?.n ?? 0,
  });

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
