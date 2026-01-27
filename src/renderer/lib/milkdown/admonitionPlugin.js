/**
 * Admonition Plugin for Milkdown
 *
 * Implements Material for MkDocs admonition syntax:
 * !!! type "optional title"
 *     Content here
 *
 * Also supports collapsible variants:
 * ??? type "title"
 *     Content here
 *
 * And inline admonitions:
 * !!! type inline "title"
 */

import { $node, $inputRule, $command } from "@milkdown/kit/utils";
import { InputRule } from "@milkdown/kit/prose/inputrules";

/**
 * Supported admonition types from Material for MkDocs
 */
export const ADMONITION_TYPES = [
  { type: "note", icon: "📝", label: "Note" },
  { type: "abstract", icon: "📋", label: "Abstract" },
  { type: "info", icon: "ℹ️", label: "Info" },
  { type: "tip", icon: "💡", label: "Tip" },
  { type: "success", icon: "✅", label: "Success" },
  { type: "question", icon: "❓", label: "Question" },
  { type: "warning", icon: "⚠️", label: "Warning" },
  { type: "failure", icon: "❌", label: "Failure" },
  { type: "danger", icon: "🔥", label: "Danger" },
  { type: "bug", icon: "🐛", label: "Bug" },
  { type: "example", icon: "📖", label: "Example" },
  { type: "quote", icon: "💬", label: "Quote" },
];

/**
 * Regex patterns for admonition parsing
 * Standard: !!! type "title"
 * Collapsible: ??? type "title" or ???+ type "title"
 * Inline: !!! type inline "title" or !!! type inline end "title"
 */
const ADMONITION_PATTERN = /^(!{3}|\?{3}\+?)\s+(\w+)(?:\s+(inline(?:\s+end)?))?\s*(?:"([^"]*)")?\s*$/;

/**
 * Admonition node schema for ProseMirror
 */
export const admonitionNode = $node("admonition", () => ({
  group: "block",
  content: "block+",
  defining: true,
  attrs: {
    type: { default: "note" },
    title: { default: "" },
    collapsible: { default: false },
    defaultOpen: { default: true },
    inline: { default: null }, // null, 'inline', or 'inline end'
  },
  parseDOM: [
    {
      tag: "div.admonition",
      getAttrs: (dom) => ({
        type: dom.getAttribute("data-type") || "note",
        title: dom.getAttribute("data-title") || "",
        collapsible: dom.getAttribute("data-collapsible") === "true",
        defaultOpen: dom.getAttribute("data-default-open") !== "false",
        inline: dom.getAttribute("data-inline") || null,
      }),
    },
  ],
  toDOM: (node) => {
    const typeInfo = ADMONITION_TYPES.find((t) => t.type === node.attrs.type) || ADMONITION_TYPES[0];
    const classes = ["admonition", `admonition-${node.attrs.type}`];

    if (node.attrs.collapsible) {
      classes.push("collapsible");
      if (!node.attrs.defaultOpen) {
        classes.push("collapsed");
      }
    }
    if (node.attrs.inline) {
      classes.push(node.attrs.inline.replace(" ", "-"));
    }

    return [
      "div",
      {
        class: classes.join(" "),
        "data-type": node.attrs.type,
        "data-title": node.attrs.title,
        "data-collapsible": node.attrs.collapsible.toString(),
        "data-default-open": node.attrs.defaultOpen.toString(),
        "data-inline": node.attrs.inline || "",
      },
      [
        "div",
        { class: "admonition-header" },
        ["span", { class: "admonition-icon" }, typeInfo.icon],
        ["span", { class: "admonition-title" }, node.attrs.title || typeInfo.label],
      ],
      ["div", { class: "admonition-content" }, 0],
    ];
  },
  parseMarkdown: {
    match: (node) => node.type === "admonition",
    runner: (state, node, type) => {
      state.openNode(type, {
        type: node.admonitionType || "note",
        title: node.title || "",
        collapsible: node.collapsible || false,
        defaultOpen: node.defaultOpen !== false,
        inline: node.inline || null,
      });
      state.next(node.children);
      state.closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "admonition",
    runner: (state, node) => {
      // Build the opening line
      let marker = node.attrs.collapsible ? (node.attrs.defaultOpen ? "???+" : "???") : "!!!";

      let line = `${marker} ${node.attrs.type}`;

      if (node.attrs.inline) {
        line += ` ${node.attrs.inline}`;
      }

      if (node.attrs.title) {
        line += ` "${node.attrs.title}"`;
      }

      // Write the admonition with proper indentation
      state.addNode("admonition", undefined, undefined, {
        type: node.attrs.type,
        title: node.attrs.title,
        collapsible: node.attrs.collapsible,
        defaultOpen: node.attrs.defaultOpen,
        inline: node.attrs.inline,
      });
    },
  },
}));

/**
 * Input rule to create admonition when typing "!!! type" or "??? type"
 */
export const admonitionInputRule = $inputRule(
  (ctx) =>
    new InputRule(/^(!{3}|\?{3}\+?)\s+(\w+)(?:\s+"([^"]*)")?\s$/, (state, match, start, end) => {
      const [, marker, type, title] = match;
      const collapsible = marker.startsWith("???");
      const defaultOpen = marker.includes("+");

      const nodeType = ctx.get("admonition").type(ctx);
      const paragraphType = state.schema.nodes.paragraph;

      return state.tr
        .delete(start, end)
        .replaceSelectionWith(
          nodeType.create({ type, title: title || "", collapsible, defaultOpen }, paragraphType.create()),
        );
    }),
);

