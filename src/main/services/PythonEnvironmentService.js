/**
 * PythonEnvironmentService - Main process service for managing Python environments
 *
 * Responsibilities:
 * - Detect system Python installation
 * - Detect existing project environments (requirements.txt, poetry, pyproject.toml)
 * - Create and manage project-local venv (.materialdocs-venv)
 * - Install mkdocs-material and dependencies
 * - Provide environment paths for MkDocs execution
 */

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import process from "node:process";

/**
 * @typedef {'not-initialized'|'checking'|'ready'|'creating'|'installing'|'error'} EnvStatus
 */

/**
 * @typedef {Object} EnvState
 * @property {EnvStatus} status
 * @property {string|null} pythonPath - Path to Python executable
 * @property {string|null} mkdocsPath - Path to mkdocs executable
 * @property {string|null} venvPath - Path to venv directory
 * @property {string|null} error - Error message if status is 'error'
 * @property {'system'|'project-venv'|'app-venv'|null} envType - Type of environment being used
 */

/**
 * @typedef {Object} PythonInfo
 * @property {boolean} available
 * @property {string|null} path
 * @property {string|null} version
 * @property {string|null} error
 */

/**
 * @typedef {Object} ProjectEnvInfo
 * @property {boolean} hasRequirements - Has requirements.txt
 * @property {boolean} hasPoetry - Has poetry.lock or pyproject.toml with [tool.poetry]
 * @property {boolean} hasPipenv - Has Pipfile
 * @property {boolean} hasVenv - Has existing .venv or venv directory
 * @property {boolean} hasAppVenv - Has .materialdocs-venv
 * @property {string|null} existingVenvPath - Path to existing venv if found
 */

const VENV_DIR_NAME = ".materialdocs-venv";
const REQUIRED_PACKAGES = ["mkdocs-material"];

/**
 * Gets the shell PATH that includes common Python locations
 * @returns {string}
 */
function getEnhancedPath() {
  const currentPath = process.env.PATH || "";
  const home = process.env.HOME || "";

  const additionalPaths = [
    `${home}/.local/bin`,
    `${home}/.pyenv/shims`,
    `${home}/.pyenv/bin`,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
  ].filter(Boolean);

  return [...additionalPaths, currentPath].join(":");
}

/**
 * Executes a command and returns the result
 * @param {string} command
 * @param {Object} options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, [], {
      shell: true,
      env: { ...process.env, PATH: getEnhancedPath(), ...options.env },
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Executes a command synchronously
 * @param {string} command
 * @param {Object} options
 * @returns {string|null}
 */
