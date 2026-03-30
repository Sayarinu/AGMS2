#!/usr/bin/env node
/**
 * Uses Gms2ProjectService from @agms2/mcp-server — same project layer as the gms2-mcp MCP server.
 * Run from repo root: node scripts/verify-queens-court-gms2.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "../packages/mcp-server/dist/src/project/config.js";
import { Gms2ProjectService } from "../packages/mcp-server/dist/src/project/service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPath = path.join(root, "Queen's Court", "Queen's Court.yyp");

const service = new Gms2ProjectService(projectPath, defaultConfig);
await service.initialize();
const meta = service.getProjectMetadata();
const assets = await service.getAssetIndex();
const list = Array.isArray(assets.assets) ? assets.assets : [];
const scripts = list.filter(a => a.type === "script");
const objects = list.filter(a => a.type === "object");
console.log("Project:", meta.name);
console.log("Resources:", scripts.length, "scripts,", objects.length, "objects");
const ok =
  meta.name === "Queen's Court" && scripts.length >= 4 && objects.length >= 1;
if (!ok) {
  console.error("Unexpected project layout");
  process.exit(1);
}
console.log("OK — Gms2ProjectService loaded Queen's Court.");
