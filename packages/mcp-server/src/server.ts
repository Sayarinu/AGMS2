import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPrompts } from "./prompts/index.js";
import type { Gms2ProjectService } from "./project/service.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

export const SERVER_NAME = "gms2-mcp-server";
export const SERVER_VERSION = "0.1.0";

export interface StartServerOptions {
  enableSse: boolean;
  port: number;
}

export interface RunningServer {
  /** Tells every connected client that the resource list changed. */
  notifyResourcesChanged(): void;
}

/** Builds an MCP server with every AGMS2 tool, resource and prompt registered against one project. */
export function createMcpServer(project: Gms2ProjectService): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { logging: {} } });
  registerResources(server, project);
  registerTools(server, project);
  registerPrompts(server, project);
  return server;
}

export async function startMcpServer(project: Gms2ProjectService, options: StartServerOptions): Promise<RunningServer> {
  const servers = new Set<McpServer>();

  const stdioServer = createMcpServer(project);
  await stdioServer.connect(new StdioServerTransport());
  servers.add(stdioServer);

  if (options.enableSse) {
    await startLegacySseServer(project, options.port, servers);
  }

  return {
    notifyResourcesChanged() {
      for (const server of servers) {
        server.sendResourceListChanged();
      }
    }
  };
}

/** Serves the deprecated HTTP+SSE transport on localhost; each session gets its own MCP server. */
async function startLegacySseServer(project: Gms2ProjectService, port: number, servers: Set<McpServer>): Promise<void> {
  const transports = new Map<string, SSEServerTransport>();

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", response);
      const server = createMcpServer(project);
      transports.set(transport.sessionId, transport);
      servers.add(server);
      response.on("close", () => {
        transports.delete(transport.sessionId);
        servers.delete(server);
      });
      await server.connect(transport);
      return;
    }

    if (request.method === "POST" && url.pathname === "/messages") {
      const transport = transports.get(url.searchParams.get("sessionId") ?? "");
      if (!transport) {
        response.writeHead(400).end("Missing or unknown sessionId");
        return;
      }
      await transport.handlePostMessage(request, response);
      return;
    }

    response.writeHead(404).end("Not found");
  };

  const httpServer = createHttpServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      process.stderr.write(`SSE request failed: ${error instanceof Error ? error.message : String(error)}\n`);
      if (!response.headersSent) {
        response.writeHead(500).end("Internal server error");
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => resolve());
  });
}
