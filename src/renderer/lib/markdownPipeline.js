/**
 * Markdown Pipeline Configuration
 *
 * Defines deterministic formatting rules for markdown import/export.
 * This ensures consistent markdown output regardless of input formatting.
 */

/**
 * Remark-stringify options for deterministic markdown output
 * These settings ensure consistent formatting when exporting from the editor
 */
export const remarkStringifyOptions = {
  // Use dashes for unordered lists (consistent with MkDocs Material examples)
  bullet: "-",

  // Use consistent ordered list markers (1. 2. 3.)
  bulletOrdered: ".",

  // Use underscores for emphasis
  emphasis: "_",

  // Use double asterisks for strong
  strong: "*",

  // Use backticks for code
  fence: "`",

  // Use ATX-style headers (# Header)
  // Not using setext (underline) style
  setext: false,

  // Rule style for horizontal rules
  rule: "-",

  // Number of rule characters
  ruleRepetition: 3,

  // Use spaces for list item indent (2 spaces)
  listItemIndent: "one",

  // Tight lists (no blank lines between items) when possible
  tightDefinitions: true,

  // Resource link style: use reference links for repeated URLs
  resourceLink: false,

  // Fenced code block settings
  fences: true,

  // Increment ordered list values
  incrementListMarker: true,
};

/**
 * Default formatting rules that can be customized per-project
 */
export const defaultFormattingRules = {
  // Ensure single trailing newline
  ensureTrailingNewline: true,

  // Normalize line endings to LF
  normalizeLineEndings: true,

  // Remove trailing whitespace from lines
  trimTrailingWhitespace: true,

  // Maximum consecutive blank lines
  maxConsecutiveBlankLines: 2,

  // Preserve front matter (YAML between --- delimiters)
  preserveFrontMatter: true,

  // Preserve HTML comments
  preserveHtmlComments: true,
};

/**
 * Front matter regex pattern
 * Matches YAML front matter at the start of a file
 */
export const FRONT_MATTER_REGEX = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/;

/**
 * Extract front matter from markdown content
 * @param {string} content - Raw markdown content
 * @returns {{ frontMatter: string | null, body: string }}
 */
export function extractFrontMatter(content) {
  const match = content.match(FRONT_MATTER_REGEX);

  if (match) {
    const frontMatter = match[1];
    let body = content.slice(frontMatter.length);
    // Trim leading newlines from body (front matter separator already included)
    body = body.replace(/^[\r\n]+/, "");
    return {
      frontMatter,
      body,
    };
  }

  return {
    frontMatter: null,
    body: content,
  };
}

/**
 * Restore front matter to markdown content
 * @param {string | null} frontMatter - Front matter string
 * @param {string} body - Markdown body
 * @returns {string}
 */
export function restoreFrontMatter(frontMatter, body) {
  if (!frontMatter) {
    return body;
  }

  // Ensure front matter ends with newline
  const normalizedFrontMatter = frontMatter.endsWith("\n") ? frontMatter : frontMatter + "\n";

  return normalizedFrontMatter + body;
}

/**
 * Apply formatting rules to markdown content
 * @param {string} content - Markdown content
 * @param {object} rules - Formatting rules
 * @returns {string}
 */
export function applyFormattingRules(content, rules = defaultFormattingRules) {
  let result = content;

  // Normalize line endings
  if (rules.normalizeLineEndings) {
    result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  // Trim trailing whitespace from lines (preserve intentional double-space for <br>)
  if (rules.trimTrailingWhitespace) {
    result = result
      .split("\n")
      .map((line) => {
        // Check if line has EXACTLY double-space at end (markdown line break)
        // This is the pattern: non-space content + exactly 2 spaces
        const match = line.match(/^(.*\S)(  )$/);
        if (match) {
          // Preserve the double-space line break
          return match[1] + "  ";
        }
        // Otherwise trim all trailing whitespace
        return line.trimEnd();
      })
      .join("\n");
  }

  // Collapse excessive blank lines
  if (rules.maxConsecutiveBlankLines > 0) {
    const maxBlanks = rules.maxConsecutiveBlankLines;
    const blankPattern = new RegExp(`\n{${maxBlanks + 2},}`, "g");
    result = result.replace(blankPattern, "\n".repeat(maxBlanks + 1));
  }

  // Ensure trailing newline
  if (rules.ensureTrailingNewline) {
    result = result.trimEnd() + "\n";
  }

  return result;
}

/**
 * Pre-process markdown before loading into editor
 * Handles front matter extraction and normalization
 * @param {string} content - Raw file content
 * @returns {{ processedContent: string, metadata: object }}
 */
export function preprocessMarkdown(content) {
  const { frontMatter, body } = extractFrontMatter(content);

  // Normalize line endings for editor
  const normalizedBody = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return {
    processedContent: normalizedBody,
    metadata: {
      frontMatter,
      originalLineEnding: content.includes("\r\n") ? "\r\n" : "\n",
    },
  };
}

/**
 * Post-process markdown after exporting from editor
 * Restores front matter and applies formatting rules
 * @param {string} content - Editor output
 * @param {object} metadata - Metadata from preprocessing
 * @param {object} rules - Formatting rules
 * @returns {string}
 */
export function postprocessMarkdown(content, metadata = {}, rules = defaultFormattingRules) {
  // Apply formatting rules
  let result = applyFormattingRules(content, rules);

  // Restore front matter
  if (metadata.frontMatter) {
    result = restoreFrontMatter(metadata.frontMatter, result);
  }

  return result;
}

export default {
  remarkStringifyOptions,
  defaultFormattingRules,
  extractFrontMatter,
  restoreFrontMatter,
  applyFormattingRules,
  preprocessMarkdown,
  postprocessMarkdown,
};
