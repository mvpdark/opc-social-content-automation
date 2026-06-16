import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2];
const passthroughArgs = process.argv.slice(3);

if (!["build", "start"].includes(command)) {
  console.error("Usage: node scripts/next-with-dist.mjs <build|start> [...args]");
  process.exit(1);
}

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextCommand = resolve(frontendRoot, "node_modules", "next", "dist", "bin", "next");
const nextEnvPath = resolve(frontendRoot, "next-env.d.ts");
const tsconfigPath = resolve(frontendRoot, "tsconfig.json");

async function restoreDevNextEnv() {
  try {
    const current = await readFile(nextEnvPath, "utf8");
    const restored = current.replace(
      './.next-build/types/routes.d.ts',
      './.next/types/routes.d.ts'
    );
    if (restored !== current) {
      await writeFile(nextEnvPath, restored);
    }
  } catch (_error) {
    // Next can regenerate this file on the next dev or build run.
  }
}

async function restoreDevTsconfig() {
  try {
    const current = await readFile(tsconfigPath, "utf8");
    const parsed = JSON.parse(current);
    if (!Array.isArray(parsed.include)) {
      return;
    }

    const include = parsed.include.filter((entry) => entry !== ".next-build/types/**/*.ts");
    if (include.length !== parsed.include.length) {
      parsed.include = include;
      await writeFile(tsconfigPath, `${JSON.stringify(parsed, null, 2)}\n`);
    }
  } catch (_error) {
    // TypeScript can still run without this cleanup; verification will catch drift.
  }
}

async function restoreDevBuildFiles() {
  await restoreDevNextEnv();
  await restoreDevTsconfig();
}

const child = spawn(process.execPath, [nextCommand, command, ...passthroughArgs], {
  cwd: frontendRoot,
  env: {
    ...process.env,
    OPC_NEXT_DIST_DIR: ".next-build"
  },
  stdio: "inherit"
});

child.on("close", async (code) => {
  if (command === "build") {
    await restoreDevBuildFiles();
  }
  process.exit(code ?? 1);
});
