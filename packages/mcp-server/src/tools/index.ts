import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Gms2ProjectService } from "../project/service.js";
import { registerAssetTools } from "./asset-tools.js";
import { registerBuildTools } from "./build-tools.js";
import { registerCodeTools } from "./code-tools.js";
import { registerProjectTools } from "./project-tools.js";

export function registerTools(server: McpServer, project: Gms2ProjectService): void {
  registerAssetTools(server, project);
  registerCodeTools(server, project);
  registerProjectTools(server, project);
  registerBuildTools(server, project);
}
