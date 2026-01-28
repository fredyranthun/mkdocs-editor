/**
 * PreviewPane Component
 *
 * Shows the mkdocs live preview using a webview tag.
 * Includes:
 * - Controls to start/stop/refresh the preview server
 * - Health-check and retry logic for slow startup
 * - Localhost-only navigation restriction for security
 * - File sync to navigate to the current file being edited
 */

import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Check if a URL is a safe localhost URL
 * @param {string} url
 * @returns {boolean}
 */
function isLocalhostUrl(url) {
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

export function PreviewPane({ status, currentFile, onStart, onStop, onRefresh }) {
  const webviewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds between retries

  // Handle webview events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setIsLoading(true);
      setLoadError(null);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
    };

    const handleDidFailLoad = (event) => {
      // Ignore aborted loads (e.g., when navigating away)
      if (event.errorCode === -3) return;

      setIsLoading(false);
      setLoadError(event.errorDescription || "Failed to load preview");

      // Retry if server might still be starting
      if (retryCount < maxRetries && status.status === "running") {
        setTimeout(() => {
          setRetryCount((c) => c + 1);
          if (webview && status.url) {
            webview.src = status.url;
          }
        }, retryDelay);
      }
    };

    const handleDidNavigate = (event) => {
      // Block navigation to non-localhost URLs for security
      if (!isLocalhostUrl(event.url)) {
        console.warn("[Preview] Blocked navigation to non-localhost URL:", event.url);
        if (status.url) {
          webview.src = status.url;
        }
      }
    };

    const handleWillNavigate = (event) => {
      // Block navigation to non-localhost URLs
      if (!isLocalhostUrl(event.url)) {
        event.preventDefault();
        console.warn("[Preview] Prevented navigation to:", event.url);
      }
    };

    const handleNewWindow = (event) => {
      // Prevent opening new windows, redirect to webview if localhost
      event.preventDefault();
      if (isLocalhostUrl(event.url)) {
        webview.src = event.url;
      } else {
        console.warn("[Preview] Blocked new window to:", event.url);
      }
    };

    // Add event listeners
    webview.addEventListener("did-start-loading", handleDidStartLoading);
    webview.addEventListener("did-stop-loading", handleDidStopLoading);
    webview.addEventListener("did-fail-load", handleDidFailLoad);
    webview.addEventListener("did-navigate", handleDidNavigate);
    webview.addEventListener("will-navigate", handleWillNavigate);
    webview.addEventListener("new-window", handleNewWindow);

    return () => {
      webview.removeEventListener("did-start-loading", handleDidStartLoading);
      webview.removeEventListener("did-stop-loading", handleDidStopLoading);
      webview.removeEventListener("did-fail-load", handleDidFailLoad);
      webview.removeEventListener("did-navigate", handleDidNavigate);
      webview.removeEventListener("will-navigate", handleWillNavigate);
      webview.removeEventListener("new-window", handleNewWindow);
    };
  }, [status.url, status.status, retryCount]);

  // Reset retry count when URL changes or server restarts
  useEffect(() => {
    setRetryCount(0);
    setLoadError(null);
  }, [status.url]);

  // Navigate to current file when it changes
  useEffect(() => {
    const navigateToFile = async () => {
      if (!currentFile || status.status !== "running" || !status.url) return;

      try {
        const pageUrl = await window.api.preview.getPageUrl(currentFile);
        if (pageUrl && webviewRef.current) {
          // Only navigate if URL is different to avoid unnecessary reloads
          const currentUrl = webviewRef.current.getURL?.() || "";
          if (currentUrl !== pageUrl) {
            webviewRef.current.src = pageUrl;
          }
        }
      } catch (err) {
        console.error("[Preview] Failed to get page URL:", err);
      }
    };

    navigateToFile();
  }, [currentFile, status.status, status.url]);

  const handleRefresh = useCallback(() => {
    setRetryCount(0);
    setLoadError(null);
    if (webviewRef.current && status.url) {
      webviewRef.current.reload();
    }
    onRefresh?.();
  }, [status.url, onRefresh]);

  const handleOpenExternal = useCallback(() => {
    if (status.url) {
      // Open in system browser
      window.open(status.url, "_blank");
    }
  }, [status.url]);

  const renderContent = () => {
    switch (status.status) {
      case "running":
        return (
          <>
            <webview
              ref={webviewRef}
              src={status.url}
              className="preview-webview"
              partition="preview"
              allowpopups="false"
            />
            {isLoading && (
              <div className="preview-loading-overlay">
                <span className="spinner">⏳</span>
                <p>Loading...</p>
              </div>
            )}
            {loadError && retryCount >= maxRetries && (
              <div className="preview-error-overlay">
                <span className="icon">⚠️</span>
                <p>Failed to load preview</p>
                <p className="error-detail">{loadError}</p>
                <button className="preview-button" onClick={handleRefresh}>
                  Retry
                </button>
              </div>
            )}
            {loadError && retryCount < maxRetries && (
              <div className="preview-loading-overlay">
                <span className="spinner">⏳</span>
                <p>
                  Waiting for server... (attempt {retryCount + 1}/{maxRetries})
                </p>
              </div>
            )}
          </>
        );

      case "starting":
        return (
          <div className="preview-message">
            <span className="spinner">⏳</span>
            <p>Starting preview server...</p>
            <p className="hint">This may take a moment on first run</p>
          </div>
        );

      case "error":
        return (
          <div className="preview-message error">
            <span className="icon">⚠️</span>
            <p>Preview server error</p>
            <p className="error-detail">{status.error}</p>
            <button className="preview-button" onClick={onStart}>
              Retry
            </button>
          </div>
        );

      case "stopped":
      default:
        return (
          <div className="preview-message">
            <span className="icon">👁️</span>
            <p>Preview is not running</p>
            <button className="preview-button" onClick={onStart}>
              Start Preview
            </button>
          </div>
        );
    }
  };

  return (
    <aside id="preview-pane" className="preview-pane">
      <header className="preview-header">
        <h2>Preview</h2>
        <div className="preview-controls">
          {status.status === "running" && (
            <>
              <button className="icon-button" onClick={handleRefresh} title="Refresh preview">
                🔄
              </button>
              <button className="icon-button" onClick={handleOpenExternal} title="Open in browser">
                🔗
              </button>
              <button className="icon-button" onClick={onStop} title="Stop preview server">
                ⏹️
              </button>
            </>
          )}
          {status.status !== "running" && status.status !== "starting" && (
            <button className="icon-button" onClick={onStart} title="Start preview server">
              ▶️
            </button>
          )}
        </div>
      </header>
      <div className="preview-content">{renderContent()}</div>
    </aside>
  );
}

export default PreviewPane;
