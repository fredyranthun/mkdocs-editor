/**
 * Material Blocks Plugin
 *
 * Combined plugin that provides all Material for MkDocs block support:
 * - Admonitions (!!! syntax)
 * - Mermaid diagrams (```mermaid blocks)
 * - Enhanced code blocks with language selector
 *
 * This is the main entry point for adding Material block support to Milkdown.
 */

import { admonitionPlugin, ADMONITION_TYPES } from "./admonitionPlugin.js";
import { mermaidPlugin, MERMAID_TEMPLATES } from "./mermaidPlugin.js";
import { codeBlockEnhancedPlugin, COMMON_LANGUAGES } from "./codeBlockPlugin.js";

/**
 * Combined Material blocks plugin
 * Use this to add all Material block support at once
 * Each plugin item is a MilkdownPlugin, flatten the array for use with .use()
 */
export const materialBlocksPlugin = [...admonitionPlugin, ...mermaidPlugin, ...codeBlockEnhancedPlugin];

/**
 * Re-export individual plugins for selective use
 */
export { admonitionPlugin, mermaidPlugin, codeBlockEnhancedPlugin };

/**
 * Re-export type constants for UI building
 */
export { ADMONITION_TYPES, MERMAID_TEMPLATES, COMMON_LANGUAGES };

/**
 * Plugin configuration options
 */
export const MaterialBlocksConfig = {
  /**
   * Default admonition type when inserting new admonitions
   */
  defaultAdmonitionType: "note",

  /**
   * Default mermaid template when inserting new diagrams
   */
  defaultMermaidTemplate: "flowchart",

  /**
   * Default code block language
   */
  defaultCodeLanguage: "",

  /**
   * Whether to show line numbers by default in code blocks
   */
  defaultLineNumbers: false,
};

/**
 * Helper to check if mkdocs.yml has required extensions enabled
 * @param {object} mkdocsConfig - Parsed mkdocs.yml config
 * @returns {object} - Object indicating which features are enabled
 */
export function checkMaterialExtensions(mkdocsConfig) {
  const extensions = mkdocsConfig?.markdown_extensions || [];
  const extensionList = Array.isArray(extensions)
    ? extensions.map((ext) => (typeof ext === "string" ? ext : Object.keys(ext)[0]))
    : [];

  return {
    admonitions: extensionList.some((ext) => ext === "admonition" || ext === "pymdownx.blocks.admonition"),
    mermaid:
      extensionList.some((ext) => ext === "pymdownx.superfences") &&
      mkdocsConfig?.extra_javascript?.some((js) =>
        typeof js === "string" ? js.includes("mermaid") : js.path?.includes("mermaid"),
      ),
    codeHighlight: extensionList.some((ext) => ext === "pymdownx.highlight" || ext === "codehilite"),
    superfences: extensionList.some((ext) => ext === "pymdownx.superfences"),
    tabbed: extensionList.some((ext) => ext === "pymdownx.tabbed"),
  };
}

/**
 * Get guidance messages for enabling extensions
 * @param {object} enabledFeatures - Result from checkMaterialExtensions
 * @returns {object} - Guidance messages for disabled features
 */
export function getExtensionGuidance(enabledFeatures) {
  const guidance = {};

  if (!enabledFeatures.admonitions) {
    guidance.admonitions = {
      feature: "Admonitions",
      message: "To enable admonitions, add to mkdocs.yml:\n\nmarkdown_extensions:\n  - admonition",
    };
  }

  if (!enabledFeatures.mermaid) {
    guidance.mermaid = {
      feature: "Mermaid Diagrams",
      message: `To enable Mermaid diagrams, add to mkdocs.yml:

markdown_extensions:
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format

extra_javascript:
  - https://unpkg.com/mermaid@10/dist/mermaid.min.js`,
    };
  }

  if (!enabledFeatures.codeHighlight) {
    guidance.codeHighlight = {
      feature: "Code Highlighting",
      message: `To enable syntax highlighting, add to mkdocs.yml:

markdown_extensions:
  - pymdownx.highlight:
      anchor_linenums: true
  - pymdownx.inlinehilite
  - pymdownx.snippets
  - pymdownx.superfences`,
    };
  }

  return guidance;
}

export default materialBlocksPlugin;
