import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, successResult } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

export function registerResources(server: McpServer, project: Gms2ProjectService): void {
  server.registerResource(
    "project",
    "gms2://project",
    {
      title: "GMS2 Project",
      description: "Top-level GameMaker project metadata",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "gms2://project",
          mimeType: "application/json",
          text: JSON.stringify(project.getProjectMetadata(), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "assets",
    "gms2://assets",
    {
      title: "GMS2 Assets",
      description: "Full asset tree grouped by type",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "gms2://assets",
          mimeType: "application/json",
          text: JSON.stringify(project.getAssetsTree(), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "config",
    "gms2://config",
    {
      title: "GMS2 Config",
      description: "Build configuration and included files",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "gms2://config",
          mimeType: "application/json",
          text: JSON.stringify(project.getConfigResource(), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "macros",
    "gms2://macros",
    {
      title: "GMS2 Macros",
      description: "Project macro constants",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "gms2://macros",
          mimeType: "application/json",
          text: JSON.stringify(await project.getMacros(), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "extensions",
    "gms2://extensions",
    {
      title: "GMS2 Extensions",
      description: "Installed extensions and metadata",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "gms2://extensions",
          mimeType: "application/json",
          text: JSON.stringify(await project.getExtensions(), null, 2)
        }
      ]
    })
  );

  registerTemplate(server, project, "asset", "gms2://asset/{type}/{name}", "Asset metadata", async (_uri, params) =>
    await project.getAssetWithContent(requiredParam(params.type, "type"), requiredParam(params.name, "name"))
  );
  registerTemplate(server, project, "object-events", "gms2://object/{name}/events", "Object events and source", async (_uri, params) =>
    await project.getObjectEvents(requiredParam(params.name, "name"))
  );
  registerTemplate(server, project, "script", "gms2://script/{name}", "Script source", async (_uri, params) =>
    await project.readScript(requiredParam(params.name, "name"))
  );
  registerTemplate(server, project, "room", "gms2://room/{name}", "Room configuration", async (_uri, params) =>
    await project.getRoom(requiredParam(params.name, "name"))
  );
}

function registerTemplate(
  server: McpServer,
  _project: Gms2ProjectService,
  name: string,
  uri: string,
  description: string,
  handler: (uri: URL, params: Record<string, string>) => Promise<unknown>
): void {
  server.registerResource(
    name,
    new ResourceTemplate(uri, { list: undefined }),
    {
      title: description,
      description,
      mimeType: "application/json"
    },
    async (resourceUri, params) => {
      try {
        const result = await handler(resourceUri, params as Record<string, string>);
        return {
          contents: [
            {
              uri: resourceUri.href,
              mimeType: "application/json",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        const failure = errorResult(error);
        return {
          contents: [
            {
              uri: resourceUri.href,
              mimeType: "application/json",
              text: JSON.stringify(failure, null, 2)
            }
          ]
        };
      }
    }
  );
}

function requiredParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing resource parameter: ${name}`);
  }
  return value;
}
