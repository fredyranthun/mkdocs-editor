/**
 * Header Component
 *
 * Top toolbar with project name and action buttons.
 */

export function Header({ projectName, onOpenProject, onSave, canSave }) {
  return (
    <header id="header" className="header">
      <div className="header-left">
        <h1 className="app-title">MaterialDocs Editor</h1>
        <span className="project-name">{projectName}</span>
      </div>
      <div className="header-right">
        <button className="header-button" onClick={onOpenProject} title="Open Project (Ctrl+O)">
          📂 Open
        </button>
        <button className="header-button" onClick={onSave} disabled={!canSave} title="Save (Ctrl+S)">
          💾 Save
        </button>
      </div>
    </header>
  );
}

export default Header;
