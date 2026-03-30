# GMS2 MCP Server

Local MCP server for GameMaker Studio 2 projects.

## Features

- Reads `.yyp`, `.yy`, and `.gml` project data
- Exposes MCP resources, tools, and prompts for GMS2 projects
- Supports stdio by default and optional SSE
- Watches project files and refreshes cached metadata

## Configuration

Optional `gms2-mcp.config.json` in the project root:

```json
{
  "gmsBinaryPath": "C:/Program Files/GameMaker/GameMaker.exe",
  "buildTarget": "Windows",
  "runtimePath": null,
  "watchMode": true,
  "logLevel": "info"
}
```

## Running

```bash
pnpm --filter @agms2/mcp-server build
node packages/mcp-server/dist/index.js --project "/path/to/project.yyp"
```

With SSE enabled:

```bash
node packages/mcp-server/dist/index.js --project "/path/to/project.yyp" --sse --port 3001
```

## Claude Desktop

Add a server entry pointing at the built CLI:

```json
{
  "mcpServers": {
    "gms2": {
      "command": "node",
      "args": [
        "/absolute/path/to/packages/mcp-server/dist/index.js",
        "--project",
        "/absolute/path/to/MyGame.yyp"
      ]
    }
  }
}
```

## Cursor

Configure the built server as a local MCP process and pass `--project /absolute/path/to/MyGame.yyp`.

## Development

```bash
pnpm install
pnpm --filter @agms2/mcp-server build
```
