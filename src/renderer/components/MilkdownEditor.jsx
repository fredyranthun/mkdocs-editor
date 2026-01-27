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

import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx, remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import { remarkStringifyOptions } from "../lib/markdownPipeline";
import { materialBlocksPlugin } from "../lib/milkdown";

// Import Nord theme CSS
import "@milkdown/theme-nord/style.css";

// Import Material blocks styles
import "../styles/materialBlocks.css";

/**
 * Inner editor component that uses the useEditor hook
 */
function MilkdownEditorInner({ initialContent, onChange }) {
  // Store onChange in a ref to avoid re-creating editor when callback changes
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create editor with initial content - NO content in deps to avoid re-creation on typing
  useEditor(
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

  return <Milkdown />;
}

/**
 * Main MilkdownEditor component with provider
 * Use the `editorKey` prop to force re-mount when loading a new file
 */
export function MilkdownEditor({ content, onChange, editorKey }) {
  return (
    <MilkdownProvider key={editorKey}>
      <MilkdownEditorInner initialContent={content} onChange={onChange} />
    </MilkdownProvider>
  );
}

export default MilkdownEditor;
