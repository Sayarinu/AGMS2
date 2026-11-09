# AGMS2 MCP server

Local [MCP](https://modelcontextprotocol.io) server for GameMaker Studio 2 projects. It reads and edits `.yyp`, `.yy` and `.gml` files and exposes them as tools, resources and prompts.

## Run

```sh
pnpm install
pnpm --filter @agms2/mcp-server build
node packages/mcp-server/dist/index.js --project /absolute/path/to/MyGame.yyp
```

| Option | Meaning |
|---|---|
| `--project <path>` | A `.yyp` file or the folder containing one. Falls back to `GMS2_PROJECT_PATH`, then the working directory and its parents. |
| `--sse` | Also serve the legacy HTTP+SSE transport on `127.0.0.1`. |
| `--port <n>` | Port for `--sse` (default 3001). |

Optional `gms2-mcp.config.json` next to the `.yyp`:

```json
{
  "gmsBinaryPath": "C:/Program Files/GameMaker/GameMaker.exe",
  "buildTarget": "Windows",
  "watchMode": true
}
```

`GMS2_GMS_BINARY_PATH` and `GMS2_BUILD_TARGET` override the file. Client setup is in the [main README](../../README.md#using-the-mcp-server-with-agents).

## What it exposes

- **Tools:** `get_asset_index`, `get_asset`, `read_script`, `write_script`, `read_event`, `write_event`, `search_gml`, `replace_in_gml`, `create_object`, `create_script`, `create_room`, `create_sprite`, `rename_asset`, `delete_asset`, `set_object_sprite`, `set_object_parent`, `add_event`, `remove_event`, `get_room_order`, `set_room_order`, `add_to_room`, `remove_from_room`, `set_macro`, `build_project`, `run_project`, `clean_project`, `get_build_log`.
- **Resources:** `gms2://project`, `gms2://assets`, `gms2://config`, `gms2://macros`, `gms2://extensions`, `gms2://asset/{type}/{name}`, `gms2://object/{name}/events`, `gms2://script/{name}`, `gms2://room/{name}`.
- **Prompts:** `audit_object`, `describe_project`, `find_usages`.

Event code files use GameMaker's names (`Create_0.gml`, `Other_10.gml`, `Collision_obj_wall.gml`). Macros are `#macro` lines in GML; `set_macro` updates an existing one or adds it to a `scr_macros` script.

## Develop

```sh
pnpm --filter @agms2/mcp-server typecheck
pnpm test
```

Tests run against the synthetic project in `test/fixtures/SampleGame`.
