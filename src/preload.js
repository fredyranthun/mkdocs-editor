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
