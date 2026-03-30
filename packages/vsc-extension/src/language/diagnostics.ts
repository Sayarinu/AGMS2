import * as vscode from "vscode";
import { builtinNames } from "./builtins.js";
import { extractDeclaredIdentifiers, stripCommentsAndStrings } from "./parser.js";
import type { Gms2McpClient } from "../mcpClient.js";

const keywords = new Set([
  "if",
  "else",
  "while",
  "for",
  "repeat",
  "with",
  "switch",
  "case",
  "break",
  "continue",
  "return",
  "exit",
  "function",
  "constructor",
  "var",
  "globalvar",
  "static",
  "new",
  "delete",
  "enum",
  "try",
  "catch",
  "finally",
  "throw"
]);

export class GmlDiagnosticsController implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection("gms2");

  constructor(private readonly client: Gms2McpClient) {}

  refreshAll(): void {
    for (const document of vscode.workspace.textDocuments) {
      this.refreshDocument(document);
    }
  }

  refreshDocument(document: vscode.TextDocument): void {
    if (document.languageId !== "gml") {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    diagnostics.push(...this.collectBraceDiagnostics(document));
    diagnostics.push(...this.collectUndefinedIdentifierDiagnostics(document));
    this.collection.set(document.uri, diagnostics);
  }

  clearDocument(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }

  dispose(): void {
    this.collection.dispose();
  }

  private collectBraceDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
    const stripped = stripCommentsAndStrings(document.getText());
    const stack: number[] = [];
    const diagnostics: vscode.Diagnostic[] = [];

    for (let index = 0; index < stripped.length; index += 1) {
      const current = stripped[index] ?? "";
      if (current === "{") {
        stack.push(index);
      } else if (current === "}") {
        const start = stack.pop();
        if (start === undefined) {
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(document.positionAt(index), document.positionAt(index + 1)),
              "Unmatched closing brace.",
              vscode.DiagnosticSeverity.Warning
            )
          );
        }
      }
    }

    for (const start of stack) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(document.positionAt(start), document.positionAt(start + 1)),
          "Unmatched opening brace.",
          vscode.DiagnosticSeverity.Warning
        )
      );
    }

    return diagnostics;
  }

  private collectUndefinedIdentifierDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
    const source = document.getText();
    const stripped = stripCommentsAndStrings(source);
    const diagnostics: vscode.Diagnostic[] = [];
    const known = new Set<string>([
      ...builtinNames,
      ...extractDeclaredIdentifiers(source),
      ...((this.client.getAssetIndex()?.assets ?? []).map(asset => asset.name))
    ]);

    for (const match of stripped.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) {
      const name = match[0];
      const index = match.index ?? 0;
      const previous = stripped[index - 1] ?? "";
      if (!name || known.has(name) || keywords.has(name)) {
        continue;
      }
      if (previous === "." || /^[A-Z0-9_]+$/.test(name)) {
        continue;
      }

      const range = new vscode.Range(document.positionAt(index), document.positionAt(index + name.length));
      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `Possibly undefined identifier "${name}".`,
          vscode.DiagnosticSeverity.Warning
        )
      );

      known.add(name);
      if (diagnostics.length >= 100) {
        break;
      }
    }

    return diagnostics;
  }
}
