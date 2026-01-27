## Automated tests

- Serializer round-trip:
  - Input markdown with admonition/code/mermaid
  - Import → edit noop → export must match normalized output rules

- RawBlock preservation:
  - Markdown containing unknown extension syntax must remain unchanged

- Electron security regression tests (smoke)
  - Renderer cannot access `require` / Node globals
  - Preload exposes only expected API surface

## Manual QA

- Open sample MkDocs Material project → preview loads
- Edit headings/bold/lists → save → preview updates
- Insert admonition → save → preview renders correctly
- Insert mermaid → save → preview renders correctly
- Insert code block language → preview highlights (if configured)
- Insert image → file copied into assets and link correct
- Close project/app → mkdocs serve process terminates

---
