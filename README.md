<div align="center">

<img src="packages/vsc-extension/media/gamemaker-diamond.svg" alt="AGMS2" width="96" height="96">

# AGMS2

**GameMaker projects in VS Code, Cursor and your AI agent.**

Edit GML with completions, hover docs and diagnostics, browse and change your project's objects, scripts and rooms from the editor, and give agents the same access through a local MCP server.

[![Latest release](https://img.shields.io/github/v/release/Sayarinu/AGMS2?label=release&sort=semver)](https://github.com/Sayarinu/AGMS2/releases/latest)
[![CI](https://github.com/Sayarinu/AGMS2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Sayarinu/AGMS2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[**Install**](#install) · [Features](#features) · [MCP server](#using-the-mcp-server-with-agents) · [How it works](#how-it-works) · [FAQ](#faq)

</div>

---

## Features

### Writing GML
- **Syntax highlighting** for GML, generated from a catalog of GameMaker built-in functions, variables and constants.
- **Completions** for built-ins, your project's assets, and functions defined in open GML files.
- **Hover docs and signature help** for built-in functions, plus hover details for assets (an object's sprite and parent).
- **Go to definition** for functions in open files and for asset names, including asset names in strings.
- **Lightweight diagnostics** for unmatched braces and possibly undefined identifiers.
- **Schema validation** for `.yy` and `.yyp` files.

### Your project in the editor
- A **GMS2 Project Explorer** in the activity bar with Objects, Scripts, Rooms, Sprites and the other asset types. Objects expand into their events; click a script or event to open its code.
- **Create objects and scripts, add events, set an object's sprite or parent, and delete assets** from the explorer or the Command Palette. AGMS2 writes the `.yy` files and updates the `.yyp` for you.
- **Search GML** across the whole project and jump to a result.
- A **room preview** that plots each room's instances, and an **object inspector** that lists an object's events.
- **Build and run** commands that call the GameMaker executable you configure (Windows target only).
- A status bar item that shows the MCP server connection and reconnects with a click.

### For AI agents
- A **local MCP server** with 27 tools to read and edit scripts and events, create and rename assets, place instances in rooms, set macros, search and replace GML, and build the project.
- **Resources** for project metadata, the asset tree, config, macros, extensions, and individual assets, scripts, rooms and object events.
- **Prompts** to audit an object, describe the project, and find usages.
- It **watches the project** and tells clients when assets change.
- **GML skill guides** in [`packages/gml-skills`](packages/gml-skills) that you can point an agent at for idiomatic GameMaker code.

## Install

1. Download `agms2-vsc-extension-<version>.vsix` from the **[Releases page](https://github.com/Sayarinu/AGMS2/releases/latest)**.
2. In VS Code or Cursor, open the Command Palette and run **Extensions: Install from VSIX…**, then pick the file. From a terminal, `code --install-extension agms2-vsc-extension-<version>.vsix` (or `cursor --install-extension …`) does the same.
3. Run **GMS2: Open Project** and choose your `.yyp`. The first time, choose **Enable Bundled Server** to use the MCP server that ships inside the extension.
4. The status bar shows **GMS2: Connected** and the GMS2 Project Explorer fills in.

The extension runs the server with the editor's own runtime, so editing a project needs nothing else installed. Building or running a game needs GameMaker installed and **`gms2.gmsBinaryPath`** set.

| Setting | What it does |
|---|---|
| `gms2.projectPath` | The `.yyp` to open on startup. Set by **GMS2: Open Project**. |
| `gms2.autoStartServer` | Connect to the saved project when the editor starts (default on). |
| `gms2.useBundledServer` | Use the MCP server bundled in the extension. |
| `gms2.serverPath` | Use a different MCP server entry file when the bundled one is off. |
| `gms2.gmsBinaryPath` | Path to the GameMaker executable, for build and run. |
| `gms2.buildTarget` | Build target. Only `Windows` is supported. |
| `gms2.showBuiltinHints` | Show hover docs for built-in functions. |

## Using the MCP server with agents

The server speaks MCP over **stdio**. Any MCP client that can launch a local command can use it, such as Claude Code, Claude Desktop, Cursor or VS Code.

**1. Get the server.** Either use the copy bundled in the installed extension:

| Editor | Path |
|---|---|
| VS Code | `~/.vscode/extensions/agms2.agms2-vsc-extension-<version>/server/index.js` |
| Cursor | `~/.cursor/extensions/agms2.agms2-vsc-extension-<version>/server/index.js` |

(On Windows, `~` is `%USERPROFILE%`.) Or build it from source, which gives you `packages/mcp-server/dist/index.js`:

```sh
git clone https://github.com/Sayarinu/AGMS2.git
cd AGMS2
pnpm install
pnpm -r build
```

**2. Point your client at it.** Most clients take an `mcpServers` entry like this (Claude Desktop's `claude_desktop_config.json`, Cursor's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "gms2": {
      "command": "node",
      "args": ["/absolute/path/to/server/index.js", "--project", "/absolute/path/to/MyGame.yyp"]
    }
  }
}
```

With Claude Code:

```sh
claude mcp add gms2 -- node /absolute/path/to/server/index.js --project /absolute/path/to/MyGame.yyp
```

**Choosing the project.** The server opens the `.yyp` given by `--project` (a `.yyp` file or the folder containing it), then `GMS2_PROJECT_PATH`, then the first `.yyp` in the working directory or one of its parents.

**Building from an agent.** Put a `gms2-mcp.config.json` next to the `.yyp`, or set the matching environment variables:

```json
{
  "gmsBinaryPath": "C:/Program Files/GameMaker/GameMaker.exe",
  "buildTarget": "Windows",
  "watchMode": true
}
```

`GMS2_GMS_BINARY_PATH` and `GMS2_BUILD_TARGET` override the file.

**Legacy SSE clients.** Add `--sse --port 3001` to also serve the older HTTP+SSE transport at `http://127.0.0.1:3001/sse`, on localhost only.

## How it works

```text
 VS Code / Cursor                                     MCP clients (agents)
┌────────────────────────────────────┐               ┌──────────────────────┐
│ AGMS2 extension                    │               │ Claude Code, Cursor, │
│  • GML grammar, completions, hover │               │ Claude Desktop, ...  │
│  • Project Explorer, commands      │               └──────────┬───────────┘
│  • Room preview, object inspector  │                          │ stdio
└─────────────────┬──────────────────┘                          │
                  │ stdio (MCP)                                  │
                  ▼                                              ▼
        ┌──────────────────────────────────────────────────────────────┐
        │ AGMS2 MCP server (packages/mcp-server)                       │
        │  tools · resources · prompts · file watcher                  │
        └──────────────────────────────┬───────────────────────────────┘
                                       │ reads and writes
                                       ▼
                     MyGame.yyp, objects/*/*.yy, *.gml, rooms/*/*.yy
```

The extension starts its own copy of the server for the open project and uses the same tools agents do, so the explorer, commands and agents all go through one implementation. The server edits GameMaker's files directly and keeps the `.yyp` resource list and room order in step. Editor features such as completions and hover docs come from the built-in catalog in [`packages/gml-skills/data/builtins.json`](packages/gml-skills/data/builtins.json).

| Package | What it is |
|---|---|
| [`packages/mcp-server`](packages/mcp-server) | The MCP server. |
| [`packages/vsc-extension`](packages/vsc-extension) | The VS Code extension, which bundles the server. |
| [`packages/gml-skills`](packages/gml-skills) | GML guides for agents and the built-in catalog. |

## FAQ

**Do I need GameMaker installed?**
Only to build or run a game. Reading and editing a project works without it.

**Does it work with any GameMaker version?**
It targets the GameMaker 2.3+ project format (`.yyp` with `.yy` files per asset). New assets are written in that format; recent GameMaker versions upgrade them when they load the project.

**Should GameMaker be open while I edit with AGMS2?**
Save and close the project in GameMaker first, or reload it afterwards. Both tools write the same files.

**Is my project sent anywhere?**
No. The server runs on your machine and only reads and writes files in your project. An AI agent you connect sees whatever its tools return, under that agent's own terms.

**Does it work in VSCodium or other VS Code forks?**
It uses only standard extension APIs, so it should, but AGMS2 is developed against VS Code and Cursor.

## Contributing

Bug reports, ideas and pull requests are welcome. Please open an [issue](https://github.com/Sayarinu/AGMS2/issues) first for larger changes. [AGENTS.md](AGENTS.md) has the setup, commands, architecture notes and branch and commit rules.

```sh
pnpm install
pnpm -r build
pnpm -r typecheck
pnpm test
```

## License

AGMS2 is free and open-source software under the [MIT License](LICENSE).

## Disclaimer

AGMS2 is an independent, unofficial project. It is not affiliated with, endorsed by or sponsored by YoYo Games Ltd. or Opera Norway AS. GameMaker is a trademark of YoYo Games Ltd., part of the Opera group.
