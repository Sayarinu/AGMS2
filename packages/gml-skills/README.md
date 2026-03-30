# GML Skills Library for AI Agents

This package is a documentation and data bundle for AI agents that need to write high-quality, idiomatic GameMaker Language code for **GameMaker Studio 2 2024.x LTS** projects.

## Structure

- `SKILL.md` is the entry point. Agents should read it first to choose the smallest useful set of sub-skills.
- `skills/` contains topic-specific guidance written in a consistent Markdown shape.
- `data/builtins.json` is the machine-readable built-in reference for prompt enrichment and tooling.
- `data/builtins-index.md` is a compact alphabetical index for quick scanning.

## How agents should use this package

1. Read `SKILL.md`.
2. Load only the topic files that match the task.
3. Use `data/builtins.json` when exact signatures, categories, or names are needed.
4. Prefer patterns in `skills/patterns.md` and warnings in `skills/gotchas.md` when generating new gameplay code.

## Notes

- All content targets **GMS2 2024.x LTS** terminology and behavior.
- Version notes are included inline only where a built-in was added, changed, or deprecated in a meaningful way.
- `data/builtins-index.md` is a scan-friendly companion to `data/builtins.json` and should stay aligned with it.
