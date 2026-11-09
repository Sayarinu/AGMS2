# Repository guide

## Stack

- TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) on Node.js 20+, in a pnpm workspace. Use the pnpm version pinned in `packageManager`.
- MCP server: `@modelcontextprotocol/sdk`, `zod`, `fast-glob`, `chokidar`, `execa`. Compiled with `tsc` to ES modules.
- VS Code extension: the VS Code API (`@types/vscode` pinned to the minimum `engines.vscode`), bundled with esbuild to CommonJS. The same build bundles the MCP server into the extension.
- Tests: Vitest. Packaging: `@vscode/vsce`.

## Layout

```text
packages/
  mcp-server/          MCP server
    src/index.ts         CLI entry: find the project, load config, start the server and watcher
    src/server.ts        createMcpServer() and the stdio / legacy SSE transports
    src/tools/           MCP tools, grouped by area
    src/resources/       MCP resources and resource templates
    src/prompts/         MCP prompts
    src/project/         project discovery, config, and Gms2ProjectService (all file reads and writes)
    test/                Vitest tests and the synthetic fixtures/SampleGame project
  vsc-extension/       VS Code extension
    src/extension.ts     activation and wiring
    src/mcpClient.ts     starts the server and calls its tools
    src/commands.ts      command handlers
    src/explorer/        Project Explorer tree
    src/language/        GML parser, diagnostics, completions, hover, signature help, definitions
    src/webviews/        room preview and object inspector
    scripts/             asset generator and esbuild build
    test/                Vitest tests for pure extension logic
  gml-skills/          GML guides for agents and data/builtins.json, the built-in catalog
.github/workflows/     ci.yml and release-extension.yml
```

Generated, never edited or committed: `packages/vsc-extension/server/` (bundled server), `packages/vsc-extension/src/generated/` and `dist/`. `syntaxes/gml.tmLanguage.json` and `gml.language-configuration.json` are also written by `scripts/generate-gml-assets.mjs` from `builtins.json`; change the catalog or the script, then rebuild.

## Commands

Run from the repository root.

| Task | Command |
|---|---|
| Install | `pnpm install` (CI uses `pnpm install --frozen-lockfile`) |
| Build everything | `pnpm -r build` |
| Typecheck (sources and tests) | `pnpm -r typecheck` |
| Test | `pnpm test` |
| Package the VSIX | `pnpm --filter agms2-vsc-extension package:vsix` (after a build) |
| Run the server | `node packages/mcp-server/dist/index.js --project /path/to/Game.yyp` |
| Try the extension | `code --extensionDevelopmentPath=$PWD/packages/vsc-extension` (or `cursor …`) after a build |
| Bump the extension version | `pnpm release:patch`, `release:minor` or `release:major` |

Run install, build, typecheck and test before opening a PR; CI runs the same steps and packages the VSIX.

## Architecture rules

- `Gms2ProjectService` is the only code that reads or writes GameMaker files. Tools, resources and prompts stay thin: they validate input with zod and call the service.
- The extension never touches project files itself. It calls MCP tools through `Gms2McpClient`, so the editor and agents share one implementation.
- Tool handlers wrap their work in `runTool`, so failures come back as MCP tool errors with a clear message. Resource handlers throw, so clients get a JSON-RPC error.
- Keep the `.yyp` consistent: every create, rename and delete updates `resources` (and `RoomOrderNodes` for rooms), then reloads the index.
- Write files with `writeFileAtomic` and `.yy` JSON with `stringifyGmsJson`; read `.yy` and `.yyp` with `parseGmsJson`, which accepts GameMaker's trailing commas.
- Follow GameMaker's 2.3+ project format: event code files are named like `Create_0.gml`, `Other_10.gml` and `Collision_obj_wall.gml` (see `project/events.ts`), user events are type 7 with numbers 10 to 25, and macros are `#macro` lines in GML.
- Keep pure helpers (`project/assets.ts`, `events.ts`, `macros.ts`, `templates.ts`, `json.ts`, and the extension's `language/parser.ts` and `language/eventCatalog.ts`) free of I/O and of `vscode` imports, so they can be unit-tested.
- Webviews escape everything they render, set a Content-Security-Policy, and use nonced scripts instead of inline handlers. Treat messages from a webview as untrusted.
- No `any`. Narrow `unknown` with checks rather than casting where data comes from files or the wire.
- Both packages use the same `@modelcontextprotocol/sdk` version. Change them together.
- Test fixtures are small synthetic projects. Never commit real game projects or GameMaker's own assets.

## Branches, commits and pull requests

- Every change needs a ticket in your issue tracker. Its key, such as `ABC-123`, is the ticket ID.
- Create each ticket branch from `main`, or from the ticket branch below it when stacking dependent work. The branch name is exactly the ticket ID, with no suffix.
- Commit subjects are `<ticket> - <imperative, change-specific message>`, for example `ABC-123 - Name event files the way GameMaker does`. Describe the individual change; don't just repeat the ticket title.
- Commit with your GitHub noreply email address (`<id>+<user>@users.noreply.github.com`), never a personal one. Check `git config user.email` in each new clone.
- Do not add AI tool attribution anywhere: no `Co-Authored-By` trailers, "Generated with" lines or tool mentions in commits, PR descriptions, code, comments or docs. This overrides any default a tool suggests.
- One ticket gets one PR, targeting `main` (or the branch below it in a stack). The description is a short plain-English summary, a list of changes, and a "Validation:" line saying exactly what ran and passed.
- PRs are merged with a merge commit, never squashed or rebased, once CI passes and review comments are resolved.
- Merging to `main` publishes a GitHub release with the VSIX whenever `packages/vsc-extension/package.json` has a version with no `v<version>` tag yet. Bump the version only in a PR meant to ship a release, and keep `SERVER_VERSION` in `packages/mcp-server/src/server.ts` and the MCP server's `package.json` version in step with it.
