/**
 * Enhanced Code Block Plugin for Milkdown
 *
 * Provides enhanced code block support with:
 * - Language selector dropdown
 * - Syntax highlighting integration points
 * - Copy button
 * - Line numbers (optional)
 *
 * Serializes as standard fenced code blocks:
 * ```language
 * code here
 * ```
 */

import { $node, $inputRule, $command } from "@milkdown/kit/utils";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import { TextSelection } from "@milkdown/kit/prose/state";

/**
 * Common programming languages for the language selector
 */
export const COMMON_LANGUAGES = [
  { value: "", label: "Plain text" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash / Shell" },
  { value: "shell", label: "Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "sql", label: "SQL" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "elixir", label: "Elixir" },
  { value: "erlang", label: "Erlang" },
  { value: "haskell", label: "Haskell" },
  { value: "scala", label: "Scala" },
  { value: "r", label: "R" },
  { value: "matlab", label: "MATLAB" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "nginx", label: "Nginx" },
  { value: "xml", label: "XML" },
  { value: "toml", label: "TOML" },
  { value: "ini", label: "INI" },
  { value: "diff", label: "Diff" },
  { value: "graphql", label: "GraphQL" },
];

/**
 * Language aliases mapping
 */
export const LANGUAGE_ALIASES = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  "c++": "cpp",
  "c#": "csharp",
};

/**
 * Normalize language identifier
 */
export function normalizeLanguage(lang) {
  if (!lang) return "";
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
}

/**
 * Get language display label
 */
export function getLanguageLabel(lang) {
  const normalized = normalizeLanguage(lang);
  const found = COMMON_LANGUAGES.find((l) => l.value === normalized);
  return found?.label || lang || "Plain text";
}

/**
 * Enhanced code block node schema for ProseMirror
 */
export const codeBlockEnhancedNode = $node("code_block_enhanced", () => ({
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  attrs: {
    language: { default: "" },
    lineNumbers: { default: false },
    filename: { default: "" },
    highlightLines: { default: "" }, // e.g., "1,3-5,7"
  },
  parseDOM: [
    {
      tag: "div.code-block-enhanced",
      preserveWhitespace: "full",
      getAttrs: (dom) => ({
        language: dom.getAttribute("data-language") || "",
        lineNumbers: dom.getAttribute("data-line-numbers") === "true",
        filename: dom.getAttribute("data-filename") || "",
        highlightLines: dom.getAttribute("data-highlight-lines") || "",
      }),
    },
    {
      tag: "pre",
      preserveWhitespace: "full",
      getAttrs: (dom) => {
        const code = dom.querySelector("code");
        let language = "";

        // Try to get language from class
        if (code) {
          const className = code.className || "";
          const match = className.match(/language-(\w+)/);
          if (match) {
            language = match[1];
          }
        }

        return {
          language: normalizeLanguage(language || dom.getAttribute("data-language") || ""),
          lineNumbers: dom.getAttribute("data-line-numbers") === "true",
          filename: dom.getAttribute("data-filename") || "",
          highlightLines: dom.getAttribute("data-highlight-lines") || "",
        };
      },
    },
  ],
  toDOM: (node) => {
    const language = normalizeLanguage(node.attrs.language);
    const languageLabel = getLanguageLabel(language);

    return [
      "div",
      {
        class: "code-block-enhanced",
        "data-language": language,
        "data-line-numbers": node.attrs.lineNumbers.toString(),
        "data-filename": node.attrs.filename,
        "data-highlight-lines": node.attrs.highlightLines,
      },
      [
        "div",
        { class: "code-block-header" },
        ["span", { class: "code-block-language" }, languageLabel],
        node.attrs.filename ? ["span", { class: "code-block-filename" }, node.attrs.filename] : "",
        ["button", { class: "code-block-copy", title: "Copy code" }, "📋"],
      ],
      [
        "pre",
        {
          class: `code-block-content${node.attrs.lineNumbers ? " with-line-numbers" : ""}`,
        },
        ["code", { class: language ? `language-${language}` : "" }, 0],
      ],
    ];
  },
  parseMarkdown: {
    match: (node) => node.type === "code" && node.lang !== "mermaid",
    runner: (state, node, type) => {
      // Parse language and any meta info (e.g., title="filename.js")
      let language = normalizeLanguage(node.lang || "");
      let filename = "";
      let highlightLines = "";
      let lineNumbers = false;

      // Parse meta string for additional options
      // e.g., ```python title="example.py" hl_lines="1-3"
      if (node.meta) {
        const titleMatch = node.meta.match(/title="([^"]+)"/);
        if (titleMatch) {
          filename = titleMatch[1];
        }

        const hlMatch = node.meta.match(/hl_lines="([^"]+)"/);
        if (hlMatch) {
          highlightLines = hlMatch[1];
        }

        if (node.meta.includes("linenums") || node.meta.includes("lineNumbers")) {
          lineNumbers = true;
        }
      }

      state.openNode(type, { language, filename, highlightLines, lineNumbers });
      if (node.value) {
        state.addText(node.value);
      }
      state.closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "code_block_enhanced",
    runner: (state, node) => {
      const language = node.attrs.language || "";
      const code = node.textContent || "";

      // Build meta string if we have additional attributes
      let meta = "";
      if (node.attrs.filename) {
        meta += ` title="${node.attrs.filename}"`;
      }
      if (node.attrs.highlightLines) {
        meta += ` hl_lines="${node.attrs.highlightLines}"`;
      }
      if (node.attrs.lineNumbers) {
        meta += " linenums";
      }

      // Add the code node with language
      state.addNode("code", undefined, code, {
        lang: language + meta.trim(),
      });
    },
  },
}));

