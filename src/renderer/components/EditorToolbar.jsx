/**
 * EditorToolbar Component
 *
 * Extension-aware toolbar for inserting Material blocks:
 * - Admonitions (callouts)
 * - Mermaid diagrams
 * - Code blocks
 *
 * Buttons are disabled when extensions are not configured in mkdocs.yml,
 * with guidance on how to enable them.
 */

import { useState, useCallback } from "react";
import { ADMONITION_TYPES, MERMAID_TEMPLATES, COMMON_LANGUAGES } from "../lib/milkdown";
import { GuidanceModal } from "./GuidanceModal";

/**
 * Toolbar button component with disabled state and tooltip
 */
function ToolbarButton({ icon, label, onClick, disabled, title, dropdown, children }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (dropdown) {
      setIsOpen(!isOpen);
    } else {
      onClick?.();
    }
  }, [disabled, dropdown, isOpen, onClick]);

  const handleSelect = useCallback(
    (value) => {
      onClick?.(value);
      setIsOpen(false);
    },
    [onClick],
  );

  return (
    <div className={`toolbar-button-wrapper ${isOpen ? "open" : ""}`}>
      <button
        className={`toolbar-button ${disabled ? "disabled" : ""}`}
        onClick={handleClick}
        title={title}
        disabled={disabled}
        type="button"
      >
        <span className="toolbar-icon">{icon}</span>
        <span className="toolbar-label">{label}</span>
        {dropdown && <span className="toolbar-dropdown-arrow">▼</span>}
      </button>
      {dropdown && isOpen && (
        <div className="toolbar-dropdown">
          {children?.({ onSelect: handleSelect, onClose: () => setIsOpen(false) })}
        </div>
      )}
    </div>
  );
}

/**
 * Dropdown menu for selecting admonition type
 */
function AdmonitionDropdown({ onSelect, onClose }) {
  return (
    <div className="dropdown-menu admonition-dropdown">
      <div className="dropdown-header">Select Admonition Type</div>
      <div className="dropdown-grid">
        {ADMONITION_TYPES.map((type) => (
          <button
            key={type.type}
            className={`dropdown-item admonition-item admonition-${type.type}`}
            onClick={() => onSelect({ type: type.type })}
            type="button"
          >
            <span className="dropdown-icon">{type.icon}</span>
            <span className="dropdown-label">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dropdown menu for selecting mermaid diagram type
 */
function MermaidDropdown({ onSelect, onClose }) {
  return (
    <div className="dropdown-menu mermaid-dropdown">
      <div className="dropdown-header">Select Diagram Type</div>
      <div className="dropdown-list">
        {Object.entries(MERMAID_TEMPLATES).map(([key, template]) => (
          <button key={key} className="dropdown-item" onClick={() => onSelect({ template: key })} type="button">
            <span className="dropdown-label">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dropdown menu for selecting code language
 */
function CodeBlockDropdown({ onSelect, onClose }) {
  const [filter, setFilter] = useState("");

  const filteredLanguages = COMMON_LANGUAGES.filter(
    (lang) =>
      lang.label.toLowerCase().includes(filter.toLowerCase()) ||
      lang.value.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="dropdown-menu code-dropdown">
      <div className="dropdown-header">Select Language</div>
      <input
        type="text"
        className="dropdown-search"
        placeholder="Search languages..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <div className="dropdown-list">
        {filteredLanguages.slice(0, 15).map((lang) => (
          <button
            key={lang.value}
            className="dropdown-item"
            onClick={() => onSelect({ language: lang.value })}
            type="button"
          >
            <span className="dropdown-label">{lang.label}</span>
            {lang.value && <span className="dropdown-hint">{lang.value}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Main EditorToolbar component
 */
export function EditorToolbar({
  features,
  guidance,
  hasProject,
  onInsertAdmonition,
  onInsertMermaid,
  onInsertCodeBlock,
  onInsertImage,
  onViewSource,
  disabled,
}) {
  const [showGuidance, setShowGuidance] = useState(null);

  // Handle button click - either perform action or show guidance
  const handleAdmonitionClick = useCallback(
    (selection) => {
      if (!features.admonitions && hasProject) {
        setShowGuidance("admonitions");
      } else {
        onInsertAdmonition?.(selection);
      }
    },
    [features.admonitions, hasProject, onInsertAdmonition],
  );

  const handleMermaidClick = useCallback(
    (selection) => {
      if (!features.mermaid && hasProject) {
        setShowGuidance("mermaid");
      } else {
        onInsertMermaid?.(selection);
      }
    },
    [features.mermaid, hasProject, onInsertMermaid],
  );

  const handleCodeBlockClick = useCallback(
    (selection) => {
      // Code blocks always work, but we can show guidance for syntax highlighting
      if (!features.codeHighlight && hasProject && selection?.showGuidance) {
        setShowGuidance("codeHighlight");
      } else {
        onInsertCodeBlock?.(selection);
      }
    },
    [features.codeHighlight, hasProject, onInsertCodeBlock],
  );

  const getDisabledTitle = (feature, defaultTitle) => {
    if (!hasProject) return defaultTitle;
    if (!features[feature]) {
      return `${defaultTitle} (not enabled in mkdocs.yml - click for guidance)`;
    }
    return defaultTitle;
  };

  return (
    <>
      <div className={`editor-toolbar ${disabled ? "disabled" : ""}`}>
        <div className="toolbar-group">
          <span className="toolbar-group-label">Insert</span>

          <ToolbarButton
            icon="📢"
            label="Callout"
            dropdown
            disabled={disabled}
            title={getDisabledTitle("admonitions", "Insert admonition/callout")}
          >
            {({ onSelect, onClose }) => (
              <AdmonitionDropdown
                onSelect={(sel) => {
                  handleAdmonitionClick(sel);
                  onClose();
                }}
                onClose={onClose}
              />
            )}
          </ToolbarButton>

          <ToolbarButton
            icon="📊"
            label="Diagram"
            dropdown
            disabled={disabled}
            title={getDisabledTitle("mermaid", "Insert Mermaid diagram")}
          >
            {({ onSelect, onClose }) => (
              <MermaidDropdown
                onSelect={(sel) => {
                  handleMermaidClick(sel);
                  onClose();
                }}
                onClose={onClose}
              />
            )}
          </ToolbarButton>

          <ToolbarButton icon="💻" label="Code" dropdown disabled={disabled} title="Insert code block">
            {({ onSelect, onClose }) => (
              <CodeBlockDropdown
                onSelect={(sel) => {
                  handleCodeBlockClick(sel);
                  onClose();
                }}
                onClose={onClose}
              />
            )}
          </ToolbarButton>

          <ToolbarButton
            icon="🖼️"
            label="Image"
            disabled={disabled}
            title="Insert image (copies to assets folder)"
            onClick={onInsertImage}
          />
        </div>

        <div className="toolbar-group toolbar-group--right">
          <ToolbarButton
            icon="📝"
            label="Source"
            disabled={disabled}
            title="View raw markdown source (read-only)"
            onClick={onViewSource}
          />
        </div>

        {hasProject && (features.admonitions === false || features.mermaid === false) && (
          <div className="toolbar-warning">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">Some features need configuration</span>
            <button className="warning-link" onClick={() => setShowGuidance("all")} type="button">
              Learn more
            </button>
          </div>
        )}
      </div>

      {showGuidance && (
        <GuidanceModal
          feature={showGuidance}
          guidance={guidance}
          features={features}
          onClose={() => setShowGuidance(null)}
        />
      )}
    </>
  );
}

export default EditorToolbar;
