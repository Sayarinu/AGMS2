import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResult, successResult } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

export function registerProjectTools(server: McpServer, project: Gms2ProjectService): void {
  server.registerTool(
    "get_asset_index",
    {
      title: "Get Asset Index",
      description: "Return normalized project asset metadata for editor integrations"
    },
    async () => await wrapTool(async () => await project.getAssetIndex())
  );

  server.registerTool(
    "get_asset",
    {
      title: "Get Asset",
      description: "Return raw .yy content for an asset",
      inputSchema: {
        type: z.string(),
        name: z.string()
      }
    },
    async ({ type, name }) => await wrapTool(async () => await project.getAssetWithContent(type, name))
  );

  server.registerTool(
    "get_room_order",
    {
      title: "Get Room Order",
      description: "Return ordered list of rooms"
    },
    async () => await wrapTool(async () => ({ rooms: project.getRoomOrder() }))
  );

  server.registerTool(
    "set_room_order",
    {
      title: "Set Room Order",
      description: "Reorder the room list",
      inputSchema: {
        rooms: z.array(z.string())
      }
    },
    async ({ rooms }) => await wrapTool(async () => ({ rooms: await project.setRoomOrder(rooms) }))
  );

  server.registerTool(
    "add_to_room",
    {
      title: "Add To Room",
      description: "Place an object instance in a room",
      inputSchema: {
        roomName: z.string(),
        objectName: z.string(),
        x: z.number(),
        y: z.number(),
        layerName: z.string().optional()
      }
    },
    async ({ roomName, objectName, x, y, layerName }) =>
      await wrapTool(async () => await project.addToRoom(roomName, objectName, x, y, layerName))
  );

  server.registerTool(
    "remove_from_room",
    {
      title: "Remove From Room",
      description: "Remove an instance from a room by ID",
      inputSchema: {
        roomName: z.string(),
        instanceId: z.string()
      }
    },
    async ({ roomName, instanceId }) => await wrapTool(async () => await project.removeFromRoom(roomName, instanceId))
  );

  server.registerTool(
    "set_macro",
    {
      title: "Set Macro",
      description: "Create or update a macro constant value",
      inputSchema: {
        name: z.string(),
        value: z.string()
      }
    },
    async ({ name, value }) => await wrapTool(async () => await project.setMacro(name, value))
  );

  server.registerTool(
    "get_build_log",
    {
      title: "Get Build Log",
      description: "Return the most recent build output"
    },
    async () => await wrapTool(async () => await project.getBuildLog())
  );
}

async function wrapTool(action: () => Promise<Record<string, unknown>>) {
  try {
    return successResult(await action());
  } catch (error) {
    return errorResult(error);
  }
}
