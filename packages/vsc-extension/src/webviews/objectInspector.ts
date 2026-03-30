import * as vscode from "vscode";
import { describeEvent } from "../language/eventCatalog.js";
import type { AssetIndexEntry } from "../types.js";

export async function openObjectInspector(asset: AssetIndexEntry): Promise<void> {
  const panel = vscode.window.createWebviewPanel("gms2ObjectInspector", `Object Inspector: ${asset.name}`, vscode.ViewColumn.Beside, {
    enableScripts: true
  });

  panel.webview.onDidReceiveMessage(async message => {
    if (message?.command === "open" && typeof message.path === "string") {
      await vscode.window.showTextDocument(vscode.Uri.file(message.path));
    }
  });

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; background: #10171c; color: #effaf7; padding: 16px;">
  <h2 style="margin-top: 0;">${escapeHtml(asset.name)}</h2>
  <p>Sprite: ${escapeHtml(asset.spriteName ?? "None")}</p>
  <p>Parent: ${escapeHtml(asset.parentName ?? "None")}</p>
  <h3>Events</h3>
  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
    ${(asset.events ?? []).map(event => {
      const label = describeEvent(event);
      return `<button style="background:#1f8b74;color:white;border:none;border-radius:999px;padding:8px 12px;cursor:pointer;" onclick='openPath(${JSON.stringify(event.gmlPath)})'>${escapeHtml(label)}</button>`;
    }).join("") || "<p>No events.</p>"}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function openPath(path) {
      vscode.postMessage({ command: "open", path });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, match => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[match] ?? match);
}
