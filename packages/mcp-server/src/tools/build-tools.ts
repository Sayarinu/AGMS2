import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, successResult } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

export function registerBuildTools(server: McpServer, project: Gms2ProjectService): void {
  server.registerTool(
    "build_project",
    {
      title: "Build Project",
      description: "Run a GMS2 CLI build"
    },
    async () => await wrapTool(async () => await project.runBuildCommand("build"))
  );

  server.registerTool(
    "run_project",
    {
      title: "Run Project",
      description: "Launch a test run via the GMS2 CLI"
    },
    async () => await wrapTool(async () => await project.runBuildCommand("run"))
  );

  server.registerTool(
    "clean_project",
    {
      title: "Clean Project",
      description: "Clean project build output"
    },
    async () => await wrapTool(async () => await project.runBuildCommand("clean"))
  );
}

async function wrapTool(action: () => Promise<Record<string, unknown>>) {
  try {
    return successResult(await action());
  } catch (error) {
    return errorResult(error);
  }
}
