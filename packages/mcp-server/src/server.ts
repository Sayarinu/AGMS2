import { createServer as createHttpServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPrompts } from "./prompts/index.js";
import type { Gms2ProjectService } from "./project/service.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";

export interface StartServerOptions {
  enableSse: boolean;
  port: number;
}

export async function startMcpServer(project: Gms2ProjectService, options: StartServerOptions): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "gms2-mcp-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        logging: {}
      }
    }
  );

  registerResources(server, project);
  registerTools(server, project);
  registerPrompts(server, project);

  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  if (options.enableSse) {
    await startLegacySseServer(server, options.port);
  }

  return server;
}

async function startLegacySseServer(server: McpServer, port: number): Promise<void> {
  const sseModule = await import("@modelcontextprotocol/sdk/server/sse.js");
  const transports = new Map<string, InstanceType<typeof sseModule.SSEServerTransport>>();

  const httpServer = createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (request.method === "GET" && url.pathname === "/sse") {
      const transport = new sseModule.SSEServerTransport("/messages", response);
      transports.set(transport.sessionId, transport);
      response.on("close", () => {
        transports.delete(transport.sessionId);
      });
      await server.server.connect(transport);
      return;
    }

    if (request.method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !transports.has(sessionId)) {
        response.statusCode = 400;
        response.end("Missing or unknown sessionId");
        return;
      }
      await transports.get(sessionId)!.handlePostMessage(request, response);
      return;
    }

    response.statusCode = 404;
    response.end("Not found");
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => resolve());
  });
}
