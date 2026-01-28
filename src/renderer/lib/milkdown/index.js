/**
 * Milkdown Custom Plugins Index
 *
 * Material MkDocs block support for Milkdown editor:
 * - Admonitions (!!! syntax)
 * - Mermaid diagrams (```mermaid blocks)
 * - Enhanced code blocks with language selector
 */

export { admonitionPlugin, admonitionNode, ADMONITION_TYPES, insertAdmonitionCommand } from "./admonitionPlugin.js";
export { mermaidPlugin, mermaidNode, MERMAID_TEMPLATES, insertMermaidCommand } from "./mermaidPlugin.js";
export {
  codeBlockEnhancedPlugin,
  codeBlockEnhancedNode,
  COMMON_LANGUAGES,
  insertCodeBlockCommand,
} from "./codeBlockPlugin.js";
export { materialBlocksPlugin } from "./materialBlocksPlugin.js";