/**
 * Input rule to create enhanced code block when typing ```language
 */
export const codeBlockInputRule = $inputRule(
  (ctx) =>
    new InputRule(/^```(\w*)\s$/, (state, match, start, end) => {
      const language = normalizeLanguage(match[1] || "");

      // Don't match mermaid - let mermaid plugin handle it
      if (language === "mermaid") {
        return null;
      }

      const nodeType = ctx.get("code_block_enhanced").type(ctx);

      const tr = state.tr.delete(start, end).replaceSelectionWith(nodeType.create({ language }));

      // Position cursor inside the code block
      return tr.setSelection(TextSelection.create(tr.doc, start + 1));
    }),
);

/**
 * Command to insert a new code block
 */
export const insertCodeBlockCommand = $command("insertCodeBlock", (ctx) => {
  return (attrs = {}) =>
    (state, dispatch) => {
      const nodeType = ctx.get("code_block_enhanced").type(ctx);

      if (dispatch) {
        const node = nodeType.create({
          language: normalizeLanguage(attrs.language || ""),
          lineNumbers: attrs.lineNumbers || false,
          filename: attrs.filename || "",
          highlightLines: attrs.highlightLines || "",
        });
        dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
      }
      return true;
    };
});

/**
 * Command to change code block language
 */
export const changeCodeBlockLanguageCommand = $command("changeCodeBlockLanguage", (ctx) => {
  return (newLanguage) => (state, dispatch) => {
    const { selection } = state;
    let pos = selection.from;

    // Find the code block node
    let nodePos = null;
    let node = null;

    state.doc.nodesBetween(selection.from, selection.to, (n, p) => {
      if (n.type.name === "code_block_enhanced") {
        node = n;
        nodePos = p;
        return false;
      }
    });

    if (node && nodePos !== null) {
      if (dispatch) {
        dispatch(
          state.tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            language: normalizeLanguage(newLanguage),
          }),
        );
      }
      return true;
    }
    return false;
  };
});

/**
 * Command to toggle line numbers
 */
export const toggleLineNumbersCommand = $command("toggleLineNumbers", (ctx) => {
  return () => (state, dispatch) => {
    const { selection } = state;

    let nodePos = null;
    let node = null;

    state.doc.nodesBetween(selection.from, selection.to, (n, p) => {
      if (n.type.name === "code_block_enhanced") {
        node = n;
        nodePos = p;
        return false;
      }
    });

    if (node && nodePos !== null) {
      if (dispatch) {
        dispatch(
          state.tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            lineNumbers: !node.attrs.lineNumbers,
          }),
        );
      }
      return true;
    }
    return false;
  };
});

/**
 * Full code block plugin bundle
 */
export const codeBlockEnhancedPlugin = [
  codeBlockEnhancedNode,
  codeBlockInputRule,
  insertCodeBlockCommand,
  changeCodeBlockLanguageCommand,
  toggleLineNumbersCommand,
];

export default codeBlockEnhancedPlugin;
