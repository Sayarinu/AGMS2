import * as vscode from "vscode";
import { registerCommands, type ExtensionServices, openProject } from "./commands.js";
import { Gms2ExplorerProvider } from "./explorer/provider.js";
import { GmlDiagnosticsController } from "./language/diagnostics.js";
import { registerLanguageProviders } from "./language/providers.js";
import { Gms2McpClient } from "./mcpClient.js";

let client: Gms2McpClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("gms2");
  client = new Gms2McpClient(context.extensionUri, configuration);

  const explorer = new Gms2ExplorerProvider(() => ({
    project: client?.getAssetIndex()?.project,
    assets: client?.getAssetIndex()?.assets ?? []
  }));

  const diagnostics = new GmlDiagnosticsController(client);
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "gms2.reconnectServer";
  statusBar.show();

  const services: ExtensionServices = {
    client,
    explorer,
    diagnostics,
    context
  };

  context.subscriptions.push(
    client,
    diagnostics,
    statusBar,
    vscode.window.registerTreeDataProvider("gms2Explorer", explorer),
    ...registerCommands(services)
  );

  registerLanguageProviders(context, client);

  client.onDidChangeState(state => {
    statusBar.text =
      state === "connected"
        ? "$(plug) GMS2: Connected"
        : state === "connecting"
          ? "$(sync~spin) GMS2: Connecting..."
          : state === "error"
            ? "$(warning) GMS2: Error"
            : "$(circle-slash) GMS2: Disconnected";
  });

  client.onDidChangeAssets(() => {
    explorer.refresh();
    diagnostics.refreshAll();
  });

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => diagnostics.refreshDocument(document)),
    vscode.workspace.onDidChangeTextDocument(event => diagnostics.refreshDocument(event.document)),
    vscode.workspace.onDidCloseTextDocument(document => diagnostics.clearDocument(document.uri))
  );

  const savedProjectPath = configuration.get<string>("projectPath")?.trim();
  const autoStart = configuration.get<boolean>("autoStartServer", true);
  if (savedProjectPath && autoStart) {
    try {
      await openProject(vscode.Uri.file(savedProjectPath), services);
    } catch (error) {
      void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }
}

export async function deactivate(): Promise<void> {
  await client?.disconnect();
}
