import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.error("Usage: node scripts/run-with-env.mjs <command> [...args]");
    process.exit(1);
  }

  applyEnvFile(path.resolve(process.cwd(), ".env"));
  applyEnvFile(path.resolve(process.cwd(), ".env.local"));

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: process.env,
  });

  process.exit(result.status ?? 1);
}

main();
