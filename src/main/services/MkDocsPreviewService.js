/**
 * MkDocsPreviewService - Main process service for managing mkdocs serve
 *
 * Responsibilities:
 * - Spawn mkdocs serve process
 * - Find available port
 * - Health check preview server
 * - Stream logs to renderer
 * - Clean shutdown
 */

import { spawn, execSync } from "node:child_process";
import net from "node:net";
import http from "node:http";
import { EventEmitter } from "node:events";
import process from "node:process";

/**
 * @typedef {'stopped'|'starting'|'running'|'error'} PreviewStatus
 */

/**
 * @typedef {Object} PreviewState
 * @property {PreviewStatus} status
 * @property {string|null} url - Preview URL when running
 * @property {number|null} port - Port number when running
 * @property {string|null} error - Error message if status is 'error'
 */

/**
 * Gets the shell PATH that includes common Python/pip locations
 * @returns {string}
 */
function getEnhancedPath() {
  const currentPath = process.env.PATH || "";
  const home = process.env.HOME || "";

  // Common locations where mkdocs might be installed
  const additionalPaths = [
    `${home}/.local/bin`, // pip install --user
    `${home}/.pyenv/shims`, // pyenv
    "/usr/local/bin",
    "/opt/homebrew/bin", // macOS Homebrew ARM
    "/usr/bin",
  ].filter(Boolean);

  return [...additionalPaths, currentPath].join(":");
}

/**
 * Kills a process and all its children (process tree)
 * @param {number} pid - Process ID to kill
 * @param {string} signal - Signal to send
 */
function killProcessTree(pid, signal = "SIGTERM") {
  try {
    // On Unix, use negative PID to kill process group
    process.kill(-pid, signal);
  } catch (err) {
    // Fallback: try to kill just the process
    try {
      process.kill(pid, signal);
    } catch {
      // Process already dead
    }
  }
}

/**
 * Checks if mkdocs is available in PATH
 * @returns {{available: boolean, path?: string, version?: string, error?: string}}
 */
export function checkMkDocsAvailability() {
  try {
    const env = { ...process.env, PATH: getEnhancedPath() };

    // Try to get mkdocs version
    const result = execSync("mkdocs --version", {
      encoding: "utf-8",
      env,
      shell: true,
      timeout: 10000,
    }).trim();

    // Try to find the path
    let mkdocsPath;
    try {
      mkdocsPath = execSync("which mkdocs", {
        encoding: "utf-8",
        env,
        shell: true,
        timeout: 5000,
      }).trim();
    } catch {
      mkdocsPath = "mkdocs"; // fallback
    }

    return {
      available: true,
      path: mkdocsPath,
      version: result,
    };
  } catch (err) {
    return {
      available: false,
      error: `MkDocs not found. Install with: pip install mkdocs-material\n${err.message}`,
    };
  }
}

/**
 * Finds an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<number>}
 */
