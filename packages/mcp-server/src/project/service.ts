import { randomUUID } from "node:crypto";
import path from "node:path";
import fg from "fast-glob";
import { execa } from "execa";
import { ensureDir, exists, readText, removePath, writeFileAtomic } from "./fs.js";
import { parseGmsJson, stringifyGmsJson } from "./json.js";
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

interface CreateObjectInput {
  name: string;
  sprite?: string | null | undefined;
  parent?: string | null | undefined;
  events?: Array<{ eventType: number; eventNum: number; code?: string | undefined; collisionObject?: string | null | undefined }> | undefined;
}

interface CreateRoomInput {
  name: string;
  width: number;
  height: number;
  persistent?: boolean | undefined;
}

export class Gms2ProjectService {
  readonly rootPath: string;
  readonly projectPath: string;
  readonly config: Gms2ServerConfig;

  private projectFile: GmsProjectFile | null = null;
  private assetsByKey = new Map<string, AssetRecord>();
  private assetsByType = new Map<AssetType, AssetRecord[]>();
  private buildLogPath: string;

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
    this.rebuildIndex(projectFile);
  }

  async invalidateForPath(changedPath: string): Promise<void> {
    if (!/\.(yy|yyp|gml|json)$/.test(changedPath)) {
      return;
    }
    await this.reload();
  }

  getProjectMetadata(): Record<string, unknown> {
    const project = this.requireProject();
    const rooms = this.getRoomOrder();
    return {
      name: project.name,
      ideVersion: project.MetaData?.IDEVersion ?? null,
      roomOrder: rooms,
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
    const assets = await Promise.all(
      Array.from(this.assetsByKey.values())
        .sort((left, right) => {
          if (left.type === right.type) {
            return left.name.localeCompare(right.name);
          }
          return left.type.localeCompare(right.type);
        })
        .map(async asset => {
          if (asset.type === "object") {
            const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
            const events = await this.readObjectEvents(asset);
            return {
              type: asset.type,
              name: asset.name,
              relativePath: asset.relativePath,
              yyPath: asset.yyPath,
              primaryPath: asset.yyPath,
              spriteName: readResourceName(objectYy.spriteId),
              parentName: readResourceName(objectYy.parentObjectId),
              events: events.map(event => ({
                eventType: event.eventType,
                eventNum: event.eventNum,
                collisionObject: event.collisionObject?.name ?? null,
                gmlPath: event.gmlPath
              }))
            };
          }

          if (asset.type === "script") {
            const gmlPath = path.join(asset.directoryPath, `${asset.name}.gml`);
            return {
              type: asset.type,
              name: asset.name,
              relativePath: asset.relativePath,
              yyPath: asset.yyPath,
              primaryPath: gmlPath,
              gmlPath
            };
          }

          return {
            type: asset.type,
            name: asset.name,
            relativePath: asset.relativePath,
            yyPath: asset.yyPath,
            primaryPath: asset.yyPath
          };
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
    const yy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    return {
      name: asset.name,
      type: asset.type,
      path: asset.relativePath,
      yy
    };
  }

  async getObjectEvents(name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", name);
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    const events = await this.readObjectEvents(asset);
    return {
      object: name,
      spriteId: objectYy.spriteId ?? null,
      parentObjectId: objectYy.parentObjectId ?? null,
      events
    };
  }

  async readEvent(objectName: string, eventType: number, eventNum: number): Promise<ObjectEventRecord> {
    const asset = this.getAssetRecord("object", objectName);
    const events = await this.readObjectEvents(asset);
    const event = events.find(entry => entry.eventType === eventType && entry.eventNum === eventNum);
    if (!event) {
      throw new Error(`Object ${objectName} does not contain event ${eventType}_${eventNum}.`);
    }
    return event;
  }

  async writeEvent(objectName: string, eventType: number, eventNum: number, code: string): Promise<ObjectEventRecord> {
    const event = await this.readEvent(objectName, eventType, eventNum);
    await writeFileAtomic(event.gmlPath, code);
    await this.reload();
    return await this.readEvent(objectName, eventType, eventNum);
  }

  async readScript(name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("script", name);
    const scriptPath = path.join(path.dirname(asset.yyPath), `${name}.gml`);
    return {
      name,
      path: path.relative(this.rootPath, scriptPath),
      source: await readText(scriptPath)
    };
  }

  async writeScript(name: string, code: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("script", name);
    const scriptPath = path.join(path.dirname(asset.yyPath), `${name}.gml`);
    await writeFileAtomic(scriptPath, code);
    return await this.readScript(name);
  }

  async getRoom(name: string): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("room", name);
    const room = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    return room;
  }

  getConfigResource(): Record<string, unknown> {
    const project = this.requireProject();
    return {
      buildTarget: this.config.buildTarget,
      config: project.configs ?? null,
      includedFiles: project.IncludedFiles ?? []
    };
  }

  async getMacros(): Promise<Record<string, unknown>> {
    const candidates = await fg(["options/**/*.yy"], { cwd: this.rootPath, absolute: true });
    const macros: Array<Record<string, unknown>> = [];
    for (const candidate of candidates) {
      const parsed = parseGmsJson<Record<string, unknown>>(await readText(candidate));
      collectMacros(parsed, macros);
    }
    return { macros };
  }

  async getExtensions(): Promise<Record<string, unknown>> {
    const assets = this.assetsByType.get("extension") ?? [];
    const extensions = await Promise.all(
      assets.map(async asset => ({
        name: asset.name,
        path: asset.relativePath,
        yy: parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath))
      }))
    );
    return { extensions };
  }

  getRoomOrder(): string[] {
    const project = this.requireProject();
    return (project.RoomOrderNodes ?? [])
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
    const objectDir = path.join(this.rootPath, "objects", input.name);
    await ensureDir(objectDir);

    const eventList = (input.events ?? []).map(event => this.makeEventYy(input.name, event.eventType, event.eventNum, event.collisionObject ?? null));
    const objectYy = {
      resourceType: "GMObject",
      resourceVersion: "1.0",
      name: input.name,
      spriteId: input.sprite ? this.resourceRefFor("sprite", input.sprite) : null,
      solid: false,
      visible: true,
      managed: true,
      parentObjectId: input.parent ? this.resourceRefFor("object", input.parent) : null,
      persistent: false,
      physicsObject: false,
      eventList
    };

    await writeFileAtomic(path.join(objectDir, `${input.name}.yy`), stringifyGmsJson(objectYy));
    for (const event of input.events ?? []) {
      const gmlPath = path.join(objectDir, `${event.eventType}_${event.eventNum}.gml`);
      await writeFileAtomic(gmlPath, event.code ?? "");
    }

    await this.addResource("objects", input.name);
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
    await import("node:fs/promises").then(fs => fs.rename(asset.directoryPath, newDir));

    const oldYyPath = path.join(newDir, `${fromName}.yy`);
    const newYyPath = path.join(newDir, `${toName}.yy`);
    const yy = parseGmsJson<Record<string, unknown>>(await readText(oldYyPath));
    yy.name = toName;
    await removePath(oldYyPath);
    await writeFileAtomic(newYyPath, stringifyGmsJson(yy));

    if (asset.type === "script") {
      const oldScriptPath = path.join(newDir, `${fromName}.gml`);
      const newScriptPath = path.join(newDir, `${toName}.gml`);
      if (await exists(oldScriptPath)) {
        await import("node:fs/promises").then(fs => fs.rename(oldScriptPath, newScriptPath));
      }
    }

    const project = this.requireProject();
    for (const entry of project.resources ?? []) {
      if (entry.id?.path === asset.relativePath && entry.id) {
        entry.id.name = toName;
        entry.id.path = path.posix.join(path.posix.dirname(path.posix.dirname(asset.relativePath)), toName, `${toName}.yy`);
      }
    }
    for (const room of project.RoomOrderNodes ?? []) {
      if (room.roomId?.path === asset.relativePath && room.roomId) {
        room.roomId.name = toName;
        room.roomId.path = path.posix.join(path.posix.dirname(path.posix.dirname(asset.relativePath)), toName, `${toName}.yy`);
      }
    }
    await this.saveProject(project);

    const replacementRegex = new RegExp(`\\b${escapeRegExp(fromName)}\\b`, "g");
    await this.replaceInGmlInternal(replacementRegex, toName);

    await this.reload();
    return await this.getAssetWithContent(asset.type, toName);
  }

  async setObjectSprite(objectName: string, spriteName: string | null): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", objectName);
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    objectYy.spriteId = spriteName ? this.resourceRefFor("sprite", spriteName) : null;
    await writeFileAtomic(asset.yyPath, stringifyGmsJson(objectYy));
    await this.reload();
    return await this.getAssetWithContent("object", objectName);
  }

  async setObjectParent(objectName: string, parentName: string | null): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", objectName);
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    objectYy.parentObjectId = parentName ? this.resourceRefFor("object", parentName) : null;
    await writeFileAtomic(asset.yyPath, stringifyGmsJson(objectYy));
    await this.reload();
    return await this.getAssetWithContent("object", objectName);
  }

  async addEvent(objectName: string, eventType: number, eventNum: number, code = "", collisionObject: string | null = null): Promise<ObjectEventRecord> {
    const asset = this.getAssetRecord("object", objectName);
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    const eventList = Array.isArray(objectYy.eventList) ? objectYy.eventList as Array<Record<string, unknown>> : [];
    const existing = eventList.find(event => event.eventType === eventType && event.eventNum === eventNum);
    if (existing) {
      throw new Error(`Object ${objectName} already contains event ${eventType}_${eventNum}.`);
    }
    eventList.push(this.makeEventYy(objectName, eventType, eventNum, collisionObject));
    objectYy.eventList = eventList;
    await writeFileAtomic(asset.yyPath, stringifyGmsJson(objectYy));
    await writeFileAtomic(path.join(asset.directoryPath, `${eventType}_${eventNum}.gml`), code);
    await this.reload();
    return await this.readEvent(objectName, eventType, eventNum);
  }

  async removeEvent(objectName: string, eventType: number, eventNum: number): Promise<Record<string, unknown>> {
    const asset = this.getAssetRecord("object", objectName);
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    const eventList = Array.isArray(objectYy.eventList) ? objectYy.eventList as Array<Record<string, unknown>> : [];
    objectYy.eventList = eventList.filter(event => !(event.eventType === eventType && event.eventNum === eventNum));
    await writeFileAtomic(asset.yyPath, stringifyGmsJson(objectYy));
    await removePath(path.join(asset.directoryPath, `${eventType}_${eventNum}.gml`));
    await this.reload();
    return { removed: true, objectName, eventType, eventNum };
  }

  async createScript(name: string, code: string): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("script", name);
    const scriptDir = path.join(this.rootPath, "scripts", name);
    await ensureDir(scriptDir);
    const yy = {
      resourceType: "GMScript",
      resourceVersion: "1.0",
      name
    };
    await writeFileAtomic(path.join(scriptDir, `${name}.yy`), stringifyGmsJson(yy));
    await writeFileAtomic(path.join(scriptDir, `${name}.gml`), code);
    await this.addResource("scripts", name);
    await this.reload();
    return await this.readScript(name);
  }

  async createRoom(input: CreateRoomInput): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("room", input.name);
    const roomDir = path.join(this.rootPath, "rooms", input.name);
    await ensureDir(roomDir);
    const room = {
      resourceType: "GMRoom",
      resourceVersion: "1.0",
      name: input.name,
      creationCodeFile: "",
      inheritCode: false,
      inheritCreationOrder: false,
      inheritLayers: false,
      instanceCreationOrder: [],
      isDnd: false,
      layers: [
        {
          resourceType: "GMRInstanceLayer",
          resourceVersion: "1.0",
          name: "Instances",
          depth: 0,
          effectEnabled: true,
          effectType: null,
          gridX: 32,
          gridY: 32,
          hierarchyFrozen: false,
          inheritLayerDepth: false,
          inheritLayerSettings: false,
          inheritSubLayers: true,
          inheritVisibility: true,
          instances: [],
          layers: [],
          properties: [],
          userdefinedDepth: false,
          visible: true
        }
      ],
      parent: {
        name: "Rooms",
        path: "folders/Rooms.yy"
      },
      parentRoom: null,
      physicsSettings: {
        inheritPhysicsSettings: false,
        PhysicsWorld: false,
        PhysicsWorldGravityX: 0,
        PhysicsWorldGravityY: 10,
        PhysicsWorldPixToMetres: 0.1
      },
      roomSettings: {
        Width: input.width,
        Height: input.height,
        inheritRoomSettings: false,
        persistent: input.persistent ?? false
      },
      sequenceId: null,
      views: [],
      viewSettings: {
        clearDisplayBuffer: true,
        clearViewBackground: false,
        enableViews: false,
        inheritViewSettings: false
      },
      volume: 1
    };
    await writeFileAtomic(path.join(roomDir, `${input.name}.yy`), stringifyGmsJson(room));
    await this.addResource("rooms", input.name);

    const project = this.requireProject();
    project.RoomOrderNodes = [...(project.RoomOrderNodes ?? []), { roomId: this.makeResourceRef("rooms", input.name) }];
    await this.saveProject(project);
    await this.reload();
    return await this.getRoom(input.name);
  }

  async createSprite(name: string): Promise<Record<string, unknown>> {
    this.ensureAssetMissing("sprite", name);
    const spriteDir = path.join(this.rootPath, "sprites", name);
    await ensureDir(spriteDir);
    const yy = {
      resourceType: "GMSprite",
      resourceVersion: "1.0",
      name,
      width: 0,
      height: 0,
      bboxMode: 0,
      collisionKind: 1,
      frames: []
    };
    await writeFileAtomic(path.join(spriteDir, `${name}.yy`), stringifyGmsJson(yy));
    await this.addResource("sprites", name);
    await this.reload();
    return await this.getAssetWithContent("sprite", name);
  }

  async searchGml(query: string, useRegex = false, caseSensitive = false): Promise<SearchMatch[]> {
    const pattern = useRegex ? new RegExp(query, caseSensitive ? "g" : "gi") : new RegExp(escapeRegExp(query), caseSensitive ? "g" : "gi");
    const files = await fg(["**/*.gml"], { cwd: this.rootPath, absolute: true });
    const matches: SearchMatch[] = [];
    for (const file of files) {
      const source = await readText(file);
      const lines = source.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex] ?? "";
        for (const result of line.matchAll(new RegExp(pattern.source, pattern.flags))) {
          matches.push({
            file: path.relative(this.rootPath, file),
            line: lineIndex + 1,
            column: (result.index ?? 0) + 1,
            lineText: line,
            match: result[0]
          });
        }
      }
    }
    return matches;
  }

  async replaceInGml(find: string, replace: string, useRegex = false, caseSensitive = false): Promise<ReplaceSummary[]> {
    const pattern = useRegex ? new RegExp(find, caseSensitive ? "g" : "gi") : new RegExp(escapeRegExp(find), caseSensitive ? "g" : "gi");
    const result = await this.replaceInGmlInternal(pattern, replace);
    await this.reload();
    return result;
  }

  async addToRoom(roomName: string, objectName: string, x: number, y: number, layerName?: string): Promise<Record<string, unknown>> {
    const roomAsset = this.getAssetRecord("room", roomName);
    this.getAssetRecord("object", objectName);
    const room = parseGmsJson<Record<string, unknown>>(await readText(roomAsset.yyPath));
    const layers = Array.isArray(room.layers) ? room.layers as Array<Record<string, unknown>> : [];
    const layer =
      layers.find(entry => entry.name === layerName) ??
      layers.find(entry => entry.resourceType === "GMRInstanceLayer");
    if (!layer) {
      throw new Error(`Room ${roomName} does not have an instance layer to place ${objectName}.`);
    }
    const instances = Array.isArray(layer.instances) ? layer.instances as Array<Record<string, unknown>> : [];
    const instanceId = randomUUID();
    const instance = {
      resourceType: "GMRInstance",
      resourceVersion: "1.0",
      name: `inst_${instanceId.slice(0, 8)}`,
      objectId: this.resourceRefFor("object", objectName),
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      colour: 4294967295,
      hasCreationCode: false,
      instanceId
    };
    instances.push(instance);
    layer.instances = instances;
    await writeFileAtomic(roomAsset.yyPath, stringifyGmsJson(room));
    await this.reload();
    return { roomName, instanceId, objectName, x, y };
  }

  async removeFromRoom(roomName: string, instanceId: string): Promise<Record<string, unknown>> {
    const roomAsset = this.getAssetRecord("room", roomName);
    const room = parseGmsJson<Record<string, unknown>>(await readText(roomAsset.yyPath));
    const layers = Array.isArray(room.layers) ? room.layers as Array<Record<string, unknown>> : [];
    for (const layer of layers) {
      if (!Array.isArray(layer.instances)) {
        continue;
      }
      const instances = layer.instances as Array<Record<string, unknown>>;
      const next = instances.filter(instance => instance.instanceId !== instanceId && instance.name !== instanceId);
      if (next.length !== instances.length) {
        layer.instances = next;
        await writeFileAtomic(roomAsset.yyPath, stringifyGmsJson(room));
        await this.reload();
        return { removed: true, roomName, instanceId };
      }
    }
    throw new Error(`Room ${roomName} does not contain instance ${instanceId}.`);
  }

  async setMacro(name: string, value: string): Promise<Record<string, unknown>> {
    const optionsPath = path.join(this.rootPath, "options", "main", "options_main.yy");
    const options = (await exists(optionsPath))
      ? parseGmsJson<Record<string, unknown>>(await readText(optionsPath))
      : { resourceType: "GMMainOptions", resourceVersion: "1.0", name: "Main", macros: [] };
    const macros = Array.isArray(options.macros) ? options.macros as Array<Record<string, unknown>> : [];
    const existing = macros.find(entry => entry.name === name);
    if (existing) {
      existing.value = value;
    } else {
      macros.push({ name, value });
    }
    options.macros = macros;
    await writeFileAtomic(optionsPath, stringifyGmsJson(options));
    await this.reload();
    return { name, value };
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
    const command = [
      binaryPath,
      `--${mode}`,
      this.projectPath
    ];
    const result = await execa(binaryPath, command.slice(1), {
      cwd: this.rootPath,
      reject: false
    });
    const highlightedErrors = result.stderr
      .split(/\r?\n/)
      .filter(line => /error/i.test(line));
    await writeFileAtomic(this.buildLogPath, `${result.stdout}\n${result.stderr}`.trim());
    return {
      command,
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout,
      stderr: result.stderr,
      highlightedErrors
    };
  }

  private rebuildIndex(projectFile: GmsProjectFile): void {
    this.assetsByKey.clear();
    this.assetsByType.clear();
    const resourceMap = new Map<string, GmsResourceRef>();
    for (const resource of projectFile.resources ?? []) {
      if (resource.id?.path && resource.id.name) {
        resourceMap.set(resource.id.path, resource.id);
      }
    }
    const discoveredPaths = fg.sync(["{objects,scripts,rooms,sprites,extensions}/**/*.yy"], { cwd: this.rootPath });
    for (const discoveredPath of discoveredPaths) {
      if (!resourceMap.has(discoveredPath)) {
        resourceMap.set(discoveredPath, {
          name: path.basename(discoveredPath, ".yy"),
          path: discoveredPath
        });
      }
    }
    const resources = Array.from(resourceMap.values()).map(resource => ({ id: resource }));
    for (const resource of resources) {
      if (!resource.id?.path || !resource.id.name) {
        continue;
      }
      const yyPath = path.join(this.rootPath, resource.id.path);
      const assetType = inferAssetType(resource.id.path);
      const record: AssetRecord = {
        id: `${assetType}:${resource.id.name}`,
        type: assetType,
        name: resource.id.name,
        yyPath,
        relativePath: resource.id.path,
        directoryPath: path.dirname(yyPath),
        resource: {
          name: resource.id.name,
          path: resource.id.path
        }
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
    if (this.assetsByKey.has(`${type}:${name}`)) {
      throw new Error(`Asset already exists: ${type}/${name}`);
    }
  }

  private resourceRefFor(type: string, name: string): GmsResourceRef {
    return this.getAssetRecord(type, name).resource;
  }

  private async readObjectEvents(asset: AssetRecord): Promise<ObjectEventRecord[]> {
    const objectYy = parseGmsJson<Record<string, unknown>>(await readText(asset.yyPath));
    const eventList = Array.isArray(objectYy.eventList) ? objectYy.eventList as Array<Record<string, unknown>> : [];
    return await Promise.all(
      eventList.map(async event => {
        const eventType = Number(event.eventType ?? 0);
        const eventNum = Number(event.eventNum ?? 0);
        const gmlPath = path.join(asset.directoryPath, `${eventType}_${eventNum}.gml`);
        return {
          id: String(event.id ?? `${asset.name}:${eventType}:${eventNum}`),
          eventType,
          eventNum,
          collisionObject: (event.collisionObjectId as GmsResourceRef | undefined) ?? null,
          gmlPath,
          source: (await exists(gmlPath)) ? await readText(gmlPath) : "",
          raw: event
        };
      })
    );
  }

  private makeEventYy(_objectName: string, eventType: number, eventNum: number, collisionObject: string | null): Record<string, unknown> {
    return {
      resourceType: "GMEvent",
      resourceVersion: "1.0",
      isDnD: false,
      eventType,
      eventNum,
      collisionObjectId: collisionObject ? this.resourceRefFor("object", collisionObject) : null,
      id: randomUUID()
    };
  }

  private async addResource(folderName: string, name: string): Promise<void> {
    const project = this.requireProject();
    project.resources = [
      ...(project.resources ?? []),
      {
        id: this.makeResourceRef(folderName, name)
      }
    ];
    await this.saveProject(project);
  }

  private makeResourceRef(folderName: string, name: string): GmsResourceRef {
    return {
      name,
      path: `${folderName}/${name}/${name}.yy`
    };
  }

  private async saveProject(project: GmsProjectFile): Promise<void> {
    await writeFileAtomic(this.projectPath, stringifyGmsJson(project));
    this.projectFile = project;
  }

  private async replaceInGmlInternal(pattern: RegExp, replace: string): Promise<ReplaceSummary[]> {
    const files = await fg(["**/*.gml"], { cwd: this.rootPath, absolute: true });
    const summaries: ReplaceSummary[] = [];
    for (const file of files) {
      const source = await readText(file);
      const matches = Array.from(source.matchAll(new RegExp(pattern.source, pattern.flags)));
      if (matches.length === 0) {
        continue;
      }
      const next = source.replace(pattern, replace);
      await writeFileAtomic(file, next);
      summaries.push({
        file: path.relative(this.rootPath, file),
        replacements: matches.length
      });
    }
    return summaries;
  }
}

function inferAssetType(relativePath: string): AssetType {
  const [segment] = relativePath.split("/");
  switch (segment) {
    case "sprites":
      return "sprite";
    case "objects":
      return "object";
    case "rooms":
      return "room";
    case "scripts":
      return "script";
    case "fonts":
      return "font";
    case "sounds":
      return "sound";
    case "tilesets":
      return "tileset";
    case "sequences":
      return "sequence";
    case "shaders":
      return "shader";
    case "timelines":
      return "timeline";
    case "paths":
      return "path";
    case "notes":
      return "note";
    case "extensions":
      return "extension";
    case "animcurves":
      return "animationCurve";
    case "particles":
      return "particleSystem";
    default:
      return "unknown";
  }
}

function normalizeAssetType(type: string): AssetType {
  const normalized = type.replace(/s$/, "");
  if (normalized === "animationcurve") {
    return "animationCurve";
  }
  return normalized as AssetType;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMacros(input: unknown, macros: Array<Record<string, unknown>>): void {
  if (Array.isArray(input)) {
    for (const value of input) {
      collectMacros(value, macros);
    }
    return;
  }
  if (!input || typeof input !== "object") {
    return;
  }

  const record = input as Record<string, unknown>;
  if (typeof record.name === "string" && Object.hasOwn(record, "value")) {
    macros.push({ name: record.name, value: record.value });
  }

  for (const value of Object.values(record)) {
    collectMacros(value, macros);
  }
}

function readResourceName(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeName = (value as { name?: unknown }).name;
  return typeof maybeName === "string" ? maybeName : null;
}
