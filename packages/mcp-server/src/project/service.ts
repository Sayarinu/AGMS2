import { randomUUID } from "node:crypto";
import { rename } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { execa } from "execa";
import { assetDirectory, assetResourceRef, escapeRegExp, inferAssetType, normalizeAssetType, readResourceName } from "./assets.js";
import { COLLISION_EVENT, eventFileName, eventLabel, legacyEventFileName } from "./events.js";
import { ensureDir, exists, readText, removePath, writeFileAtomic } from "./fs.js";
import { parseGmsJson, stringifyGmsJson } from "./json.js";
import { formatMacro, parseMacros, type MacroDefinition } from "./macros.js";
import { eventYy, objectYy, roomInstanceYy, roomYy, scriptYy, spriteYy } from "./templates.js";
import type {
  AssetRecord,
  AssetType,
  BuildResult,
  Gms2ServerConfig,
  GmsProjectFile,
  GmsResourceRef,
  ObjectEventRecord,
  ReplaceSummary,
  SearchMatch
} from "./types.js";

type YyDocument = Record<string, unknown>;
type KnownAssetType = Exclude<AssetType, "unknown">;

interface EventInput {
  eventType: number;
  eventNum: number;
  code?: string | undefined;
  collisionObject?: string | null | undefined;
}

interface CreateObjectInput {
  name: string;
  sprite?: string | null | undefined;
  parent?: string | null | undefined;
  events?: EventInput[] | undefined;
}

interface CreateRoomInput {
  name: string;
  width: number;
  height: number;
  persistent?: boolean | undefined;
}

/** Script that `setMacro` adds new macros to when the macro is not defined anywhere yet. */
const MACRO_SCRIPT = "scr_macros";

export class Gms2ProjectService {
  readonly rootPath: string;
  readonly projectPath: string;
  readonly config: Gms2ServerConfig;

  private projectFile: GmsProjectFile | null = null;
  private assetsByKey = new Map<string, AssetRecord>();
  private assetsByType = new Map<AssetType, AssetRecord[]>();
  private readonly buildLogPath: string;

  constructor(projectPath: string, config: Gms2ServerConfig) {
    this.projectPath = projectPath;
    this.rootPath = path.dirname(projectPath);
    this.config = config;
    this.buildLogPath = path.join(this.rootPath, ".gms2-mcp-build.log");
  }

  async initialize(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const projectFile = parseGmsJson<GmsProjectFile>(await readText(this.projectPath));
    this.projectFile = projectFile;
    await this.rebuildIndex(projectFile);
  }

  async invalidateForPath(changedPath: string): Promise<void> {
    if (!/\.(yy|yyp|gml|json)$/.test(changedPath)) {
      return;
    }
    await this.reload();
  }

  getProjectMetadata(): Record<string, unknown> {
    const project = this.requireProject();
    return {
      name: project.name,
      ideVersion: project.MetaData?.IDEVersion ?? null,
      roomOrder: this.getRoomOrder(),
      includedFiles: project.IncludedFiles ?? [],
      resourceCount: this.assetsByKey.size
    };
  }

  getAssetsTree(): Record<string, unknown> {
    const grouped = Object.fromEntries(
      Array.from(this.assetsByType.entries()).map(([type, entries]) => [
        type,
        entries
          .slice()
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(asset => ({
            name: asset.name,
            path: asset.relativePath,
            uri: `gms2://asset/${asset.type}/${asset.name}`
          }))
      ])
    );

    return {
      project: this.requireProject().name,
      assets: grouped
    };
  }