export async function findAvailablePort(startPort = 8000, maxAttempts = 100) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available port found between ${startPort} and ${startPort + maxAttempts}`);
}

/**
 * Checks if a port is available
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Performs a health check on the preview server
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>}
 */
export function healthCheck(url, timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Waits for the preview server to be ready
 * @param {string} url - URL to check
 * @param {number} maxWait - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>}
 */
export async function waitForServer(url, maxWait = 30000, interval = 500) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const ready = await healthCheck(url);
    if (ready) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Creates a preview service instance for a project
 */
export class PreviewService extends EventEmitter {
  /**
   * @param {string} projectRoot - Absolute path to project root
   */
  constructor(projectRoot) {
    super();
    this.projectRoot = projectRoot;
    this.process = null;
    this.state = {
      status: "stopped",
      url: null,
      port: null,
      error: null,
    };
    this.logs = [];
  }

  /**
   * Gets current state
   * @returns {PreviewState}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Gets collected logs
   * @returns {string[]}
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Updates state and emits event
   * @param {Partial<PreviewState>} updates
   */
  _updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.emit("status", this.getState());
  }

  /**
   * Adds a log entry and emits event
   * @param {string} message
   */
  _addLog(message) {
    const entry = `[${new Date().toISOString()}] ${message}`;
    this.logs.push(entry);
    // Keep last 1000 log entries
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    this.emit("log", entry);
  }

  /**
   * Starts the mkdocs serve process
   * @returns {Promise<PreviewState>}
   */
  async start() {
    if (this.state.status === "running" || this.state.status === "starting") {
      return this.getState();
    }

    this._updateState({ status: "starting", error: null });
    this._addLog("Starting preview server...");

    // Check if mkdocs is available first
    const mkdocsCheck = checkMkDocsAvailability();
    if (!mkdocsCheck.available) {
      this._addLog(`MkDocs not found: ${mkdocsCheck.error}`);
      this._updateState({
        status: "error",
        url: null,
        port: null,
        error: mkdocsCheck.error,
      });
      return this.getState();
    }

    this._addLog(`Found MkDocs: ${mkdocsCheck.version} at ${mkdocsCheck.path}`);

    try {
      // Find available port
      const port = await findAvailablePort(8000);
      this._addLog(`Found available port: ${port}`);

      // Spawn mkdocs serve with livereload enabled
      const devAddr = `127.0.0.1:${port}`;
      const command = `mkdocs serve --dev-addr ${devAddr} --livereload`;

      this._addLog(`Running: ${command}`);

      // Use shell: true and enhanced PATH to find mkdocs
      // Use detached: true so we can kill the entire process group later
      this.process = spawn(command, [], {
        cwd: this.projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        detached: true, // Create new process group for proper cleanup
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
        },
      });

      // Handle stdout
      this.process.stdout.on("data", (data) => {
        const lines = data.toString().split("\n").filter(Boolean);
        lines.forEach((line) => this._addLog(`[stdout] ${line}`));
      });

      // Handle stderr
      this.process.stderr.on("data", (data) => {
        const lines = data.toString().split("\n").filter(Boolean);
        lines.forEach((line) => this._addLog(`[stderr] ${line}`));
      });

      // Handle process exit
      this.process.on("close", (code) => {
        this._addLog(`Process exited with code: ${code}`);
        if (this.state.status !== "stopped") {
          this._updateState({
            status: code === 0 ? "stopped" : "error",
            url: null,
            port: null,
            error: code !== 0 ? `Process exited with code ${code}` : null,
          });
        }
        this.process = null;
      });

      // Handle spawn errors
      this.process.on("error", (err) => {
        this._addLog(`Process error: ${err.message}`);
        this._updateState({
          status: "error",
          url: null,
          port: null,
          error: err.message,
        });
        this.process = null;
      });

      // Wait for server to be ready
      const url = `http://127.0.0.1:${port}`;
      const ready = await waitForServer(url);

      if (ready) {
        this._addLog(`Preview server ready at ${url}`);
        this._updateState({
          status: "running",
          url,
          port,
          error: null,
        });
      } else {
        throw new Error("Preview server failed to start within timeout");
      }

      return this.getState();
    } catch (err) {
      this._addLog(`Failed to start: ${err.message}`);
      this._updateState({
        status: "error",
        url: null,
        port: null,
        error: err.message,
      });

      // Clean up if process was spawned
      if (this.process) {
        try {
          killProcessTree(this.process.pid);
        } catch {
          // Ignore errors
        }
        this.process = null;
      }

      return this.getState();
    }
  }

  /**
   * Stops the mkdocs serve process
   * @returns {Promise<PreviewState>}
   */
  async stop() {
    if (!this.process) {
      this._updateState({ status: "stopped", url: null, port: null, error: null });
      return this.getState();
    }

    const pid = this.process.pid;
    this._addLog(`Stopping preview server (PID: ${pid})...`);

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.process) {
          this._addLog("Force killing process tree...");
          try {
            killProcessTree(pid, "SIGKILL");
          } catch {
            // Ignore errors
          }
        }
      }, 3000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.process = null;
        this._updateState({ status: "stopped", url: null, port: null, error: null });
        this._addLog("Preview server stopped");
        resolve(this.getState());
      };

      this.process.once("close", cleanup);

      // Kill the entire process group (shell + mkdocs)
      try {
        killProcessTree(pid, "SIGTERM");
      } catch (err) {
        this._addLog(`Error killing process: ${err.message}`);
        cleanup();
      }
    });
  }

  /**
   * Restarts the preview server
   * @returns {Promise<PreviewState>}
   */
  async restart() {
    await this.stop();
    return this.start();
  }
}

/**
 * Creates a new preview service for a project
 * @param {string} projectRoot
 * @returns {PreviewService}
 */
export function createPreviewService(projectRoot) {
  return new PreviewService(projectRoot);
}

export default {
  findAvailablePort,
  healthCheck,
  waitForServer,
  checkMkDocsAvailability,
  PreviewService,
  createPreviewService,
};
