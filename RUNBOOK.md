# Runbook (Electron)

## Prereqs

- Node 22+
- Python 3.10+ available in PATH (used to run MkDocs)
- macOS: Xcode Command Line Tools (`xcode-select --install`) recommended for building native deps
- MkDocs Material installed: `pip install mkdocs-material`

## Install

```bash
npm install
```

## Dev (Electron)

```bash
npm start
```

The app will open with DevTools. Use Ctrl+Shift+I to toggle DevTools.

## Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Build / Package (macOS + Linux)

```bash
npm run make
```

> Notes:
>
> - Packaging outputs are written under `out/` (Forge default).
> - For Linux packaging you typically run the build on Linux; for macOS builds run on macOS.

## Fixture project

A sample MkDocs project is included at `fixtures/sample-mkdocs-project/` for testing:

```bash
# Test the fixture project with MkDocs directly
cd fixtures/sample-mkdocs-project
mkdocs serve
# Preview at http://127.0.0.1:8000
```

## Architecture

```
src/
├── main.js                    # Main process entry + IPC handlers
├── preload.js                 # Preload bridge (contextBridge API)
├── renderer.js                # Renderer UI logic
├── index.css                  # Styles
└── main/
    └── services/
        ├── ProjectLoader.js       # MkDocs project detection/parsing
        ├── FileSystemService.js   # File tree and read/write ops
        └── MkDocsPreviewService.js # Preview server management

test/
├── ProjectLoader.test.js
├── FileSystemService.test.js
└── MkDocsPreviewService.test.js
```

## IPC Channels (Preload API)

The renderer accesses main process via `window.api`:

- `window.api.project.open()` - Open folder dialog
- `window.api.project.load(path)` - Load project from path
- `window.api.project.getTree()` - Get file tree
- `window.api.project.getCurrent()` - Get current project info
- `window.api.project.close()` - Close project

- `window.api.page.read(path)` - Read markdown file
- `window.api.page.write(path, content)` - Write markdown file
- `window.api.page.exists(path)` - Check if file exists

- `window.api.preview.start()` - Start mkdocs serve
- `window.api.preview.stop()` - Stop preview server
- `window.api.preview.restart()` - Restart preview server
- `window.api.preview.getStatus()` - Get current status
- `window.api.preview.getLogs()` - Get collected logs
- `window.api.preview.onStatus(callback)` - Subscribe to status changes
- `window.api.preview.onLog(callback)` - Subscribe to log messages

## Troubleshooting

### Preview server fails to start

1. Ensure MkDocs is installed: `pip install mkdocs-material`
2. Verify mkdocs is in PATH: `which mkdocs`
3. Check the preview logs via DevTools console

### Tests fail

1. Ensure dependencies installed: `npm install`
2. Check fixture exists: `ls fixtures/sample-mkdocs-project/mkdocs.yml`
