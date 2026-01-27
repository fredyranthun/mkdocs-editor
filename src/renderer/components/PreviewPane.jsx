/**
 * PreviewPane Component
 *
 * Shows the mkdocs live preview in an iframe.
 * Includes controls to start/stop/refresh the preview server.
 */

import { useRef, useCallback } from "react";

export function PreviewPane({ status, onStart, onStop, onRefresh }) {
  const iframeRef = useRef(null);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && status.url) {
      iframeRef.current.src = status.url;
    }
    onRefresh?.();
  }, [status.url, onRefresh]);

  const renderContent = () => {
    switch (status.status) {
      case "running":
        return (
          <iframe
            ref={iframeRef}
            src={status.url}
            className="preview-iframe"
            title="MkDocs Preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        );

      case "starting":
        return (
          <div className="preview-message">
            <span className="spinner">⏳</span>
            <p>Starting preview server...</p>
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
