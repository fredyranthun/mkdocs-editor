/**
 * Preload Bridge - Secure API exposed to renderer
 *
 * This module exposes a minimal, typed API to the renderer process
 * via contextBridge. All filesystem and process operations happen
 * in the main process and are called via IPC.
 *
 * Security: All IPC channels are validated against a whitelist
 * to prevent unauthorized access to main process functionality.
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * Whitelist of valid IPC invoke channels (renderer → main)
 * @type {Set<string>}
 */
const VALID_INVOKE_CHANNELS = new Set([
  // Project operations
  "project:open",
  "project:load",
  "project:getTree",
  "project:getCurrent",
  "project:close",

  // Page/file operations
  "page:read",
  "page:write",
  "page:exists",
  "page:create",
  "page:delete",
  "page:rename",
  "page:move",

  // Directory operations
  "directory:create",
  "directory:delete",
  "directory:rename",

  // Asset operations
  "asset:selectAndCopy",
  "asset:copy",
  "asset:list",
  "asset:delete",
  "asset:getRelativePath",

  // Preview operations
  "preview:start",
  "preview:stop",
  "preview:restart",
  "preview:getStatus",
  "preview:getLogs",
  "preview:clearLogs",
  "preview:getPageUrl",
  "preview:isHealthy",
  "preview:checkMkDocs",

  // Python environment operations
  "pythonEnv:checkPython",
  "pythonEnv:detectProjectEnv",
  "pythonEnv:getStatus",
  "pythonEnv:ensure",
  "pythonEnv:reinstall",
  "pythonEnv:getLogs",

  // App operations
  "app:getVersion",
]);

/**
 * Whitelist of valid IPC receive channels (main → renderer)
 * @type {Set<string>}
 */
const VALID_RECEIVE_CHANNELS = new Set(["preview:status", "preview:log", "pythonEnv:status", "pythonEnv:log"]);

/**
 * Secure invoke wrapper - validates channel before sending
 * @param {string} channel
 * @param  {...any} args
 * @returns {Promise<any>}
 */
function secureInvoke(channel, ...args) {
  if (!VALID_INVOKE_CHANNELS.has(channel)) {
    console.error(`[Security] Blocked IPC invoke on invalid channel: ${channel}`);
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args);
}

/**
 * Secure event listener wrapper - validates channel before subscribing
 * @param {string} channel
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
function secureOn(channel, callback) {
  if (!VALID_RECEIVE_CHANNELS.has(channel)) {
    console.error(`[Security] Blocked IPC listener on invalid channel: ${channel}`);
    return () => {};
  }
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

/**
 * API exposed to the renderer as window.api
 */