  async getAssetIndex(): Promise<Record<string, unknown>> {
    const sorted = Array.from(this.assetsByKey.values()).sort(
      (left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name)
    );
    const assets = await Promise.all(
      sorted.map(async asset => {
        const base = {
          type: asset.type,
          name: asset.name,
          relativePath: asset.relativePath,
          yyPath: asset.yyPath,
          primaryPath: asset.yyPath
        };

        if (asset.type === "object") {
          const objectDoc = await readYy(asset.yyPath);
          const events = await this.readObjectEvents(asset, objectDoc);
          return {
            ...base,
            spriteName: readResourceName(objectDoc.spriteId),
            parentName: readResourceName(objectDoc.parentObjectId),
            events: events.map(event => ({
              eventType: event.eventType,
              eventNum: event.eventNum,
              collisionObject: event.collisionObject?.name ?? null,
              gmlPath: event.gmlPath
            }))
          };
        }

        if (asset.type === "script") {
          const gmlPath = scriptGmlPath(asset);
          return { ...base, primaryPath: gmlPath, gmlPath };
        }

        return base;
      })
    );

    return {
      project: this.requireProject().name,
      rootPath: this.rootPath,
      projectPath: this.projectPath,
      assets
    };
  }

  async getAssetWithContent(type: string, name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord(type, name);
    return {
      name: asset.name,
      type: asset.type,
      path: asset.relativePath,
      yy: await readYy(asset.yyPath)
    };
  }

  async getObjectEvents(name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", name);
    const objectDoc = await readYy(asset.yyPath);
    return {
      object: name,
      spriteId: objectDoc.spriteId ?? null,
      parentObjectId: objectDoc.parentObjectId ?? null,
      events: await this.readObjectEvents(asset, objectDoc)
    };
  }

  async readEvent(objectName: string, eventType: number, eventNum: number, collisionObject: string | null = null): Promise<ObjectEventRecord> {
    const asset = this.getAssetRecord("object", objectName);
    const events = await this.readObjectEvents(asset, await readYy(asset.yyPath));
    const event = events.find(entry => matchesEvent(entry, eventType, eventNum, collisionObject));
    if (!event) {
      throw new Error(`Object ${objectName} does not contain event ${eventLabel(eventType, eventNum, collisionObject)}.`);
    }
    return event;
  }

  async writeEvent(objectName: string, eventType: number, eventNum: number, code: string, collisionObject: string | null = null): Promise<ObjectEventRecord> {
    const event = await this.readEvent(objectName, eventType, eventNum, collisionObject);
    await writeFileAtomic(event.gmlPath, code);
    return await this.readEvent(objectName, eventType, eventNum, collisionObject);
  }

  async readScript(name: string): Promise<Record<string, unknown>> {
    const scriptPath = scriptGmlPath(this.getAssetRecord("script", name));
    return {
      name,
      path: path.relative(this.rootPath, scriptPath),
      source: await readText(scriptPath)
    };
  }

  async writeScript(name: string, code: string): Promise<Record<string, unknown>> {
    await writeFileAtomic(scriptGmlPath(this.getAssetRecord("script", name)), code);
    return await this.readScript(name);
  }

  async getRoom(name: string): Promise<Record<string, unknown>> {
    return await readYy(this.getAssetRecord("room", name).yyPath);
  }

  getConfigResource(): Record<string, unknown> {
    const project = this.requireProject();
    return {
      buildTarget: this.config.buildTarget,
      config: project.configs ?? null,
      includedFiles: project.IncludedFiles ?? []
    };
  }

  async getMacros(): Promise<{ macros: MacroDefinition[] }> {
    const macros: MacroDefinition[] = [];
    for (const file of await this.gmlFiles()) {
      macros.push(...parseMacros(await readText(file), path.relative(this.rootPath, file)));
    }
    return { macros };
  }

  async getExtensions(): Promise<Record<string, unknown>> {
    const assets = this.assetsByType.get("extension") ?? [];
    const extensions = await Promise.all(
      assets.map(async asset => ({
        name: asset.name,
        path: asset.relativePath,
        yy: await readYy(asset.yyPath)
      }))
    );
    return { extensions };
  }

  getRoomOrder(): string[] {
    return (this.requireProject().RoomOrderNodes ?? [])
      .map(node => node.roomId?.name)
      .filter((name): name is string => Boolean(name));
  }

  async setRoomOrder(roomNames: string[]): Promise<string[]> {
    const project = this.requireProject();
    project.RoomOrderNodes = roomNames.map(roomName => ({
      roomId: this.getAssetRecord("room", roomName).resource
    }));
    await this.saveProject(project);
    await this.reload();
    return this.getRoomOrder();
  }

