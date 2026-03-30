import * as vscode from "vscode";

export type Gms2AssetType =
  | "object"
  | "script"
  | "room"
  | "sprite"
  | "sound"
  | "font"
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

export interface AssetEventIndexEntry {
  eventType: number;
  eventNum: number;
  collisionObject: string | null;
  gmlPath: string;
}

export interface AssetIndexEntry {
  type: Gms2AssetType;
  name: string;
  relativePath: string;
  yyPath: string;
  primaryPath: string;
  gmlPath?: string;
  spriteName?: string | null;
  parentName?: string | null;
  events?: AssetEventIndexEntry[];
}

export interface AssetIndexPayload {
  project: string;
  rootPath: string;
  projectPath: string;
  assets: AssetIndexEntry[];
}

export interface BuiltinFunction {
  name: string;
  signature: string;
  returns: string;
  description: string;
  params: Array<{
    name: string;
    type: string;
    description: string;
    optional?: boolean;
  }>;
  category: string;
}

export interface BuiltinValue {
  name: string;
  description: string;
  type?: string;
  category?: string;
}

export type ExplorerNodeKind = "project" | "folder" | "asset" | "event";

export interface ExplorerNode {
  kind: ExplorerNodeKind;
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  assetType?: Gms2AssetType;
  folderKey?: Gms2AssetType | "project";
  asset?: AssetIndexEntry;
  event?: AssetEventIndexEntry;
  command?: vscode.Command;
  contextValue: string;
  resourceUri?: vscode.Uri;
  tooltip?: string;
}
