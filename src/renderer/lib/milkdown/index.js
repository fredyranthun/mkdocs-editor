/**
 * Milkdown Custom Plugins Index
 *
 * Material MkDocs block support for Milkdown editor:
 * - Admonitions (!!! syntax)
 * - Mermaid diagrams (```mermaid blocks)
 * - Enhanced code blocks with language selector
 */

export { admonitionPlugin, admonitionNode, ADMONITION_TYPES } from "./admonitionPlugin.js";
export { mermaidPlugin, mermaidNode, MERMAID_TEMPLATES } from "./mermaidPlugin.js";
export { codeBlockEnhancedPlugin, codeBlockEnhancedNode, COMMON_LANGUAGES } from "./codeBlockPlugin.js";
export { materialBlocksPlugin } from "./materialBlocksPlugin.js";
