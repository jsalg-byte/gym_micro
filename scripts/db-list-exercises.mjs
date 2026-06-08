import postgres from "postgres";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    csv: false,
  };

  for (const arg of argv) {
    if (arg === "--csv") {
      options.csv = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  npm run db:list:exercises
  npm run db:list:exercises -- --csv
`);
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function printCsv(rows) {
  const columns = ["id", "name", "category", "muscle_group", "created_by_user_id", "created_at"];
  console.log(columns.join(","));

  for (const row of rows) {
    console.log(columns.map((column) => csvEscape(row[column])).join(","));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const rows = await sql`
      select id, name, category, muscle_group, created_by_user_id, created_at
      from exercises
      order by name asc
    `;

    if (options.csv) {
      printCsv(rows);
      return;
    }

    console.table(rows);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to list exercises:", error.message);
  process.exit(1);
});
