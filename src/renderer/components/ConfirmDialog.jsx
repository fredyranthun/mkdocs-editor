/**
 * ConfirmDialog Component - Modal dialog for confirmation
 *
 * Used for confirming destructive operations like delete
 */

import { useEffect, useRef } from "react";

/**
 * @typedef {Object} ConfirmDialogProps
 * @property {boolean} isOpen - Whether dialog is open
 * @property {string} title - Dialog title
 * @property {string} message - Confirmation message
 * @property {string} [confirmText='Delete'] - Confirm button text
 * @property {boolean} [danger=false] - Whether this is a dangerous action
 * @property {Function} onConfirm - Called on confirm
 * @property {Function} onCancel - Called on cancel
 */

/**
 * Modal dialog for confirmation
 */
export function ConfirmDialog({ isOpen, title, message, confirmText = "Delete", danger = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h3 id="confirm-dialog-title" className="dialog-title">
          {title}
        </h3>

        <p id="confirm-dialog-message" className="dialog-message">
          {message}
        </p>

        <div className="dialog-actions">
          <button type="button" className="dialog-button dialog-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`dialog-button ${danger ? "dialog-button--danger" : "dialog-button--primary"}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
