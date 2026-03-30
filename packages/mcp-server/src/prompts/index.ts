import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Gms2ProjectService } from "../project/service.js";

export function registerPrompts(server: McpServer, project: Gms2ProjectService): void {
  server.registerPrompt(
    "audit_object",
    {
      title: "Audit Object",
      description: "Describe an object's sprite, parent, and all events with source",
      argsSchema: { name: z.string() }
    },
    async ({ name }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Audit this GameMaker object:\n\n${JSON.stringify(await project.getObjectEvents(name), null, 2)}`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "describe_project",
    {
      title: "Describe Project",
      description: "Summarize project structure and major assets"
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Summarize this GMS2 project:\n\n${JSON.stringify({
              project: project.getProjectMetadata(),
              assets: project.getAssetsTree()
            }, null, 2)}`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "find_usages",
    {
      title: "Find Usages",
      description: "Locate all GML references to a function, variable, or asset name",
      argsSchema: { query: z.string() }
    },
    async ({ query }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Find usages of "${query}" in this GMS2 project:\n\n${JSON.stringify(await project.searchGml(query), null, 2)}`
          }
        }
      ]
    })
  );
}
