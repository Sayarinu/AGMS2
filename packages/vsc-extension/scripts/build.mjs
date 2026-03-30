import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repoRoot = path.resolve(root, "..", "..");
const watch = process.argv.includes("--watch");

const pnpmStore = path.join(repoRoot, "node_modules", ".pnpm");
const esbuildPackage = fs.readdirSync(pnpmStore).find(entry => entry.startsWith("esbuild@"));
if (!esbuildPackage) {
  throw new Error("Unable to locate esbuild in node_modules/.pnpm.");
}

const esbuildBin = path.join(pnpmStore, esbuildPackage, "node_modules", "esbuild", "bin", "esbuild");
const mcpRoot = path.join(repoRoot, "node_modules", ".pnpm", "node_modules", "@modelcontextprotocol", "sdk", "dist", "esm");
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.mkdirSync(path.join(root, "server"), { recursive: true });

const extensionArgs = [
  path.join(root, "src", "extension.ts"),
  "--bundle",
  `--outfile=${path.join(root, "dist", "extension.js")}`,
  "--format=cjs",
  "--platform=node",
  "--target=node20",
  "--sourcemap",
  "--external:vscode",
  `--alias:@modelcontextprotocol/sdk/client/index.js=${path.join(mcpRoot, "client", "index.js")}`,
  `--alias:@modelcontextprotocol/sdk/client/stdio.js=${path.join(mcpRoot, "client", "stdio.js")}`,
  `--alias:@modelcontextprotocol/sdk/types.js=${path.join(mcpRoot, "types.js")}`
];

if (watch) {
  extensionArgs.push("--watch");
}

execFileSync(esbuildBin, extensionArgs, {
  cwd: repoRoot,
  stdio: "inherit"
});

const serverArgs = [
  path.join(repoRoot, "packages", "mcp-server", "src", "index.ts"),
  "--bundle",
  `--outfile=${path.join(root, "server", "index.js")}`,
  "--format=cjs",
  "--platform=node",
  "--target=node20",
  "--sourcemap",
  `--alias:@modelcontextprotocol/sdk/server/mcp.js=${path.join(mcpRoot, "server", "mcp.js")}`,
  `--alias:@modelcontextprotocol/sdk/server/stdio.js=${path.join(mcpRoot, "server", "stdio.js")}`,
  `--alias:chokidar=${path.join(pnpmStore, "node_modules", "chokidar")}`,
  `--alias:execa=${path.join(pnpmStore, "node_modules", "execa")}`,
  `--alias:fast-glob=${path.join(pnpmStore, "node_modules", "fast-glob")}`,
  `--alias:zod=${path.join(pnpmStore, "node_modules", "zod")}`
];

execFileSync(esbuildBin, serverArgs, {
  cwd: repoRoot,
  stdio: "inherit"
});
