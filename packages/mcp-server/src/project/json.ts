export function parseGmsJson<T>(input: string): T {
  const normalized = input.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(normalized) as T;
}

export function stringifyGmsJson(input: unknown): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}
