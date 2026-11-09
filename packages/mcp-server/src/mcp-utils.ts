export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: true;
}

export function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function successResult(value: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: jsonText(value) }],
    structuredContent: value
  };
}

export function errorResult(error: unknown): ToolResult {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true
  };
}

/** Runs a tool action and reports failures as MCP tool errors instead of protocol errors. */
export async function runTool(action: () => Promise<Record<string, unknown>> | Record<string, unknown>): Promise<ToolResult> {
  try {
    return successResult(await action());
  } catch (error) {
    return errorResult(error);
  }
}
