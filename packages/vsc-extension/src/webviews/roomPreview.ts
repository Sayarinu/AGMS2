import * as vscode from "vscode";
import type { Gms2McpClient } from "../mcpClient.js";
import type { AssetIndexEntry } from "../types.js";

export async function openRoomPreview(client: Gms2McpClient, room: AssetIndexEntry): Promise<void> {
  const panel = vscode.window.createWebviewPanel("gms2RoomPreview", `Room Preview: ${room.name}`, vscode.ViewColumn.Beside, {
    enableScripts: false
  });

  const roomData = await client.callTool<Record<string, unknown>>("get_asset", { type: "room", name: room.name }).catch(async () => {
    return await client.callTool<Record<string, unknown>>("read_resource", { uri: room.relativePath });
  }).catch(() => ({}));

  const yy = (roomData.yy ?? roomData) as Record<string, unknown>;
  const settings = (yy.roomSettings ?? {}) as Record<string, unknown>;
  const layers = Array.isArray(yy.layers) ? yy.layers as Array<Record<string, unknown>> : [];
  const instances = layers.flatMap(layer => Array.isArray(layer.instances) ? layer.instances as Array<Record<string, unknown>> : []);
  const width = Number(settings.Width ?? 640);
  const height = Number(settings.Height ?? 360);

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; background: #0f1720; color: #e5f3ef; padding: 16px;">
  <h2 style="margin-top: 0;">${escapeHtml(room.name)}</h2>
  <p>${width} x ${height} • ${instances.length} instances</p>
  <svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-height: 70vh; border: 1px solid #28584f; background: #142a25;">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#18352f"></rect>
    ${instances.map(instance => {
      const x = Number(instance.x ?? 0);
      const y = Number(instance.y ?? 0);
      const label = String((instance.objectId as { name?: string } | undefined)?.name ?? "instance");
      return `<g><circle cx="${x}" cy="${y}" r="10" fill="#20a88b"></circle><text x="${x + 14}" y="${y + 4}" fill="#e5f3ef" font-size="12">${escapeHtml(label)}</text></g>`;
    }).join("")}
  </svg>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, match => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[match] ?? match);
}
