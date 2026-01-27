/**
 * ProjectLoader - Main process service for loading MkDocs projects
 *
 * Responsibilities:
 * - Locate and parse mkdocs.yml
 * - Extract docs_dir configuration
 * - Parse navigation structure
 * - Detect markdown extensions
 */

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

/**
 * @typedef {Object} MkDocsConfig
 * @property {string} siteName - Site name from config
 * @property {string} docsDir - Path to docs directory (relative to project root)
 * @property {string} siteDir - Path to output directory
 * @property {Array|null} nav - Navigation structure if defined
 * @property {string[]} markdownExtensions - List of enabled markdown extensions
 * @property {Object} theme - Theme configuration
 * @property {Object} raw - Raw parsed YAML object
 */

/**
 * @typedef {Object} ProjectInfo
 * @property {string} projectRoot - Absolute path to project root
 * @property {string} configPath - Absolute path to mkdocs.yml
 * @property {MkDocsConfig} config - Parsed configuration
 */

/**
 * Validates that a directory contains a valid MkDocs project
 * @param {string} dirPath - Path to check
 * @returns {Promise<string|null>} Path to mkdocs.yml if found, null otherwise
 */
export async function findMkDocsConfig(dirPath) {
  const possibleNames = ["mkdocs.yml", "mkdocs.yaml"];

  for (const name of possibleNames) {
    const configPath = path.join(dirPath, name);
    try {
      await fs.promises.access(configPath, fs.constants.R_OK);
      return configPath;
    } catch {
      // File doesn't exist or not readable, continue
    }
  }

  return null;
}

/**
 * Parses mkdocs.yml and extracts relevant configuration
 * @param {string} configPath - Absolute path to mkdocs.yml
 * @returns {Promise<MkDocsConfig>}
 * @throws {Error} If file cannot be read or parsed
 */
export async function parseMkDocsConfig(configPath) {
  const content = await fs.promises.readFile(configPath, "utf-8");
  const raw = YAML.parse(content);

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid mkdocs.yml: expected object at root");
  }

  return {
    siteName: raw.site_name || "Untitled Site",
    docsDir: raw.docs_dir || "docs",
    siteDir: raw.site_dir || "site",
    nav: raw.nav || null,
    markdownExtensions: extractExtensionNames(raw.markdown_extensions),
    theme: raw.theme || { name: "material" },
    raw,
  };
}

/**
 * Extracts extension names from the markdown_extensions config
 * Handles both simple strings and objects with config
 * @param {Array} extensions - Raw extensions array from config
 * @returns {string[]}
 */
function extractExtensionNames(extensions) {
  if (!Array.isArray(extensions)) {
    return [];
  }

  return extensions
    .map((ext) => {
      if (typeof ext === "string") {
        return ext;
      }
      if (typeof ext === "object" && ext !== null) {
        // Extension with config: { 'pymdownx.superfences': { ... } }
        return Object.keys(ext)[0];
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Loads a MkDocs project from a directory
 * @param {string} dirPath - Path to project directory
 * @returns {Promise<ProjectInfo>}
 * @throws {Error} If not a valid MkDocs project
 */
export async function loadProject(dirPath) {
  const absolutePath = path.resolve(dirPath);

  // Verify directory exists
  const stat = await fs.promises.stat(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${absolutePath}`);
  }

  // Find mkdocs.yml
  const configPath = await findMkDocsConfig(absolutePath);
  if (!configPath) {
    throw new Error(`No mkdocs.yml found in: ${absolutePath}`);
  }

  // Parse config
  const config = await parseMkDocsConfig(configPath);

  // Verify docs directory exists
  const docsPath = path.join(absolutePath, config.docsDir);
  try {
    const docsStat = await fs.promises.stat(docsPath);
    if (!docsStat.isDirectory()) {
      throw new Error(`docs_dir is not a directory: ${docsPath}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`docs_dir does not exist: ${docsPath}`);
    }
    throw err;
  }

  return {
    projectRoot: absolutePath,
    configPath,
    config,
  };
}

/**
 * Checks if specific Material features are available based on extensions
 * @param {string[]} extensions - List of enabled extensions
 * @returns {Object} Feature availability map
 */
export function getAvailableFeatures(extensions) {
  const extSet = new Set(extensions);

  return {
    admonitions: extSet.has("admonition"),
    codeHighlight: extSet.has("pymdownx.highlight") || extSet.has("codehilite"),
    mermaid: extSet.has("pymdownx.superfences"),
    tables: extSet.has("tables") || extSet.has("markdown.extensions.tables"),
    toc: extSet.has("toc") || extSet.has("markdown.extensions.toc"),
    details: extSet.has("pymdownx.details"),
    tabs: extSet.has("pymdownx.tabbed"),
  };
}

export default {
  findMkDocsConfig,
  parseMkDocsConfig,
  loadProject,
  getAvailableFeatures,
};