const api = {
  /**
   * Project operations
   */
  project: {
    /**
     * Opens a folder selection dialog and loads the project
     * @returns {Promise<{projectRoot: string, config: object}|null>}
     */
    open: () => secureInvoke("project:open"),

    /**
     * Loads a project from a specific path
     * @param {string} projectPath
     * @returns {Promise<{projectRoot: string, config: object}>}
     */
    load: (projectPath) => secureInvoke("project:load", projectPath),

    /**
     * Gets the file tree for the current project
     * @returns {Promise<Array>}
     */
    getTree: () => secureInvoke("project:getTree"),

    /**
     * Gets current project info
     * @returns {Promise<{projectRoot: string, config: object}|null>}
     */
    getCurrent: () => secureInvoke("project:getCurrent"),

    /**
     * Closes the current project
     * @returns {Promise<void>}
     */
    close: () => secureInvoke("project:close"),
  },

  /**
   * Page/file operations
   */
  page: {
    /**
     * Reads a markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, content: string, mtime: number}>}
     */
    read: (relativePath) => secureInvoke("page:read", relativePath),

    /**
     * Writes content to a markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @param {string} content - Markdown content
     * @returns {Promise<{path: string, mtime: number}>}
     */
    write: (relativePath, content) => secureInvoke("page:write", relativePath, content),

    /**
     * Checks if a file exists
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<boolean>}
     */
    exists: (relativePath) => secureInvoke("page:exists", relativePath),

    /**
     * Creates a new markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @param {string} [content=''] - Initial content
     * @returns {Promise<{path: string, mtime: number}>}
     */
    create: (relativePath, content) => secureInvoke("page:create", relativePath, content),

    /**
     * Deletes a markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => secureInvoke("page:delete", relativePath),

    /**
     * Renames a markdown file (same directory)
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string, mtime: number}>}
     */
    rename: (oldPath, newPath) => secureInvoke("page:rename", oldPath, newPath),

    /**
     * Moves a markdown file to a different location
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string, mtime: number}>}
     */
    move: (oldPath, newPath) => secureInvoke("page:move", oldPath, newPath),
  },

  /**
   * Directory operations
   */
  directory: {
    /**
     * Creates a new directory
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, created: boolean}>}
     */
    create: (relativePath) => secureInvoke("directory:create", relativePath),

    /**
     * Deletes an empty directory
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => secureInvoke("directory:delete", relativePath),

    /**
     * Renames a directory
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string}>}
     */
    rename: (oldPath, newPath) => secureInvoke("directory:rename", oldPath, newPath),
  },

  /**
   * Asset (image) operations
   */
  asset: {
    /**
     * Opens file dialog to select an image, copies it to assets folder
     * @param {string} [currentFilePath] - Current markdown file path for relative path calculation
     * @returns {Promise<{relativePath: string, absolutePath: string, filename: string, markdownPath: string}|null>}
     */
    selectAndCopy: (currentFilePath) => secureInvoke("asset:selectAndCopy", currentFilePath),

    /**
     * Copies an image file to assets folder
     * @param {string} sourcePath - Absolute path to source image
     * @param {string} [currentFilePath] - Current markdown file path for relative path calculation
     * @returns {Promise<{relativePath: string, absolutePath: string, filename: string, markdownPath: string}>}
     */
    copy: (sourcePath, currentFilePath) => secureInvoke("asset:copy", sourcePath, currentFilePath),

    /**
     * Lists all assets in the assets folder
     * @returns {Promise<Array<{name: string, path: string, absolutePath: string, size: number, mtime: number}>>}
     */
    list: () => secureInvoke("asset:list"),

    /**
     * Deletes an asset file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => secureInvoke("asset:delete", relativePath),

    /**
     * Gets relative path from a markdown file to an asset
     * @param {string} markdownPath - Relative path to markdown file
     * @param {string} assetPath - Relative path to asset
     * @returns {Promise<string>}
     */
    getRelativePath: (markdownPath, assetPath) => secureInvoke("asset:getRelativePath", markdownPath, assetPath),
  },

  /**
   * Preview operations
   */
  preview: {
    /**
     * Starts the preview server
     * @returns {Promise<{status: string, url: string|null, port: number|null, error: string|null}>}
     */
    start: () => secureInvoke("preview:start"),

    /**
     * Stops the preview server
     * @returns {Promise<{status: string}>}
     */
    stop: () => secureInvoke("preview:stop"),

    /**
     * Restarts the preview server
     * @returns {Promise<{status: string, url: string|null}>}
     */
    restart: () => secureInvoke("preview:restart"),

    /**
     * Gets current preview status
     * @returns {Promise<{status: string, url: string|null, port: number|null, error: string|null}>}
     */
    getStatus: () => secureInvoke("preview:getStatus"),

    /**
     * Gets preview logs
     * @returns {Promise<string[]>}
     */
    getLogs: () => secureInvoke("preview:getLogs"),

    /**
     * Clears preview logs
     * @returns {Promise<void>}
     */
    clearLogs: () => secureInvoke("preview:clearLogs"),

    /**
     * Gets the preview URL for a specific markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<string|null>}
     */
    getPageUrl: (relativePath) => secureInvoke("preview:getPageUrl", relativePath),

    /**
     * Checks if the preview server is healthy
     * @returns {Promise<boolean>}
     */
    isHealthy: () => secureInvoke("preview:isHealthy"),

    /**
     * Checks if MkDocs is installed and available
     * @returns {Promise<{available: boolean, path?: string, version?: string, error?: string}>}
     */
    checkMkDocs: () => secureInvoke("preview:checkMkDocs"),

    /**
     * Subscribes to status changes
     * @param {Function} callback - Called with status object
     * @returns {Function} Unsubscribe function
     */
    onStatus: (callback) => secureOn("preview:status", callback),

    /**
     * Subscribes to log messages
     * @param {Function} callback - Called with log string
     * @returns {Function} Unsubscribe function
     */
    onLog: (callback) => secureOn("preview:log", callback),
  },

  /**
   * Python environment operations
   */
  pythonEnv: {
    /**
     * Checks if Python is available on the system
     * @returns {Promise<{available: boolean, path?: string, version?: string, error?: string}>}
     */
    checkPython: () => secureInvoke("pythonEnv:checkPython"),

    /**
     * Detects existing Python environments in a project
     * @param {string} [projectPath] - Path to check (defaults to current project)
     * @returns {Promise<{hasRequirements: boolean, hasPoetry: boolean, hasPipenv: boolean, hasVenv: boolean, hasAppVenv: boolean, existingVenvPath: string|null}>}
     */
    detectProjectEnv: (projectPath) => secureInvoke("pythonEnv:detectProjectEnv", projectPath),

    /**
     * Gets current Python environment status
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    getStatus: () => secureInvoke("pythonEnv:getStatus"),

    /**
     * Ensures Python environment is ready (creates venv and installs mkdocs if needed)
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    ensure: () => secureInvoke("pythonEnv:ensure"),

    /**
     * Reinstalls MkDocs in the app venv (for fixing corrupted installs)
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    reinstall: () => secureInvoke("pythonEnv:reinstall"),

    /**
     * Gets Python environment logs
     * @returns {Promise<string[]>}
     */
    getLogs: () => secureInvoke("pythonEnv:getLogs"),

    /**
     * Subscribes to status changes
     * @param {Function} callback - Called with status object
     * @returns {Function} Unsubscribe function
     */
    onStatus: (callback) => secureOn("pythonEnv:status", callback),

    /**
     * Subscribes to log messages
     * @param {Function} callback - Called with log string
     * @returns {Function} Unsubscribe function
     */
    onLog: (callback) => secureOn("pythonEnv:log", callback),
  },

  /**
   * App info
   */
  app: {
    /**
     * Gets app version
     * @returns {Promise<string>}
     */
    getVersion: () => secureInvoke("app:getVersion"),
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("api", api);
