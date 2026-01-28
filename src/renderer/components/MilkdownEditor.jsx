/**
 * MilkdownEditor Component
 *
 * WYSIWYG Markdown editor using Milkdown.
 * Supports controlled content via props with deterministic formatting.
 * Includes Material for MkDocs block support:
 * - Admonitions (!!! syntax)
 * - Mermaid diagrams
 * - Enhanced code blocks with language selector
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Editor, rootCtx, defaultValueCtx, remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { callCommand } from "@milkdown/kit/utils";
import { nord } from "@milkdown/theme-nord";
import { remarkStringifyOptions } from "../lib/markdownPipeline";
import { materialBlocksPlugin } from "../lib/milkdown";
import { insertCodeBlockCommand, insertAdmonitionCommand, insertMermaidCommand } from "../lib/milkdown";

// Import Nord theme CSS
import "@milkdown/theme-nord/style.css";

// Import Material blocks styles
import "../styles/materialBlocks.css";

/**
 * Inner editor component that uses the useEditor hook
 */
const MilkdownEditorInner = forwardRef(function MilkdownEditorInner({ initialContent, onChange }, ref) {
  // Store onChange in a ref to avoid re-creating editor when callback changes
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create editor with initial content - NO content in deps to avoid re-creation on typing
  const { get } = useEditor(
    (root) =>
      Editor.make()
        .config(nord)
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialContent || "");

          // Configure remark-stringify for deterministic output formatting
          ctx.set(remarkStringifyOptionsCtx, remarkStringifyOptions);

          // Set up markdown change listener
          const onChangeListener = ctx.get(listenerCtx);
          onChangeListener.markdownUpdated((ctx, markdown, prevMarkdown) => {
            // Only call onChange if content actually changed
            if (markdown !== prevMarkdown) {
              onChangeRef.current?.(markdown);
            }
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(materialBlocksPlugin)
        .use(history)
        .use(clipboard)
        .use(listener),
    [], // Empty deps - editor is only created once per mount
  );

  // Get editor instance for commands
  const [loading, getEditor] = useInstance();

  // Expose imperative methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      insertCodeBlock: (attrs = {}) => {
        const editor = getEditor();
        if (editor) {
          editor.action(callCommand(insertCodeBlockCommand.key, attrs));
        }
      },
      insertAdmonition: (attrs = {}) => {
        const editor = getEditor();
        if (editor) {
          editor.action(callCommand(insertAdmonitionCommand.key, attrs));
        }
      },
      insertMermaid: (templateType = "flowchart") => {
        const editor = getEditor();
        if (editor) {
          // insertMermaidCommand expects a string template type, not an object
          const template = typeof templateType === "object" ? templateType.template : templateType;
          editor.action(callCommand(insertMermaidCommand.key, template));
        }
      },
      isReady: () => !loading && !!getEditor(),
    }),
    [loading, getEditor],
  );

  return <Milkdown />;
});

/**
 * Main MilkdownEditor component with provider
 * Use the `editorKey` prop to force re-mount when loading a new file
 */
export const MilkdownEditor = forwardRef(function MilkdownEditor({ content, onChange, editorKey }, ref) {
  return (
    <MilkdownProvider key={editorKey}>
      <MilkdownEditorInner ref={ref} initialContent={content} onChange={onChange} />
    </MilkdownProvider>
  );
});

export default MilkdownEditor;
