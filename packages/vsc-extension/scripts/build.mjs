import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.resolve(root, "..", "mcp-server", "src", "index.ts");
const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
  logLevel: "info"
};

// Both bundles resolve their imports through normal Node module resolution, so the
// server picks up its dependencies from packages/mcp-server and the extension from here.
const builds = [
  {
    ...shared,
    entryPoints: [path.join(root, "src", "extension.ts")],
    outfile: path.join(root, "dist", "extension.js"),
    external: ["vscode"]
  },
  {
    ...shared,
    entryPoints: [serverEntry],
    outfile: path.join(root, "server", "index.js")
  }
];

if (watch) {
  for (const options of builds) {
    const context = await esbuild.context(options);
    await context.watch();
  }
} else {
  await Promise.all(builds.map(options => esbuild.build(options)));
}
