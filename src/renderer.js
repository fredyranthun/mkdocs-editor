/**
 * Renderer - MaterialDocs Editor UI
 *
 * This is the main renderer process entry point.
 * Uses the preload API (window.api) for all main process communication.
 */

import "./index.css";

// State
let currentFile = null;
let isModified = false;
let originalContent = "";

// DOM Elements
const elements = {
  projectName: document.getElementById("project-name"),
  btnOpenProject: document.getElementById("btn-open-project"),
  btnSave: document.getElementById("btn-save"),
  btnRefreshTree: document.getElementById("btn-refresh-tree"),
  fileTree: document.getElementById("file-tree"),
  editorTitle: document.getElementById("editor-title"),
  editorStatus: document.getElementById("editor-status"),
  markdownEditor: document.getElementById("markdown-editor"),
  previewStatus: document.getElementById("preview-status"),
  btnRefreshPreview: document.getElementById("btn-refresh-preview"),
  btnStartPreview: document.getElementById("btn-start-preview"),
  btnStopPreview: document.getElementById("btn-stop-preview"),
  previewPlaceholder: document.getElementById("preview-placeholder"),
  previewFrame: document.getElementById("preview-frame"),
  statusMessage: document.getElementById("status-message"),
  previewUrl: document.getElementById("preview-url"),
};

/**
 * Initialize the application
 */
async function init() {
  setupEventListeners();
  setupPreviewListeners();

  // Check if there's an existing project loaded
  const project = await window.api.project.getCurrent();
  if (project) {
    await onProjectLoaded(project);
  }

  setStatus("Ready");
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
  // Open project button
  elements.btnOpenProject.addEventListener("click", async () => {
    try {
      setStatus("Opening project...");
      const project = await window.api.project.open();
      if (project) {
        await onProjectLoaded(project);
      } else {
        setStatus("Cancelled");
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      showError("Failed to open project", err.message);
    }
  });

  // Save button
  elements.btnSave.addEventListener("click", saveCurrentFile);

  // Refresh tree button
  elements.btnRefreshTree.addEventListener("click", refreshFileTree);

  // Editor changes
  elements.markdownEditor.addEventListener("input", () => {
    if (!currentFile) return;
    isModified = elements.markdownEditor.value !== originalContent;
    updateEditorStatus();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (currentFile && isModified) {
        saveCurrentFile();
      }
    }
  });

  // Preview controls
  elements.btnStartPreview.addEventListener("click", startPreview);
  elements.btnStopPreview.addEventListener("click", stopPreview);
  elements.btnRefreshPreview.addEventListener("click", refreshPreview);
}

/**
 * Set up listeners for preview status and logs
 */
function setupPreviewListeners() {
  window.api.preview.onStatus((status) => {
    updatePreviewUI(status);
  });

  window.api.preview.onLog((log) => {
    console.log("[Preview]", log);
  });
}

/**
 * Called when a project is loaded
 * @param {Object} project
 */
async function onProjectLoaded(project) {
  elements.projectName.textContent = project.config.siteName || "Untitled Project";
  setStatus(`Loaded: ${project.projectRoot}`);

  await refreshFileTree();

  // Check preview status
  const previewStatus = await window.api.preview.getStatus();
  updatePreviewUI(previewStatus);
}

/**
 * Refreshes the file tree
 */
async function refreshFileTree() {
  try {
    const tree = await window.api.project.getTree();
    renderFileTree(tree);
  } catch (err) {
    elements.fileTree.innerHTML = '<p class="empty-state">Failed to load files</p>';
    console.error("Failed to load file tree:", err);
  }
}

/**
 * Renders the file tree
 * @param {Array} nodes
 * @param {HTMLElement} container
 * @param {number} depth
 */
function renderFileTree(nodes, container = elements.fileTree, depth = 0) {
  if (container === elements.fileTree) {
    container.innerHTML = "";
  }

  if (!nodes || nodes.length === 0) {
    if (depth === 0) {
      container.innerHTML = '<p class="empty-state">No markdown files found</p>';
    }
    return;
  }

  nodes.forEach((node) => {
    const item = document.createElement("div");
    item.className = `file-tree-item ${node.type}`;
    item.dataset.path = node.path;
    item.style.paddingLeft = `${12 + depth * 16}px`;

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = node.type === "directory" ? "📁" : "📄";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = node.name;

    item.appendChild(icon);
    item.appendChild(name);
    container.appendChild(item);

    if (node.type === "file") {
      item.addEventListener("click", () => openFile(node.path));
    }

    if (node.type === "directory" && node.children) {
      const childContainer = document.createElement("div");
      childContainer.className = "file-tree-children";
      container.appendChild(childContainer);
      renderFileTree(node.children, childContainer, depth + 1);
    }
  });
}

