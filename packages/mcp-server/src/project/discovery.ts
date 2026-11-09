import { access, readdir } from "node:fs/promises";
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
      const port = Number(argv[index + 1]);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error(`--port expects a port number, got ${String(argv[index + 1])}.`);
      }
      options.port = port;
      index += 1;
    }
  }
  return options;
}

/**
 * Resolves the `.yyp` to open from `--project`, then `GMS2_PROJECT_PATH`, then the working
 * directory and its parents. `--project` and `GMS2_PROJECT_PATH` may name a `.yyp` file or the
 * folder that contains one.
 */
export async function discoverProjectPath(explicitProject: string | undefined, cwd: string): Promise<string> {
  const configured = explicitProject || process.env.GMS2_PROJECT_PATH;
  if (configured) {
    const resolved = path.resolve(cwd, configured);
    if (resolved.endsWith(".yyp")) {
      await access(resolved);
      return resolved;
    }
    const projectFile = await findProjectFile(resolved);
    if (!projectFile) {
      throw new Error(`No .yyp project file found in ${resolved}.`);
    }
    return projectFile;
  }

  let current = cwd;
  while (true) {
    const projectFile = await findProjectFile(current);
    if (projectFile) {
      return projectFile;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error("Unable to locate a .yyp project file via --project, GMS2_PROJECT_PATH, or cwd discovery.");
}

async function findProjectFile(directory: string): Promise<string | undefined> {
  const projectFile = (await readdir(directory)).sort().find(entry => entry.endsWith(".yyp"));
  return projectFile ? path.join(directory, projectFile) : undefined;
}
