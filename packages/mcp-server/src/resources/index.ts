import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonText } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

type Params = Record<string, string | string[]>;

export function registerResources(server: McpServer, project: Gms2ProjectService): void {
  const fixed: Array<[name: string, title: string, description: string, read: () => unknown]> = [
    ["project", "GMS2 Project", "Top-level GameMaker project metadata", () => project.getProjectMetadata()],
    ["assets", "GMS2 Assets", "Full asset tree grouped by type", () => project.getAssetsTree()],
    ["config", "GMS2 Config", "Build configuration and included files", () => project.getConfigResource()],
    ["macros", "GMS2 Macros", "#macro definitions found in the project's GML", async () => await project.getMacros()],
    ["extensions", "GMS2 Extensions", "Installed extensions and metadata", async () => await project.getExtensions()]
  ];

  for (const [name, title, description, read] of fixed) {
    const uri = `gms2://${name}`;
    server.registerResource(name, uri, { title, description, mimeType: "application/json" }, async () => ({
      contents: [{ uri, mimeType: "application/json", text: jsonText(await read()) }]
    }));
  }

  const templates: Array<[name: string, uri: string, description: string, read: (params: Params) => Promise<unknown>]> = [
    ["asset", "gms2://asset/{type}/{name}", "Asset metadata", async params => await project.getAssetWithContent(param(params, "type"), param(params, "name"))],
    ["object-events", "gms2://object/{name}/events", "Object events and source", async params => await project.getObjectEvents(param(params, "name"))],
    ["script", "gms2://script/{name}", "Script source", async params => await project.readScript(param(params, "name"))],
    ["room", "gms2://room/{name}", "Room configuration", async params => await project.getRoom(param(params, "name"))]
  ];

  for (const [name, uri, description, read] of templates) {
    // Errors propagate so the client receives a JSON-RPC error rather than an error disguised as content.
    server.registerResource(name, new ResourceTemplate(uri, { list: undefined }), { title: description, description, mimeType: "application/json" }, async (resourceUri, params) => ({
      contents: [{ uri: resourceUri.href, mimeType: "application/json", text: jsonText(await read(params)) }]
    }));
  }
}

function param(params: Params, name: string): string {
  const value = params[name];
  const text = Array.isArray(value) ? value[0] : value;
  if (!text) {
    throw new Error(`Missing resource parameter: ${name}`);
  }
  return decodeURIComponent(text);
}
