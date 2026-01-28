/**
 * InputDialog Component - Modal dialog for text input
 *
 * Used for renaming files/folders and creating new files/folders
 */

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * @typedef {Object} InputDialogProps
 * @property {boolean} isOpen - Whether dialog is open
 * @property {string} title - Dialog title
 * @property {string} label - Input label
 * @property {string} [initialValue=''] - Initial input value
 * @property {string} [placeholder=''] - Input placeholder
 * @property {string} [submitText='OK'] - Submit button text
 * @property {Function} onSubmit - Called with input value on submit
 * @property {Function} onCancel - Called on cancel
 * @property {Function} [validate] - Optional validation function, returns error string or null
 */

/**
 * Modal dialog for text input operations
 */
export function InputDialog({
  isOpen,
  title,
  label,
  initialValue = "",
  placeholder = "",
  submitText = "OK",
  onSubmit,
  onCancel,
  validate,
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  // Reset value when dialog opens/initialValue changes
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
    }
  }, [isOpen, initialValue]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        setError("Name cannot be empty");
        return;
      }

      if (validate) {
        const validationError = validate(trimmedValue);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      onSubmit(trimmedValue);
    },
    [value, validate, onSubmit],
  );

  const handleChange = useCallback((e) => {
    setValue(e.target.value);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title" className="dialog-title">
          {title}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="dialog-field">
            <label htmlFor="dialog-input" className="dialog-label">
              {label}
            </label>
            <input
              ref={inputRef}
              id="dialog-input"
              type="text"
              className={`dialog-input ${error ? "dialog-input--error" : ""}`}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            {error && <span className="dialog-error">{error}</span>}
          </div>

          <div className="dialog-actions">
            <button type="button" className="dialog-button dialog-button--secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="dialog-button dialog-button--primary">
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InputDialog;