/**
 * Opens a file in the editor
 * @param {string} path
 */
async function openFile(path) {
  // Check for unsaved changes
  if (isModified) {
    const shouldSave = confirm("You have unsaved changes. Save before opening another file?");
    if (shouldSave) {
      await saveCurrentFile();
    }
  }

  try {
    setStatus(`Opening ${path}...`);
    const file = await window.api.page.read(path);

    currentFile = path;
    originalContent = file.content;
    isModified = false;

    elements.markdownEditor.value = file.content;
    elements.markdownEditor.disabled = false;
    elements.editorTitle.textContent = path;
    updateEditorStatus();

    // Update file tree selection
    document.querySelectorAll(".file-tree-item").forEach((item) => {
      item.classList.toggle("selected", item.dataset.path === path);
    });

    setStatus(`Opened: ${path}`);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
    showError("Failed to open file", err.message);
  }
}

/**
 * Saves the current file
 */
async function saveCurrentFile() {
  if (!currentFile) return;

  try {
    setStatus("Saving...");
    const content = elements.markdownEditor.value;
    await window.api.page.write(currentFile, content);

    originalContent = content;
    isModified = false;
    updateEditorStatus();

    setStatus(`Saved: ${currentFile}`);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
    showError("Failed to save file", err.message);
  }
}

/**
 * Updates the editor status badge
 */
function updateEditorStatus() {
  elements.btnSave.disabled = !isModified;

  if (isModified) {
    elements.editorStatus.textContent = "Modified";
    elements.editorStatus.className = "status-badge status-modified";
  } else {
    elements.editorStatus.textContent = "";
    elements.editorStatus.className = "status-badge";
  }
}

/**
 * Starts the preview server
 */
async function startPreview() {
  try {
    setStatus("Starting preview server...");
    elements.btnStartPreview.disabled = true;
    await window.api.preview.start();
  } catch (err) {
    setStatus(`Preview error: ${err.message}`);
    elements.btnStartPreview.disabled = false;
  }
}

/**
 * Stops the preview server
 */
async function stopPreview() {
  try {
    setStatus("Stopping preview server...");
    await window.api.preview.stop();
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

/**
 * Refreshes the preview iframe
 */
function refreshPreview() {
  if (elements.previewFrame.src) {
    // Force reload by appending timestamp
    const url = new URL(elements.previewFrame.src);
    url.searchParams.set("_t", Date.now().toString());
    elements.previewFrame.src = url.toString();
    setStatus("Preview refreshed");
  }
}

/**
 * Updates the preview UI based on status
 * @param {Object} status
 */
function updatePreviewUI(status) {
  elements.previewStatus.textContent = status.status.charAt(0).toUpperCase() + status.status.slice(1);
  elements.previewStatus.className = `status-badge status-${status.status}`;

  const isRunning = status.status === "running";
  elements.btnStartPreview.disabled = isRunning || status.status === "starting";
  elements.btnStopPreview.disabled = status.status === "stopped" || status.status === "error";
  elements.btnRefreshPreview.disabled = !isRunning;

  if (status.status === "running" && status.url) {
    elements.previewPlaceholder.style.display = "none";
    elements.previewFrame.style.display = "block";

    // Only update src if changed to avoid reload
    if (elements.previewFrame.src !== status.url) {
      elements.previewFrame.src = status.url;
    }

    elements.previewUrl.textContent = status.url;
    setStatus(`Preview running at ${status.url}`);
  } else {
    elements.previewPlaceholder.style.display = "flex";
    elements.previewFrame.style.display = "none";
    elements.previewFrame.src = "";
    elements.previewUrl.textContent = "";

    if (status.status === "error") {
      setStatus(`Preview error: ${status.error}`);
    } else if (status.status === "starting") {
      setStatus("Preview starting...");
    } else {
      setStatus("Preview stopped");
    }
  }
}

/**
 * Sets the status bar message
 * @param {string} message
 */
function setStatus(message) {
  elements.statusMessage.textContent = message;
}

/**
 * Shows an error message (simple alert for MVP)
 * @param {string} title
 * @param {string} message
 */
function showError(title, message) {
  alert(`${title}\n\n${message}`);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
