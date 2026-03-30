import * as vscode from "vscode";

export interface FunctionDefinition {
  name: string;
  params: string[];
  index: number;
}

export function stripCommentsAndStrings(source: string): string {
  let result = "";
  let state: "code" | "line-comment" | "block-comment" | "double" | "single" | "backtick" = "code";

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (state === "code") {
      if (current === "/" && next === "/") {
        result += "  ";
        index += 1;
        state = "line-comment";
        continue;
      }
      if (current === "/" && next === "*") {
        result += "  ";
        index += 1;
        state = "block-comment";
        continue;
      }
      if (current === "\"") {
        result += " ";
        state = "double";
        continue;
      }
      if (current === "'") {
        result += " ";
        state = "single";
        continue;
      }
      if (current === "`") {
        result += " ";
        state = "backtick";
        continue;
      }
      result += current;
      continue;
    }

    if (state === "line-comment") {
      result += current === "\n" ? "\n" : " ";
      if (current === "\n") {
        state = "code";
      }
      continue;
    }

    if (state === "block-comment") {
      result += current === "\n" ? "\n" : " ";
      if (current === "*" && next === "/") {
        result += " ";
        index += 1;
        state = "code";
      }
      continue;
    }

    result += current === "\n" ? "\n" : " ";
    if (current === "\\" && next) {
      result += next === "\n" ? "\n" : " ";
      index += 1;
      continue;
    }
    if ((state === "double" && current === "\"") || (state === "single" && current === "'") || (state === "backtick" && current === "`")) {
      state = "code";
    }
  }

  return result;
}

export function extractFunctionDefinitions(source: string): FunctionDefinition[] {
  const stripped = stripCommentsAndStrings(source);
  const regex = /\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  const matches: FunctionDefinition[] = [];

  for (const match of stripped.matchAll(regex)) {
    const params = (match[2] ?? "")
      .split(",")
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => entry.replace(/\s*=.*$/, "").trim());

    matches.push({
      name: match[1] ?? "",
      params,
      index: match.index ?? 0
    });
  }

  return matches;
}

export function extractDeclaredIdentifiers(source: string): Set<string> {
  const stripped = stripCommentsAndStrings(source);
  const names = new Set<string>();

  for (const match of stripped.matchAll(/\b(?:var|globalvar|static)\s+([^;]+)/g)) {
    for (const segment of (match[1] ?? "").split(",")) {
      const candidate = segment.trim().replace(/\s*=.*$/, "");
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(candidate)) {
        names.add(candidate);
      }
    }
  }

  for (const fn of extractFunctionDefinitions(source)) {
    names.add(fn.name);
    for (const param of fn.params) {
      names.add(param);
    }
  }

  return names;
}

export function getWordRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
  return document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
}

export function findCallContext(prefix: string): { functionName: string; activeParameter: number } | null {
  let depth = 0;
  let commas = 0;

  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    const current = prefix[index] ?? "";
    if (current === ")") {
      depth += 1;
      continue;
    }
    if (current === "(") {
      if (depth === 0) {
        const before = prefix.slice(0, index);
        const match = before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
        return match ? { functionName: match[1], activeParameter: commas } : null;
      }
      depth -= 1;
      continue;
    }
    if (current === "," && depth === 0) {
      commas += 1;
    }
  }

  return null;
}