  async createObject(input: CreateObjectInput): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("object", input.name);
    const objectDir = path.join(this.rootPath, assetDirectory("object"), input.name);
    const events = (input.events ?? []).map(event => {
      const collisionObject = event.collisionObject ?? null;
      return {
        yy: eventYy(event.eventType, event.eventNum, this.collisionRef(event.eventType, collisionObject)),
        file: eventFileName(event.eventType, event.eventNum, collisionObject),
        code: event.code ?? ""
      };
    });

    const document = objectYy({
      name: input.name,
      parentFolder: this.rootFolderRef(),
      sprite: input.sprite ? this.resourceRefFor("sprite", input.sprite) : null,
      parent: input.parent ? this.resourceRefFor("object", input.parent) : null,
      events: events.map(event => event.yy)
    });

    await ensureDir(objectDir);
    await writeYy(path.join(objectDir, `${input.name}.yy`), document);
    for (const event of events) {
      await writeFileAtomic(path.join(objectDir, event.file), event.code);
    }

    await this.addResource("object", input.name);
    await this.reload();
    return await this.getAssetWithContent("object", input.name);
  }

  async deleteAsset(type: string, name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord(type, name);
    const project = this.requireProject();
    project.resources = (project.resources ?? []).filter(entry => entry.id?.path !== asset.relativePath);
    if (asset.type === "room") {
      project.RoomOrderNodes = (project.RoomOrderNodes ?? []).filter(entry => entry.roomId?.path !== asset.relativePath);
    }
    await this.saveProject(project);
    await removePath(asset.directoryPath);
    await this.reload();
    return { deleted: true, type: asset.type, name };
  }

  async renameAsset(type: string, fromName: string, toName: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord(type, fromName);
    this.ensureAssetMissing(asset.type, toName);

    const newDir = path.join(path.dirname(asset.directoryPath), toName);
    await rename(asset.directoryPath, newDir);

    const oldYyPath = path.join(newDir, `${fromName}.yy`);
    const document = await readYy(oldYyPath);
    document.name = toName;
    await removePath(oldYyPath);
    await writeYy(path.join(newDir, `${toName}.yy`), document);

    if (asset.type === "script") {
      const oldScriptPath = path.join(newDir, `${fromName}.gml`);
      if (await exists(oldScriptPath)) {
        await rename(oldScriptPath, path.join(newDir, `${toName}.gml`));
      }
    }

    const newPath = path.posix.join(path.posix.dirname(path.posix.dirname(asset.relativePath)), toName, `${toName}.yy`);
    const project = this.requireProject();
    const refs = [
      ...(project.resources ?? []).map(entry => entry.id),
      ...(project.RoomOrderNodes ?? []).map(entry => entry.roomId)
    ];
    for (const ref of refs) {
      if (ref?.path === asset.relativePath) {
        ref.name = toName;
        ref.path = newPath;
      }
    }
    await this.saveProject(project);

    await this.replaceInGmlFiles(new RegExp(`\\b${escapeRegExp(fromName)}\\b`, "g"), toName);

    await this.reload();
    return await this.getAssetWithContent(asset.type, toName);
  }

  async setObjectSprite(objectName: string, spriteName: string | null): Promise<Record<string, unknown>> {
    return await this.updateObject(objectName, document => {
      document.spriteId = spriteName ? this.resourceRefFor("sprite", spriteName) : null;
    });
  }

  async setObjectParent(objectName: string, parentName: string | null): Promise<Record<string, unknown>> {
    if (parentName === objectName) {
      throw new Error(`Object ${objectName} cannot be its own parent.`);
    }
    return await this.updateObject(objectName, document => {
      document.parentObjectId = parentName ? this.resourceRefFor("object", parentName) : null;
    });
  }

  async addEvent(objectName: string, eventType: number, eventNum: number, code = "", collisionObject: string | null = null): Promise<ObjectEventRecord> {
    const asset = this.getAssetRecord("object", objectName);
    const document = await readYy(asset.yyPath);
    const events = recordArray(document.eventList);
    if (events.some(event => matchesEventYy(event, eventType, eventNum, collisionObject))) {
      throw new Error(`Object ${objectName} already contains event ${eventLabel(eventType, eventNum, collisionObject)}.`);
    }
    const file = eventFileName(eventType, eventNum, collisionObject);
    events.push(eventYy(eventType, eventNum, this.collisionRef(eventType, collisionObject)));
    document.eventList = events;
    await writeYy(asset.yyPath, document);
    await writeFileAtomic(path.join(asset.directoryPath, file), code);
    await this.reload();
    return await this.readEvent(objectName, eventType, eventNum, collisionObject);
  }

  async removeEvent(objectName: string, eventType: number, eventNum: number, collisionObject: string | null = null): Promise<Record<string, unknown>> {
    const event = await this.readEvent(objectName, eventType, eventNum, collisionObject);
    const asset = this.getAssetRecord("object", objectName);
    const document = await readYy(asset.yyPath);
    document.eventList = recordArray(document.eventList).filter(entry => !matchesEventYy(entry, eventType, eventNum, collisionObject));
    await writeYy(asset.yyPath, document);
    await removePath(event.gmlPath);
    await this.reload();
    return { removed: true, objectName, eventType, eventNum, collisionObject };
  }

  async createScript(name: string, code: string): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("script", name);
    const scriptDir = path.join(this.rootPath, assetDirectory("script"), name);
    await ensureDir(scriptDir);
    await writeYy(path.join(scriptDir, `${name}.yy`), scriptYy(name, this.rootFolderRef()));
    await writeFileAtomic(path.join(scriptDir, `${name}.gml`), code);
    await this.addResource("script", name);
    await this.reload();
    return await this.readScript(name);
  }

  async createRoom(input: CreateRoomInput): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("room", input.name);
    const roomDir = path.join(this.rootPath, assetDirectory("room"), input.name);
    await ensureDir(roomDir);
    const document = roomYy({
      name: input.name,
      parentFolder: this.rootFolderRef(),
      width: input.width,
      height: input.height,
      persistent: input.persistent ?? false
    });
    await writeYy(path.join(roomDir, `${input.name}.yy`), document);

    const project = this.requireProject();
    project.RoomOrderNodes = [...(project.RoomOrderNodes ?? []), { roomId: assetResourceRef("room", input.name) }];
    await this.addResource("room", input.name);
    await this.reload();
    return await this.getRoom(input.name);
  }

  async createSprite(name: string): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("sprite", name);
    const spriteDir = path.join(this.rootPath, assetDirectory("sprite"), name);
    await ensureDir(spriteDir);
    await writeYy(path.join(spriteDir, `${name}.yy`), spriteYy(name, this.rootFolderRef()));
    await this.addResource("sprite", name);
    await this.reload();
    return await this.getAssetWithContent("sprite", name);
  }

  async searchGml(query: string, useRegex = false, caseSensitive = false): Promise<SearchMatch[]> {
    const pattern = buildPattern(query, useRegex, caseSensitive);
    const matches: SearchMatch[] = [];
    for (const file of await this.gmlFiles()) {
      const lines = (await readText(file)).split(/\r?\n/);
      lines.forEach((line, lineIndex) => {
        for (const result of line.matchAll(pattern)) {
          matches.push({
            file: path.relative(this.rootPath, file),
            line: lineIndex + 1,
            column: result.index + 1,
            lineText: line,
            match: result[0]
          });
        }
      });
    }
    return matches;
  }

  async replaceInGml(find: string, replace: string, useRegex = false, caseSensitive = false): Promise<ReplaceSummary[]> {
    const result = await this.replaceInGmlFiles(buildPattern(find, useRegex, caseSensitive), replace);
    await this.reload();
    return result;
  }

  async addToRoom(roomName: string, objectName: string, x: number, y: number, layerName?: string): Promise<Record<string, unknown>> {
    const roomAsset = this.getAssetRecord("room", roomName);
    const objectRef = this.resourceRefFor("object", objectName);
    const room = await readYy(roomAsset.yyPath);
    const layers = recordArray(room.layers);
    const layer = layerName
      ? layers.find(entry => entry.name === layerName)
      : layers.find(entry => entry.resourceType === "GMRInstanceLayer");
    if (!layer || layer.resourceType !== "GMRInstanceLayer") {
      throw new Error(
        layerName
          ? `Room ${roomName} does not have an instance layer named ${layerName}.`
          : `Room ${roomName} does not have an instance layer to place ${objectName}.`
      );
    }

    const instanceName = `inst_${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    layer.instances = [...recordArray(layer.instances), roomInstanceYy(instanceName, objectRef, x, y)];
    room.instanceCreationOrder = [...recordArray(room.instanceCreationOrder), { name: instanceName, path: roomAsset.relativePath }];
    await writeYy(roomAsset.yyPath, room);
    await this.reload();
    return { roomName, instanceId: instanceName, objectName, x, y, layer: layer.name ?? null };
  }

  async removeFromRoom(roomName: string, instanceId: string): Promise<Record<string, unknown>> {
    const roomAsset = this.getAssetRecord("room", roomName);
    const room = await readYy(roomAsset.yyPath);
    const isTarget = (instance: YyDocument) => instance.name === instanceId || instance.instanceId === instanceId;

    for (const layer of recordArray(room.layers)) {
      const instances = recordArray(layer.instances);
      const removed = instances.find(isTarget);
      if (!removed) {
        continue;
      }
      layer.instances = instances.filter(instance => instance !== removed);
      room.instanceCreationOrder = recordArray(room.instanceCreationOrder).filter(entry => entry.name !== removed.name);
      await writeYy(roomAsset.yyPath, room);
      await this.reload();
      return { removed: true, roomName, instanceId };
    }
    throw new Error(`Room ${roomName} does not contain instance ${instanceId}.`);
  }

  /**
   * Updates an existing `#macro NAME value` line, or adds the macro to the `scr_macros`
   * script (creating it if needed) when the macro is not defined yet.
   */
  async setMacro(name: string, value: string): Promise<Record<string, unknown>> {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid macro name "${name}".`);
    }
    if (/[\r\n]/.test(value)) {
      throw new Error("Macro values must fit on one line.");
    }

    const existing = (await this.getMacros()).macros.find(macro => macro.name === name && macro.config === null);
    if (existing) {
      const filePath = path.join(this.rootPath, existing.file);
      const lines = (await readText(filePath)).split("\n");
      const original = lines[existing.line - 1] ?? "";
      const indent = /^\s*/.exec(original)?.[0] ?? "";
      lines[existing.line - 1] = `${indent}${formatMacro(name, value)}${original.endsWith("\r") ? "\r" : ""}`;
      await writeFileAtomic(filePath, lines.join("\n"));
      return { name, value, file: existing.file };
    }

    const line = `${formatMacro(name, value)}\n`;
    if (this.assetsByKey.has(`script:${MACRO_SCRIPT}`)) {
      const current = String((await this.readScript(MACRO_SCRIPT)).source);
      await this.writeScript(MACRO_SCRIPT, `${current}${current === "" || current.endsWith("\n") ? "" : "\n"}${line}`);
    } else {
      await this.createScript(MACRO_SCRIPT, line);
    }
    return { name, value, file: path.relative(this.rootPath, scriptGmlPath(this.getAssetRecord("script", MACRO_SCRIPT))) };
  }

  async getBuildLog(): Promise<Record<string, unknown>> {
    const log = (await exists(this.buildLogPath)) ? await readText(this.buildLogPath) : "";
    return { path: path.relative(this.rootPath, this.buildLogPath), log };
  }

  async runBuildCommand(mode: "build" | "run" | "clean"): Promise<BuildResult> {
    if (this.config.buildTarget !== "Windows") {
      throw new Error(`Only Windows buildTarget is currently supported. Received ${this.config.buildTarget}.`);
    }
    if (!this.config.gmsBinaryPath) {
      throw new Error(`gmsBinaryPath must be configured to ${mode} the project.`);
    }

    const binaryPath = this.config.gmsBinaryPath;
    const args = [`--${mode}`, this.projectPath];
    const result = await execa(binaryPath, args, {
      cwd: this.rootPath,
      reject: false
    });
    if (result.exitCode === undefined) {
      throw new Error(`Could not run ${binaryPath}: ${result.shortMessage}`);
    }

    await writeFileAtomic(this.buildLogPath, `${result.stdout}\n${result.stderr}`.trim());
    return {
      command: [binaryPath, ...args],
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      highlightedErrors: result.stderr.split(/\r?\n/).filter(line => /error/i.test(line))
    };
  }

  private async rebuildIndex(projectFile: GmsProjectFile): Promise<void> {
    const resourceMap = new Map<string, GmsResourceRef>();
    for (const resource of projectFile.resources ?? []) {
      if (resource.id?.path && resource.id.name) {
        resourceMap.set(resource.id.path, resource.id);
      }
    }
    const discoveredPaths = await fg(["{objects,scripts,rooms,sprites,extensions}/*/*.yy"], { cwd: this.rootPath });
    for (const discoveredPath of discoveredPaths) {
      if (!resourceMap.has(discoveredPath)) {
        resourceMap.set(discoveredPath, {
          name: path.basename(discoveredPath, ".yy"),
          path: discoveredPath
        });
      }
    }

    this.assetsByKey.clear();
    this.assetsByType.clear();
    for (const resource of resourceMap.values()) {
      const yyPath = path.join(this.rootPath, resource.path);
      const assetType = inferAssetType(resource.path);
      const record: AssetRecord = {
        id: `${assetType}:${resource.name}`,
        type: assetType,
        name: resource.name,
        yyPath,
        relativePath: resource.path,
        directoryPath: path.dirname(yyPath),
        resource: { name: resource.name, path: resource.path }
      };
      this.assetsByKey.set(record.id, record);
      const bucket = this.assetsByType.get(record.type) ?? [];
      bucket.push(record);
      this.assetsByType.set(record.type, bucket);
    }
  }

  private requireProject(): GmsProjectFile {
    if (!this.projectFile) {
      throw new Error("Project has not been initialized.");
    }
    return this.projectFile;
  }

  private getAssetRecord(type: string, name: string): AssetRecord {
    const normalizedType = normalizeAssetType(type);
    const asset = this.assetsByKey.get(`${normalizedType}:${name}`);
    if (!asset) {
      throw new Error(`Asset not found: ${normalizedType}/${name}`);
    }
    return asset;
  }

  private ensureAssetMissing(type: AssetType, name: string): void {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid asset name "${name}". Use letters, digits and underscores, not starting with a digit.`);
    }
    if (this.assetsByKey.has(`${type}:${name}`)) {
      throw new Error(`Asset already exists: ${type}/${name}`);
    }
  }

  private resourceRefFor(type: string, name: string): GmsResourceRef {
    return this.getAssetRecord(type, name).resource;
  }

  private collisionRef(eventType: number, collisionObject: string | null): GmsResourceRef | null {
    return eventType === COLLISION_EVENT && collisionObject ? this.resourceRefFor("object", collisionObject) : null;
  }

  /** New assets go at the root of the asset browser, under the project itself. */
  private rootFolderRef(): GmsResourceRef {
    const project = this.requireProject();
    return { name: project.name, path: path.basename(this.projectPath) };
  }

  private async updateObject(objectName: string, update: (document: YyDocument) => void): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", objectName);
    const document = await readYy(asset.yyPath);
    update(document);
    await writeYy(asset.yyPath, document);
    await this.reload();
    return await this.getAssetWithContent("object", objectName);
  }

  private async readObjectEvents(asset: AssetRecord, objectDoc: YyDocument): Promise<ObjectEventRecord[]> {
    return await Promise.all(
      recordArray(objectDoc.eventList).map(async event => {
        const eventType = Number(event.eventType ?? 0);
        const eventNum = Number(event.eventNum ?? 0);
        const collisionObject = readResourceRef(event.collisionObjectId);
        const gmlPath = await this.locateEventFile(asset, eventType, eventNum, collisionObject?.name ?? null);
        return {
          id: String(event.id ?? `${asset.name}:${eventType}:${eventNum}${collisionObject ? `:${collisionObject.name}` : ""}`),
          eventType,
          eventNum,
          collisionObject,
          gmlPath,
          source: (await exists(gmlPath)) ? await readText(gmlPath) : "",
          raw: event
        };
      })
    );
  }

  private async locateEventFile(asset: AssetRecord, eventType: number, eventNum: number, collisionObject: string | null): Promise<string> {
    const legacyPath = path.join(asset.directoryPath, legacyEventFileName(eventType, eventNum));
    try {
      const canonicalPath = path.join(asset.directoryPath, eventFileName(eventType, eventNum, collisionObject));
      if ((await exists(canonicalPath)) || !(await exists(legacyPath))) {
        return canonicalPath;
      }
    } catch {
      // Unknown event types have no canonical file name; fall back to the legacy one.
    }
    return legacyPath;
  }

  private async addResource(type: KnownAssetType, name: string): Promise<void> {
    const project = this.requireProject();
    project.resources = [...(project.resources ?? []), { id: assetResourceRef(type, name) }];
    await this.saveProject(project);
  }

  private async saveProject(project: GmsProjectFile): Promise<void> {
    await writeFileAtomic(this.projectPath, stringifyGmsJson(project));
    this.projectFile = project;
  }

  private async gmlFiles(): Promise<string[]> {
    return (await fg(["**/*.gml"], { cwd: this.rootPath, absolute: true, ignore: ["**/node_modules/**"] })).sort();
  }

  private async replaceInGmlFiles(pattern: RegExp, replace: string): Promise<ReplaceSummary[]> {
    const summaries: ReplaceSummary[] = [];
    for (const file of await this.gmlFiles()) {
      const source = await readText(file);
      const replacements = Array.from(source.matchAll(pattern)).length;
      if (replacements === 0) {
        continue;
      }
      await writeFileAtomic(file, source.replace(pattern, replace));
      summaries.push({ file: path.relative(this.rootPath, file), replacements });
    }
    return summaries;
  }
}

