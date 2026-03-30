import * as vscode from "vscode";
import { eventCatalog } from "./language/eventCatalog.js";
import { openObjectInspector } from "./webviews/objectInspector.js";
import { openRoomPreview } from "./webviews/roomPreview.js";
import type { Gms2McpClient } from "./mcpClient.js";
import type { AssetIndexEntry, ExplorerNode } from "./types.js";
import type { Gms2ExplorerProvider } from "./explorer/provider.js";
import type { GmlDiagnosticsController } from "./language/diagnostics.js";

export interface ExtensionServices {
  client: Gms2McpClient;
  explorer: Gms2ExplorerProvider;
  diagnostics: GmlDiagnosticsController;
  context: vscode.ExtensionContext;
}

class Gms2Terminal implements vscode.Pseudoterminal, vscode.Disposable {
  private readonly writeEmitter = new vscode.EventEmitter<string>();
  private readonly closeEmitter = new vscode.EventEmitter<number>();
  private readonly terminal = vscode.window.createTerminal({ name: "GMS2", pty: this });

  readonly onDidWrite = this.writeEmitter.event;
  readonly onDidClose = this.closeEmitter.event;

  open(): void {}
  close(): void {}
  handleInput(): void {}

  show(): void {
    this.terminal.show(true);
  }

  writeLine(value: string): void {
    this.writeEmitter.fire(`${value}\r\n`);
  }

  dispose(): void {
    this.closeEmitter.fire(0);
    this.writeEmitter.dispose();
    this.closeEmitter.dispose();
    this.terminal.dispose();
  }
}

export function registerCommands(services: ExtensionServices): vscode.Disposable[] {
  const terminal = new Gms2Terminal();
  const commands: vscode.Disposable[] = [terminal];

  commands.push(
    vscode.commands.registerCommand("gms2.openProject", async () => {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { "GameMaker Projects": ["yyp"] }
      });

      const uri = picked?.[0];
      if (!uri) {
        return;
      }

      await openProject(uri, services);
    }),
    vscode.commands.registerCommand("gms2.reconnectServer", async () => {
      await services.client.reconnect();
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.refreshExplorer", async () => {
      await services.client.refreshAssetIndex();
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.buildProject", async () => {
      terminal.show();
      terminal.writeLine("Running build_project...");
      const result = await services.client.callTool<Record<string, unknown>>("build_project");
      writeBuildResult(terminal, result);
    }),
    vscode.commands.registerCommand("gms2.runProject", async () => {
      terminal.show();
      terminal.writeLine("Running run_project...");
      const result = await services.client.callTool<Record<string, unknown>>("run_project");
      writeBuildResult(terminal, result);
    }),
    vscode.commands.registerCommand("gms2.createObject", async () => {
      const name = await vscode.window.showInputBox({ prompt: "Object name" });
      if (!name) {
        return;
      }

      const spriteName = await pickAssetName(services.client, "sprite", "Assign sprite");
      const parentName = await pickAssetName(services.client, "object", "Assign parent object");
      await services.client.callTool("create_object", {
        name,
        sprite: spriteName,
        parent: parentName
      });
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.createScript", async () => {
      const name = await vscode.window.showInputBox({ prompt: "Script name" });
      if (!name) {
        return;
      }
      const code = `function ${name}() {\n\n}\n`;
      await services.client.callTool("create_script", { name, code });
      await afterMutationRefresh(services);
      const asset = services.client.getAssetByName(name);
      if (asset?.gmlPath) {
        await vscode.window.showTextDocument(vscode.Uri.file(asset.gmlPath));
      }
    }),
    vscode.commands.registerCommand("gms2.searchGml", async () => {
      const query = await vscode.window.showInputBox({ prompt: "Search all GML" });
      if (!query) {
        return;
      }

      const result = await services.client.callTool<{ matches: Array<{ file: string; line: number; column: number; lineText: string }> }>("search_gml", { query });
      const picked = await vscode.window.showQuickPick(
        result.matches.map(match => ({
          label: `${match.file}:${match.line}:${match.column}`,
          description: match.lineText.trim(),
          match
        })),
        { matchOnDescription: true, title: `Results for "${query}"` }
      );

      if (!picked || !services.client.getAssetIndex()) {
        return;
      }

      const rootPath = services.client.getAssetIndex()!.rootPath;
      const uri = vscode.Uri.file(`${rootPath}/${picked.match.file}`);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      const position = new vscode.Position(Math.max(0, picked.match.line - 1), Math.max(0, picked.match.column - 1));
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }),
    vscode.commands.registerCommand("gms2.addEvent", async (node?: ExplorerNode) => {
      const objectAsset = await resolveObjectAsset(node, services.client);
      if (!objectAsset) {
        return;
      }

      const picked = await vscode.window.showQuickPick(
        eventCatalog.map(event => ({
          label: event.label,
          description: event.detail,
          event
        })),
        { title: `Add Event to ${objectAsset.name}` }
      );

      if (!picked) {
        return;
      }

      const collisionObject = picked.event.requiresCollisionObject
        ? await pickAssetName(services.client, "object", "Select collision object")
        : null;

      await services.client.callTool("add_event", {
        objectName: objectAsset.name,
        eventType: picked.event.eventType,
        eventNum: picked.event.eventNum,
        collisionObject
      });
      await afterMutationRefresh(services);
      const refreshed = services.client.getAssetByName(objectAsset.name);
      const event = refreshed?.events?.find(entry => entry.eventType === picked.event.eventType && entry.eventNum === picked.event.eventNum);
      if (event) {
        await vscode.window.showTextDocument(vscode.Uri.file(event.gmlPath));
      }
    }),
    vscode.commands.registerCommand("gms2.setObjectSprite", async (node?: ExplorerNode) => {
      const objectAsset = await resolveObjectAsset(node, services.client);
      if (!objectAsset) {
        return;
      }
      const spriteName = await pickAssetName(services.client, "sprite", "Select sprite");
      await services.client.callTool("set_object_sprite", { objectName: objectAsset.name, spriteName });
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.setObjectParent", async (node?: ExplorerNode) => {
      const objectAsset = await resolveObjectAsset(node, services.client);
      if (!objectAsset) {
        return;
      }
      const parentName = await pickAssetName(services.client, "object", "Select parent object");
      await services.client.callTool("set_object_parent", { objectName: objectAsset.name, parentName });
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.deleteAsset", async (node?: ExplorerNode) => {
      const asset = node?.asset;
      if (!asset) {
        return;
      }
      const confirm = await vscode.window.showWarningMessage(`Delete ${asset.type} "${asset.name}"?`, { modal: true }, "Delete");
      if (confirm !== "Delete") {
        return;
      }
      await services.client.callTool("delete_asset", { type: asset.type, name: asset.name, confirm: true });
      await afterMutationRefresh(services);
    }),
    vscode.commands.registerCommand("gms2.openRoomPreview", async (node?: ExplorerNode) => {
      const room = node?.asset?.type === "room" ? node.asset : await pickNamedAsset(services.client, "room", "Select room");
      if (room) {
        await openRoomPreview(services.client, room);
      }
    }),
    vscode.commands.registerCommand("gms2.openObjectInspector", async (node?: ExplorerNode) => {
      const asset = await resolveObjectAsset(node, services.client);
      if (asset) {
        await openObjectInspector(asset);
      }
    })
  );

  return commands;
}

