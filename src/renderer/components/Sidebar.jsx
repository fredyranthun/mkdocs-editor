/**
 * Sidebar Component - File Tree Navigator
 *
 * Displays the project docs folder as a file tree.
 * Supports expanding/collapsing folders and selecting files.
 */

import { useState, useCallback, memo } from "react";

/**
 * Individual file tree item component
 */
const TreeItem = memo(function TreeItem({ item, depth, currentFile, onFileSelect }) {
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

  const paddingLeft = 12 + depth * 16;

  return (
    <li className="tree-item">
      <div
        className={`tree-node ${isDirectory ? "folder" : "file"} ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft }}
        onClick={handleClick}
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
 * Sidebar component with file tree and controls
 */
export function Sidebar({ fileTree, currentFile, onFileSelect, onRefresh }) {
  return (
    <aside id="sidebar" className="sidebar">
      <header className="sidebar-header">
        <h2>Project Files</h2>
        <button className="icon-button" onClick={onRefresh} title="Refresh file tree">
          🔄
        </button>
      </header>
      <nav className="file-tree" role="tree">
        {fileTree.length === 0 ? (
          <p className="no-files">No project open</p>
        ) : (
          <ul className="tree-root">
            {fileTree.map((item) => (
              <TreeItem key={item.path} item={item} depth={0} currentFile={currentFile} onFileSelect={onFileSelect} />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
