import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runTool } from "../mcp-utils.js";
import type { Gms2ProjectService } from "../project/service.js";

export function registerAssetTools(server: McpServer, project: Gms2ProjectService): void {
  server.registerTool(
    "create_object",
    {
      title: "Create Object",
      description: "Create a new object with optional parent, sprite, and events",
      inputSchema: {
        name: z.string(),
        sprite: z.string().nullable().optional(),
        parent: z.string().nullable().optional(),
        events: z
          .array(
            z.object({
              eventType: z.number().int(),
              eventNum: z.number().int(),
              code: z.string().optional(),
              collisionObject: z.string().nullable().optional()
            })
          )
          .optional()
      }
    },
    async input => await runTool(async () => await project.createObject(input))
  );

  server.registerTool(
    "delete_asset",
    {
      title: "Delete Asset",
      description: "Delete an asset by type and name",
      inputSchema: {
        type: z.string(),
        name: z.string(),
        confirm: z.literal(true)
      }
    },
    async ({ type, name }) => await runTool(async () => await project.deleteAsset(type, name))
  );

  server.registerTool(
    "rename_asset",
    {
      title: "Rename Asset",
      description: "Rename an asset and update string references in GML",
      inputSchema: {
        type: z.string(),
        fromName: z.string(),
        toName: z.string()
      }
    },
    async ({ type, fromName, toName }) => await runTool(async () => await project.renameAsset(type, fromName, toName))
  );

  server.registerTool(
    "set_object_sprite",
    {
      title: "Set Object Sprite",
      description: "Assign or clear the sprite on an object",
      inputSchema: {
        objectName: z.string(),
        spriteName: z.string().nullable()
      }
    },
    async ({ objectName, spriteName }) => await runTool(async () => await project.setObjectSprite(objectName, spriteName))
  );

  server.registerTool(
    "set_object_parent",
    {
      title: "Set Object Parent",
      description: "Assign or clear the parent object",
      inputSchema: {
        objectName: z.string(),
        parentName: z.string().nullable()
      }
    },
    async ({ objectName, parentName }) => await runTool(async () => await project.setObjectParent(objectName, parentName))
  );

  server.registerTool(
    "add_event",
    {
      title: "Add Event",
      description:
        "Add an event to an object. eventType follows GameMaker: 0 Create, 1 Destroy, 2 Alarm, 3 Step, 4 Collision, 5 Keyboard, 6 Mouse, 7 Other (user events are 7 with eventNum 10-25), 8 Draw, 9 Key Press, 10 Key Release, 12 Clean Up",
      inputSchema: {
        objectName: z.string(),
        eventType: z.number().int(),
        eventNum: z.number().int(),
        code: z.string().optional(),
        collisionObject: z.string().nullable().optional()
      }
    },
    async ({ objectName, eventType, eventNum, code, collisionObject }) =>
      await runTool(async () => await project.addEvent(objectName, eventType, eventNum, code, collisionObject ?? null))
  );

  server.registerTool(
    "remove_event",
    {
      title: "Remove Event",
      description: "Remove an event from an object",
      inputSchema: {
        objectName: z.string(),
        eventType: z.number().int(),
        eventNum: z.number().int(),
        collisionObject: z.string().nullable().optional()
      }
    },
    async ({ objectName, eventType, eventNum, collisionObject }) =>
      await runTool(async () => await project.removeEvent(objectName, eventType, eventNum, collisionObject ?? null))
  );

  server.registerTool(
    "create_script",
    {
      title: "Create Script",
      description: "Create a new script asset",
      inputSchema: {
        name: z.string(),
        code: z.string()
      }
    },
    async ({ name, code }) => await runTool(async () => await project.createScript(name, code))
  );

  server.registerTool(
    "create_room",
    {
      title: "Create Room",
      description: "Create a new room asset",
      inputSchema: {
        name: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        persistent: z.boolean().optional()
      }
    },
    async input => await runTool(async () => await project.createRoom(input))
  );

  server.registerTool(
    "create_sprite",
    {
      title: "Create Sprite",
      description: "Register a sprite asset without importing image data",
      inputSchema: {
        name: z.string()
      }
    },
    async ({ name }) => await runTool(async () => await project.createSprite(name))
  );
}