async function readYy(filePath: string): Promise<YyDocument> {
  return parseGmsJson<YyDocument>(await readText(filePath));
}

async function writeYy(filePath: string, document: YyDocument): Promise<void> {
  await writeFileAtomic(filePath, stringifyGmsJson(document));
}

function recordArray(value: unknown): YyDocument[] {
  return Array.isArray(value) ? value.filter((entry): entry is YyDocument => Boolean(entry) && typeof entry === "object") : [];
}

function readResourceRef(value: unknown): GmsResourceRef | null {
  const name = readResourceName(value);
  const refPath = (value as { path?: unknown } | null)?.path;
  return name !== null && typeof refPath === "string" ? { name, path: refPath } : null;
}

function scriptGmlPath(asset: AssetRecord): string {
  return path.join(asset.directoryPath, `${asset.name}.gml`);
}

function buildPattern(query: string, useRegex: boolean, caseSensitive: boolean): RegExp {
  const source = useRegex ? query : escapeRegExp(query);
  try {
    return new RegExp(source, caseSensitive ? "g" : "gi");
  } catch (error) {
    throw new Error(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function matchesEvent(event: ObjectEventRecord, eventType: number, eventNum: number, collisionObject: string | null): boolean {
  if (event.eventType !== eventType) {
    return false;
  }
  if (eventType === COLLISION_EVENT && collisionObject) {
    return event.collisionObject?.name === collisionObject;
  }
  return event.eventNum === eventNum;
}

function matchesEventYy(event: YyDocument, eventType: number, eventNum: number, collisionObject: string | null): boolean {
  if (Number(event.eventType) !== eventType) {
    return false;
  }
  if (eventType === COLLISION_EVENT) {
    return readResourceName(event.collisionObjectId) === collisionObject;
  }
  return Number(event.eventNum) === eventNum;
}
