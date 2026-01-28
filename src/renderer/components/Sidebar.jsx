/**
 * Sidebar Component - File Tree Navigator with CRUD Operations
 *
 * Displays the project docs folder as a file tree.
 * Supports:
 * - Expanding/collapsing folders
 * - Selecting files
 * - Context menu for new/rename/delete operations
 * - Drag and drop for moving files (future)
 */

import { useState, useCallback, memo } from "react";
import { ContextMenu } from "./ContextMenu";
import { InputDialog } from "./InputDialog";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Individual file tree item component
 */
const TreeItem = memo(function TreeItem({ item, depth, currentFile, onFileSelect, onContextMenu }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isDirectory = item.type === "directory";
  const isSelected = currentFile === item.path;

  const handleClick = useCallback(() => {
    if (isDirectory) {
      setIsExpanded((prev) => !prev);
    } else {
      onFileSelect(item.path);
    }
  }, [isDirectory, item.path, onFileSelect]);

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, item);
    },
    [item, onContextMenu],
  );

  const paddingLeft = 12 + depth * 16;

  return (
    <li className="tree-item">
      <div
        className={`tree-node ${isDirectory ? "folder" : "file"} ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        role="treeitem"
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <span className="tree-icon">{isDirectory ? (isExpanded ? "📂" : "📁") : getFileIcon(item.name)}</span>
        <span className="tree-label">{item.name}</span>
      </div>
      {isDirectory && isExpanded && item.children && (
        <ul className="tree-children" role="group">
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

/**
 * Get appropriate icon for file type
 */
function getFileIcon(filename) {
  if (filename.endsWith(".md")) return "📝";
  if (filename.endsWith(".yml") || filename.endsWith(".yaml")) return "⚙️";
  if (filename.endsWith(".css")) return "🎨";
  if (filename.endsWith(".js")) return "📜";
  return "📄";
}

/**
 * Validates file/folder names
 */
function validateName(name, isFile = true) {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return "Name contains invalid characters";
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  const baseName = isFile ? name.replace(/\.md$/, "") : name;
  if (reservedNames.test(baseName)) {
    return "This name is reserved by the system";
  }

  // Check length
  if (name.length > 255) {
    return "Name is too long (max 255 characters)";
  }

  // Check for leading/trailing spaces or dots
  if (name !== name.trim() || name.endsWith(".")) {
    return "Name cannot start or end with spaces or dots";
  }

  return null;
}

/**
 * Sidebar component with file tree and CRUD controls
 */
export function Sidebar({
  fileTree,
  currentFile,
  onFileSelect,
  onRefresh,
  onFileCreated,
  onFileDeleted,
  onFileRenamed,
}) {
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Dialog states
  const [newFileDialog, setNewFileDialog] = useState({ open: false, parentPath: "" });
  const [newFolderDialog, setNewFolderDialog] = useState({ open: false, parentPath: "" });
  const [renameDialog, setRenameDialog] = useState({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Handle context menu open
  const handleContextMenu = useCallback((e, item) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetType: item?.type || "root",
      targetItem: item,
    });
  }, []);

  // Handle context menu on root (empty area)
  const handleRootContextMenu = useCallback((e) => {
    e.preventDefault();
    if (e.target.classList.contains("file-tree") || e.target.classList.contains("tree-root")) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetType: "root",
        targetItem: null,
      });
    }
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // New file action
  const handleNewFile = useCallback(() => {
    const parentPath = contextMenu?.targetType === "directory" ? contextMenu.targetItem.path : "";
    setNewFileDialog({ open: true, parentPath });
  }, [contextMenu]);

  // New folder action
  const handleNewFolder = useCallback(() => {
    const parentPath = contextMenu?.targetType === "directory" ? contextMenu.targetItem.path : "";
    setNewFolderDialog({ open: true, parentPath });
  }, [contextMenu]);

  // Rename action
  const handleRename = useCallback(() => {
    if (contextMenu?.targetItem) {
      setRenameDialog({ open: true, item: contextMenu.targetItem });
    }
  }, [contextMenu]);

  // Delete action
  const handleDelete = useCallback(() => {
    if (contextMenu?.targetItem) {
      setDeleteDialog({ open: true, item: contextMenu.targetItem });
    }
  }, [contextMenu]);

  // Submit new file
  const submitNewFile = useCallback(
    async (name) => {
      try {
        // Ensure .md extension
        const fileName = name.endsWith(".md") ? name : `${name}.md`;
        const filePath = newFileDialog.parentPath ? `${newFileDialog.parentPath}/${fileName}` : fileName;

        // Create initial content with title
        const title = fileName.replace(/\.md$/, "").replace(/-/g, " ");
        const initialContent = `# ${title}\n\n`;

        await window.api.page.create(filePath, initialContent);
        setNewFileDialog({ open: false, parentPath: "" });
        onRefresh();
        onFileCreated?.(filePath);
        // Open the newly created file
        onFileSelect(filePath);
      } catch (err) {
        console.error("Failed to create file:", err);
        alert(`Failed to create file: ${err.message}`);
      }
    },
    [newFileDialog.parentPath, onRefresh, onFileCreated, onFileSelect],
  );

  // Submit new folder
  const submitNewFolder = useCallback(
    async (name) => {
      try {
        const folderPath = newFolderDialog.parentPath ? `${newFolderDialog.parentPath}/${name}` : name;

        await window.api.directory.create(folderPath);
        setNewFolderDialog({ open: false, parentPath: "" });
        onRefresh();
      } catch (err) {
        console.error("Failed to create folder:", err);
        alert(`Failed to create folder: ${err.message}`);
      }
    },
    [newFolderDialog.parentPath, onRefresh],
  );

  // Submit rename
  const submitRename = useCallback(
    async (newName) => {
      try {
        const item = renameDialog.item;
        const parentDir = item.path.includes("/") ? item.path.substring(0, item.path.lastIndexOf("/")) : "";

        let newPath;
        if (item.type === "file") {
          // Ensure .md extension
          const fileName = newName.endsWith(".md") ? newName : `${newName}.md`;
          newPath = parentDir ? `${parentDir}/${fileName}` : fileName;
          await window.api.page.rename(item.path, newPath);
        } else {
          newPath = parentDir ? `${parentDir}/${newName}` : newName;
          await window.api.directory.rename(item.path, newPath);
        }

        setRenameDialog({ open: false, item: null });
        onRefresh();
        onFileRenamed?.(item.path, newPath);

        // If renamed file was current, update selection
        if (currentFile === item.path && item.type === "file") {
          onFileSelect(newPath);
        }
      } catch (err) {
        console.error("Failed to rename:", err);
        alert(`Failed to rename: ${err.message}`);
      }
    },
    [renameDialog.item, currentFile, onRefresh, onFileRenamed, onFileSelect],
  );

  // Submit delete
  const submitDelete = useCallback(async () => {
    try {
      const item = deleteDialog.item;

      if (item.type === "file") {
        await window.api.page.delete(item.path);
      } else {
        await window.api.directory.delete(item.path);
      }

      setDeleteDialog({ open: false, item: null });
      onRefresh();
      onFileDeleted?.(item.path);

      // If deleted file was current, clear selection
      if (currentFile === item.path) {
        onFileSelect(null);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      alert(`Failed to delete: ${err.message}`);
    }
  }, [deleteDialog.item, currentFile, onRefresh, onFileDeleted, onFileSelect]);

  return (
    <aside id="sidebar" className="sidebar">
      <header className="sidebar-header">
        <h2>Project Files</h2>
        <div className="sidebar-actions">
          <button
            className="icon-button"
            onClick={() => handleContextMenu({ clientX: 50, clientY: 80, preventDefault: () => {} }, null)}
            title="New page or folder"
          >
            ➕
          </button>
          <button className="icon-button" onClick={onRefresh} title="Refresh file tree">
            🔄
          </button>
        </div>
      </header>

      <nav className="file-tree" role="tree" onContextMenu={handleRootContextMenu}>
        {fileTree.length === 0 ? (
          <p className="no-files">No project open</p>
        ) : (
          <ul className="tree-root">
            {fileTree.map((item) => (
              <TreeItem
                key={item.path}
                item={item}
                depth={0}
                currentFile={currentFile}
                onFileSelect={onFileSelect}
                onContextMenu={handleContextMenu}
              />
            ))}
          </ul>
        )}
      </nav>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetType={contextMenu.targetType}
          targetItem={contextMenu.targetItem}
          onClose={closeContextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}

      {/* New File Dialog */}
      <InputDialog
        isOpen={newFileDialog.open}
        title="New Page"
        label="Page name"
        placeholder="my-new-page.md"
        submitText="Create"
        onSubmit={submitNewFile}
        onCancel={() => setNewFileDialog({ open: false, parentPath: "" })}
        validate={(name) => validateName(name, true)}
      />

      {/* New Folder Dialog */}
      <InputDialog
        isOpen={newFolderDialog.open}
        title="New Folder"
        label="Folder name"
        placeholder="my-folder"
        submitText="Create"
        onSubmit={submitNewFolder}
        onCancel={() => setNewFolderDialog({ open: false, parentPath: "" })}
        validate={(name) => validateName(name, false)}
      />

      {/* Rename Dialog */}
      <InputDialog
        isOpen={renameDialog.open}
        title={`Rename ${renameDialog.item?.type === "directory" ? "Folder" : "Page"}`}
        label="New name"
        initialValue={renameDialog.item?.name || ""}
        submitText="Rename"
        onSubmit={submitRename}
        onCancel={() => setRenameDialog({ open: false, item: null })}
        validate={(name) => validateName(name, renameDialog.item?.type === "file")}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        title={`Delete ${deleteDialog.item?.type === "directory" ? "Folder" : "Page"}`}
        message={`Are you sure you want to delete "${deleteDialog.item?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger={true}
        onConfirm={submitDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
      />
    </aside>
  );
}

export default Sidebar;
