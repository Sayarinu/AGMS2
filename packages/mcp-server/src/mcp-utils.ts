export function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function successResult(value: Record<string, unknown>): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: jsonText(value) }],
    structuredContent: value
  };
}

export function errorResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const text = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: text }],
    isError: true
  };
}
