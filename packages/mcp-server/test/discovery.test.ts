import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverProjectPath, parseCliArgs } from "../src/project/discovery.js";

describe("parseCliArgs", () => {
  it("reads --project, --sse and --port", () => {
    expect(parseCliArgs(["--project", "Game.yyp", "--sse", "--port", "4000"])).toEqual({ project: "Game.yyp", sse: true, port: 4000 });
  });

  it("rejects a port that is not a number", () => {
    expect(() => parseCliArgs(["--port", "abc"])).toThrow(/--port expects a port number/);
  });
});

describe("discoverProjectPath", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "agms2-discovery-"));
    await mkdir(path.join(root, "Game", "objects", "obj_a"), { recursive: true });
    await writeFile(path.join(root, "Game", "Game.yyp"), "{}");
    vi.stubEnv("GMS2_PROJECT_PATH", "");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it("uses an explicit .yyp path", async () => {
    expect(await discoverProjectPath("Game/Game.yyp", root)).toBe(path.join(root, "Game", "Game.yyp"));
  });

  it("finds the .yyp inside an explicit project folder", async () => {
    expect(await discoverProjectPath(path.join(root, "Game"), "/")).toBe(path.join(root, "Game", "Game.yyp"));
  });

  it("falls back to GMS2_PROJECT_PATH", async () => {
    vi.stubEnv("GMS2_PROJECT_PATH", path.join(root, "Game", "Game.yyp"));
    expect(await discoverProjectPath(undefined, "/")).toBe(path.join(root, "Game", "Game.yyp"));
  });

  it("walks up from the working directory", async () => {
    expect(await discoverProjectPath(undefined, path.join(root, "Game", "objects", "obj_a"))).toBe(path.join(root, "Game", "Game.yyp"));
  });

  it("fails clearly when an explicit folder has no project", async () => {
    await expect(discoverProjectPath(path.join(root, "Game", "objects"), "/")).rejects.toThrow(/No \.yyp project file found/);
  });
});
