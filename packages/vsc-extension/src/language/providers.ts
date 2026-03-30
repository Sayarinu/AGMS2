import path from "node:path";
import * as vscode from "vscode";
import { builtinConstantMap, builtinConstants, builtinFunctionMap, builtinFunctions, builtinVariableMap, builtinVariables } from "./builtins.js";
import { extractFunctionDefinitions, findCallContext, getWordRange, stripCommentsAndStrings } from "./parser.js";
import type { AssetIndexEntry, BuiltinFunction } from "../types.js";
import type { Gms2McpClient } from "../mcpClient.js";

export function registerLanguageProviders(context: vscode.ExtensionContext, client: Gms2McpClient): void {
  const selector: vscode.DocumentSelector = { language: "gml", scheme: "file" };

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(selector, new GmlCompletionProvider(client), "."),
    vscode.languages.registerHoverProvider(selector, new GmlHoverProvider(client)),
    vscode.languages.registerSignatureHelpProvider(selector, new GmlSignatureHelpProvider(), "(", ","),
    vscode.languages.registerDefinitionProvider(selector, new GmlDefinitionProvider(client))
  );
}

class GmlCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly client: Gms2McpClient) {}

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
    const scopedMatch = linePrefix.match(/\b(global|self|other)\.$/);
    if (scopedMatch) {
      return ["x", "y", "id", "sprite_index", "image_index", "image_speed"].map(name => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field);
        item.detail = `${scopedMatch[1]}.${name}`;
        return item;
      });
    }

    const items: vscode.CompletionItem[] = [];
    for (const builtin of builtinFunctions) {
      const item = new vscode.CompletionItem(builtin.name, vscode.CompletionItemKind.Function);
      item.detail = builtin.signature;
      item.documentation = builtin.description;
      items.push(item);
    }
    for (const value of builtinVariables) {
      const item = new vscode.CompletionItem(value.name, vscode.CompletionItemKind.Variable);
      item.detail = value.type ?? "Built-in variable";
      item.documentation = value.description;
      items.push(item);
    }
    for (const value of builtinConstants) {
      const item = new vscode.CompletionItem(value.name, vscode.CompletionItemKind.Constant);
      item.detail = value.type ?? "Built-in constant";
      item.documentation = value.description;
      items.push(item);
    }
    for (const asset of this.client.getAssetIndex()?.assets ?? []) {
      const item = new vscode.CompletionItem(asset.name, assetKind(asset));
      item.detail = asset.type;
      item.documentation = asset.relativePath;
      items.push(item);
    }
    for (const def of collectOpenFunctionDefinitions()) {
      const item = new vscode.CompletionItem(def.name, vscode.CompletionItemKind.Function);
      item.detail = `function ${def.name}(${def.params.join(", ")})`;
      items.push(item);
    }

    return items;
  }
}

class GmlHoverProvider implements vscode.HoverProvider {
  constructor(private readonly client: Gms2McpClient) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const range = getWordRange(document, position);
    if (!range) {
      return undefined;
    }

    const text = document.getText(range);
    const config = vscode.workspace.getConfiguration("gms2");

    if (config.get<boolean>("showBuiltinHints", true)) {
      const builtin = builtinFunctionMap.get(text);
      if (builtin) {
        return new vscode.Hover([
          new vscode.MarkdownString(`\`${builtin.signature}\``),
          new vscode.MarkdownString(builtin.description)
        ]);
      }
    }

    const builtinVariable = builtinVariableMap.get(text) ?? builtinConstantMap.get(text);
    if (builtinVariable) {
      return new vscode.Hover(`${builtinVariable.name}: ${builtinVariable.description}`);
    }

    const asset = this.client.getAssetByName(text);
    if (!asset) {
      return undefined;
    }

    const lines = [`**${asset.name}**`, `Type: ${asset.type}`, `Path: ${asset.relativePath}`];
    if (asset.type === "object") {
      lines.push(`Sprite: ${asset.spriteName ?? "None"}`, `Parent: ${asset.parentName ?? "None"}`);
    }
    return new vscode.Hover(new vscode.MarkdownString(lines.join("  \n")));
  }
}

class GmlSignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position): vscode.SignatureHelp | undefined {
    const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const stripped = stripCommentsAndStrings(prefix);
    const context = findCallContext(stripped);
    if (!context) {
      return undefined;
    }

    const builtin = builtinFunctionMap.get(context.functionName);
    if (!builtin) {
      return undefined;
    }

    const help = new vscode.SignatureHelp();
    const signature = new vscode.SignatureInformation(builtin.signature, builtin.description);
    signature.parameters = builtin.params.map(param => new vscode.ParameterInformation(param.name, param.description));
    help.signatures = [signature];
    help.activeSignature = 0;
    help.activeParameter = Math.min(context.activeParameter, Math.max(signature.parameters.length - 1, 0));
    return help;
  }
}

class GmlDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly client: Gms2McpClient) {}

  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition | undefined {
    const stringAsset = findQuotedAssetAtPosition(document, position, this.client);
    if (stringAsset) {
      return new vscode.Location(vscode.Uri.file(primaryCodePath(stringAsset)), new vscode.Position(0, 0));
    }

    const range = getWordRange(document, position);
    if (!range) {
      return undefined;
    }

    const word = document.getText(range);
    const local = findOpenFunctionDefinition(word);
    if (local) {
      return local;
    }

    const asset = this.client.getAssetByName(word);
    if (asset) {
      return new vscode.Location(vscode.Uri.file(primaryCodePath(asset)), new vscode.Position(0, 0));
    }

    return undefined;
  }
}

function collectOpenFunctionDefinitions(): Array<{ name: string; params: string[] }> {
  const values: Array<{ name: string; params: string[] }> = [];
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId !== "gml") {
      continue;
    }
    values.push(...extractFunctionDefinitions(document.getText()).map(def => ({ name: def.name, params: def.params })));
  }
  return values;
}

function findOpenFunctionDefinition(name: string): vscode.Location | undefined {
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId !== "gml") {
      continue;
    }
    for (const def of extractFunctionDefinitions(document.getText())) {
      if (def.name === name) {
        return new vscode.Location(document.uri, document.positionAt(def.index));
      }
    }
  }
  return undefined;
}

function findQuotedAssetAtPosition(document: vscode.TextDocument, position: vscode.Position, client: Gms2McpClient): AssetIndexEntry | undefined {
  const line = document.lineAt(position.line).text;
  for (const match of line.matchAll(/["']([^"']+)["']/g)) {
    const value = match[1] ?? "";
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (position.character >= start && position.character <= end) {
      return client.getAssetByName(value);
    }
  }
  return undefined;
}

function primaryCodePath(asset: AssetIndexEntry): string {
  if (asset.type === "script") {
    return asset.gmlPath ?? asset.primaryPath;
  }
  if (asset.type === "object") {
    return asset.events?.[0]?.gmlPath ?? asset.yyPath;
  }
  return asset.primaryPath;
}

function assetKind(asset: AssetIndexEntry): vscode.CompletionItemKind {
  switch (asset.type) {
    case "object":
      return vscode.CompletionItemKind.Class;
    case "script":
      return vscode.CompletionItemKind.Function;
    case "room":
      return vscode.CompletionItemKind.Module;
    case "sprite":
      return vscode.CompletionItemKind.Color;
    default:
      return vscode.CompletionItemKind.Value;
  }
}
