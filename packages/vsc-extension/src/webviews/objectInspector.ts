import * as vscode from "vscode";
import { describeEvent } from "../language/eventCatalog.js";
import type { AssetIndexEntry } from "../types.js";
import { contentSecurityPolicy, createNonce, escapeHtml } from "./html.js";

export async function openObjectInspector(asset: AssetIndexEntry): Promise<void> {
  const panel = vscode.window.createWebviewPanel("gms2ObjectInspector", `Object Inspector: ${asset.name}`, vscode.ViewColumn.Beside, {
    enableScripts: true
  });

  const eventPaths = new Set((asset.events ?? []).map(event => event.gmlPath));
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    const target = (message as { command?: unknown; path?: unknown } | null) ?? {};
    // Only open files this panel listed, whatever the webview sends.
    if (target.command === "open" && typeof target.path === "string" && eventPaths.has(target.path)) {
      await vscode.window.showTextDocument(vscode.Uri.file(target.path));
    }
  });

  const nonce = createNonce();
  const buttons = (asset.events ?? [])
    .map(event => `<button data-path="${escapeHtml(event.gmlPath)}">${escapeHtml(describeEvent(event))}</button>`)
    .join("");

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${contentSecurityPolicy(nonce)}
  <style>
    body { font-family: sans-serif; background: #10171c; color: #effaf7; padding: 16px; }
    .events { display: flex; gap: 8px; flex-wrap: wrap; }
    button { background: #1f8b74; color: white; border: none; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
  </style>
</head>
<body>
  <h2 style="margin-top: 0;">${escapeHtml(asset.name)}</h2>
  <p>Sprite: ${escapeHtml(asset.spriteName ?? "None")}</p>
  <p>Parent: ${escapeHtml(asset.parentName ?? "None")}</p>
  <h3>Events</h3>
  <div class="events">${buttons || "<p>No events.</p>"}</div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    for (const button of document.querySelectorAll("button[data-path]")) {
      button.addEventListener("click", () => vscode.postMessage({ command: "open", path: button.dataset.path }));
    }
  </script>
</body>
</html>`;
}
