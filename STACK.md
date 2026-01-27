# Stack Decisions (v0.2)

## Desktop shell

- Electron + React (TypeScript)
- Tooling: Electron Forge + Vite (renderer bundling)

## Editor

- Milkdown (ProseMirror-based WYSIWYG markdown editor)

## Preview

- Spawn `mkdocs serve` for the opened project and embed the localhost URL in the app UI.
- Preview is the source of truth. Do **not** use a JS markdown renderer for preview.

## Security model (Electron)

- `contextIsolation: true`
- `nodeIntegration: false`
- All filesystem/process access goes through a typed Preload Bridge (`contextBridge`) and IPC.

## Markdown fidelity rules

- Markdown files are the source of truth.
- The editor must be able to:
  1. Import Markdown → WYSIWYG document model
  2. Export WYSIWYG → Markdown deterministically
  3. Preserve unknown/unsupported syntax losslessly via RawBlock nodes

## OS support

- macOS / Linux (Windows can be added later without architectural changes)
