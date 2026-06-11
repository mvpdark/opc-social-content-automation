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
    await restoreDevNextEnv();
  }
  process.exit(code ?? 1);
});
