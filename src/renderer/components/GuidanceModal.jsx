/**
 * GuidanceModal Component
 *
 * Modal dialog showing how to enable Material extensions in mkdocs.yml
 * when features are not available.
 */

/**
 * GuidanceModal displays configuration guidance for Material extensions
 */
export function GuidanceModal({ feature, guidance, features, onClose }) {
  // Determine which guidance to show
  const guidanceItems = feature === "all" ? Object.values(guidance) : guidance[feature] ? [guidance[feature]] : [];

  if (guidanceItems.length === 0) {
    // No guidance needed - all features enabled
    return (
      <div className="guidance-modal-overlay" onClick={onClose}>
        <div className="guidance-modal" onClick={(e) => e.stopPropagation()}>
          <header className="guidance-header">
            <h2>All Features Enabled</h2>
            <button className="guidance-close" onClick={onClose} type="button">
              ×
            </button>
          </header>
          <div className="guidance-content">
            <p className="guidance-success">✅ All Material extensions are properly configured in your mkdocs.yml!</p>
          </div>
          <footer className="guidance-footer">
            <button className="guidance-button primary" onClick={onClose} type="button">
              Close
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="guidance-modal-overlay" onClick={onClose}>
      <div className="guidance-modal" onClick={(e) => e.stopPropagation()}>
        <header className="guidance-header">
          <h2>Enable Material Extensions</h2>
          <button className="guidance-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="guidance-content">
          <p className="guidance-intro">
            Some features require additional configuration in your <code>mkdocs.yml</code> file. Add the following to
            enable them:
          </p>

          {guidanceItems.map((item, index) => (
            <div key={index} className="guidance-item">
              <h3 className="guidance-feature-title">
                <span className="feature-status disabled">○</span>
                {item.feature}
              </h3>
              <pre className="guidance-code">
                <code>{item.message}</code>
              </pre>
              <button
                className="guidance-copy"
                onClick={() => copyToClipboard(extractYamlFromMessage(item.message))}
                type="button"
              >
                📋 Copy YAML
              </button>
            </div>
          ))}

          <div className="guidance-enabled">
            <h3>Currently Enabled</h3>
            <ul className="feature-list">
              {features.admonitions && (
                <li>
                  <span className="feature-status enabled">●</span> Admonitions
                </li>
              )}
              {features.mermaid && (
                <li>
                  <span className="feature-status enabled">●</span> Mermaid Diagrams
                </li>
              )}
              {features.codeHighlight && (
                <li>
                  <span className="feature-status enabled">●</span> Code Highlighting
                </li>
              )}
              {features.superfences && (
                <li>
                  <span className="feature-status enabled">●</span> SuperFences
                </li>
              )}
            </ul>
          </div>
        </div>

        <footer className="guidance-footer">
          <p className="guidance-note">After updating mkdocs.yml, restart the preview server to see changes.</p>
          <button className="guidance-button primary" onClick={onClose} type="button">
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Extract YAML portion from guidance message
 */
function extractYamlFromMessage(message) {
  // Find the YAML content after the instruction text
  const lines = message.split("\n");
  const yamlLines = [];
  let inYaml = false;

  for (const line of lines) {
    if (line.trim().endsWith(":") || line.startsWith("  - ") || line.startsWith("    ")) {
      inYaml = true;
    }
    if (inYaml || line.startsWith("markdown_extensions") || line.startsWith("extra_javascript")) {
      yamlLines.push(line);
    }
  }

  return yamlLines.join("\n").trim();
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

export default GuidanceModal;
