# GMS2 VS Code Extension

VS Code-compatible extension for editing GameMaker Studio 2 projects from the editor.

It is intended to work in:

- VS Code
- Cursor
- VSCodium
- other VS Code forks that support standard extension APIs

## Features

### Explorer

- Custom `gms2Explorer` tree view
- IDE-style top-level folders like Objects, Scripts, Rooms, and Sprites
- Script nodes open their `.gml`
- Object nodes expand into event files
- Folder and object context actions for common GMS2 operations

### GML language support

- syntax highlighting
- bracket/comment/indent configuration
- built-in completions
- project asset completions
- built-in hover docs
- signature help for built-in functions
- go to definition for local functions and known assets
- lightweight warnings for undefined identifiers and brace mismatches

### MCP integration

- starts the local MCP server automatically on project open
- connects over stdio
- refreshes on project-change notifications
- shows connection state in the status bar

### Commands

- `gms2.openProject`
- `gms2.refreshExplorer`
- `gms2.buildProject`
- `gms2.runProject`
- `gms2.createObject`
- `gms2.createScript`
- `gms2.searchGml`
- `gms2.addEvent`

### Webviews

- Room Preview
- Object Inspector

## Settings

- `gms2.projectPath`
- `gms2.gmsBinaryPath`
- `gms2.autoStartServer`
- `gms2.buildTarget`
- `gms2.showBuiltinHints`

## Build

From the repo root:

```bash
pnpm install
pnpm --filter @agms2/mcp-server build
cd packages/vsc-extension
node ./scripts/generate-gml-assets.mjs
node ./scripts/build.mjs
```

## Run In VS Code

1. Open the repo in VS Code or Cursor.
2. Press `F5` with the `Run GMS2 Extension` launch config.
3. In the Extension Development Host, run `GMS2: Open Project`.
4. Select a `.yyp`.

The extension will spawn:

```bash
node packages/mcp-server/dist/index.js --project <path-to-project>
```

If you installed the extension as a `.vsix`, set:

```text
gms2.serverPath = /absolute/path/to/AGMS2/packages/mcp-server/dist/index.js
```

Without that setting, the installed extension will not know where your local MCP server build lives.

## Notes

- The extension bundle is written to `packages/vsc-extension/dist/extension.js`.
- The grammar is generated from `packages/gml-skills/data/builtins.json`.
- Build/run commands require `gms2.gmsBinaryPath` to be configured.
