/**
 * useMarkdownPipeline Hook
 *
 * React hook that manages the markdown import/export pipeline.
 * Handles front matter preservation, formatting, and content transformation.
 */

import { useState, useCallback, useRef } from "react";
import { preprocessMarkdown, postprocessMarkdown, defaultFormattingRules } from "../lib/markdownPipeline";

/**
 * Hook for managing markdown content with preprocessing/postprocessing pipeline
 *
 * @param {object} options - Configuration options
 * @param {object} options.formattingRules - Custom formatting rules
 * @returns {object} Pipeline state and handlers
 */
export function useMarkdownPipeline(options = {}) {
  const { formattingRules = defaultFormattingRules } = options;

  // Store metadata from preprocessing (front matter, line endings, etc.)
  const metadataRef = useRef({});

  // Track original content for change detection
  const originalContentRef = useRef("");

  // Editor content (after preprocessing)
  const [editorContent, setEditorContent] = useState("");

  /**
   * Load raw markdown content into the pipeline
   * Preprocesses the content and stores metadata for later restoration
   */
  const loadContent = useCallback((rawContent) => {
    if (!rawContent) {
      setEditorContent("");
      metadataRef.current = {};
      originalContentRef.current = "";
      return "";
    }

    const { processedContent, metadata } = preprocessMarkdown(rawContent);

    metadataRef.current = metadata;
    originalContentRef.current = rawContent;
    setEditorContent(processedContent);

    return processedContent;
  }, []);

  /**
   * Export editor content back to raw markdown
   * Applies formatting rules and restores metadata (front matter, etc.)
   */
  const exportContent = useCallback(
    (currentEditorContent) => {
      const content = currentEditorContent ?? editorContent;
      return postprocessMarkdown(content, metadataRef.current, formattingRules);
    },
    [editorContent, formattingRules],
  );

  /**
   * Update editor content (called on editor changes)
   */
  const updateContent = useCallback((newContent) => {
    setEditorContent(newContent);
  }, []);

  /**
   * Check if content has changed from original
   */
  const hasChanges = useCallback(
    (currentContent) => {
      const content = currentContent ?? editorContent;
      const exported = postprocessMarkdown(content, metadataRef.current, formattingRules);
      return exported !== originalContentRef.current;
    },
    [editorContent, formattingRules],
  );

  /**
   * Reset to original content
   */
  const reset = useCallback(() => {
    if (originalContentRef.current) {
      loadContent(originalContentRef.current);
    }
  }, [loadContent]);

  /**
   * Mark current content as saved (update original reference)
   */
  const markSaved = useCallback(
    (savedContent) => {
      originalContentRef.current = savedContent ?? exportContent(editorContent);
    },
    [editorContent, exportContent],
  );

  /**
   * Get current metadata
   */
  const getMetadata = useCallback(() => {
    return { ...metadataRef.current };
  }, []);

  /**
   * Update front matter
   */
  const updateFrontMatter = useCallback((newFrontMatter) => {
    metadataRef.current.frontMatter = newFrontMatter;
  }, []);

  return {
    // State
    editorContent,

    // Actions
    loadContent,
    exportContent,
    updateContent,
    hasChanges,
    reset,
    markSaved,

    // Metadata
    getMetadata,
    updateFrontMatter,
  };
}

export default useMarkdownPipeline;
