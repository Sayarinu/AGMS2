import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseGmsJson } from "../src/project/json.js";
import { openFixtureProject, type FixtureProject } from "./helpers.js";

type Doc = Record<string, unknown>;

describe("Gms2ProjectService", () => {
  let fixture: FixtureProject;

  beforeEach(async () => {
    fixture = await openFixtureProject();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  const readJson = async (relativePath: string): Promise<Doc> =>
    parseGmsJson<Doc>(await readFile(path.join(fixture.root, relativePath), "utf8"));

  describe("reading", () => {
    it("summarises the project", () => {
      expect(fixture.service.getProjectMetadata()).toMatchObject({
        name: "SampleGame",
        ideVersion: "2024.8.1.171",
        roomOrder: ["rm_main"],
        resourceCount: 5
      });
    });

    it("indexes assets with object sprites, parents and events", async () => {
      const index = await fixture.service.getAssetIndex();
      const assets = index.assets as Doc[];
      expect(assets.map(asset => `${String(asset.type)}:${String(asset.name)}`)).toEqual([
        "object:obj_player",
        "object:obj_wall",
        "room:rm_main",
        "script:scr_math",
        "sprite:spr_player"
      ]);
      const player = assets.find(asset => asset.name === "obj_player");
      expect(player).toMatchObject({ spriteName: "spr_player", parentName: null });
      expect(player?.events).toEqual([
        expect.objectContaining({ eventType: 0, eventNum: 0, collisionObject: null, gmlPath: path.join(fixture.root, "objects/obj_player/Create_0.gml") }),
        expect.objectContaining({ eventType: 3, eventNum: 0 }),
        expect.objectContaining({ eventType: 4, collisionObject: "obj_wall", gmlPath: path.join(fixture.root, "objects/obj_player/Collision_obj_wall.gml") })
      ]);
      const script = assets.find(asset => asset.name === "scr_math");
      expect(script?.gmlPath).toBe(path.join(fixture.root, "scripts/scr_math/scr_math.gml"));
    });

    it("reads scripts and events, including a specific collision event", async () => {
      expect((await fixture.service.readScript("scr_math")).source).toContain("function scr_clamp_speed");
      expect((await fixture.service.readEvent("obj_player", 0, 0)).source).toContain("hp = PLAYER_MAX_HP");
      expect((await fixture.service.readEvent("obj_player", 4, 0, "obj_wall")).source).toBe("x = xprevious;\n");
    });

    it("reports missing assets and events clearly", async () => {
      await expect(fixture.service.readScript("scr_missing")).rejects.toThrow("Asset not found: script/scr_missing");
      await expect(fixture.service.readEvent("obj_wall", 0, 0)).rejects.toThrow("Object obj_wall does not contain event Create_0.");
    });

    it("lists #macro definitions from GML", async () => {
      const { macros } = await fixture.service.getMacros();
      expect(macros).toEqual([
        { name: "PLAYER_MAX_HP", value: "3", config: null, file: "scripts/scr_math/scr_math.gml", line: 1 },
        { name: "PLAYER_MAX_HP", value: "99", config: "Debug", file: "scripts/scr_math/scr_math.gml", line: 2 }
      ]);
    });
  });

  describe("searching", () => {
    it("finds plain-text matches case-insensitively by default", async () => {
      const matches = await fixture.service.searchGml("player_max_hp");
      expect(matches.map(match => `${match.file}:${match.line}:${match.column}`)).toEqual([
        path.join("objects", "obj_player", "Create_0.gml") + ":2:6",
        path.join("scripts", "scr_math", "scr_math.gml") + ":1:8",
        path.join("scripts", "scr_math", "scr_math.gml") + ":2:14"
      ]);
    });

    it("treats the query literally unless useRegex is set", async () => {
      expect(await fixture.service.searchGml("x +=")).toHaveLength(1);
      expect(await fixture.service.searchGml("clamp(")).toHaveLength(1);
      expect((await fixture.service.searchGml("scr_\\w+", true)).map(match => match.match)).toEqual(["scr_clamp_speed", "scr_clamp_speed"]);
    });

    it("reports an invalid regular expression as an error", async () => {
      await expect(fixture.service.searchGml("(", true)).rejects.toThrow(/Invalid regular expression/);
    });
  });

  describe("editing", () => {
    it("creates an object with GameMaker-named event files and registers it", async () => {
      await fixture.service.createObject({
        name: "obj_enemy",
        sprite: "spr_player",
        parent: "obj_wall",
        events: [
          { eventType: 0, eventNum: 0, code: "hp = 1;" },
          { eventType: 4, eventNum: 0, collisionObject: "obj_player", code: "instance_destroy();" }
        ]
      });

      const yy = await readJson("objects/obj_enemy/obj_enemy.yy");
      expect(yy).toMatchObject({
        name: "obj_enemy",
        parent: { name: "SampleGame", path: "SampleGame.yyp" },
        spriteId: { name: "spr_player", path: "sprites/spr_player/spr_player.yy" },
        parentObjectId: { name: "obj_wall", path: "objects/obj_wall/obj_wall.yy" }
      });
      expect(await readFile(path.join(fixture.root, "objects/obj_enemy/Create_0.gml"), "utf8")).toBe("hp = 1;");
      expect(await readFile(path.join(fixture.root, "objects/obj_enemy/Collision_obj_player.gml"), "utf8")).toBe("instance_destroy();");

      const project = await readJson("SampleGame.yyp");
      expect(project.resources).toContainEqual({ id: { name: "obj_enemy", path: "objects/obj_enemy/obj_enemy.yy" } });
    });

    it("refuses duplicate or invalid asset names and unknown references", async () => {
      await expect(fixture.service.createObject({ name: "obj_player" })).rejects.toThrow("Asset already exists: object/obj_player");
      await expect(fixture.service.createScript("bad name", "")).rejects.toThrow(/Invalid asset name/);
      await expect(fixture.service.createObject({ name: "obj_x", sprite: "spr_missing" })).rejects.toThrow("Asset not found: sprite/spr_missing");
    });

    it("adds, rewrites and removes events", async () => {
      const added = await fixture.service.addEvent("obj_wall", 7, 10, "// user event 0");
      expect(path.basename(added.gmlPath)).toBe("Other_10.gml");
      await expect(fixture.service.addEvent("obj_wall", 7, 10)).rejects.toThrow("already contains event Other_10");

      const written = await fixture.service.writeEvent("obj_wall", 7, 10, "show_debug_message(\"hi\");");
      expect(written.source).toBe("show_debug_message(\"hi\");");

      await fixture.service.removeEvent("obj_wall", 7, 10);
      const yy = await readJson("objects/obj_wall/obj_wall.yy");
      expect(yy.eventList).toEqual([]);
      await expect(readFile(added.gmlPath, "utf8")).rejects.toThrow();
    });

    it("still reads event files written with the legacy <type>_<num>.gml names", async () => {
      const { writeFile } = await import("node:fs/promises");
      const yyPath = path.join(fixture.root, "objects/obj_wall/obj_wall.yy");
      const yy = await readJson("objects/obj_wall/obj_wall.yy");
      yy.eventList = [{ resourceType: "GMEvent", eventType: 3, eventNum: 0, collisionObjectId: null }];
      await writeFile(yyPath, JSON.stringify(yy));
      await writeFile(path.join(fixture.root, "objects/obj_wall/3_0.gml"), "legacy();");
      expect((await fixture.service.readEvent("obj_wall", 3, 0)).source).toBe("legacy();");
    });

    it("sets and clears an object's sprite and parent", async () => {
      await fixture.service.setObjectSprite("obj_wall", "spr_player");
      await fixture.service.setObjectParent("obj_wall", "obj_player");
      expect(await readJson("objects/obj_wall/obj_wall.yy")).toMatchObject({
        spriteId: { name: "spr_player" },
        parentObjectId: { name: "obj_player" }
      });
      await fixture.service.setObjectSprite("obj_wall", null);
      expect((await readJson("objects/obj_wall/obj_wall.yy")).spriteId).toBeNull();
      await expect(fixture.service.setObjectParent("obj_wall", "obj_wall")).rejects.toThrow(/own parent/);
    });

    it("renames a script, its files, its project entry and references in GML", async () => {
      await fixture.service.renameAsset("script", "scr_math", "scr_numbers");
      expect((await fixture.service.readScript("scr_numbers")).source).toContain("scr_clamp_speed");
      const project = await readJson("SampleGame.yyp");
      expect(project.resources).toContainEqual({ id: { name: "scr_numbers", path: "scripts/scr_numbers/scr_numbers.yy" } });
      expect((await readJson("scripts/scr_numbers/scr_numbers.yy")).name).toBe("scr_numbers");
    });

    it("renames identifiers across GML with replace_in_gml", async () => {
      const summary = await fixture.service.replaceInGml("move_speed", "walk_speed", false, true);
      expect(summary).toEqual([
        { file: path.join("objects", "obj_player", "Create_0.gml"), replacements: 1 },
        { file: path.join("objects", "obj_player", "Step_0.gml"), replacements: 1 }
      ]);
      expect(await fixture.service.searchGml("move_speed")).toEqual([]);
    });

    it("creates a room, adds it to the room order and places and removes instances", async () => {
      await fixture.service.createRoom({ name: "rm_level", width: 320, height: 240 });
      expect(fixture.service.getRoomOrder()).toEqual(["rm_main", "rm_level"]);

      const placed = await fixture.service.addToRoom("rm_level", "obj_player", 10, 20);
      expect(placed.instanceId).toMatch(/^inst_[0-9A-F]{8}$/);
      let room = await fixture.service.getRoom("rm_level");
      expect(room.instanceCreationOrder).toEqual([{ name: placed.instanceId, path: "rooms/rm_level/rm_level.yy" }]);
      expect((room.layers as Doc[])[0]?.instances).toEqual([
        expect.objectContaining({ name: placed.instanceId, objectId: { name: "obj_player", path: "objects/obj_player/obj_player.yy" }, x: 10, y: 20 })
      ]);

      await fixture.service.removeFromRoom("rm_level", String(placed.instanceId));
      room = await fixture.service.getRoom("rm_level");
      expect(room.instanceCreationOrder).toEqual([]);
      await expect(fixture.service.removeFromRoom("rm_level", "inst_NOPE")).rejects.toThrow(/does not contain instance/);
    });

    it("only places instances on instance layers", async () => {
      await expect(fixture.service.addToRoom("rm_main", "obj_wall", 0, 0, "Background")).rejects.toThrow(/instance layer named Background/);
    });

    it("reorders rooms", async () => {
      await fixture.service.createRoom({ name: "rm_title", width: 320, height: 240 });
      expect(await fixture.service.setRoomOrder(["rm_title", "rm_main"])).toEqual(["rm_title", "rm_main"]);
    });

    it("deletes an asset and its project entries", async () => {
      await fixture.service.deleteAsset("rooms", "rm_main");
      expect(fixture.service.getRoomOrder()).toEqual([]);
      const project = await readJson("SampleGame.yyp");
      expect(JSON.stringify(project.resources)).not.toContain("rm_main");
      await expect(fixture.service.getRoom("rm_main")).rejects.toThrow("Asset not found");
    });

    it("updates an existing macro in place and adds new ones to scr_macros", async () => {
      expect(await fixture.service.setMacro("PLAYER_MAX_HP", "5")).toEqual({ name: "PLAYER_MAX_HP", value: "5", file: "scripts/scr_math/scr_math.gml" });
      const source = String((await fixture.service.readScript("scr_math")).source);
      expect(source.split("\n").slice(0, 2)).toEqual(["#macro PLAYER_MAX_HP 5", "#macro Debug:PLAYER_MAX_HP 99"]);

      await fixture.service.setMacro("TILE_SIZE", "16");
      await fixture.service.setMacro("GRAVITY", "0.5");
      expect((await fixture.service.readScript("scr_macros")).source).toBe("#macro TILE_SIZE 16\n#macro GRAVITY 0.5\n");
      await expect(fixture.service.setMacro("bad name", "1")).rejects.toThrow(/Invalid macro name/);
    });
  });

  describe("builds", () => {
    it("needs a GameMaker binary before building", async () => {
      await expect(fixture.service.runBuildCommand("build")).rejects.toThrow(/gmsBinaryPath must be configured/);
    });
  });
});
