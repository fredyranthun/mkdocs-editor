/**
 * StatusBar Component
 *
 * Bottom status bar showing current state and preview URL.
 */

export function StatusBar({ message, previewUrl }) {
  return (
    <footer id="status-bar" className="status-bar">
      <span className="status-message">{message}</span>
      {previewUrl && (
        <a className="preview-url" href={previewUrl} target="_blank" rel="noopener noreferrer">
          {previewUrl}
        </a>
      )}
    </footer>
  );
}

export default StatusBar;
