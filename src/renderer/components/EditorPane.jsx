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

  // Insert handlers - use Milkdown commands via ref
  const handleInsertAdmonition = useCallback((selection) => {
    const type = selection?.type || "note";
    if (editorRef.current?.isReady()) {
      editorRef.current.insertAdmonition({ type, title: "" });
    }
  }, []);

  const handleInsertMermaid = useCallback((selection) => {
    const templateKey = selection?.template || "flowchart";
    if (editorRef.current?.isReady()) {
      editorRef.current.insertMermaid({ template: templateKey });
    }
  }, []);

  const handleInsertCodeBlock = useCallback((selection) => {
    const language = selection?.language || "";
    if (editorRef.current?.isReady()) {
      editorRef.current.insertCodeBlock({ language });
    }
  }, []);

  const handleInsertImage = useCallback(async () => {
    if (!filePath || !editorRef.current?.isReady()) return;

    try {
      // Open file dialog and copy image to assets
      const result = await window.api.asset.selectAndCopy(filePath);
      if (result) {
        // Insert image with the relative path
        editorRef.current.insertImage({
          src: result.markdownPath,
          alt: result.filename.replace(/\.[^.]+$/, ""), // Use filename without extension as alt
          title: "",
        });
      }
    } catch (err) {
      console.error("Failed to insert image:", err);
      alert(`Failed to insert image: ${err.message}`);
    }
  }, [filePath]);

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
          onInsertImage={handleInsertImage}
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
