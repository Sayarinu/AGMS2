import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runTool } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

export function registerCodeTools(server: McpServer, project: Gms2ProjectService): void {
  server.registerTool(
    "write_event",
    {
      title: "Write Event",
      description: "Overwrite the GML source of an object event",
      inputSchema: {
        objectName: z.string(),
        eventType: z.number().int(),
        eventNum: z.number().int(),
        code: z.string(),
        collisionObject: z.string().nullable().optional().describe("Other object, for collision events (eventType 4)")
      }
    },
    async ({ objectName, eventType, eventNum, code, collisionObject }) =>
      await runTool(async () => await project.writeEvent(objectName, eventType, eventNum, code, collisionObject ?? null))
  );

  server.registerTool(
    "write_script",
    {
      title: "Write Script",
      description: "Overwrite the GML source of a script asset",
      inputSchema: {
        name: z.string(),
        code: z.string()
      }
    },
    async ({ name, code }) => await runTool(async () => await project.writeScript(name, code))
  );

  server.registerTool(
    "read_event",
    {
      title: "Read Event",
      description: "Read the GML source of a specific object event",
      inputSchema: {
        objectName: z.string(),
        eventType: z.number().int(),
        eventNum: z.number().int(),
        collisionObject: z.string().nullable().optional().describe("Other object, for collision events (eventType 4)")
      }
    },
    async ({ objectName, eventType, eventNum, collisionObject }) =>
      await runTool(async () => await project.readEvent(objectName, eventType, eventNum, collisionObject ?? null))
  );

  server.registerTool(
    "read_script",
    {
      title: "Read Script",
      description: "Read the GML source of a named script",
      inputSchema: {
        name: z.string()
      }
    },
    async ({ name }) => await runTool(async () => await project.readScript(name))
  );

  server.registerTool(
    "search_gml",
    {
      title: "Search GML",
      description: "Search across all GML files",
      inputSchema: {
        query: z.string(),
        useRegex: z.boolean().optional(),
        caseSensitive: z.boolean().optional()
      }
    },
    async ({ query, useRegex, caseSensitive }) =>
      await runTool(async () => ({ matches: await project.searchGml(query, useRegex, caseSensitive) }))
  );

  server.registerTool(
    "replace_in_gml",
    {
      title: "Replace in GML",
      description: "Find and replace across all GML files",
      inputSchema: {
        find: z.string(),
        replace: z.string(),
        useRegex: z.boolean().optional(),
        caseSensitive: z.boolean().optional()
      }
    },
    async ({ find, replace, useRegex, caseSensitive }) =>
      await runTool(async () => ({ files: await project.replaceInGml(find, replace, useRegex, caseSensitive) }))
  );
}
