#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { loadServerConfig } from "./project/config.js";
import { discoverProjectPath, parseCliArgs } from "./project/discovery.js";
import { parseGmsJson } from "./project/json.js";
import { Gms2ProjectService } from "./project/service.js";
import { startMcpServer } from "./server.js";
import { createProjectWatcher } from "./watcher.js";

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const projectPath = await discoverProjectPath(args.project, process.cwd());
  const projectRoot = path.dirname(projectPath);
  const config = await loadServerConfig(projectRoot);
  parseGmsJson(await import("node:fs/promises").then(fs => fs.readFile(projectPath, "utf8")));

  const project = new Gms2ProjectService(projectPath, config);
  await project.initialize();

  const server = await startMcpServer(project, {
    enableSse: args.sse ?? false,
    port: args.port ?? 3001
  });

  if (config.watchMode) {
    createProjectWatcher(project, async () => {
      await server.sendResourceListChanged();
    });
  }

  const metadata = project.getProjectMetadata();
  process.stderr.write(`GMS2 MCP Server ready — ${String(metadata.name)} (${String(metadata.resourceCount)} assets)\n`);
}

main().catch(error => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
