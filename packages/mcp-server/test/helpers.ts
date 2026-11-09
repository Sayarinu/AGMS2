import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "../src/project/config.js";
import { Gms2ProjectService } from "../src/project/service.js";

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "SampleGame");

export interface FixtureProject {
  root: string;
  projectPath: string;
  service: Gms2ProjectService;
  cleanup(): Promise<void>;
}

/** Copies the SampleGame fixture to a temp folder so tests can change it freely. */
export async function openFixtureProject(): Promise<FixtureProject> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "agms2-test-"));
  const root = path.join(tempDir, "SampleGame");
  await cp(fixtureRoot, root, { recursive: true });
  const projectPath = path.join(root, "SampleGame.yyp");
  const service = new Gms2ProjectService(projectPath, { ...defaultConfig, watchMode: false });
  await service.initialize();
  return {
    root,
    projectPath,
    service,
    cleanup: async () => await rm(tempDir, { recursive: true, force: true })
  };
}
