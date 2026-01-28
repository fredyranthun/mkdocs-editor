/**
 * Type definitions for the Preload API exposed to renderer
 *
 * This file provides TypeScript definitions for window.api
 * Use in renderer with: declare const api: typeof import('./preload.api').api
 */

export interface MkDocsConfig {
  siteName: string;
  docsDir: string;
  siteDir: string;
  nav: Array<unknown> | null;
  markdownExtensions: string[];
  theme: {
    name: string;
    [key: string]: unknown;
  };
  raw: Record<string, unknown>;
}

export interface ProjectInfo {
  projectRoot: string;
  config: MkDocsConfig;
}

export interface FileNode {
  name: string;
  path: string;
  absolutePath: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  mtime: number;
}

export interface WriteResult {
  path: string;
  mtime: number;
}

export type PreviewStatus = "stopped" | "starting" | "running" | "error";

export interface PreviewState {
  status: PreviewStatus;
  url: string | null;
  port: number | null;
  error: string | null;
}

export type PythonEnvStatus = "not-initialized" | "checking" | "ready" | "creating" | "installing" | "error";

export type PythonEnvType = "system" | "project-venv" | "app-venv" | null;

export interface PythonEnvState {
  status: PythonEnvStatus;
  pythonPath: string | null;
  mkdocsPath: string | null;
  venvPath: string | null;
  error: string | null;
  envType: PythonEnvType;
}

export interface PythonInfo {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
}

export interface ProjectEnvInfo {
  hasRequirements: boolean;
  hasPoetry: boolean;
  hasPipenv: boolean;
  hasVenv: boolean;
  hasAppVenv: boolean;
  existingVenvPath: string | null;
}

export interface PreloadAPI {
  project: {
    /**
     * Opens a folder selection dialog and loads the project
     */
    open(): Promise<ProjectInfo | null>;

    /**
     * Loads a project from a specific path
     */
    load(projectPath: string): Promise<ProjectInfo>;

    /**
     * Gets the file tree for the current project
     */
    getTree(): Promise<FileNode[]>;

    /**
     * Gets current project info
     */
    getCurrent(): Promise<ProjectInfo | null>;

    /**
     * Closes the current project
     */
    close(): Promise<void>;
  };

  page: {
    /**
     * Reads a markdown file
     */
    read(relativePath: string): Promise<FileContent>;

    /**
     * Writes content to a markdown file
     */
    write(relativePath: string, content: string): Promise<WriteResult>;

    /**
     * Checks if a file exists
     */
    exists(relativePath: string): Promise<boolean>;
  };

  preview: {
    /**
     * Starts the preview server
     */
    start(): Promise<PreviewState>;

    /**
     * Stops the preview server
     */
    stop(): Promise<PreviewState>;

    /**
     * Restarts the preview server
     */
    restart(): Promise<PreviewState>;

    /**
     * Gets current preview status
     */
    getStatus(): Promise<PreviewState>;

    /**
     * Gets preview logs
     */
    getLogs(): Promise<string[]>;

    /**
     * Clears preview logs
     */
    clearLogs(): Promise<void>;

    /**
     * Gets the preview URL for a specific markdown file
     */
    getPageUrl(relativePath: string): Promise<string | null>;

    /**
     * Checks if the preview server is healthy
     */
    isHealthy(): Promise<boolean>;

    /**
     * Subscribes to status changes
     * @returns Unsubscribe function
     */
    onStatus(callback: (status: PreviewState) => void): () => void;

    /**
     * Subscribes to log messages
     * @returns Unsubscribe function
     */
    onLog(callback: (log: string) => void): () => void;

    /**
     * Checks if MkDocs is installed and available
     */
    checkMkDocs(): Promise<{ available: boolean; path?: string; version?: string; error?: string }>;
  };

  pythonEnv: {
    /**
     * Checks if Python is available on the system
     */
    checkPython(): Promise<PythonInfo>;

    /**
     * Detects existing Python environments in a project
     */
    detectProjectEnv(projectPath?: string): Promise<ProjectEnvInfo>;

    /**
     * Gets current Python environment status
     */
    getStatus(): Promise<PythonEnvState>;

    /**
     * Ensures Python environment is ready (creates venv and installs mkdocs if needed)
     */
    ensure(): Promise<PythonEnvState>;

    /**
     * Reinstalls MkDocs in the app venv (for fixing corrupted installs)
     */
    reinstall(): Promise<PythonEnvState>;

    /**
     * Gets Python environment logs
     */
    getLogs(): Promise<string[]>;

    /**
     * Subscribes to status changes
     * @returns Unsubscribe function
     */
    onStatus(callback: (status: PythonEnvState) => void): () => void;

    /**
     * Subscribes to log messages
     * @returns Unsubscribe function
     */
    onLog(callback: (log: string) => void): () => void;
  };

  app: {
    /**
     * Gets app version
     */
    getVersion(): Promise<string>;
  };
}

declare global {
  interface Window {
    api: PreloadAPI;
  }
}

export {};
