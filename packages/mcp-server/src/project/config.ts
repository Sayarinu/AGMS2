import path from "node:path";
import { exists, readText } from "./fs.js";
import { parseGmsJson } from "./json.js";
import type { Gms2ServerConfig } from "./types.js";

export const defaultConfig: Gms2ServerConfig = {
  gmsBinaryPath: null,
  buildTarget: "Windows",
  runtimePath: null,
  watchMode: true,
  logLevel: "info"
};

export async function loadServerConfig(projectRoot: string): Promise<Gms2ServerConfig> {
  const configPath = path.join(projectRoot, "gms2-mcp.config.json");
  const parsed = (await exists(configPath))
    ? parseGmsJson<Partial<Gms2ServerConfig>>(await readText(configPath))
    : {};

  return {
    ...defaultConfig,
    ...parsed,
    gmsBinaryPath: process.env.GMS2_GMS_BINARY_PATH ?? parsed.gmsBinaryPath ?? defaultConfig.gmsBinaryPath,
    buildTarget: process.env.GMS2_BUILD_TARGET ?? parsed.buildTarget ?? defaultConfig.buildTarget
  };
}
