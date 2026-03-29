import chokidar, { type FSWatcher } from "chokidar";
import type { Gms2ProjectService } from "./project/service.js";

export function createProjectWatcher(project: Gms2ProjectService, onReload?: () => void | Promise<void>): FSWatcher {
  const watcher = chokidar.watch(project.rootPath, {
    ignoreInitial: true,
    ignored: [/node_modules/, /dist/]
  });

  const invalidate = async (filePath: string) => {
    await project.invalidateForPath(filePath);
    await onReload?.();
  };

  watcher.on("add", invalidate);
  watcher.on("change", invalidate);
  watcher.on("unlink", invalidate);
  return watcher;
}
