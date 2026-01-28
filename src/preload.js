/**
 * Preload Bridge - Secure API exposed to renderer
 *
 * This module exposes a minimal, typed API to the renderer process
 * via contextBridge. All filesystem and process operations happen
 * in the main process and are called via IPC.
 */

import { contextBridge, ipcRenderer } from "electron";

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
    open: () => ipcRenderer.invoke("project:open"),

    /**
     * Loads a project from a specific path
     * @param {string} projectPath
     * @returns {Promise<{projectRoot: string, config: object}>}
     */
    load: (projectPath) => ipcRenderer.invoke("project:load", projectPath),

    /**
     * Gets the file tree for the current project
     * @returns {Promise<Array>}
     */
    getTree: () => ipcRenderer.invoke("project:getTree"),

    /**
     * Gets current project info
     * @returns {Promise<{projectRoot: string, config: object}|null>}
     */
    getCurrent: () => ipcRenderer.invoke("project:getCurrent"),

    /**
     * Closes the current project
     * @returns {Promise<void>}
     */
    close: () => ipcRenderer.invoke("project:close"),
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
    read: (relativePath) => ipcRenderer.invoke("page:read", relativePath),

    /**
     * Writes content to a markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @param {string} content - Markdown content
     * @returns {Promise<{path: string, mtime: number}>}
     */
    write: (relativePath, content) => ipcRenderer.invoke("page:write", relativePath, content),

    /**
     * Checks if a file exists
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<boolean>}
     */
    exists: (relativePath) => ipcRenderer.invoke("page:exists", relativePath),

    /**
     * Creates a new markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @param {string} [content=''] - Initial content
     * @returns {Promise<{path: string, mtime: number}>}
     */
    create: (relativePath, content) => ipcRenderer.invoke("page:create", relativePath, content),

    /**
     * Deletes a markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => ipcRenderer.invoke("page:delete", relativePath),

    /**
     * Renames a markdown file (same directory)
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string, mtime: number}>}
     */
    rename: (oldPath, newPath) => ipcRenderer.invoke("page:rename", oldPath, newPath),

    /**
     * Moves a markdown file to a different location
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string, mtime: number}>}
     */
    move: (oldPath, newPath) => ipcRenderer.invoke("page:move", oldPath, newPath),
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
    create: (relativePath) => ipcRenderer.invoke("directory:create", relativePath),

    /**
     * Deletes an empty directory
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => ipcRenderer.invoke("directory:delete", relativePath),

    /**
     * Renames a directory
     * @param {string} oldPath - Current path relative to docs directory
     * @param {string} newPath - New path relative to docs directory
     * @returns {Promise<{oldPath: string, newPath: string}>}
     */
    rename: (oldPath, newPath) => ipcRenderer.invoke("directory:rename", oldPath, newPath),
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
    selectAndCopy: (currentFilePath) => ipcRenderer.invoke("asset:selectAndCopy", currentFilePath),

    /**
     * Copies an image file to assets folder
     * @param {string} sourcePath - Absolute path to source image
     * @param {string} [currentFilePath] - Current markdown file path for relative path calculation
     * @returns {Promise<{relativePath: string, absolutePath: string, filename: string, markdownPath: string}>}
     */
    copy: (sourcePath, currentFilePath) => ipcRenderer.invoke("asset:copy", sourcePath, currentFilePath),

    /**
     * Lists all assets in the assets folder
     * @returns {Promise<Array<{name: string, path: string, absolutePath: string, size: number, mtime: number}>>}
     */
    list: () => ipcRenderer.invoke("asset:list"),

    /**
     * Deletes an asset file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<{path: string, deleted: boolean}>}
     */
    delete: (relativePath) => ipcRenderer.invoke("asset:delete", relativePath),

    /**
     * Gets relative path from a markdown file to an asset
     * @param {string} markdownPath - Relative path to markdown file
     * @param {string} assetPath - Relative path to asset
     * @returns {Promise<string>}
     */
    getRelativePath: (markdownPath, assetPath) => ipcRenderer.invoke("asset:getRelativePath", markdownPath, assetPath),
  },

  /**
   * Preview operations
   */
  preview: {
    /**
     * Starts the preview server
     * @returns {Promise<{status: string, url: string|null, port: number|null, error: string|null}>}
     */
    start: () => ipcRenderer.invoke("preview:start"),

    /**
     * Stops the preview server
     * @returns {Promise<{status: string}>}
     */
    stop: () => ipcRenderer.invoke("preview:stop"),

    /**
     * Restarts the preview server
     * @returns {Promise<{status: string, url: string|null}>}
     */
    restart: () => ipcRenderer.invoke("preview:restart"),

    /**
     * Gets current preview status
     * @returns {Promise<{status: string, url: string|null, port: number|null, error: string|null}>}
     */
    getStatus: () => ipcRenderer.invoke("preview:getStatus"),

    /**
     * Gets preview logs
     * @returns {Promise<string[]>}
     */
    getLogs: () => ipcRenderer.invoke("preview:getLogs"),

    /**
     * Clears preview logs
     * @returns {Promise<void>}
     */
    clearLogs: () => ipcRenderer.invoke("preview:clearLogs"),

    /**
     * Gets the preview URL for a specific markdown file
     * @param {string} relativePath - Path relative to docs directory
     * @returns {Promise<string|null>}
     */
    getPageUrl: (relativePath) => ipcRenderer.invoke("preview:getPageUrl", relativePath),

    /**
     * Checks if the preview server is healthy
     * @returns {Promise<boolean>}
     */
    isHealthy: () => ipcRenderer.invoke("preview:isHealthy"),

    /**
     * Checks if MkDocs is installed and available
     * @returns {Promise<{available: boolean, path?: string, version?: string, error?: string}>}
     */
    checkMkDocs: () => ipcRenderer.invoke("preview:checkMkDocs"),

    /**
     * Subscribes to status changes
     * @param {Function} callback - Called with status object
     * @returns {Function} Unsubscribe function
     */
    onStatus: (callback) => {
      const handler = (_event, status) => callback(status);
      ipcRenderer.on("preview:status", handler);
      return () => ipcRenderer.removeListener("preview:status", handler);
    },

    /**
     * Subscribes to log messages
     * @param {Function} callback - Called with log string
     * @returns {Function} Unsubscribe function
     */
    onLog: (callback) => {
      const handler = (_event, log) => callback(log);
      ipcRenderer.on("preview:log", handler);
      return () => ipcRenderer.removeListener("preview:log", handler);
    },
  },

  /**
   * Python environment operations
   */
  pythonEnv: {
    /**
     * Checks if Python is available on the system
     * @returns {Promise<{available: boolean, path?: string, version?: string, error?: string}>}
     */
    checkPython: () => ipcRenderer.invoke("pythonEnv:checkPython"),

    /**
     * Detects existing Python environments in a project
     * @param {string} [projectPath] - Path to check (defaults to current project)
     * @returns {Promise<{hasRequirements: boolean, hasPoetry: boolean, hasPipenv: boolean, hasVenv: boolean, hasAppVenv: boolean, existingVenvPath: string|null}>}
     */
    detectProjectEnv: (projectPath) => ipcRenderer.invoke("pythonEnv:detectProjectEnv", projectPath),

    /**
     * Gets current Python environment status
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    getStatus: () => ipcRenderer.invoke("pythonEnv:getStatus"),

    /**
     * Ensures Python environment is ready (creates venv and installs mkdocs if needed)
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    ensure: () => ipcRenderer.invoke("pythonEnv:ensure"),

    /**
     * Reinstalls MkDocs in the app venv (for fixing corrupted installs)
     * @returns {Promise<{status: string, pythonPath: string|null, mkdocsPath: string|null, venvPath: string|null, error: string|null, envType: string|null}>}
     */
    reinstall: () => ipcRenderer.invoke("pythonEnv:reinstall"),

    /**
     * Gets Python environment logs
     * @returns {Promise<string[]>}
     */
    getLogs: () => ipcRenderer.invoke("pythonEnv:getLogs"),

    /**
     * Subscribes to status changes
     * @param {Function} callback - Called with status object
     * @returns {Function} Unsubscribe function
     */
    onStatus: (callback) => {
      const handler = (_event, status) => callback(status);
      ipcRenderer.on("pythonEnv:status", handler);
      return () => ipcRenderer.removeListener("pythonEnv:status", handler);
    },

    /**
     * Subscribes to log messages
     * @param {Function} callback - Called with log string
     * @returns {Function} Unsubscribe function
     */
    onLog: (callback) => {
      const handler = (_event, log) => callback(log);
      ipcRenderer.on("pythonEnv:log", handler);
      return () => ipcRenderer.removeListener("pythonEnv:log", handler);
    },
  },

  /**
   * App info
   */
  app: {
    /**
     * Gets app version
     * @returns {Promise<string>}
     */
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld("api", api);
