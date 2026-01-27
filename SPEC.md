## Product

A local desktop app (“MaterialDocs Editor”) for non-technical users to edit Markdown pages in an existing MkDocs + Material project using a WYSIWYG UI, while saving valid `.md` files and showing an accurate live preview rendered by `mkdocs serve`.

## Goals

- Non-technical editing experience (Word/Notion-like)
- Output Markdown remains the source-of-truth
- Preview must match the project’s real MkDocs Material rendering (no “approximate” renderer)

## Non-goals (v1)

- Cloud collaboration, multi-user editing
- Git operations (commit/push) (may be future)
- Full support for every MkDocs plugin/extension (start with a defined subset)

## Supported platforms

- macOS, Linux (desktop)

## Primary workflows

1. Open MkDocs project folder (`mkdocs.yml` present)
2. Show page tree (from `docs_dir` and optionally `nav`)
3. Open a `.md` page in WYSIWYG editor
4. Live preview using embedded `mkdocs serve`
5. Save updates back to the original `.md` file
6. Manage assets (insert image copies file into project assets folder and inserts markdown)

## UX layout (must)

- Left: Pages tree
- Center: WYSIWYG editor
- Right: Live preview panel (embedded webview / browser view)

## Material-aware features (MVP)

- Admonitions (callouts)
- Fenced code blocks with language
- Mermaid diagrams
- Basic markdown: headings, bold/italic, lists, links, images, tables

## Compatibility rules

- Preview must be produced by running `mkdocs serve` for the opened project.
- Editor must serialize to Markdown compatible with the project’s `markdown_extensions` in `mkdocs.yml`.
- If the project lacks needed extensions for a feature, the UI must hide/disable that feature and explain why.

## Electron security rules (must)

- The React renderer must not have Node access.
- Filesystem and process execution happen in the main process and are exposed to the renderer only via a narrow, typed Preload Bridge API.

## Notes on “local execution by a code assistant”

To make this maximally executable, include in the repo:

- `/fixtures/sample-mkdocs-project/` (a minimal MkDocs Material project)
- A `RUNBOOK.md` with exact commands for:
  - dev mode
  - packaging
  - running tests
  - starting preview service in isolation
