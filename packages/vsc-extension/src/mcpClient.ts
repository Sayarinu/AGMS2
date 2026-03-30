import path from "node:path";
import fs from "node:fs";
import * as vscode from "vscode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { AssetIndexEntry, AssetIndexPayload } from "./types.js";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export class Gms2McpClient implements vscode.Disposable {
  private client: Client | undefined;
  private transport: StdioClientTransport | undefined;
  private assetIndex: AssetIndexPayload | undefined;
  private output = vscode.window.createOutputChannel("GMS2 MCP");
  private state = new vscode.EventEmitter<ConnectionState>();
  private assetsChanged = new vscode.EventEmitter<void>();
  private currentProjectPath: string | undefined;
  private currentState: ConnectionState = "disconnected";

  readonly onDidChangeState = this.state.event;
  readonly onDidChangeAssets = this.assetsChanged.event;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configuration: vscode.WorkspaceConfiguration
  ) {}

  get projectPath(): string | undefined {
    return this.currentProjectPath;
  }

  get connected(): boolean {
    return this.currentState === "connected";
  }

  getAssetIndex(): AssetIndexPayload | undefined {
    return this.assetIndex;
  }

  getAssetsOfType(type: AssetIndexEntry["type"]): AssetIndexEntry[] {
    return (this.assetIndex?.assets ?? []).filter(asset => asset.type === type);
  }

  getAssetByName(name: string): AssetIndexEntry | undefined {
    return this.assetIndex?.assets.find(asset => asset.name === name);
  }

  async connect(projectPath: string): Promise<void> {
    await this.disconnect();
    this.currentProjectPath = projectPath;
    this.updateState("connecting");

    const serverEntry = await this.resolveServerEntry();
    const repoRoot = path.dirname(serverEntry);
    const gmsBinaryPath = this.configuration.get<string>("gmsBinaryPath")?.trim();
    const buildTarget = this.configuration.get<string>("buildTarget")?.trim();

    this.transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry, "--project", projectPath],
      cwd: repoRoot,
      stderr: "pipe",
      env: {
        ...process.env,
        ...(gmsBinaryPath ? { GMS2_GMS_BINARY_PATH: gmsBinaryPath } : {}),
        ...(buildTarget ? { GMS2_BUILD_TARGET: buildTarget } : {})
      }
    });

    const stderr = this.transport.stderr;
    if (stderr) {
      stderr.on("data", chunk => {
        this.output.appendLine(String(chunk).trimEnd());
      });
    }

    this.transport.onerror = error => {
      this.output.appendLine(error.message);
      this.updateState("error");
    };

    this.transport.onclose = () => {
      if (this.currentState !== "disconnected") {
        this.updateState("error");
      }
    };

    this.client = new Client(
      { name: "agms2-vsc-extension", version: "0.1.0" },
      {
        capabilities: {},
        listChanged: {
          resources: {
            onChanged: async error => {
              if (error) {
                this.output.appendLine(`Resource refresh failed: ${error.message}`);
                return;
              }
              await this.refreshAssetIndex();
              this.assetsChanged.fire();
            }
          }
        }
      }
    );

    await this.client.connect(this.transport);
    await this.refreshAssetIndex();
    this.updateState("connected");
  }

  async reconnect(): Promise<void> {
    if (!this.currentProjectPath) {
      return;
    }
    await this.connect(this.currentProjectPath);
  }

  async disconnect(): Promise<void> {
    this.assetIndex = undefined;
    const client = this.client;
    const transport = this.transport;
    this.client = undefined;
    this.transport = undefined;

    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close failures during shutdown.
      }
    }

    if (transport) {
      try {
        await transport.close();
      } catch {
        // Ignore close failures during shutdown.
      }
    }

    this.updateState("disconnected");
  }

  async refreshAssetIndex(): Promise<AssetIndexPayload> {
    const payload = await this.callTool<AssetIndexPayload>("get_asset_index");
    this.assetIndex = payload;
    return payload;
  }

  async callTool<T>(name: string, args?: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new Error("GMS2 MCP client is not connected.");
    }

    const result = await this.client.callTool({ name, arguments: args ?? {} }, CallToolResultSchema);
    if (result.isError) {
      const text = result.content.find(entry => entry.type === "text")?.text ?? `Tool failed: ${name}`;
      throw new Error(text);
    }
    if (result.structuredContent) {
      return result.structuredContent as T;
    }

    const text = result.content.find(entry => entry.type === "text")?.text ?? "{}";
    return JSON.parse(text) as T;
  }

  showOutput(): void {
    this.output.show(true);
  }

  dispose(): void {
    void this.disconnect();
    this.state.dispose();
    this.assetsChanged.dispose();
    this.output.dispose();
  }

  private updateState(next: ConnectionState): void {
    this.currentState = next;
    this.state.fire(next);
  }

  private async resolveServerEntry(): Promise<string> {
    const bundledPath = path.join(this.extensionUri.fsPath, "server", "index.js");
    const useBundledServer = this.configuration.get<boolean>("useBundledServer", false);
    const configuredPath = this.configuration.get<string>("serverPath")?.trim();

    if (useBundledServer) {
      if (fs.existsSync(bundledPath)) {
        return bundledPath;
      }
      throw new Error("The bundled AGMS2 MCP server is enabled, but the packaged server file is missing.");
    }

    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    if (fs.existsSync(bundledPath)) {
      const choice = await vscode.window.showInformationMessage(
        "No external AGMS2 MCP server path is configured. Enable the bundled server for this installation?",
        "Enable Bundled Server",
        "Cancel"
      );

      if (choice === "Enable Bundled Server") {
        await vscode.workspace.getConfiguration("gms2").update("useBundledServer", true, vscode.ConfigurationTarget.Global);
        return bundledPath;
      }
    }

    throw new Error(
      [
        "Unable to locate the AGMS2 MCP server.",
        "Either enable gms2.useBundledServer or set gms2.serverPath to an external AGMS2 MCP server entry file."
      ].join(" ")
    );
  }
}
