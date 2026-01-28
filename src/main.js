import { app, BrowserWindow, ipcMain, dialog, session } from "electron";
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

// Security
import { VALID_INVOKE_CHANNELS, isValidInvokeChannel } from "./main/security/ipcChannelWhitelist.js";
import { isLocalhostUrl, getRendererCSP, getWebviewSecurityPrefs } from "./main/security/securityUtils.js";

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
 * All handlers are validated against the channel whitelist
 */
function setupIpcHandlers() {
  // Validate that we only register whitelisted channels
  const registerHandler = (channel, handler) => {
    if (!isValidInvokeChannel(channel)) {
      console.error(`[Security] Attempted to register non-whitelisted IPC channel: ${channel}`);
      return;
    }
    ipcMain.handle(channel, handler);
  };

  // Project handlers
  registerHandler("project:open", async () => {
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

  registerHandler("project:load", async (_event, projectPath) => {
    return handleProjectLoad(projectPath);
  });

  registerHandler("project:getTree", async () => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return buildFileTree(docsPath);
  });

  registerHandler("project:getCurrent", () => {
    if (!currentProject) return null;
    return {
      projectRoot: currentProject.projectRoot,
      config: currentProject.config,
    };
  });

  registerHandler("project:close", async () => {
    await handleProjectClose();
  });

  // Page handlers
  registerHandler("page:read", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return readFile(docsPath, relativePath);
  });

  registerHandler("page:write", async (_event, relativePath, content) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return writeFile(docsPath, relativePath, content);
  });

  registerHandler("page:exists", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return fileExists(docsPath, relativePath);
  });

  // Page CRUD handlers
  registerHandler("page:create", async (_event, relativePath, content) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return createFile(docsPath, relativePath, content || "");
  });

  registerHandler("page:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteFile(docsPath, relativePath);
  });

  registerHandler("page:rename", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameFile(docsPath, oldPath, newPath);
  });

  registerHandler("page:move", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameFile(docsPath, oldPath, newPath);
  });

  // Directory CRUD handlers
  registerHandler("directory:create", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return createDirectory(docsPath, relativePath);
  });

  registerHandler("directory:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteDirectory(docsPath, relativePath);
  });

  registerHandler("directory:rename", async (_event, oldPath, newPath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return renameDirectory(docsPath, oldPath, newPath);
  });

  // Asset handlers
  registerHandler("asset:selectAndCopy", async (_event, currentFilePath) => {
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

  registerHandler("asset:copy", async (_event, sourcePath, currentFilePath) => {
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

  registerHandler("asset:list", async () => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return listAssets(docsPath);
  });

  registerHandler("asset:delete", async (_event, relativePath) => {
    const docsPath = getDocsPath();
    if (!docsPath) {
      throw new Error("No project loaded");
    }
    return deleteAsset(docsPath, relativePath);
  });

  registerHandler("asset:getRelativePath", async (_event, markdownPath, assetPath) => {
    return getRelativeAssetPath(markdownPath, assetPath);
  });

  // Preview handlers
  registerHandler("preview:start", async () => {
    if (!previewService) {
      throw new Error("No project loaded");
    }
    return previewService.start();
  });

  registerHandler("preview:stop", async () => {
    if (!previewService) {
      return { status: "stopped" };
    }
    return previewService.stop();
  });

  registerHandler("preview:restart", async () => {
    if (!previewService) {
      throw new Error("No project loaded");
    }
    return previewService.restart();
  });

  registerHandler("preview:getStatus", () => {
    if (!previewService) {
      return { status: "stopped", url: null, port: null, error: null };
    }
    return previewService.getState();
  });

  registerHandler("preview:getLogs", () => {
    if (!previewService) {
      return [];
    }
    return previewService.getLogs();
  });

  registerHandler("preview:clearLogs", () => {
    if (previewService) {
      previewService.clearLogs();
    }
  });

  registerHandler("preview:getPageUrl", (_event, relativePath) => {
    if (!previewService) {
      return null;
    }
    return previewService.getPageUrl(relativePath);
  });

  registerHandler("preview:isHealthy", async () => {
    if (!previewService) {
      return false;
    }
    return previewService.isHealthy();
  });

  registerHandler("preview:checkMkDocs", () => {
    return checkMkDocsAvailability();
  });

  // Python environment handlers
  registerHandler("pythonEnv:checkPython", () => {
    return checkPythonAvailability();
  });

  registerHandler("pythonEnv:detectProjectEnv", async (_event, projectPath) => {
    const targetPath = projectPath || (currentProject ? currentProject.projectRoot : null);
    if (!targetPath) {
      throw new Error("No project path provided and no project loaded");
    }
    return detectProjectEnvironment(targetPath);
  });

  registerHandler("pythonEnv:getStatus", () => {
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

  registerHandler("pythonEnv:ensure", async () => {
    if (!pythonEnvService) {
      throw new Error("No project loaded");
    }
    return pythonEnvService.ensureEnvironment();
  });

  registerHandler("pythonEnv:reinstall", async () => {
    if (!pythonEnvService) {
      throw new Error("No project loaded");
    }
    return pythonEnvService.reinstall();
  });

  registerHandler("pythonEnv:getLogs", () => {
    if (!pythonEnvService) {
      return [];
    }
    return pythonEnvService.getLogs();
  });

  // App handlers
  registerHandler("app:getVersion", () => {
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
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: false, // Required for preload to work with ESM
      webviewTag: true, // Enable webview tag for preview pane
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: "",
    },
  });

  // Set up Content Security Policy for renderer
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [getRendererCSP()],
      },
    });
  });

  // Block navigation to external URLs in the main window
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    // Allow navigation to dev server URL in development
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL && navigationUrl.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL)) {
      return;
    }
    // Allow file:// URLs for production
    if (navigationUrl.startsWith("file://")) {
      return;
    }
    // Block all other external navigations
    console.warn("[Security] Blocked navigation to:", navigationUrl);
    event.preventDefault();
  });

  // Block new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow opening localhost URLs in preview (redirected to webview)
    if (isLocalhostUrl(url)) {
      return { action: "deny" };
    }
    console.warn("[Security] Blocked window open to:", url);
    return { action: "deny" };
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

    // Apply strict security preferences for webview
    const securityPrefs = getWebviewSecurityPrefs();
    Object.assign(webPreferences, securityPrefs);

    // Restrict webview to localhost URLs only
    const srcUrl = params.src;
    if (!isLocalhostUrl(srcUrl)) {
      console.warn("[Security] Blocked webview with non-localhost URL:", srcUrl);
      event.preventDefault();
    }
  });
};

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
