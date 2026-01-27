/**
 * useExtensionFeatures Hook
 *
 * Checks mkdocs.yml configuration to determine which Material extensions
 * are enabled. Provides feature state and guidance for enabling missing features.
 */

import { useMemo } from "react";
import { checkMaterialExtensions, getExtensionGuidance } from "../lib/milkdown/materialBlocksPlugin";

/**
 * Hook to check and provide Material extension feature availability
 * @param {object} projectConfig - Project configuration from mkdocs.yml (raw)
 * @returns {object} Feature availability and guidance information
 */
export function useExtensionFeatures(projectConfig) {
  const features = useMemo(() => {
    if (!projectConfig?.raw) {
      // No project loaded - enable all features by default
      return {
        admonitions: true,
        mermaid: true,
        codeHighlight: true,
        superfences: true,
        tabbed: false, // P1 feature
      };
    }

    return checkMaterialExtensions(projectConfig.raw);
  }, [projectConfig?.raw]);

  const guidance = useMemo(() => {
    return getExtensionGuidance(features);
  }, [features]);

  const hasProject = Boolean(projectConfig?.raw);

  return {
    features,
    guidance,
    hasProject,

    // Convenience getters for common checks
    canUseAdmonitions: features.admonitions,
    canUseMermaid: features.mermaid,
    canUseCodeHighlight: features.codeHighlight,
    canUseTabs: features.tabbed,

    // Check if any features are disabled
    hasDisabledFeatures: Object.values(guidance).length > 0,
  };
}

export default useExtensionFeatures;
