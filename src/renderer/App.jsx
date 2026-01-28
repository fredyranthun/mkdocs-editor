/**
 * Main App Component - MaterialDocs Editor
 *
 * Root component that manages the three-pane layout:
 * - Sidebar (file tree)
 * - Editor (Milkdown WYSIWYG)
 * - Preview (mkdocs serve iframe)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { EditorPane } from "./components/EditorPane";
import { PreviewPane } from "./components/PreviewPane";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { useMarkdownPipeline } from "./hooks/useMarkdownPipeline";
import { useExtensionFeatures } from "./hooks/useExtensionFeatures";
import "./styles/App.css";

export function App() {
  // Project state
  const [project, setProject] = useState(null);
  const [fileTree, setFileTree] = useState([]);

  // File state
  const [currentFile, setCurrentFile] = useState(null);

  // Markdown pipeline for import/export with formatting
  const { editorContent, loadContent, exportContent, updateContent, hasChanges, markSaved, getMetadata } =
    useMarkdownPipeline();

  // Extension features - checks mkdocs.yml for enabled extensions
  const { features, guidance, hasProject } = useExtensionFeatures(project?.config);

  // Track modification state
  const [isModified, setIsModified] = useState(false);

  // Preview state
  const [previewStatus, setPreviewStatus] = useState({
    status: "stopped",
    url: null,
    port: null,
    error: null,
  });

  // UI state
  const [statusMessage, setStatusMessage] = useState("Ready");

  // Load initial state
  useEffect(() => {
    async function loadInitialState() {
      const currentProject = await window.api.project.getCurrent();
      if (currentProject) {
        setProject(currentProject);
        await refreshFileTree();
      }

      const status = await window.api.preview.getStatus();
      setPreviewStatus(status);
    }

    loadInitialState();

    // Subscribe to preview status changes
    const unsubscribeStatus = window.api.preview.onStatus((status) => {
      setPreviewStatus(status);
    });

    const unsubscribeLog = window.api.preview.onLog((log) => {
      console.log("[Preview]", log);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLog();
    };
  }, []);

  // Refresh file tree
  const refreshFileTree = useCallback(async () => {
    try {
      const tree = await window.api.project.getTree();
      setFileTree(tree);
    } catch (err) {
      console.error("Failed to refresh file tree:", err);
      setFileTree([]);
    }
  }, []);

  // Open project
  const handleOpenProject = useCallback(async () => {
    try {
      setStatusMessage("Opening project...");
      const newProject = await window.api.project.open();
      if (newProject) {
        setProject(newProject);
        setCurrentFile(null);
        loadContent(""); // Reset editor content
        setIsModified(false);
        await refreshFileTree();
        setStatusMessage(`Loaded: ${newProject.projectRoot}`);
      } else {
        setStatusMessage("Cancelled");
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  }, [refreshFileTree, loadContent]);

  // Open file with markdown pipeline preprocessing
  const handleOpenFile = useCallback(
    async (filePath) => {
      // Check for unsaved changes
      if (isModified) {
        const shouldSave = window.confirm("You have unsaved changes. Save before opening another file?");
        if (shouldSave) {
          await handleSaveFile();
        }
      }

      try {
        setStatusMessage(`Opening ${filePath}...`);
        const file = await window.api.page.read(filePath);
        setCurrentFile(filePath);
        // Use pipeline to preprocess content (extract front matter, normalize)
        loadContent(file.content);
        setIsModified(false);
        setStatusMessage(`Opened: ${filePath}`);
      } catch (err) {
        setStatusMessage(`Error: ${err.message}`);
      }
    },
    [isModified, loadContent],
  );

  // Save file with markdown pipeline postprocessing
  const handleSaveFile = useCallback(async () => {
    if (!currentFile) return;

    try {
      setStatusMessage("Saving...");
      // Use pipeline to export with formatting rules and restore front matter
      const contentToSave = exportContent(editorContent);
      await window.api.page.write(currentFile, contentToSave);
      markSaved(contentToSave);
      setIsModified(false);
      setStatusMessage(`Saved: ${currentFile}`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  }, [currentFile, editorContent, exportContent, markSaved]);

  // Handle content change from editor
  const handleContentChange = useCallback(
    (newContent) => {
      updateContent(newContent);
      setIsModified(hasChanges(newContent));
    },
    [updateContent, hasChanges],
  );

  // Preview controls
  const handleStartPreview = useCallback(async () => {
    try {
      setStatusMessage("Starting preview server...");
      await window.api.preview.start();
    } catch (err) {
      setStatusMessage(`Preview error: ${err.message}`);
    }
  }, []);

  const handleStopPreview = useCallback(async () => {
    try {
      setStatusMessage("Stopping preview server...");
      await window.api.preview.stop();
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  }, []);

  const handleRefreshPreview = useCallback(() => {
    // This will be handled by PreviewPane
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (currentFile && isModified) {
          handleSaveFile();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentFile, isModified, handleSaveFile]);

  return (
    <div id="app">
      <Header
        projectName={project?.config?.siteName || "No project open"}
        onOpenProject={handleOpenProject}
        onSave={handleSaveFile}
        canSave={isModified}
      />

      <main id="main-content">
        <Sidebar
          fileTree={fileTree}
          currentFile={currentFile}
          onFileSelect={handleOpenFile}
          onRefresh={refreshFileTree}
        />

        <EditorPane
          filePath={currentFile}
          content={editorContent}
          isModified={isModified}
          onChange={handleContentChange}
          projectConfig={project?.config}
          features={features}
          guidance={guidance}
          hasProject={hasProject}
        />

        <PreviewPane
          status={previewStatus}
          currentFile={currentFile}
          onStart={handleStartPreview}
          onStop={handleStopPreview}
          onRefresh={handleRefreshPreview}
        />
      </main>

      <StatusBar message={statusMessage} previewUrl={previewStatus.url} />
    </div>
  );
}

export default App;