function execSync_(command, options = {}) {
  try {
    return execSync(command, {
      encoding: "utf-8",
      env: { ...process.env, PATH: getEnhancedPath(), ...options.env },
      cwd: options.cwd,
      timeout: options.timeout || 30000,
      shell: true,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Checks if Python is available on the system
 * @returns {PythonInfo}
 */
export function checkPythonAvailability() {
  // Try python3 first, then python
  const pythonCommands = ["python3", "python"];

  for (const cmd of pythonCommands) {
    try {
      const version = execSync_(`${cmd} --version`);
      if (version && version.includes("Python")) {
        // Verify it's Python 3.x
        const versionMatch = version.match(/Python (\d+)\.(\d+)/);
        if (versionMatch && parseInt(versionMatch[1], 10) >= 3) {
          const pythonPath = execSync_(`which ${cmd}`) || cmd;
          return {
            available: true,
            path: pythonPath,
            version,
            error: null,
          };
        }
      }
    } catch {
      // Continue to next command
    }
  }

  return {
    available: false,
    path: null,
    version: null,
    error: "Python 3 not found. Please install Python 3.8 or later.",
  };
}

/**
 * Detects existing Python environments in a project
 * @param {string} projectRoot
 * @returns {Promise<ProjectEnvInfo>}
 */
export async function detectProjectEnvironment(projectRoot) {
  const info = {
    hasRequirements: false,
    hasPoetry: false,
    hasPipenv: false,
    hasVenv: false,
    hasAppVenv: false,
    existingVenvPath: null,
  };

  // Check for requirements.txt
  try {
    await fs.promises.access(path.join(projectRoot, "requirements.txt"));
    info.hasRequirements = true;
  } catch {
    // Not found
  }

  // Check for poetry (poetry.lock or pyproject.toml with [tool.poetry])
  try {
    await fs.promises.access(path.join(projectRoot, "poetry.lock"));
    info.hasPoetry = true;
  } catch {
    // Check pyproject.toml
    try {
      const pyproject = await fs.promises.readFile(path.join(projectRoot, "pyproject.toml"), "utf-8");
      if (pyproject.includes("[tool.poetry]")) {
        info.hasPoetry = true;
      }
    } catch {
      // Not found
    }
  }

  // Check for Pipenv
  try {
    await fs.promises.access(path.join(projectRoot, "Pipfile"));
    info.hasPipenv = true;
  } catch {
    // Not found
  }

  // Check for existing venv directories
  const venvDirs = [".venv", "venv", ".materialdocs-venv"];
  for (const venvDir of venvDirs) {
    const venvPath = path.join(projectRoot, venvDir);
    try {
      const stat = await fs.promises.stat(venvPath);
      if (stat.isDirectory()) {
        // Verify it's a valid venv by checking for python
        const pythonInVenv = getPythonInVenv(venvPath);
        try {
          await fs.promises.access(pythonInVenv, fs.constants.X_OK);
          if (venvDir === VENV_DIR_NAME) {
            info.hasAppVenv = true;
          } else {
            info.hasVenv = true;
          }
          if (!info.existingVenvPath) {
            info.existingVenvPath = venvPath;
          }
        } catch {
          // Not a valid venv
        }
      }
    } catch {
      // Not found
    }
  }

  // Prefer app venv if it exists
  if (info.hasAppVenv) {
    info.existingVenvPath = path.join(projectRoot, VENV_DIR_NAME);
  }

  return info;
}

/**
 * Gets the Python executable path inside a venv
 * @param {string} venvPath
 * @returns {string}
 */
function getPythonInVenv(venvPath) {
  // On Windows, it's Scripts/python.exe; on Unix, it's bin/python
  return process.platform === "win32"
    ? path.join(venvPath, "Scripts", "python.exe")
    : path.join(venvPath, "bin", "python");
}

/**
 * Gets the pip executable path inside a venv
 * @param {string} venvPath
 * @returns {string}
 */
function getPipInVenv(venvPath) {
  return process.platform === "win32" ? path.join(venvPath, "Scripts", "pip.exe") : path.join(venvPath, "bin", "pip");
}

/**
 * Gets the mkdocs executable path inside a venv
 * @param {string} venvPath
 * @returns {string}
 */
function getMkDocsInVenv(venvPath) {
  return process.platform === "win32"
    ? path.join(venvPath, "Scripts", "mkdocs.exe")
    : path.join(venvPath, "bin", "mkdocs");
}

/**
 * Checks if mkdocs is available in a venv
 * @param {string} venvPath
 * @returns {Promise<boolean>}
 */
async function isMkDocsInVenv(venvPath) {
  const mkdocsPath = getMkDocsInVenv(venvPath);
  try {
    await fs.promises.access(mkdocsPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Python Environment Service class
 */
export class PythonEnvironmentService extends EventEmitter {
  /**
   * @param {string} projectRoot - Absolute path to project root
   */
  constructor(projectRoot) {
    super();
    this.projectRoot = projectRoot;
    this.state = {
      status: "not-initialized",
      pythonPath: null,
      mkdocsPath: null,
      venvPath: null,
      error: null,
      envType: null,
    };
    this.logs = [];
  }

  /**
   * Gets current state
   * @returns {EnvState}
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
   * @param {Partial<EnvState>} updates
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
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    this.emit("log", entry);
  }

  /**
   * Gets the venv path for this project
   * @returns {string}
   */
  getAppVenvPath() {
    return path.join(this.projectRoot, VENV_DIR_NAME);
  }

  /**
   * Initializes and ensures the Python environment is ready
   * This will:
   * 1. Check for Python availability
   * 2. Detect existing project environments
   * 3. Create app venv if needed
   * 4. Install mkdocs-material if needed
   * @returns {Promise<EnvState>}
   */
  async ensureEnvironment() {
    this._updateState({ status: "checking" });
    this._addLog("Checking Python environment...");

    // Step 1: Check Python availability
    const pythonInfo = checkPythonAvailability();
    if (!pythonInfo.available) {
      this._addLog(`Python not available: ${pythonInfo.error}`);
      this._updateState({
        status: "error",
        error: pythonInfo.error,
      });
      return this.getState();
    }

    this._addLog(`Found Python: ${pythonInfo.version} at ${pythonInfo.path}`);
    this._updateState({ pythonPath: pythonInfo.path });

    // Step 2: Detect project environment
    const projectEnv = await detectProjectEnvironment(this.projectRoot);
    this._addLog(`Project environment detection: ${JSON.stringify(projectEnv)}`);

    // Step 3: Determine which environment to use
    // Priority: existing app venv > existing project venv with mkdocs > create new app venv

    // Check app venv first
    const appVenvPath = this.getAppVenvPath();
    if (projectEnv.hasAppVenv) {
      this._addLog(`Found existing app venv at ${appVenvPath}`);
      const hasMkDocs = await isMkDocsInVenv(appVenvPath);
      if (hasMkDocs) {
        this._addLog("MkDocs already installed in app venv");
        return this._finalizeEnv(appVenvPath, "app-venv");
      } else {
        this._addLog("App venv exists but MkDocs not installed, will install...");
        return this._installMkDocsInVenv(appVenvPath, "app-venv");
      }
    }

    // Check if existing project venv has mkdocs
    if (projectEnv.hasVenv && projectEnv.existingVenvPath) {
      this._addLog(`Found existing project venv at ${projectEnv.existingVenvPath}`);
      const hasMkDocs = await isMkDocsInVenv(projectEnv.existingVenvPath);
      if (hasMkDocs) {
        this._addLog("MkDocs found in project venv, using it");
        return this._finalizeEnv(projectEnv.existingVenvPath, "project-venv");
      }
      this._addLog("Project venv exists but no MkDocs, will create app venv");
    }

    // Check if mkdocs is available system-wide
    const systemMkDocs = this._checkSystemMkDocs();
    if (systemMkDocs) {
      this._addLog(`Found system MkDocs: ${systemMkDocs.version}`);
      // Still prefer to create a controlled venv for consistency
      this._addLog("Creating app venv for isolated environment...");
    }

    // Create new app venv
    return this._createAndSetupVenv();
  }

  /**
   * Checks if MkDocs is available system-wide
   * @returns {{available: boolean, path?: string, version?: string}|null}
   */
  _checkSystemMkDocs() {
    try {
      const version = execSync_("mkdocs --version");
      if (version) {
        const mkdocsPath = execSync_("which mkdocs") || "mkdocs";
        return { available: true, path: mkdocsPath, version };
      }
    } catch {
      // Not available
    }
    return null;
  }

  /**
   * Creates a new venv and installs mkdocs-material
   * @returns {Promise<EnvState>}
   */
  async _createAndSetupVenv() {
    const venvPath = this.getAppVenvPath();
    this._updateState({ status: "creating" });
    this._addLog(`Creating virtual environment at ${venvPath}...`);

    try {
      // Create venv
      const createResult = await execCommand(`"${this.state.pythonPath}" -m venv "${venvPath}"`, {
        cwd: this.projectRoot,
      });

      if (createResult.code !== 0) {
        throw new Error(`Failed to create venv: ${createResult.stderr || createResult.stdout}`);
      }

      this._addLog("Virtual environment created successfully");

      // Install mkdocs-material
      return this._installMkDocsInVenv(venvPath, "app-venv");
    } catch (err) {
      this._addLog(`Error creating venv: ${err.message}`);
      this._updateState({
        status: "error",
        error: `Failed to create virtual environment: ${err.message}`,
      });
      return this.getState();
    }
  }

  /**
   * Installs mkdocs-material in a venv
   * @param {string} venvPath
   * @param {'app-venv'|'project-venv'} envType
   * @returns {Promise<EnvState>}
   */
  async _installMkDocsInVenv(venvPath, envType) {
    this._updateState({ status: "installing" });
    this._addLog(`Installing ${REQUIRED_PACKAGES.join(", ")} in ${venvPath}...`);

    const pipPath = getPipInVenv(venvPath);

    try {
      // Upgrade pip first
      this._addLog("Upgrading pip...");
      const upgradePip = await execCommand(`"${pipPath}" install --upgrade pip`, { cwd: this.projectRoot });
      if (upgradePip.code !== 0) {
        this._addLog(`Warning: pip upgrade failed: ${upgradePip.stderr}`);
      }

      // Install mkdocs-material
      this._addLog(`Installing ${REQUIRED_PACKAGES.join(", ")}...`);
      const installResult = await this._runPipInstall(pipPath, REQUIRED_PACKAGES);

      if (installResult.code !== 0) {
        throw new Error(`Failed to install packages: ${installResult.stderr || installResult.stdout}`);
      }

      this._addLog("Packages installed successfully");

      return this._finalizeEnv(venvPath, envType);
    } catch (err) {
      this._addLog(`Error installing packages: ${err.message}`);
      this._updateState({
        status: "error",
        error: `Failed to install MkDocs: ${err.message}`,
      });
      return this.getState();
    }
  }

  /**
   * Runs pip install with progress logging
   * @param {string} pipPath
   * @param {string[]} packages
   * @returns {Promise<{code: number, stdout: string, stderr: string}>}
   */
  async _runPipInstall(pipPath, packages) {
    return new Promise((resolve) => {
      const proc = spawn(`"${pipPath}"`, ["install", ...packages], {
        shell: true,
        cwd: this.projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        // Log progress
        const lines = text.split("\n").filter(Boolean);
        lines.forEach((line) => {
          if (line.includes("Collecting") || line.includes("Installing") || line.includes("Successfully")) {
            this._addLog(`[pip] ${line.trim()}`);
          }
        });
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      proc.on("error", (err) => {
        resolve({ code: 1, stdout: "", stderr: err.message });
      });
    });
  }

  /**
   * Finalizes environment setup
   * @param {string} venvPath
   * @param {'app-venv'|'project-venv'|'system'} envType
   * @returns {Promise<EnvState>}
   */
  async _finalizeEnv(venvPath, envType) {
    const pythonPath = getPythonInVenv(venvPath);
    const mkdocsPath = getMkDocsInVenv(venvPath);

    // Verify mkdocs is working
    try {
      const result = await execCommand(`"${mkdocsPath}" --version`);
      if (result.code === 0) {
        this._addLog(`MkDocs ready: ${result.stdout}`);
        this._updateState({
          status: "ready",
          pythonPath,
          mkdocsPath,
          venvPath,
          envType,
          error: null,
        });
      } else {
        throw new Error(result.stderr || "mkdocs --version failed");
      }
    } catch (err) {
      this._addLog(`Error verifying MkDocs: ${err.message}`);
      this._updateState({
        status: "error",
        error: `MkDocs verification failed: ${err.message}`,
      });
    }

    return this.getState();
  }

  /**
   * Reinstalls MkDocs in the app venv (useful for fixing corrupted installs)
   * @returns {Promise<EnvState>}
   */
  async reinstall() {
    const venvPath = this.getAppVenvPath();

    // Remove existing venv
    try {
      this._addLog(`Removing existing venv at ${venvPath}...`);
      await fs.promises.rm(venvPath, { recursive: true, force: true });
      this._addLog("Existing venv removed");
    } catch (err) {
      this._addLog(`Warning: Could not remove venv: ${err.message}`);
    }

    // Create fresh venv
    return this._createAndSetupVenv();
  }

  /**
   * Gets environment variables for running mkdocs
   * @returns {Object}
   */
  getEnvVars() {
    if (!this.state.venvPath) {
      return { PATH: getEnhancedPath() };
    }

    const binDir =
      process.platform === "win32" ? path.join(this.state.venvPath, "Scripts") : path.join(this.state.venvPath, "bin");

    return {
      PATH: `${binDir}:${getEnhancedPath()}`,
      VIRTUAL_ENV: this.state.venvPath,
    };
  }
}

/**
 * Creates a new Python environment service for a project
 * @param {string} projectRoot
 * @returns {PythonEnvironmentService}
 */
export function createPythonEnvironmentService(projectRoot) {
  return new PythonEnvironmentService(projectRoot);
}

export default {
  checkPythonAvailability,
  detectProjectEnvironment,
  PythonEnvironmentService,
  createPythonEnvironmentService,
};
