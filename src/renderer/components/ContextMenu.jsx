/**
 * ContextMenu Component - Right-click menu for file/directory operations
 *
 * Provides context-sensitive menu options for:
 * - Creating new files and directories
 * - Renaming files and directories
 * - Deleting files and directories
 * - Moving files (via drag & drop handled separately)
 */

import { useEffect, useRef, useCallback } from "react";

/**
 * @typedef {Object} ContextMenuProps
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {'file'|'directory'|'root'} targetType - Type of target
 * @property {Object|null} targetItem - Target item (file or directory node)
 * @property {Function} onClose - Close menu callback
 * @property {Function} onNewFile - Create new file callback
 * @property {Function} onNewFolder - Create new folder callback
 * @property {Function} onRename - Rename callback
 * @property {Function} onDelete - Delete callback
 */

/**
 * Context menu overlay for file tree operations
 */
export function ContextMenu({ x, y, targetType, targetItem, onClose, onNewFile, onNewFolder, onRename, onDelete }) {
  const menuRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const handleAction = useCallback(
    (action) => {
      action();
      onClose();
    },
    [onClose],
  );

  return (
    <div ref={menuRef} className="context-menu" style={{ left: x, top: y }} role="menu">
      <ul className="context-menu-list">
        {/* New file - available for directories and root */}
        {(targetType === "directory" || targetType === "root") && (
          <li
            className="context-menu-item"
            role="menuitem"
            onClick={() => handleAction(onNewFile)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAction(onNewFile);
            }}
          >
            <span className="context-menu-icon">📄</span>
            <span>New Page</span>
          </li>
        )}

        {/* New folder - available for directories and root */}
        {(targetType === "directory" || targetType === "root") && (
          <li
            className="context-menu-item"
            role="menuitem"
            onClick={() => handleAction(onNewFolder)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAction(onNewFolder);
            }}
          >
            <span className="context-menu-icon">📁</span>
            <span>New Folder</span>
          </li>
        )}

        {/* Separator */}
        {(targetType === "directory" || targetType === "root") && targetItem && (
          <li className="context-menu-separator" role="separator" />
        )}

        {/* Rename - available for files and directories */}
        {targetItem && (
          <li
            className="context-menu-item"
            role="menuitem"
            onClick={() => handleAction(onRename)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAction(onRename);
            }}
          >
            <span className="context-menu-icon">✏️</span>
            <span>Rename</span>
          </li>
        )}

        {/* Delete - available for files and directories */}
        {targetItem && (
          <li
            className="context-menu-item context-menu-item--danger"
            role="menuitem"
            onClick={() => handleAction(onDelete)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAction(onDelete);
            }}
          >
            <span className="context-menu-icon">🗑️</span>
            <span>Delete</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default ContextMenu;
