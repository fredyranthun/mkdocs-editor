/**
 * FileSystemService - Main process service for filesystem operations
 *
 * Responsibilities:
 * - List markdown files in docs directory
 * - Read/write file contents
 * - Build file tree structure
 * - Handle file watching (future)
 */

import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {Object} FileNode
 * @property {string} name - File or directory name
 * @property {string} path - Relative path from docs root
 * @property {string} absolutePath - Absolute path
 * @property {'file'|'directory'} type - Node type
 * @property {FileNode[]} [children] - Child nodes for directories
 */

/**
 * @typedef {Object} FileContent
 * @property {string} path - Relative path from docs root
 * @property {string} content - File content
 * @property {number} mtime - Last modified timestamp
 */

/**
 * Builds a tree structure of markdown files in a directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} [relativePath=''] - Current relative path (for recursion)
 * @returns {Promise<FileNode[]>}
 */
export async function buildFileTree(docsRoot, relativePath = "") {
  const currentPath = path.join(docsRoot, relativePath);
  const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

  const nodes = [];

  // Sort: directories first, then files, both alphabetically
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    // Skip hidden files and common non-doc directories
    if (entry.name.startsWith(".") || entry.name === "__pycache__") {
      continue;
    }

    const entryRelativePath = path.join(relativePath, entry.name);
    const entryAbsolutePath = path.join(docsRoot, entryRelativePath);

    if (entry.isDirectory()) {
      const children = await buildFileTree(docsRoot, entryRelativePath);
      // Only include directories that have markdown files (directly or nested)
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: entryRelativePath,
          absolutePath: entryAbsolutePath,
          type: "directory",
          children,
        });
      }
    } else if (entry.name.endsWith(".md")) {
      nodes.push({
        name: entry.name,
        path: entryRelativePath,
        absolutePath: entryAbsolutePath,
        type: "file",
      });
    }
  }

  return nodes;
}

/**
 * Reads a markdown file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {Promise<FileContent>}
 * @throws {Error} If file doesn't exist or is outside docs root
 */
export async function readFile(docsRoot, relativePath) {
  const absolutePath = path.join(docsRoot, relativePath);

  // Security: ensure path is within docs root
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(docsRoot);
  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    throw new Error("Access denied: path outside docs directory");
  }

  // Verify it's a markdown file
  if (!relativePath.endsWith(".md")) {
    throw new Error("Only markdown files can be read");
  }

  const stat = await fs.promises.stat(absolutePath);
  const content = await fs.promises.readFile(absolutePath, "utf-8");

  return {
    path: relativePath,
    content,
    mtime: stat.mtimeMs,
  };
}

/**
 * Writes content to a markdown file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @param {string} content - Content to write
 * @returns {Promise<{path: string, mtime: number}>}
 * @throws {Error} If path is outside docs root
 */
export async function writeFile(docsRoot, relativePath, content) {
  const absolutePath = path.join(docsRoot, relativePath);

  // Security: ensure path is within docs root
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(docsRoot);
  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    throw new Error("Access denied: path outside docs directory");
  }

  // Verify it's a markdown file
  if (!relativePath.endsWith(".md")) {
    throw new Error("Only markdown files can be written");
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(absolutePath);
  await fs.promises.mkdir(parentDir, { recursive: true });

  await fs.promises.writeFile(absolutePath, content, "utf-8");

  const stat = await fs.promises.stat(absolutePath);
  return {
    path: relativePath,
    mtime: stat.mtimeMs,
  };
}

/**
 * Checks if a file exists
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {Promise<boolean>}
 */
export async function fileExists(docsRoot, relativePath) {
  const absolutePath = path.join(docsRoot, relativePath);
  try {
    await fs.promises.access(absolutePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Flattens file tree into a list of files (for search/iteration)
 * @param {FileNode[]} tree - File tree from buildFileTree
 * @returns {FileNode[]} Flat list of file nodes only
 */
export function flattenTree(tree) {
  const files = [];

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.type === "file") {
        files.push(node);
      } else if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return files;
}

export default {
  buildFileTree,
  readFile,
  writeFile,
  fileExists,
  flattenTree,
};