export async function openProject(uri: vscode.Uri, services: ExtensionServices): Promise<void> {
  await vscode.workspace.getConfiguration("gms2").update("projectPath", uri.fsPath, vscode.ConfigurationTarget.Global);
  await services.client.connect(uri.fsPath);
  await afterMutationRefresh(services);
}

async function afterMutationRefresh(services: ExtensionServices): Promise<void> {
  await services.client.refreshAssetIndex();
  services.explorer.refresh();
  services.diagnostics.refreshAll();
}

async function pickAssetName(client: Gms2McpClient, type: AssetIndexEntry["type"], title: string): Promise<string | null> {
  const options = [{ label: "None", asset: null as AssetIndexEntry | null }, ...client.getAssetsOfType(type).map(asset => ({ label: asset.name, asset }))];
  const picked = await vscode.window.showQuickPick(options, { title });
  return picked?.asset?.name ?? null;
}

async function pickNamedAsset(client: Gms2McpClient, type: AssetIndexEntry["type"], title: string): Promise<AssetIndexEntry | undefined> {
  const picked = await vscode.window.showQuickPick(
    client.getAssetsOfType(type).map(asset => ({ label: asset.name, description: asset.relativePath, asset })),
    { title }
  );
  return picked?.asset;
}

async function resolveObjectAsset(node: ExplorerNode | undefined, client: Gms2McpClient): Promise<AssetIndexEntry | undefined> {
  if (node?.asset?.type === "object") {
    return node.asset;
  }
  return await pickNamedAsset(client, "object", "Select object");
}

function writeBuildResult(terminal: Gms2Terminal, result: Record<string, unknown>): void {
  terminal.writeLine(`Exit code: ${String(result.exitCode ?? "")}`);
  if (typeof result.stdout === "string" && result.stdout) {
    terminal.writeLine(result.stdout);
  }
  if (typeof result.stderr === "string" && result.stderr) {
    terminal.writeLine(result.stderr);
  }
}
