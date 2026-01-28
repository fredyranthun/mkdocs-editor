import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

// Services
import { loadProject } from "./main/services/ProjectLoader.js";
import {
  buildFileTree,
  readFile,
  writeFile,
  fileExists,
  createFile,
  deleteFile,
  renameFile,
  createDirectory,
  deleteDirectory,
  renameDirectory,
  copyAsset,
  listAssets,
  deleteAsset,
  getRelativeAssetPath,
} from "./main/services/FileSystemService.js";
import { createPreviewService, checkMkDocsAvailability } from "./main/services/MkDocsPreviewService.js";
import {
  createPythonEnvironmentService,
  checkPythonAvailability,
  detectProjectEnvironment,
} from "./main/services/PythonEnvironmentService.js";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Application state
let mainWindow = null;
let currentProject = null;
let previewService = null;
let pythonEnvService = null;

/**
 * Gets the docs directory path for the current project
 * @returns {string|null}
 */
function getDocsPath() {
  if (!currentProject) return null;
  return path.join(currentProject.projectRoot, currentProject.config.docsDir);
}

/**
 * Sets up IPC handlers for main process services
 */
function setupIpcHandlers() {
  // Project handlers
  ipcMain.handle("project:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Open MkDocs Project",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const projectPath = result.filePaths[0];
    return handleProjectLoad(projectPath);
  });

  ipcMain.handle("project:load", async (_event, projectPath) => {
    return handleProjectLoad(projectPath);
  });

  ipcMain.handle("project:getTree", async () => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return buildFileTree(docsPath);
  });

  ipcMain.handle("project:getCurrent", () => {
    if (!currentProject) return null;
    return {
      projectRoot: currentProject.projectRoot,
      config: currentProject.config,
    };
  });

  ipcMain.handle("project:close", async () => {
    await handleProjectClose();
  });

  // Page handlers
  ipcMain.handle("page:read", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return readFile(docsPath, relativePath);
  });

  ipcMain.handle("page:write", async (_event, relativePath, content) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return writeFile(docsPath, relativePath, content);
  });

  ipcMain.handle("page:exists", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return fileExists(docsPath, relativePath);
  });

  // Page CRUD handlers
  ipcMain.handle("page:create", async (_event, relativePath, content) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return createFile(docsPath, relativePath, content || "");
  });

  ipcMain.handle("page:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteFile(docsPath, relativePath);
  });

  ipcMain.handle("page:rename", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameFile(docsPath, oldPath, newPath);
  });

  ipcMain.handle("page:move", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameFile(docsPath, oldPath, newPath);
  });

  // Directory CRUD handlers
  ipcMain.handle("directory:create", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return createDirectory(docsPath, relativePath);
  });

  ipcMain.handle("directory:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteDirectory(docsPath, relativePath);
  });

  ipcMain.handle("directory:rename", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameDirectory(docsPath, oldPath, newPath);
  });

  // Asset handlers
  ipcMain.handle("asset:selectAndCopy", async (_event, currentFilePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }

    // Open file dialog to select image
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      title: "Select Image",
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const copyResult = await copyAsset(docsPath, sourcePath);

    // Calculate relative path from current file if provided
    const relativePath = currentFilePath
      ? getRelativeAssetPath(currentFilePath, copyResult.relativePath)
      : copyResult.relativePath;

    return {
      ...copyResult,
      markdownPath: relativePath,
    };
  });

  ipcMain.handle("asset:copy", async (_event, sourcePath, currentFilePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }

    const copyResult = await copyAsset(docsPath, sourcePath);

    // Calculate relative path from current file if provided
    const relativePath = currentFilePath
      ? getRelativeAssetPath(currentFilePath, copyResult.relativePath)
      : copyResult.relativePath;

    return {
      ...copyResult,
      markdownPath: relativePath,
    };
  });

  ipcMain.handle("asset:list", async () => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return listAssets(docsPath);
  });

  ipcMain.handle("asset:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteAsset(docsPath, relativePath);
  });

  ipcMain.handle("asset:getRelativePath", async (_event, markdownPath, assetPath) => {
    return getRelativeAssetPath(markdownPath, assetPath);
  });

  // Preview handlers
  ipcMain.handle("preview:start", async () => {
    if (!previewService) {
      throw new Error("No project loaded");
    }
    return previewService.start();
  });

  ipcMain.handle("preview:stop", async () => {
    if (!previewService) {
      return { status: "stopped" };
    }
    return previewService.stop();
  });

  ipcMain.handle("preview:restart", async () => {
    if (!previewService) {
      throw new Error("No project loaded");
    }
    return previewService.restart();
  });

  ipcMain.handle("preview:getStatus", () => {
    if (!previewService) {
      return { status: "stopped", url: null, port: null, error: null };
    }
    return previewService.getState();
  });

  ipcMain.handle("preview:getLogs", () => {
    if (!previewService) {
      return [];
    }
    return previewService.getLogs();
  });

  ipcMain.handle("preview:clearLogs", () => {
    if (previewService) {
      previewService.clearLogs();
    }
  });

  ipcMain.handle("preview:getPageUrl", (_event, relativePath) => {
    if (!previewService) {
      return null;
    }
    return previewService.getPageUrl(relativePath);
  });

  ipcMain.handle("preview:isHealthy", async () => {
    if (!previewService) {
      return false;
    }
    return previewService.isHealthy();
  });

  ipcMain.handle("preview:checkMkDocs", () => {
    return checkMkDocsAvailability();
  });

  // Python environment handlers
  ipcMain.handle("pythonEnv:checkPython", () => {
    return checkPythonAvailability();
  });

  ipcMain.handle("pythonEnv:detectProjectEnv", async (_event, projectPath) => {
    const targetPath = projectPath || (currentProject ? currentProject.projectRoot : null);
    if (!targetPath) {
      throw new Error("No project path provided and no project loaded");
    }
    return detectProjectEnvironment(targetPath);
  });

  ipcMain.handle("pythonEnv:getStatus", () => {
    if (!pythonEnvService) {
      return {
        status: "not-initialized",
        pythonPath: null,
        mkdocsPath: null,
        venvPath: null,
        error: null,
        envType: null,
      };
    }
    return pythonEnvService.getState();
  });

  ipcMain.handle("pythonEnv:ensure", async () => {
    if (!pythonEnvService) {
      throw new Error("No project loaded");
    }
    return pythonEnvService.ensureEnvironment();
  });

  ipcMain.handle("pythonEnv:reinstall", async () => {
    if (!pythonEnvService) {
      throw new Error("No project loaded");
    }
    return pythonEnvService.reinstall();
  });

  ipcMain.handle("pythonEnv:getLogs", () => {
    if (!pythonEnvService) {
      return [];
    }
    return pythonEnvService.getLogs();
  });

  // App handlers
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });
}

