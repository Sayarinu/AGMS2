import { access } from "node:fs/promises";
import path from "node:path";

export interface CliOptions {
  project?: string;
  sse?: boolean;
  port?: number;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") {
      const value = argv[index + 1];
      if (value) {
        options.project = value;
      }
      index += 1;
    } else if (arg === "--sse") {
      options.sse = true;
    } else if (arg === "--port") {
      const value = argv[index + 1];
      if (value) {
        options.port = Number(value);
      }
      index += 1;
    }
  }
  return options;
}

export async function discoverProjectPath(explicitProject: string | undefined, cwd: string): Promise<string> {
  const candidates = [explicitProject, process.env.GMS2_PROJECT_PATH].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const resolved = path.resolve(cwd, candidate);
    if (resolved.endsWith(".yyp")) {
      await assertReadable(resolved);
      return resolved;
    }
  }

  let current = cwd;
  while (true) {
    const entries = await import("node:fs/promises").then(async fs => await fs.readdir(current));
    const projectFile = entries.find(entry => entry.endsWith(".yyp"));
    if (projectFile) {
      return path.join(current, projectFile);
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error("Unable to locate a .yyp project file via --project, GMS2_PROJECT_PATH, or cwd discovery.");
}

async function assertReadable(filePath: string): Promise<void> {
  await access(filePath);
}
