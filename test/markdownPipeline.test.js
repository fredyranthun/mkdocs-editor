/**
 * Markdown Pipeline Tests
 *
 * Tests for markdown import/export pipeline with deterministic formatting
 */

import { describe, it, expect } from "vitest";
import {
  remarkStringifyOptions,
  defaultFormattingRules,
  extractFrontMatter,
  restoreFrontMatter,
  applyFormattingRules,
  preprocessMarkdown,
  postprocessMarkdown,
} from "../src/renderer/lib/markdownPipeline.js";

describe("Markdown Pipeline", () => {
  describe("remarkStringifyOptions", () => {
    it("should have expected formatting options", () => {
      expect(remarkStringifyOptions.bullet).toBe("-");
      expect(remarkStringifyOptions.emphasis).toBe("_");
      expect(remarkStringifyOptions.strong).toBe("*");
      expect(remarkStringifyOptions.fence).toBe("`");
      expect(remarkStringifyOptions.fences).toBe(true);
    });
  });

  describe("extractFrontMatter", () => {
    it("should extract YAML front matter from content", () => {
      const content = `---
title: Test Page
author: Test
---

# Hello World

This is content.`;

      const result = extractFrontMatter(content);

      expect(result.frontMatter).toBe(`---
title: Test Page
author: Test
---
`);
      expect(result.body).toBe(`# Hello World

This is content.`);
    });

    it("should return null frontMatter when none exists", () => {
      const content = "# Hello World\n\nNo front matter here.";

      const result = extractFrontMatter(content);

      expect(result.frontMatter).toBeNull();
      expect(result.body).toBe(content);
    });

    it("should handle empty content", () => {
      const result = extractFrontMatter("");
      expect(result.frontMatter).toBeNull();
      expect(result.body).toBe("");
    });

    it("should handle front matter with Windows line endings", () => {
      const content = "---\r\ntitle: Test\r\n---\r\n\r\n# Content";

      const result = extractFrontMatter(content);

      expect(result.frontMatter).not.toBeNull();
      // Body starts after front matter, with leading newlines stripped
      expect(result.body).toBe("# Content");
    });
  });

  describe("restoreFrontMatter", () => {
    it("should prepend front matter to body", () => {
      const frontMatter = "---\ntitle: Test\n---\n";
      const body = "# Hello World";

      const result = restoreFrontMatter(frontMatter, body);

      expect(result).toBe("---\ntitle: Test\n---\n# Hello World");
    });

    it("should return body unchanged when no front matter", () => {
      const body = "# Hello World";

      const result = restoreFrontMatter(null, body);

      expect(result).toBe(body);
    });

    it("should add newline to front matter if missing", () => {
      const frontMatter = "---\ntitle: Test\n---";
      const body = "# Hello";

      const result = restoreFrontMatter(frontMatter, body);

      expect(result).toBe("---\ntitle: Test\n---\n# Hello");
    });
  });

  describe("applyFormattingRules", () => {
    it("should normalize line endings to LF", () => {
      const content = "Line 1\r\nLine 2\rLine 3";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        normalizeLineEndings: true,
      });

      expect(result).not.toContain("\r");
      expect(result).toContain("\n");
    });

    it("should trim trailing whitespace from lines", () => {
      const content = "Line 1   \nLine 2\t\t\nLine 3";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        trimTrailingWhitespace: true,
      });

      // All trailing spaces/tabs should be trimmed
      expect(result).toBe("Line 1\nLine 2\nLine 3\n");
    });

    it("should preserve intentional double-space line breaks", () => {
      // Content ending with exactly 2 spaces (markdown line break)
      const content = "Line 1  \nLine 2";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        trimTrailingWhitespace: true,
      });

      // Double-space should be preserved
      expect(result).toBe("Line 1  \nLine 2\n");
    });

    it("should collapse excessive blank lines", () => {
      const content = "Line 1\n\n\n\n\nLine 2";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        maxConsecutiveBlankLines: 2,
      });

      // Should have at most 2 blank lines (3 newlines total between content)
      expect(result).toBe("Line 1\n\n\nLine 2\n");
    });

    it("should ensure trailing newline", () => {
      const content = "No trailing newline";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        ensureTrailingNewline: true,
      });

      expect(result.endsWith("\n")).toBe(true);
      expect(result).toBe("No trailing newline\n");
    });

    it("should not add multiple trailing newlines", () => {
      const content = "Already has newline\n\n\n";

      const result = applyFormattingRules(content, {
        ...defaultFormattingRules,
        ensureTrailingNewline: true,
      });

      expect(result).toBe("Already has newline\n");
    });
  });

  describe("preprocessMarkdown", () => {
    it("should extract front matter and normalize body", () => {
      const content = `---
title: Test
---

# Hello World`;

      const result = preprocessMarkdown(content);

      expect(result.metadata.frontMatter).toBeDefined();
      expect(result.processedContent).toBe("# Hello World");
    });

    it("should detect Windows line endings", () => {
      const content = "# Hello\r\nWorld";

      const result = preprocessMarkdown(content);

      expect(result.metadata.originalLineEnding).toBe("\r\n");
      expect(result.processedContent).toBe("# Hello\nWorld");
    });

    it("should detect Unix line endings", () => {
      const content = "# Hello\nWorld";

      const result = preprocessMarkdown(content);

      expect(result.metadata.originalLineEnding).toBe("\n");
    });
  });

  describe("postprocessMarkdown", () => {
    it("should restore front matter and apply formatting", () => {
      const content = "# Hello World";
      const metadata = {
        frontMatter: "---\ntitle: Test\n---\n",
      };

      const result = postprocessMarkdown(content, metadata);

      expect(result).toBe("---\ntitle: Test\n---\n# Hello World\n");
    });

    it("should work without metadata", () => {
      const content = "# Hello World";

      const result = postprocessMarkdown(content, {});

      expect(result).toBe("# Hello World\n");
    });

    it("should apply custom formatting rules", () => {
      // 3 spaces at end - should be trimmed (not intentional double-space)
      const content = "Line 1   \n\n\n\n\nLine 2";
      const rules = {
        ...defaultFormattingRules,
        maxConsecutiveBlankLines: 1,
      };

      const result = postprocessMarkdown(content, {}, rules);

      // Trailing spaces trimmed, blank lines collapsed
      expect(result).toBe("Line 1\n\nLine 2\n");
    });
  });

  describe("Round-trip preservation", () => {
    it("should preserve front matter through round-trip", () => {
      const original = `---
title: My Page
description: A test page
tags:
  - test
  - example
---

# Hello World

This is a paragraph.

## Section 2

More content here.
`;

      const { processedContent, metadata } = preprocessMarkdown(original);
      const result = postprocessMarkdown(processedContent, metadata);

      expect(result).toContain("---\ntitle: My Page");
      expect(result).toContain("# Hello World");
      expect(result).toContain("## Section 2");
    });

    it("should preserve content without front matter", () => {
      const original = `# Hello World

This is a test paragraph.

- Item 1
- Item 2
- Item 3
`;

      const { processedContent, metadata } = preprocessMarkdown(original);
      const result = postprocessMarkdown(processedContent, metadata);

      expect(result).toBe(original);
    });
  });
});
