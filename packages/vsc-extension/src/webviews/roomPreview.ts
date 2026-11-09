import * as vscode from "vscode";
import type { Gms2McpClient } from "../mcpClient.js";
import type { AssetIndexEntry } from "../types.js";
import { contentSecurityPolicy, escapeHtml } from "./html.js";

type YyRecord = Record<string, unknown>;

export async function openRoomPreview(client: Gms2McpClient, room: AssetIndexEntry): Promise<void> {
  const roomData = await client.callTool<{ yy?: YyRecord }>("get_asset", { type: "room", name: room.name });
  const yy = roomData.yy ?? {};
  const settings = (yy.roomSettings ?? {}) as YyRecord;
  const instances = records(yy.layers).flatMap(layer => records(layer.instances));
  const width = Number(settings.Width ?? 640);
  const height = Number(settings.Height ?? 360);

  const panel = vscode.window.createWebviewPanel("gms2RoomPreview", `Room Preview: ${room.name}`, vscode.ViewColumn.Beside, {
    enableScripts: false
  });

  const markers = instances
    .map(instance => {
      const x = Number(instance.x ?? 0);
      const y = Number(instance.y ?? 0);
      const objectName = (instance.objectId as { name?: unknown } | undefined)?.name;
      const label = typeof objectName === "string" ? objectName : "instance";
      return `<g><circle cx="${x}" cy="${y}" r="10" fill="#20a88b"></circle><text x="${x + 14}" y="${y + 4}" fill="#e5f3ef" font-size="12">${escapeHtml(label)}</text></g>`;
    })
    .join("");

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>${contentSecurityPolicy()}</head>
<body style="font-family: sans-serif; background: #0f1720; color: #e5f3ef; padding: 16px;">
  <h2 style="margin-top: 0;">${escapeHtml(room.name)}</h2>
  <p>${width} x ${height} • ${instances.length} instances</p>
  <svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-height: 70vh; border: 1px solid #28584f; background: #142a25;">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#18352f"></rect>
    ${markers}
  </svg>
</body>
</html>`;
}

function records(value: unknown): YyRecord[] {
  return Array.isArray(value) ? value.filter((entry): entry is YyRecord => Boolean(entry) && typeof entry === "object") : [];
}
