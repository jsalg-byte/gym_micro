import postgres from "postgres";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getDatabaseName(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, "");

  if (!dbName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return dbName;
}

function getAdminUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

function quoteIdent(identifier) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const targetDb = getDatabaseName(databaseUrl);
  const adminUrl = getAdminUrl(databaseUrl);

  const sql = postgres(adminUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 5,
  });

  try {
    const rows = await sql`select 1 from pg_database where datname = ${targetDb} limit 1`;
    if (rows.length > 0) {
      console.log(`Database "${targetDb}" already exists`);
      return;
    }

    await sql.unsafe(`create database ${quoteIdent(targetDb)}`);
    console.log(`Created database "${targetDb}"`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to create database:", error);
  process.exit(1);
});
