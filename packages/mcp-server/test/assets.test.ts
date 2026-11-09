import { describe, expect, it } from "vitest";
import { assetResourceRef, inferAssetType, normalizeAssetType } from "../src/project/assets.js";
import { eventFileName, legacyEventFileName } from "../src/project/events.js";
import { parseMacros } from "../src/project/macros.js";

describe("asset types", () => {
  it("infers the type from the top-level folder", () => {
    expect(inferAssetType("objects/obj_player/obj_player.yy")).toBe("object");
    expect(inferAssetType("animcurves/ac_ease/ac_ease.yy")).toBe("animationCurve");
    expect(inferAssetType("folders/Things.yy")).toBe("unknown");
  });

  it("accepts singular, plural and folder spellings in any case", () => {
    expect(normalizeAssetType("object")).toBe("object");
    expect(normalizeAssetType("Objects")).toBe("object");
    expect(normalizeAssetType("animcurves")).toBe("animationCurve");
    expect(normalizeAssetType("animationCurve")).toBe("animationCurve");
  });

  it("rejects unknown types with the list of valid ones", () => {
    expect(() => normalizeAssetType("widget")).toThrow(/Unknown asset type "widget".*object/);
  });

  it("builds resource references in GameMaker's folder layout", () => {
    expect(assetResourceRef("script", "scr_util")).toEqual({ name: "scr_util", path: "scripts/scr_util/scr_util.yy" });
  });
});

describe("event file names", () => {
  it("matches GameMaker's naming", () => {
    expect(eventFileName(0, 0, null)).toBe("Create_0.gml");
    expect(eventFileName(2, 3, null)).toBe("Alarm_3.gml");
    expect(eventFileName(7, 10, null)).toBe("Other_10.gml");
    expect(eventFileName(8, 64, null)).toBe("Draw_64.gml");
    expect(eventFileName(12, 0, null)).toBe("CleanUp_0.gml");
    expect(eventFileName(4, 0, "obj_wall")).toBe("Collision_obj_wall.gml");
  });

  it("requires a collision object for collision events and rejects unknown types", () => {
    expect(() => eventFileName(4, 0, null)).toThrow(/collision object/);
    expect(() => eventFileName(99, 0, null)).toThrow(/Unknown event type 99/);
  });

  it("keeps the legacy name for files written by AGMS2 0.1.0", () => {
    expect(legacyEventFileName(3, 1)).toBe("3_1.gml");
  });
});

describe("parseMacros", () => {
  it("finds plain and configuration macros with their lines", () => {
    const source = "// header\n#macro SPEED 4\n  #macro Debug:SPEED 10 // fast\nvar a = 1;\r\n#macro NAME \"Sample\"\r\n";
    expect(parseMacros(source, "scripts/a/a.gml")).toEqual([
      { name: "SPEED", value: "4", config: null, file: "scripts/a/a.gml", line: 2 },
      { name: "SPEED", value: "10 // fast", config: "Debug", file: "scripts/a/a.gml", line: 3 },
      { name: "NAME", value: "\"Sample\"", config: null, file: "scripts/a/a.gml", line: 5 }
    ]);
  });
});
