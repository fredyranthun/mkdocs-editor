## Phase 1 — Skeleton (P0) ✅ COMPLETE

- [x] T1 Create Electron shell + basic layout (tree/editor/preview panes)
  - Electron Forge + Vite template
  - Main + Preload + Renderer separation
- [x] T2 Implement project open + mkdocs.yml detection (main process service)
- [x] T3 Implement filesystem page listing + open file (main) + expose via preload API
- [x] T4 Implement preview service spawning mkdocs serve (main) + surface URL/status/logs to renderer
- [x] T5 Implement plain-text markdown editor temporarily to validate workflow end-to-end

## Phase 2 — Milkdown editor MVP (P0)

- T6 Integrate Milkdown in React UI
  - Mount editor component
  - Provide controlled load/save hooks through preload API

- T7 Implement Markdown import/export pipeline
  - Load file → editor state
  - Export editor state → markdown
  - Apply deterministic formatting rules

- T8 Implement "RawBlock" preservation layer
  - Detect unsupported patterns during import
  - Represent them as RawBlocks in editor
  - Export them unchanged

- [x] T9 Implement Material blocks (Milkdown custom nodes/plugins)
  - [x] T9.1 Admonition block (!!!)
    - UI: Callout insert with type + optional title
    - Serializer: correct indentation and syntax

  - [x] T9.2 Mermaid block
    - UI: Insert Mermaid, text editor area
    - Serializer: ```mermaid fenced block

  - [x] T9.3 Code block
    - UI: Insert code, language selector
    - Serializer: ```lang fenced block

- [x] T10 Add extension-aware toolbar
  - Parse mkdocs.yml markdown_extensions
  - Enable/disable Callout/Mermaid/Tabs (tabs can be P1)
  - Show “how to enable” guidance

## Phase 3 — Preview/runtime integration (P0)

- T11 Implement MkDocs runtime strategy (main process)
  - Strategy A (P0): Use system Python + create project-local venv on first run
  - Commands:
    - python -m venv .materialdocs-venv
    - pip install mkdocs-material
  - Detect existing requirements.txt/poetry and prefer project env if available

- T12 Spawn mkdocs serve (main)
  - Find free port
  - Start mkdocs serve in project root
  - Capture stdout/stderr logs
  - Stop process on project close/app exit

- T13 Embed preview in app (renderer + main coordination)
  - Panel loads http://127.0.0.1:PORT
  - Health-check and retry if startup is slow
  - MVP: allow `<webview>` restricted to localhost **or** implement `BrowserView`

## Phase 4 — UX polish (P1)

- T14 Page CRUD: new/rename/delete/move
- T15 Asset manager: insert image → copy to docs/assets → insert relative link
- T16 Advanced menu: "View Markdown" read-only + "Edit RawBlock"
- T17 Security hardening
  - Validate/whitelist IPC channels
  - Block external navigation in preview
  - Add CSP for renderer
