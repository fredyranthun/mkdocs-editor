/**
 * Mermaid Plugin for Milkdown
 *
 * Implements Mermaid diagram support with live preview.
 * Renders as fenced code block with 'mermaid' language:
 *
 * ```mermaid
 * graph LR
 *     A --> B
 * ```
 */

import { $node, $inputRule, $command } from "@milkdown/kit/utils";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import { TextSelection } from "@milkdown/kit/prose/state";

/**
 * Mermaid diagram types with templates
 */
export const MERMAID_TEMPLATES = {
  flowchart: {
    label: "Flowchart",
    template: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
  },
  sequence: {
    label: "Sequence Diagram",
    template: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hi Alice!`,
  },
  classDiagram: {
    label: "Class Diagram",
    template: `classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`,
  },
  stateDiagram: {
    label: "State Diagram",
    template: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : complete
    Done --> [*]`,
  },
  erDiagram: {
    label: "ER Diagram",
    template: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : "is in"`,
  },
  gantt: {
    label: "Gantt Chart",
    template: `gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :after a1, 20d`,
  },
  pie: {
    label: "Pie Chart",
    template: `pie title Distribution
    "Category A" : 40
    "Category B" : 30
    "Category C" : 20
    "Category D" : 10`,
  },
  mindmap: {
    label: "Mind Map",
    template: `mindmap
  root((Central Topic))
    Topic 1
      Subtopic A
      Subtopic B
    Topic 2
      Subtopic C`,
  },
};

/**
 * Mermaid node schema for ProseMirror
 * Renders as an editable code block with mermaid preview
 */
export const mermaidNode = $node("mermaid", () => ({
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  attrs: {
    // Store the mermaid diagram code
    value: { default: "" },
  },
  parseDOM: [
    {
      tag: "div.mermaid-block",
      preserveWhitespace: "full",
      getAttrs: (dom) => ({
        value: dom.querySelector(".mermaid-source")?.textContent || "",
      }),
    },
    {
      tag: "pre[data-language='mermaid']",
      preserveWhitespace: "full",
      getAttrs: (dom) => ({
        value: dom.textContent || "",
      }),
    },
  ],
  toDOM: (node) => {
    const code = node.textContent || node.attrs.value || "";
    return [
      "div",
      { class: "mermaid-block", "data-type": "mermaid" },
      [
        "div",
        { class: "mermaid-header" },
        ["span", { class: "mermaid-icon" }, "📊"],
        ["span", { class: "mermaid-label" }, "Mermaid Diagram"],
      ],
      [
        "div",
        { class: "mermaid-editor" },
        ["pre", { class: "mermaid-source", "data-language": "mermaid" }, ["code", 0]],
      ],
      [
        "div",
        { class: "mermaid-preview", "data-mermaid-preview": "true" },
        // Preview will be rendered by external mermaid library
        ["div", { class: "mermaid-preview-content" }, code],
      ],
    ];
  },
  parseMarkdown: {
    match: (node) => node.type === "code" && node.lang === "mermaid",
    runner: (state, node, type) => {
      state.openNode(type, { value: node.value || "" });
      if (node.value) {
        state.addText(node.value);
      }
      state.closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "mermaid",
    runner: (state, node) => {
      const code = node.textContent || node.attrs.value || "";
      state.addNode("code", undefined, code, { lang: "mermaid" });
    },
  },
}));

/**
 * Input rule to create mermaid block when typing ```mermaid
 */
export const mermaidInputRule = $inputRule(
  (ctx) =>
    new InputRule(/^```mermaid\s$/, (state, match, start, end) => {
      const nodeType = ctx.get("mermaid").type(ctx);
      const template = MERMAID_TEMPLATES.flowchart.template;

      const tr = state.tr
        .delete(start, end)
        .replaceSelectionWith(nodeType.create({ value: template }, state.schema.text(template)));

      // Position cursor inside the block
      return tr.setSelection(TextSelection.create(tr.doc, start + 1));
    }),
);

/**
 * Command to insert a new mermaid diagram
 */
export const insertMermaidCommand = $command("insertMermaid", (ctx) => {
  return (templateType = "flowchart") =>
    (state, dispatch) => {
      const nodeType = ctx.get("mermaid").type(ctx);
      const template = MERMAID_TEMPLATES[templateType]?.template || MERMAID_TEMPLATES.flowchart.template;

      if (dispatch) {
        const node = nodeType.create({ value: template }, state.schema.text(template));
        dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
      }
      return true;
    };
});

/**
 * Command to update mermaid diagram content
 */
export const updateMermaidCommand = $command("updateMermaid", (ctx) => {
  return (newCode) => (state, dispatch) => {
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);

    if (node?.type.name === "mermaid") {
      if (dispatch) {
        const nodeType = ctx.get("mermaid").type(ctx);
        const newNode = nodeType.create({ value: newCode }, newCode ? state.schema.text(newCode) : undefined);
        dispatch(state.tr.replaceWith(selection.from, selection.from + node.nodeSize, newNode));
      }
      return true;
    }
    return false;
  };
});

/**
 * Full mermaid plugin bundle
 */
export const mermaidPlugin = [mermaidNode, mermaidInputRule, insertMermaidCommand, updateMermaidCommand];

export default mermaidPlugin;
