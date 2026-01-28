/**
 * RawBlockEditor Component
 *
 * Modal editor for editing raw/unsupported markdown blocks.
 * Used when the WYSIWYG editor cannot render certain content.
 */

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * @typedef {Object} RawBlockEditorProps
 * @property {boolean} isOpen - Whether the editor is open
 * @property {string} content - The raw block content
 * @property {string} [blockType='raw'] - Type of the block being edited
 * @property {Function} onSave - Called with new content when saved
 * @property {Function} onCancel - Called when editing is cancelled
 */

export function RawBlockEditor({ isOpen, content, blockType = "raw", onSave, onCancel }) {
  const [value, setValue] = useState(content || "");
  const [hasChanges, setHasChanges] = useState(false);
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);

  // Reset value when content changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(content || "");
      setHasChanges(false);
    }
  }, [isOpen, content]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCancel();
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, value, hasChanges]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        handleCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, hasChanges]);

  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setValue(newValue);
      setHasChanges(newValue !== content);
    },
    [content],
  );

  const handleSave = useCallback(() => {
    onSave(value);
  }, [value, onSave]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmed) return;
    }
    onCancel();
  }, [hasChanges, onCancel]);

  if (!isOpen) return null;

  const lineCount = value ? value.split("\n").length : 0;

  return (
    <div className="dialog-overlay rawblock-editor-overlay">
      <div
        ref={dialogRef}
        className="dialog rawblock-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rawblock-dialog-title"
      >
        <header className="rawblock-editor-header">
          <div className="rawblock-editor-title-row">
            <h3 id="rawblock-dialog-title" className="dialog-title">
              ✏️ Edit Raw Block
            </h3>
            <span className="rawblock-editor-type">{blockType}</span>
            {hasChanges && <span className="rawblock-editor-modified">● Modified</span>}
          </div>
          <div className="rawblock-editor-stats">
            <span>{lineCount} lines</span>
          </div>
        </header>

        <div className="rawblock-editor-content">
          <textarea
            ref={textareaRef}
            className="rawblock-editor-textarea"
            value={value}
            onChange={handleChange}
            spellCheck={false}
            placeholder="Enter raw markdown content..."
            aria-label="Raw block content"
          />
        </div>

        <footer className="rawblock-editor-footer">
          <div className="rawblock-editor-hint">
            <span className="hint-icon">💡</span>
            <span>This content will be preserved exactly as written. Press Ctrl+S to save.</span>
          </div>
          <div className="dialog-actions">
            <button type="button" className="dialog-button dialog-button--secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="dialog-button dialog-button--primary"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default RawBlockEditor;
