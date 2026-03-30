export type AssetType =
  | "sprite"
  | "object"
  | "room"
  | "script"
  | "font"
  | "sound"
  | "tileset"
  | "sequence"
  | "shader"
  | "timeline"
  | "path"
  | "note"
  | "extension"
  | "animationCurve"
  | "particleSystem"
  | "unknown";

export interface Gms2ServerConfig {
  gmsBinaryPath: string | null;
  buildTarget: string;
  runtimePath: string | null;
  watchMode: boolean;
  logLevel: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";
}

export interface GmsResourceRef {
  name: string;
  path: string;
}

export interface GmsProjectFile {
  resourceType: string;
  resourceVersion: string;
  name: string;
  resources?: Array<{ id?: GmsResourceRef | null }>;
  RoomOrderNodes?: Array<{ roomId?: GmsResourceRef | null }>;
  IncludedFiles?: unknown[];
  MetaData?: Record<string, unknown>;
  configs?: unknown;
  [key: string]: unknown;
}

export interface AssetRecord {
  id: string;
  type: AssetType;
  name: string;
  yyPath: string;
  relativePath: string;
  directoryPath: string;
  resource: GmsResourceRef;
}

export interface ObjectEventRecord {
  [key: string]: unknown;
  id: string;
  eventType: number;
  eventNum: number;
  collisionObject?: GmsResourceRef | null;
  gmlPath: string;
  source: string;
  raw: Record<string, unknown>;
}

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  lineText: string;
  match: string;
}

export interface ReplaceSummary {
  file: string;
  replacements: number;
}

export interface BuildResult {
  [key: string]: unknown;
  command: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  highlightedErrors: string[];
}
