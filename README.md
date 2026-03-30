# AGMS2

AGMS2 is a GameMaker Studio 2 tooling monorepo built around three pieces:

- a local MCP server that can inspect and modify `.yyp`, `.yy`, and `.gml` files
- a VS Code-compatible extension for editing a GMS2 project entirely from the editor
- a GML builtins/skills data package used for documentation, prompts, and editor features

The goal is to make a GameMaker project feel like a first-class codebase inside modern editors such as VS Code, Cursor, and VSCodium.

## Packages

- `packages/mcp-server`  
  Local MCP server for GameMaker projects. It exposes project metadata, asset reads/writes, build/run commands, search, and room/object mutation tools.

- `packages/vsc-extension`  
  VS Code/Cursor extension with a GMS2 explorer, GML language tooling, MCP lifecycle management, and read-only webviews.

- `packages/gml-skills`  
  Prompt-ready GameMaker guidance plus built-in functions, variables, and constants used by the extension’s grammar, completion, hover, and signature help.

## Current Features

### MCP server

- Opens a `.yyp` project and indexes project assets
- Reads scripts, object events, rooms, macros, extensions, and project metadata
- Creates and edits scripts, objects, rooms, sprites, and object events
- Sets object sprite and parent
- Renames and deletes assets
- Searches and replaces across `.gml`
- Adds and removes room instances
- Runs build/run/clean commands through the GameMaker CLI
- Watches the project and refreshes internal metadata on file changes
- Emits MCP resource-change notifications so editor clients can refresh automatically
- Exposes a normalized asset index for editor integrations

### VS Code extension

- Custom `gms2Explorer` tree view that mirrors the GMS2 IDE
- Opens scripts and object event files directly from the explorer
- Context actions for:
  - create object
  - create script
  - add event
  - set sprite
  - set parent
  - delete asset
- Commands for:
  - open project
  - refresh explorer
  - build project
  - run project
  - create object
  - create script
  - search GML
  - add event
- GML language support:
  - TextMate syntax highlighting
  - language configuration
  - built-in completions
  - asset-name completions
  - hover docs
  - signature help
  - go to definition
  - lightweight diagnostics
- Read-only webviews:
  - room preview
  - object inspector
- Automatic MCP process management with status bar connection state

### GML data/skills

- Built-in function signatures and descriptions
- Built-in constants and variables
- Prompt-oriented GameMaker best-practice references for common systems

## Repo Layout

```text
AGMS2/
├─ packages/
│  ├─ gml-skills/
│  ├─ mcp-server/
│  └─ vsc-extension/
├─ Queen's Court/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## Requirements

- Node.js 20+
- `pnpm`
- GameMaker Studio 2 installed if you want to run actual builds

## Install

From the repo root:

```bash
pnpm install
```

This is important now that the extension package has its own dependencies.

## Running the MCP Server

Build it:

```bash
pnpm --filter @agms2/mcp-server build
```

Run it against a project:

```bash
node packages/mcp-server/dist/index.js --project "/absolute/path/to/MyGame.yyp"
```

Optional SSE mode:

```bash
node packages/mcp-server/dist/index.js --project "/absolute/path/to/MyGame.yyp" --sse --port 3001
```

You can also configure the GameMaker binary by creating `gms2-mcp.config.json` in the project root:

```json
{
  "gmsBinaryPath": "C:/Program Files/GameMaker/GameMaker.exe",
  "buildTarget": "Windows",
  "runtimePath": null,
  "watchMode": true,
  "logLevel": "info"
}
```

The extension also passes `gms2.gmsBinaryPath` and `gms2.buildTarget` through environment variables when it starts the server.

## Running the Extension

### Fastest way in VS Code / Cursor

1. Run install once:

```bash
pnpm install
```

2. Build the MCP server:

```bash
pnpm --filter @agms2/mcp-server build
```

3. Build the extension:

```bash
cd packages/vsc-extension
node ./scripts/generate-gml-assets.mjs
node ./scripts/build.mjs
```

4. Open the repo in VS Code or Cursor.

5. Start an Extension Development Host:
   - open the Run and Debug panel
   - choose `Run GMS2 Extension`
   - press `F5`

6. In the Extension Development Host window:
   - run `GMS2: Open Project`
   - pick a `.yyp`
   - wait for the status bar to show `GMS2: Connected`

### Installed VSIX setup

If you install the extension as a normal `.vsix`, also set:

- `gms2.serverPath`

Point it at your built MCP server file:

```text
/absolute/path/to/AGMS2/packages/mcp-server/dist/index.js
```

The installed extension needs this because the MCP server currently lives in the AGMS2 repo, not inside the packaged VSIX.

### Manual command-line build

If you only want to rebuild the extension bundle:

```bash
cd packages/vsc-extension
node ./scripts/build.mjs
```

Watch mode:

```bash
cd packages/vsc-extension
node ./scripts/build.mjs --watch
```

## Publishing

### Extension

The extension is designed for Open VSX first:

```bash
pnpm --filter agms2-vsc-extension package
pnpm --filter agms2-vsc-extension publish:ovsx
```

GitHub Releases are also automated for the VSIX. Bump the extension version in `packages/vsc-extension/package.json` or run one of:

```bash
pnpm release:patch
pnpm release:minor
pnpm release:major
```

Then push `main`. The workflow will build `agms2-vsc-extension-<version>.vsix` and publish a GitHub release tagged `v<version>`.

### Marketplace

The manifest is structured so a VS Code Marketplace publish path can also be added if desired.

## Important Notes

- The extension expects the MCP server build output at `packages/mcp-server/dist/index.js`.
- For a normally installed VSIX, set `gms2.serverPath` explicitly.
- Build and run commands only work when the GameMaker executable path is configured.
- The current diagnostics are intentionally lightweight. They are warnings, not a full semantic compiler.
- The webviews are read-only on purpose in this version.

## Documentation

- MCP server details: [`packages/mcp-server/README.md`](/Users/carter/Documents/Coding%20Repositories/AGMS2/packages/mcp-server/README.md)
- Extension details: [`packages/vsc-extension/README.md`](/Users/carter/Documents/Coding%20Repositories/AGMS2/packages/vsc-extension/README.md)
- GML data/skills: [`packages/gml-skills/README.md`](/Users/carter/Documents/Coding%20Repositories/AGMS2/packages/gml-skills/README.md)
