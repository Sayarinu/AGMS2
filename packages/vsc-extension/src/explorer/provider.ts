import path from "node:path";
import * as vscode from "vscode";
import { describeEvent } from "../language/eventCatalog.js";
import type { AssetIndexEntry, AssetIndexPayload, ExplorerNode } from "../types.js";

const folderOrder: AssetIndexEntry["type"][] = [
  "object",
  "script",
  "room",
  "sprite",
  "sound",
  "font",
  "tileset",
  "sequence",
  "shader",
  "timeline",
  "path",
  "note",
  "extension",
  "animationCurve",
  "particleSystem",
  "unknown"
];

const folderLabels = new Map<AssetIndexEntry["type"], string>([
  ["object", "Objects"],
  ["script", "Scripts"],
  ["room", "Rooms"],
  ["sprite", "Sprites"],
  ["sound", "Sounds"],
  ["font", "Fonts"],
  ["tileset", "Tilesets"],
  ["sequence", "Sequences"],
  ["shader", "Shaders"],
  ["timeline", "Timelines"],
  ["path", "Paths"],
  ["note", "Notes"],
  ["extension", "Extensions"],
  ["animationCurve", "Animation Curves"],
  ["particleSystem", "Particle Systems"],
  ["unknown", "Other"]
]);

const assetContextValues = new Map<AssetIndexEntry["type"], string>([
  ["object", "gms2Object"],
  ["script", "gms2Script"],
  ["room", "gms2Room"],
  ["sprite", "gms2Sprite"]
]);

export class Gms2ExplorerProvider implements vscode.TreeDataProvider<ExplorerNode> {
  private readonly emitter = new vscode.EventEmitter<ExplorerNode | undefined>();

  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly getAssetIndex: () => AssetIndexPayload | undefined) {}

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: ExplorerNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label, node.collapsibleState);
    item.contextValue = node.contextValue;
    if (node.command) {
      item.command = node.command;
    }
    if (node.resourceUri) {
      item.resourceUri = node.resourceUri;
    }
    if (node.tooltip) {
      item.tooltip = node.tooltip;
    }

    if (node.kind === "project") {
      item.iconPath = new vscode.ThemeIcon("package");
    } else if (node.kind === "folder") {
      item.iconPath = new vscode.ThemeIcon("folder-library");
    } else if (node.kind === "event") {
      item.iconPath = new vscode.ThemeIcon("symbol-event");
    } else if (node.assetType === "object") {
      item.iconPath = new vscode.ThemeIcon("symbol-class");
    } else if (node.assetType === "script") {
      item.iconPath = new vscode.ThemeIcon("symbol-function");
    } else if (node.assetType === "room") {
      item.iconPath = new vscode.ThemeIcon("symbol-array");
    } else {
      item.iconPath = new vscode.ThemeIcon("symbol-file");
    }

    return item;
  }

  async getChildren(node?: ExplorerNode): Promise<ExplorerNode[]> {
    const state = this.getAssetIndex();
    if (!state) {
      return [];
    }

    if (!node) {
      return [
        {
          kind: "project",
          label: state.project,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          folderKey: "project",
          contextValue: "gms2Project"
        }
      ];
    }

    if (node.kind === "project") {
      return folderOrder.map(type => ({
        kind: "folder",
        label: folderLabels.get(type) ?? type,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        folderKey: type,
        assetType: type,
        contextValue: "gms2Folder"
      }));
    }

    if (node.kind === "folder" && node.folderKey && node.folderKey !== "project") {
      return state.assets
        .filter(asset => asset.type === node.folderKey)
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(asset => this.assetNode(asset));
    }

    const objectAsset = node.kind === "asset" && node.asset?.type === "object" ? node.asset : undefined;
    if (objectAsset) {
      return (objectAsset.events ?? [])
        .slice()
        .sort((left, right) => left.eventType - right.eventType || left.eventNum - right.eventNum)
        .map((event): ExplorerNode => {
          const uri = vscode.Uri.file(event.gmlPath);
          return {
            kind: "event",
            label: describeEvent(event),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            asset: objectAsset,
            assetType: objectAsset.type,
            event,
            contextValue: "gms2Event",
            resourceUri: uri,
            command: { command: "vscode.open", title: "Open Event", arguments: [uri] },
            tooltip: path.basename(event.gmlPath)
          };
        });
    }

    return [];
  }

  private assetNode(asset: AssetIndexEntry): ExplorerNode {
    const opensPath = asset.type === "script" ? asset.gmlPath ?? asset.primaryPath : asset.primaryPath;
    const resourceUri = vscode.Uri.file(opensPath);

    return {
      kind: "asset",
      label: asset.name,
      collapsibleState: asset.type === "object" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
      assetType: asset.type,
      asset,
      contextValue: assetContextValues.get(asset.type) ?? "gms2Asset",
      resourceUri,
      command: { command: "vscode.open", title: "Open Asset", arguments: [resourceUri] },
      tooltip: asset.type === "object"
        ? [asset.yyPath, asset.spriteName ? `Sprite: ${asset.spriteName}` : "", asset.parentName ? `Parent: ${asset.parentName}` : ""]
            .filter(Boolean)
            .join("\n")
        : asset.relativePath
    };
  }
}
