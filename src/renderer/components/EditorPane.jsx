/**
 * EditorPane Component
 *
 * Main editor area that uses MilkdownEditor for WYSIWYG markdown editing.
 * Includes extension-aware toolbar for inserting Material blocks.
 * Shows placeholder when no file is open.
 */

import { useCallback, useRef } from "react";
import { MilkdownEditor } from "./MilkdownEditor";
import { EditorToolbar } from "./EditorToolbar";

export function EditorPane({ filePath, content, isModified, onChange, projectConfig, features, guidance, hasProject }) {
  // Reference to editor for command execution
  const editorRef = useRef(null);

  // Insert handlers - these append content at cursor or end
  const handleInsertAdmonition = useCallback(
    (selection) => {
      const type = selection?.type || "note";
      const admonitionMarkdown = `\n!!! ${type} ""\n    \n\n`;
      // For now, append to content (proper cursor insertion requires editor API)
      onChange(content + admonitionMarkdown);
    },
    [content, onChange],
  );

  const handleInsertMermaid = useCallback(
    (selection) => {
      const template = selection?.template || "flowchart";
      const templates = {
        flowchart: "graph TD\n    A[Start] --> B[End]",
        sequence: "sequenceDiagram\n    Alice->>Bob: Hello",
        classDiagram: "classDiagram\n    class Animal",
        stateDiagram: "stateDiagram-v2\n    [*] --> State1",
        erDiagram: "erDiagram\n    CUSTOMER ||--o{ ORDER : places",
        gantt: "gantt\n    title Schedule\n    Task 1 :a1, 2024-01-01, 30d",
        pie: 'pie title Distribution\n    "A" : 40\n    "B" : 60',
        mindmap: "mindmap\n  root((Topic))\n    Branch 1\n    Branch 2",
      };
      const mermaidMarkdown = `\n\`\`\`mermaid\n${templates[template] || templates.flowchart}\n\`\`\`\n\n`;
      onChange(content + mermaidMarkdown);
    },
    [content, onChange],
  );

  const handleInsertCodeBlock = useCallback(
    (selection) => {
      const language = selection?.language || "";
      const codeMarkdown = `\n\`\`\`${language}\n\n\`\`\`\n\n`;
      onChange(content + codeMarkdown);
    },
    [content, onChange],
  );

  // Show placeholder if no file selected
  if (!filePath) {
    return (
      <section id="editor-pane" className="editor-pane">
        <div className="editor-placeholder">
          <p>Select a file from the sidebar to start editing</p>
          <p className="hint">or press Ctrl+O to open a project</p>
        </div>
      </section>
    );
  }

  // Only show editor for markdown files
  const isMarkdown = filePath.endsWith(".md");

  return (
    <section id="editor-pane" className="editor-pane">
      <header className="editor-header">
        <span className="editor-filename">
          {filePath.split("/").pop()}
          {isModified && <span className="modified-indicator">●</span>}
        </span>
        <span className="editor-path">{filePath}</span>
      </header>

      {isMarkdown && (
        <EditorToolbar
          features={features}
          guidance={guidance}
          hasProject={hasProject}
          onInsertAdmonition={handleInsertAdmonition}
          onInsertMermaid={handleInsertMermaid}
          onInsertCodeBlock={handleInsertCodeBlock}
          disabled={!filePath}
        />
      )}

      <div className="editor-content">
        {isMarkdown ? (
          <MilkdownEditor ref={editorRef} content={content} onChange={onChange} editorKey={filePath} />
        ) : (
          <textarea
            className="code-editor"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
    </section>
  );
}

export default EditorPane;
