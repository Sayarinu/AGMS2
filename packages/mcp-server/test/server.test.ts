import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server.js";
import { openFixtureProject, type FixtureProject } from "./helpers.js";

interface TextContent {
  type: string;
  text: string;
}

describe("MCP server", () => {
  let fixture: FixtureProject;
  let client: Client;

  beforeEach(async () => {
    fixture = await openFixtureProject();
    const server = createMcpServer(fixture.service);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await fixture.cleanup();
  });

  const textOf = (result: Record<string, unknown>): string => ((result.content as TextContent[] | undefined)?.[0]?.text ?? "");

  it("lists the project tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map(tool => tool.name);
    expect(names).toEqual(expect.arrayContaining(["get_asset_index", "read_script", "write_event", "search_gml", "create_object", "add_to_room", "build_project"]));
    expect(names).toHaveLength(27);
  });

  it("returns structured content from a tool call", async () => {
    const result = await client.callTool({ name: "read_script", arguments: { name: "scr_math" } });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ name: "scr_math", source: expect.stringContaining("#macro PLAYER_MAX_HP 3") });
    expect(JSON.parse(textOf(result))).toEqual(result.structuredContent);
  });

  it("reports service failures as tool errors", async () => {
    const result = await client.callTool({ name: "get_asset", arguments: { type: "widget", name: "x" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/Unknown asset type "widget"/);
  });

  it("serves fixed resources and resource templates", async () => {
    const project = await client.readResource({ uri: "gms2://project" });
    expect(JSON.parse((project.contents[0] as { text: string }).text)).toMatchObject({ name: "SampleGame" });

    const events = await client.readResource({ uri: "gms2://object/obj_player/events" });
    expect((events.contents[0] as { text: string }).text).toContain("Collision_obj_wall.gml");
  });

  it("fails a resource read for a missing asset", async () => {
    await expect(client.readResource({ uri: "gms2://script/scr_missing" })).rejects.toThrow(/Asset not found: script\/scr_missing/);
  });

  it("builds prompts from project data", async () => {
    const prompt = await client.getPrompt({ name: "find_usages", arguments: { query: "move_speed" } });
    expect((prompt.messages[0]?.content as TextContent).text).toContain("Step_0.gml");
  });
});
