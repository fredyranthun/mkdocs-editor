/**
 * MarkdownSourceModal Component
 *
 * Displays the raw markdown source in a read-only modal.
 * Allows users to view and copy the underlying markdown.
 */

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * @typedef {Object} MarkdownSourceModalProps
 * @property {boolean} isOpen - Whether the modal is open
 * @property {string} content - The markdown content to display
 * @property {string} filePath - Current file path for display
 * @property {Function} onClose - Called when modal should close
 */

export function MarkdownSourceModal({ isOpen, content, filePath, onClose }) {
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, 0);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  // Reset copied state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fileName = filePath ? filePath.split("/").pop() : "Untitled";
  const lineCount = content ? content.split("\n").length : 0;
  const charCount = content ? content.length : 0;

  return (
    <div className="dialog-overlay markdown-source-overlay">
      <div
        ref={dialogRef}
        className="dialog markdown-source-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-dialog-title"
      >
        <header className="markdown-source-header">
          <div className="markdown-source-title-row">
            <h3 id="source-dialog-title" className="dialog-title">
              📄 View Markdown Source
            </h3>
            <span className="markdown-source-filename">{fileName}</span>
          </div>
          <div className="markdown-source-stats">
            <span>{lineCount} lines</span>
            <span>•</span>
            <span>{charCount} characters</span>
          </div>
        </header>

        <div className="markdown-source-content">
          <textarea
            ref={textareaRef}
            className="markdown-source-textarea"
            value={content || ""}
            readOnly
            spellCheck={false}
            aria-label="Markdown source code"
          />
        </div>

        <footer className="markdown-source-footer">
          <div className="markdown-source-hint">
            <span className="hint-icon">💡</span>
            <span>This is the raw markdown source. Changes made here will not be saved.</span>
          </div>
          <div className="dialog-actions">
            <button type="button" className="dialog-button dialog-button--secondary" onClick={handleCopy}>
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button type="button" className="dialog-button dialog-button--primary" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default MarkdownSourceModal;
