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
 * Validates path security (ensures path is within docs root)
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {{resolvedPath: string, resolvedRoot: string}}
 * @throws {Error} If path is outside docs root
 */
function validatePathSecurity(docsRoot, relativePath) {
  const absolutePath = path.join(docsRoot, relativePath);
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(docsRoot);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    throw new Error("Access denied: path outside docs directory");
  }

  return { resolvedPath, resolvedRoot };
}

/**
 * Creates a new markdown file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @param {string} [content=''] - Initial content
 * @returns {Promise<{path: string, mtime: number}>}
 * @throws {Error} If file already exists or path is invalid
 */
export async function createFile(docsRoot, relativePath, content = "") {
  validatePathSecurity(docsRoot, relativePath);

  // Verify it's a markdown file
  if (!relativePath.endsWith(".md")) {
    throw new Error("Only markdown files can be created");
  }

  const absolutePath = path.join(docsRoot, relativePath);

  // Check if file already exists
  try {
    await fs.promises.access(absolutePath, fs.constants.F_OK);
    throw new Error("File already exists");
  } catch (err) {
    if (err.message === "File already exists") throw err;
    // File doesn't exist, continue
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
 * Deletes a markdown file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {Promise<{path: string, deleted: boolean}>}
 * @throws {Error} If path is outside docs root
 */
export async function deleteFile(docsRoot, relativePath) {
  validatePathSecurity(docsRoot, relativePath);

  // Verify it's a markdown file
  if (!relativePath.endsWith(".md")) {
    throw new Error("Only markdown files can be deleted");
  }

  const absolutePath = path.join(docsRoot, relativePath);

  await fs.promises.unlink(absolutePath);

  return {
    path: relativePath,
    deleted: true,
  };
}

/**
 * Renames/moves a markdown file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} oldRelativePath - Current path relative to docs root
 * @param {string} newRelativePath - New path relative to docs root
 * @returns {Promise<{oldPath: string, newPath: string, mtime: number}>}
 * @throws {Error} If paths are invalid or destination exists
 */
export async function renameFile(docsRoot, oldRelativePath, newRelativePath) {
  validatePathSecurity(docsRoot, oldRelativePath);
  validatePathSecurity(docsRoot, newRelativePath);

  // Verify both are markdown files
  if (!oldRelativePath.endsWith(".md") || !newRelativePath.endsWith(".md")) {
    throw new Error("Only markdown files can be renamed");
  }

  const oldAbsolutePath = path.join(docsRoot, oldRelativePath);
  const newAbsolutePath = path.join(docsRoot, newRelativePath);

  // Check source exists
  await fs.promises.access(oldAbsolutePath, fs.constants.F_OK);

  // Check destination doesn't exist
  try {
    await fs.promises.access(newAbsolutePath, fs.constants.F_OK);
    throw new Error("Destination file already exists");
  } catch (err) {
    if (err.message === "Destination file already exists") throw err;
    // File doesn't exist, continue
  }

  // Ensure parent directory exists for destination
  const parentDir = path.dirname(newAbsolutePath);
  await fs.promises.mkdir(parentDir, { recursive: true });

  await fs.promises.rename(oldAbsolutePath, newAbsolutePath);

  const stat = await fs.promises.stat(newAbsolutePath);
  return {
    oldPath: oldRelativePath,
    newPath: newRelativePath,
    mtime: stat.mtimeMs,
  };
}

/**
 * Creates a new directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {Promise<{path: string, created: boolean}>}
 */
export async function createDirectory(docsRoot, relativePath) {
  validatePathSecurity(docsRoot, relativePath);

  const absolutePath = path.join(docsRoot, relativePath);

  await fs.promises.mkdir(absolutePath, { recursive: true });

  return {
    path: relativePath,
    created: true,
  };
}

/**
 * Deletes an empty directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Path relative to docs root
 * @returns {Promise<{path: string, deleted: boolean}>}
 * @throws {Error} If directory is not empty
 */
export async function deleteDirectory(docsRoot, relativePath) {
  validatePathSecurity(docsRoot, relativePath);

  const absolutePath = path.join(docsRoot, relativePath);

  // Check if directory is empty
  const entries = await fs.promises.readdir(absolutePath);
  if (entries.length > 0) {
    throw new Error("Directory is not empty");
  }

  await fs.promises.rmdir(absolutePath);

  return {
    path: relativePath,
    deleted: true,
  };
}

/**
 * Renames/moves a directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} oldRelativePath - Current path relative to docs root
 * @param {string} newRelativePath - New path relative to docs root
 * @returns {Promise<{oldPath: string, newPath: string}>}
 */
export async function renameDirectory(docsRoot, oldRelativePath, newRelativePath) {
  validatePathSecurity(docsRoot, oldRelativePath);
  validatePathSecurity(docsRoot, newRelativePath);

  const oldAbsolutePath = path.join(docsRoot, oldRelativePath);
  const newAbsolutePath = path.join(docsRoot, newRelativePath);

  // Check source exists and is a directory
  const stat = await fs.promises.stat(oldAbsolutePath);
  if (!stat.isDirectory()) {
    throw new Error("Source is not a directory");
  }

  // Check destination doesn't exist
  try {
    await fs.promises.access(newAbsolutePath, fs.constants.F_OK);
    throw new Error("Destination already exists");
  } catch (err) {
    if (err.message === "Destination already exists") throw err;
    // Path doesn't exist, continue
  }

  // Ensure parent directory exists for destination
  const parentDir = path.dirname(newAbsolutePath);
  await fs.promises.mkdir(parentDir, { recursive: true });

  await fs.promises.rename(oldAbsolutePath, newAbsolutePath);

  return {
    oldPath: oldRelativePath,
    newPath: newRelativePath,
  };
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

// =============================================================================
// Asset Management
// =============================================================================

/**
 * Supported image file extensions
 */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp"];

/**
 * Checks if a file is an image based on extension
 * @param {string} filename - File name or path
 * @returns {boolean}
 */
export function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Gets the default assets directory path
 * @returns {string}
 */
export function getAssetsDir() {
  return "assets";
}

/**
 * Generates a unique filename if a file already exists
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Relative path to check
 * @returns {Promise<string>} Unique relative path
 */
async function generateUniqueFilename(docsRoot, relativePath) {
  const ext = path.extname(relativePath);
  const baseName = path.basename(relativePath, ext);
  const dirPath = path.dirname(relativePath);

  let counter = 0;
  let uniquePath = relativePath;

  while (await fileExists(docsRoot, uniquePath)) {
    counter++;
    const newName = `${baseName}-${counter}${ext}`;
    uniquePath = path.join(dirPath, newName);
  }

  return uniquePath;
}

/**
 * Copies an asset (image) to the docs/assets directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} sourcePath - Absolute path to source file
 * @param {string} [targetSubdir='assets'] - Target subdirectory in docs
 * @returns {Promise<{relativePath: string, absolutePath: string, filename: string}>}
 */
export async function copyAsset(docsRoot, sourcePath, targetSubdir = "assets") {
  // Validate source file exists
  try {
    await fs.promises.access(sourcePath, fs.constants.F_OK);
  } catch {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }

  // Validate it's an image file
  const filename = path.basename(sourcePath);
  if (!isImageFile(filename)) {
    throw new Error(`Not a supported image file: ${filename}`);
  }

  // Ensure target directory exists
  const targetDir = path.join(docsRoot, targetSubdir);
  await fs.promises.mkdir(targetDir, { recursive: true });

  // Generate unique filename if needed
  const targetRelativePath = path.join(targetSubdir, filename);
  const uniqueRelativePath = await generateUniqueFilename(docsRoot, targetRelativePath);
  const targetAbsolutePath = path.join(docsRoot, uniqueRelativePath);

  // Copy the file
  await fs.promises.copyFile(sourcePath, targetAbsolutePath);

  return {
    relativePath: uniqueRelativePath,
    absolutePath: targetAbsolutePath,
    filename: path.basename(uniqueRelativePath),
  };
}

/**
 * Lists assets in the assets directory
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} [assetsSubdir='assets'] - Assets subdirectory
 * @returns {Promise<Array<{name: string, path: string, absolutePath: string, size: number, mtime: number}>>}
 */
export async function listAssets(docsRoot, assetsSubdir = "assets") {
  const assetsPath = path.join(docsRoot, assetsSubdir);

  try {
    await fs.promises.access(assetsPath, fs.constants.F_OK);
  } catch {
    // Assets directory doesn't exist yet
    return [];
  }

  const entries = await fs.promises.readdir(assetsPath, { withFileTypes: true });
  const assets = [];

  for (const entry of entries) {
    if (entry.isFile() && isImageFile(entry.name)) {
      const relativePath = path.join(assetsSubdir, entry.name);
      const absolutePath = path.join(docsRoot, relativePath);
      const stat = await fs.promises.stat(absolutePath);

      assets.push({
        name: entry.name,
        path: relativePath,
        absolutePath,
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
  }

  // Sort by name
  assets.sort((a, b) => a.name.localeCompare(b.name));

  return assets;
}

/**
 * Deletes an asset file
 * @param {string} docsRoot - Absolute path to docs directory
 * @param {string} relativePath - Relative path to asset
 * @returns {Promise<{path: string, deleted: boolean}>}
 */
export async function deleteAsset(docsRoot, relativePath) {
  // Security: ensure path is within docs root
  const absolutePath = path.join(docsRoot, relativePath);
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(docsRoot);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
    throw new Error("Access denied: path outside docs directory");
  }

  // Verify it's an image file
  if (!isImageFile(relativePath)) {
    throw new Error("Only image files can be deleted via asset manager");
  }

  await fs.promises.unlink(absolutePath);

  return {
    path: relativePath,
    deleted: true,
  };
}

/**
 * Generates a relative path from a source markdown file to an asset
 * @param {string} markdownPath - Relative path to the markdown file
 * @param {string} assetPath - Relative path to the asset
 * @returns {string} Relative path from markdown to asset
 */
export function getRelativeAssetPath(markdownPath, assetPath) {
  const mdDir = path.dirname(markdownPath);

  // If markdown is at root, asset path is just the asset path
  if (!mdDir || mdDir === ".") {
    return assetPath;
  }

  // Calculate relative path from markdown directory to asset
  const relativePath = path.relative(mdDir, assetPath);

  // Ensure forward slashes for markdown compatibility
  return relativePath.replace(/\\/g, "/");
}

export default {
  buildFileTree,
  readFile,
  writeFile,
  fileExists,
  flattenTree,
  createFile,
  deleteFile,
  renameFile,
  createDirectory,
  deleteDirectory,
  renameDirectory,
  // Asset management
  isImageFile,
  getAssetsDir,
  copyAsset,
  listAssets,
  deleteAsset,
  getRelativeAssetPath,
};