/**
 * Loads a project and sets up the preview service
 * @param {string} projectPath
 */
async function handleProjectLoad(projectPath) {
  // Close existing project if any
  await handleProjectClose();

  // Load the new project
  currentProject = await loadProject(projectPath);

  // Create Python environment service
  pythonEnvService = createPythonEnvironmentService(currentProject.projectRoot);

  // Forward Python env events to renderer
  pythonEnvService.on("status", (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("pythonEnv:status", status);
    }
  });

  pythonEnvService.on("log", (log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("pythonEnv:log", log);
    }
  });

  // Create preview service
  previewService = createPreviewService(currentProject.projectRoot, pythonEnvService);

  // Forward preview events to renderer
  previewService.on("status", (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("preview:status", status);
    }
  });

  previewService.on("log", (log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("preview:log", log);
    }
  });

  return {
    projectRoot: currentProject.projectRoot,
    config: currentProject.config,
  };
}

/**
 * Closes the current project
 */
async function handleProjectClose() {
  if (previewService) {
    await previewService.stop();
    previewService.destroy();
    previewService = null;
  }
  if (pythonEnvService) {
    pythonEnvService.removeAllListeners();
    pythonEnvService = null;
  }
  currentProject = null;
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for preload to work with ESM
      webviewTag: true, // Enable webview tag for preview pane
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools in development
  if (process.env.NODE_ENV !== "production") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Add security restrictions for webview content
  mainWindow.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    // Strip away preload scripts if not needed
    delete webPreferences.preload;
    delete webPreferences.preloadURL;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.contextIsolation = true;

    // Restrict webview to localhost URLs only
    const srcUrl = params.src;
    if (!isLocalhostUrl(srcUrl)) {
      console.warn("[Webview] Blocked non-localhost URL:", srcUrl);
      event.preventDefault();
    }
  });
};

/**
 * Check if a URL is a localhost URL (for webview security)
 * @param {string} url
 * @returns {boolean}
 */
function isLocalhostUrl(url) {
  if (!url || url === "about:blank") return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", async () => {
  // Clean up preview service before quitting
  await handleProjectClose();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app before-quit to ensure cleanup
app.on("before-quit", async () => {
  await handleProjectClose();
});
