# AGMS2 for VS Code

Edit GameMaker Studio 2 projects in VS Code, Cursor and other VS Code-compatible editors.

## Getting started

1. Run **GMS2: Open Project** and choose your `.yyp`.
2. The first time, choose **Enable Bundled Server** to use the MCP server that ships inside this extension.
3. The status bar shows **GMS2: Connected** and the **GMS2 Project Explorer** in the activity bar fills in.

## Features

- **GML language support:** syntax highlighting, completions for built-ins, assets and functions in open files, hover docs, signature help for built-in functions, go to definition, and warnings for unmatched braces and possibly undefined identifiers.
- **Project Explorer:** Objects, Scripts, Rooms, Sprites and other asset types; objects expand into their events.
- **Commands:** open project, refresh explorer, create object, create script, add event, set object sprite or parent, delete asset, search GML, build and run project, reconnect server.
- **Room preview** and **object inspector** panels.
- **Schema validation** for `.yy` and `.yyp` files.

## Settings

| Setting | What it does |
|---|---|
| `gms2.projectPath` | The `.yyp` to open on startup. Set by **GMS2: Open Project**. |
| `gms2.autoStartServer` | Connect to the saved project when the editor starts. |
| `gms2.useBundledServer` | Use the MCP server bundled in the extension. |
| `gms2.serverPath` | Use a different MCP server entry file when the bundled one is off. |
| `gms2.gmsBinaryPath` | Path to the GameMaker executable, needed for build and run. |
| `gms2.buildTarget` | Build target. Only `Windows` is supported. |
| `gms2.showBuiltinHints` | Show hover docs for built-in functions. |

The bundled server is also usable by AI agents; see the [AGMS2 README](https://github.com/Sayarinu/AGMS2#using-the-mcp-server-with-agents).

AGMS2 is not affiliated with or endorsed by YoYo Games or Opera. GameMaker is a trademark of YoYo Games Ltd.