/**
 * Command to insert a new admonition
 */
export const insertAdmonitionCommand = $command("insertAdmonition", (ctx) => {
  return (attrs = { type: "note", title: "", collapsible: false }) =>
    (state, dispatch) => {
      const nodeType = ctx.get("admonition").type(ctx);
      const paragraphType = state.schema.nodes.paragraph;

      if (dispatch) {
        const node = nodeType.create(
          {
            type: attrs.type || "note",
            title: attrs.title || "",
            collapsible: attrs.collapsible || false,
            defaultOpen: attrs.defaultOpen !== false,
            inline: attrs.inline || null,
          },
          paragraphType.create(),
        );
        dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
      }
      return true;
    };
});

/**
 * Command to change admonition type
 */
export const changeAdmonitionTypeCommand = $command("changeAdmonitionType", (ctx) => {
  return (newType) => (state, dispatch) => {
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);

    if (node?.type.name === "admonition") {
      if (dispatch) {
        dispatch(
          state.tr.setNodeMarkup(selection.from, undefined, {
            ...node.attrs,
            type: newType,
          }),
        );
      }
      return true;
    }
    return false;
  };
});

/**
 * Remark plugin to parse admonitions from markdown
 */
export function remarkAdmonition() {
  return (tree) => {
    const { visit } = require("unist-util-visit");

    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return;

      const textNode = node.children?.[0];
      if (textNode?.type !== "text") return;

      const match = textNode.value.match(ADMONITION_PATTERN);
      if (!match) return;

      const [, marker, type, inline, title] = match;
      const collapsible = marker.startsWith("???");
      const defaultOpen = marker.includes("+");

      // Find the content (indented paragraphs following this one)
      const content = [];
      let i = index + 1;

      while (i < parent.children.length) {
        const nextNode = parent.children[i];
        // Check if next block is indented content (simplified check)
        if (nextNode.type === "paragraph" || nextNode.type === "code") {
          content.push(nextNode);
          i++;
        } else {
          break;
        }
      }

      // Create admonition node
      const admonitionNode = {
        type: "admonition",
        admonitionType: type,
        title: title || "",
        collapsible,
        defaultOpen,
        inline: inline || null,
        children: content.length > 0 ? content : [{ type: "paragraph", children: [] }],
      };

      // Replace in tree
      parent.children.splice(index, 1 + content.length, admonitionNode);
    });
  };
}

/**
 * Remark plugin to serialize admonitions to markdown
 */
export function remarkAdmonitionStringify() {
  return (tree) => {
    const { visit } = require("unist-util-visit");

    visit(tree, "admonition", (node) => {
      const marker = node.collapsible ? (node.defaultOpen ? "???+" : "???") : "!!!";

      let header = `${marker} ${node.admonitionType}`;
      if (node.inline) {
        header += ` ${node.inline}`;
      }
      if (node.title) {
        header += ` "${node.title}"`;
      }

      // Convert to raw text representation
      node.type = "paragraph";
      node.children = [
        { type: "text", value: header + "\n" },
        ...node.children.map((child) => ({
          ...child,
          // Indent content by 4 spaces
          children: child.children?.map((c) => (c.type === "text" ? { ...c, value: "    " + c.value } : c)),
        })),
      ];
    });
  };
}

/**
 * Full admonition plugin bundle
 */
export const admonitionPlugin = [
  admonitionNode,
  admonitionInputRule,
  insertAdmonitionCommand,
  changeAdmonitionTypeCommand,
];

export default admonitionPlugin;
