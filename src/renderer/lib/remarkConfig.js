/**
 * Milkdown Remark Configuration Plugin
 *
 * Configures remark-stringify options for deterministic markdown output.
 * This plugin modifies how Milkdown serializes content back to markdown.
 */

import { $prose } from "@milkdown/kit/utils";
import { remarkStringifyCtx } from "@milkdown/kit/core";
import { remarkStringifyOptions } from "./markdownPipeline";

/**
 * Plugin that configures remark-stringify options
 * Applied during editor initialization to ensure consistent output formatting
 */
export const remarkConfigPlugin = $prose(() => {
  return {
    // This is a configuration plugin, no ProseMirror plugins needed
    // The actual configuration happens in the editor setup
  };
});

/**
 * Configure remark-stringify options on the editor context
 * Call this in the editor .config() chain
 * @param {object} options - Custom options to merge with defaults
 */
export function configureRemarkStringify(ctx, options = {}) {
  const mergedOptions = {
    ...remarkStringifyOptions,
    ...options,
  };

  // Set the remark-stringify options in the context
  ctx.set(remarkStringifyCtx.key, mergedOptions);
}

/**
 * Milkdown plugin factory that applies remark-stringify configuration
 * @param {object} options - Custom options to override defaults
 */
export function createRemarkConfigPlugin(options = {}) {
  return (ctx) => {
    configureRemarkStringify(ctx, options);
  };
}

export default {
  remarkConfigPlugin,
  configureRemarkStringify,
  createRemarkConfigPlugin,
};
