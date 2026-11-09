import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import type { Gms2ProjectService } from "./project/service.js";

const ignoredDirectories = new Set(["node_modules", ".git"]);

export function createProjectWatcher(project: Gms2ProjectService, onReload?: () => void | Promise<void>): FSWatcher {
  const watcher = chokidar.watch(project.rootPath, {
    ignoreInitial: true,
    ignored: filePath => path.relative(project.rootPath, filePath).split(path.sep).some(segment => ignoredDirectories.has(segment))
  });

  const invalidate = async (filePath: string) => {
    try {
      await project.invalidateForPath(filePath);
      await onReload?.();
    } catch (error) {
      // A half-written file can fail to parse; the next change event reloads again.
      process.stderr.write(`Reload after ${filePath} changed failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  watcher.on("add", invalidate);
  watcher.on("change", invalidate);
  watcher.on("unlink", invalidate);
  return watcher;
}
