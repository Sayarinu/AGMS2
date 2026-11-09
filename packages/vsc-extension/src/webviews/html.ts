import { randomBytes } from "node:crypto";

const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, match => entities[match] ?? match);
}

export function createNonce(): string {
  return randomBytes(16).toString("base64");
}

/** Content-Security-Policy that blocks everything except inline styles and, when given, one nonced script. */
export function contentSecurityPolicy(nonce?: string): string {
  const script = nonce ? `script-src 'nonce-${nonce}';` : "";
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; ${script}">`;
}
