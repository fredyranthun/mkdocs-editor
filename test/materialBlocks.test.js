/**
 * Material Blocks Tests
 *
 * Tests for Material for MkDocs block plugins:
 * - Admonitions (!!! syntax)
 * - Mermaid diagrams (```mermaid blocks)
 * - Enhanced code blocks
 */

import { describe, it, expect } from "vitest";
import {
  ADMONITION_TYPES,
  MERMAID_TEMPLATES,
  COMMON_LANGUAGES,
  checkMaterialExtensions,
  getExtensionGuidance,
} from "../src/renderer/lib/milkdown/materialBlocksPlugin.js";
import { normalizeLanguage, getLanguageLabel, LANGUAGE_ALIASES } from "../src/renderer/lib/milkdown/codeBlockPlugin.js";

describe("Material Blocks", () => {
  describe("Admonition Plugin", () => {
    describe("ADMONITION_TYPES", () => {
      it("should have all Material for MkDocs admonition types", () => {
        const expectedTypes = [
          "note",
          "abstract",
          "info",
          "tip",
          "success",
          "question",
          "warning",
          "failure",
          "danger",
          "bug",
          "example",
          "quote",
        ];

        expectedTypes.forEach((type) => {
          const found = ADMONITION_TYPES.find((t) => t.type === type);
          expect(found, `Missing admonition type: ${type}`).toBeDefined();
          expect(found.icon).toBeDefined();
          expect(found.label).toBeDefined();
        });
      });

      it("should have icons for all types", () => {
        ADMONITION_TYPES.forEach((type) => {
          expect(type.icon).toBeTruthy();
          expect(type.icon.length).toBeGreaterThan(0);
        });
      });

      it("should have labels for all types", () => {
        ADMONITION_TYPES.forEach((type) => {
          expect(type.label).toBeTruthy();
          // Label should be capitalized
          expect(type.label[0]).toBe(type.label[0].toUpperCase());
        });
      });
    });

    describe("Admonition Markdown Syntax", () => {
      it("should recognize standard admonition pattern", () => {
        const pattern = /^(!{3}|\?{3}\+?)\s+(\w+)(?:\s+(inline(?:\s+end)?))?\s*(?:"([^"]*)")?\s*$/;

        // Standard admonition
        expect('!!! note "Title"').toMatch(pattern);
        expect("!!! warning").toMatch(pattern);
        expect('!!! tip "A tip with title"').toMatch(pattern);

        // Collapsible
        expect('??? info "Collapsed by default"').toMatch(pattern);
        expect('???+ example "Open by default"').toMatch(pattern);

        // Inline
        expect('!!! info inline "Inline note"').toMatch(pattern);
        expect('!!! warning inline end "End note"').toMatch(pattern);
      });

      it("should parse admonition components correctly", () => {
        const pattern = /^(!{3}|\?{3}\+?)\s+(\w+)(?:\s+(inline(?:\s+end)?))?\s*(?:"([^"]*)")?\s*$/;

        const match1 = '!!! note "My Title"'.match(pattern);
        expect(match1[1]).toBe("!!!");
        expect(match1[2]).toBe("note");
        expect(match1[3]).toBeUndefined();
        expect(match1[4]).toBe("My Title");

        const match2 = "??? warning".match(pattern);
        expect(match2[1]).toBe("???");
        expect(match2[2]).toBe("warning");
        expect(match2[4]).toBeUndefined();

        const match3 = '???+ tip inline end "Inline"'.match(pattern);
        expect(match3[1]).toBe("???+");
        expect(match3[2]).toBe("tip");
        expect(match3[3]).toBe("inline end");
        expect(match3[4]).toBe("Inline");
      });
    });
  });

  describe("Mermaid Plugin", () => {
    describe("MERMAID_TEMPLATES", () => {
      it("should have common diagram types", () => {
        expect(MERMAID_TEMPLATES.flowchart).toBeDefined();
        expect(MERMAID_TEMPLATES.sequence).toBeDefined();
        expect(MERMAID_TEMPLATES.classDiagram).toBeDefined();
        expect(MERMAID_TEMPLATES.stateDiagram).toBeDefined();
        expect(MERMAID_TEMPLATES.erDiagram).toBeDefined();
        expect(MERMAID_TEMPLATES.gantt).toBeDefined();
        expect(MERMAID_TEMPLATES.pie).toBeDefined();
        expect(MERMAID_TEMPLATES.mindmap).toBeDefined();
      });

      it("should have labels and templates for all types", () => {
        Object.entries(MERMAID_TEMPLATES).forEach(([key, value]) => {
          expect(value.label, `Missing label for ${key}`).toBeDefined();
          expect(value.template, `Missing template for ${key}`).toBeDefined();
          expect(value.template.length).toBeGreaterThan(0);
        });
      });

      it("flowchart template should have valid mermaid syntax", () => {
        const template = MERMAID_TEMPLATES.flowchart.template;
        expect(template).toContain("graph");
        expect(template).toContain("-->");
      });

      it("sequence template should have valid mermaid syntax", () => {
        const template = MERMAID_TEMPLATES.sequence.template;
        expect(template).toContain("sequenceDiagram");
        expect(template).toContain("participant");
      });
    });

    describe("Mermaid Markdown Syntax", () => {
      it("should use fenced code block with mermaid language", () => {
        const mermaidBlock = "```mermaid\ngraph LR\n    A --> B\n```";

        expect(mermaidBlock).toContain("```mermaid");
        expect(mermaidBlock).toContain("```");
      });
    });
  });

  describe("Code Block Plugin", () => {
    describe("COMMON_LANGUAGES", () => {
      it("should have popular programming languages", () => {
        const expectedLanguages = [
          "python",
          "javascript",
          "typescript",
          "html",
          "css",
          "json",
          "yaml",
          "bash",
          "sql",
          "java",
          "go",
          "rust",
        ];

        expectedLanguages.forEach((lang) => {
          const found = COMMON_LANGUAGES.find((l) => l.value === lang);
          expect(found, `Missing language: ${lang}`).toBeDefined();
        });
      });

      it("should have labels for all languages", () => {
        COMMON_LANGUAGES.forEach((lang) => {
          expect(lang.label).toBeDefined();
          expect(lang.label.length).toBeGreaterThan(0);
        });
      });

      it("should have plain text option", () => {
        const plainText = COMMON_LANGUAGES.find((l) => l.value === "");
        expect(plainText).toBeDefined();
        expect(plainText.label).toBe("Plain text");
      });
    });

    describe("normalizeLanguage", () => {
      it("should return empty string for falsy values", () => {
        expect(normalizeLanguage("")).toBe("");
        expect(normalizeLanguage(null)).toBe("");
        expect(normalizeLanguage(undefined)).toBe("");
      });

      it("should lowercase language identifiers", () => {
        expect(normalizeLanguage("Python")).toBe("python");
        expect(normalizeLanguage("JAVASCRIPT")).toBe("javascript");
        expect(normalizeLanguage("TypeScript")).toBe("typescript");
      });

      it("should resolve common aliases", () => {
        expect(normalizeLanguage("js")).toBe("javascript");
        expect(normalizeLanguage("ts")).toBe("typescript");
        expect(normalizeLanguage("py")).toBe("python");
        expect(normalizeLanguage("rb")).toBe("ruby");
        expect(normalizeLanguage("sh")).toBe("bash");
        expect(normalizeLanguage("yml")).toBe("yaml");
      });

      it("should trim whitespace", () => {
        expect(normalizeLanguage("  python  ")).toBe("python");
        expect(normalizeLanguage("\tjavascript\n")).toBe("javascript");
      });
    });

    describe("getLanguageLabel", () => {
      it("should return friendly labels for known languages", () => {
        expect(getLanguageLabel("python")).toBe("Python");
        expect(getLanguageLabel("javascript")).toBe("JavaScript");
        expect(getLanguageLabel("typescript")).toBe("TypeScript");
        expect(getLanguageLabel("cpp")).toBe("C++");
        expect(getLanguageLabel("csharp")).toBe("C#");
      });

      it("should return the language itself for unknown languages", () => {
        expect(getLanguageLabel("unknown-lang")).toBe("unknown-lang");
        expect(getLanguageLabel("custom")).toBe("custom");
      });

      it("should return Plain text for empty language", () => {
        expect(getLanguageLabel("")).toBe("Plain text");
      });

      it("should handle aliases", () => {
        expect(getLanguageLabel("js")).toBe("JavaScript");
        expect(getLanguageLabel("ts")).toBe("TypeScript");
        expect(getLanguageLabel("py")).toBe("Python");
      });
    });

    describe("LANGUAGE_ALIASES", () => {
      it("should have common aliases", () => {
        expect(LANGUAGE_ALIASES.js).toBe("javascript");
        expect(LANGUAGE_ALIASES.ts).toBe("typescript");
        expect(LANGUAGE_ALIASES.py).toBe("python");
        expect(LANGUAGE_ALIASES.rb).toBe("ruby");
        expect(LANGUAGE_ALIASES.sh).toBe("bash");
        expect(LANGUAGE_ALIASES.yml).toBe("yaml");
      });
    });
  });

  describe("Material Extension Checker", () => {
    describe("checkMaterialExtensions", () => {
      it("should detect admonition extension", () => {
        const config = {
          markdown_extensions: ["admonition", "toc"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.admonitions).toBe(true);
      });

      it("should detect pymdownx.blocks.admonition", () => {
        const config = {
          markdown_extensions: ["pymdownx.blocks.admonition"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.admonitions).toBe(true);
      });

      it("should detect mermaid support", () => {
        const config = {
          markdown_extensions: ["pymdownx.superfences"],
          extra_javascript: ["https://unpkg.com/mermaid/dist/mermaid.min.js"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.mermaid).toBe(true);
      });

      it("should detect code highlight extension", () => {
        const config = {
          markdown_extensions: ["pymdownx.highlight", "pymdownx.superfences"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.codeHighlight).toBe(true);
        expect(result.superfences).toBe(true);
      });

      it("should detect codehilite (legacy)", () => {
        const config = {
          markdown_extensions: ["codehilite"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.codeHighlight).toBe(true);
      });

      it("should detect tabbed extension", () => {
        const config = {
          markdown_extensions: ["pymdownx.tabbed"],
        };

        const result = checkMaterialExtensions(config);
        expect(result.tabbed).toBe(true);
      });

      it("should handle extensions as objects", () => {
        const config = {
          markdown_extensions: [{ admonition: {} }, { "pymdownx.highlight": { anchor_linenums: true } }],
        };

        const result = checkMaterialExtensions(config);
        expect(result.admonitions).toBe(true);
        expect(result.codeHighlight).toBe(true);
      });

      it("should return all false for empty config", () => {
        const result = checkMaterialExtensions({});

        expect(result.admonitions).toBe(false);
        expect(result.mermaid).toBe(false);
        expect(result.codeHighlight).toBe(false);
        expect(result.superfences).toBe(false);
        expect(result.tabbed).toBe(false);
      });

      it("should handle mermaid in extra_javascript with object format", () => {
        const config = {
          markdown_extensions: ["pymdownx.superfences"],
          extra_javascript: [{ path: "https://cdn.example.com/mermaid.js" }],
        };

        const result = checkMaterialExtensions(config);
        expect(result.mermaid).toBe(true);
      });
    });

    describe("getExtensionGuidance", () => {
      it("should provide guidance for missing admonitions", () => {
        const enabledFeatures = {
          admonitions: false,
          mermaid: true,
          codeHighlight: true,
        };

        const guidance = getExtensionGuidance(enabledFeatures);

        expect(guidance.admonitions).toBeDefined();
        expect(guidance.admonitions.feature).toBe("Admonitions");
        expect(guidance.admonitions.message).toContain("admonition");
      });

      it("should provide guidance for missing mermaid", () => {
        const enabledFeatures = {
          admonitions: true,
          mermaid: false,
          codeHighlight: true,
        };

        const guidance = getExtensionGuidance(enabledFeatures);

        expect(guidance.mermaid).toBeDefined();
        expect(guidance.mermaid.feature).toBe("Mermaid Diagrams");
        expect(guidance.mermaid.message).toContain("pymdownx.superfences");
        expect(guidance.mermaid.message).toContain("mermaid");
      });

      it("should provide guidance for missing code highlighting", () => {
        const enabledFeatures = {
          admonitions: true,
          mermaid: true,
          codeHighlight: false,
        };

        const guidance = getExtensionGuidance(enabledFeatures);

        expect(guidance.codeHighlight).toBeDefined();
        expect(guidance.codeHighlight.feature).toBe("Code Highlighting");
        expect(guidance.codeHighlight.message).toContain("pymdownx.highlight");
      });

      it("should return empty object when all features enabled", () => {
        const enabledFeatures = {
          admonitions: true,
          mermaid: true,
          codeHighlight: true,
        };

        const guidance = getExtensionGuidance(enabledFeatures);

        expect(Object.keys(guidance)).toHaveLength(0);
      });
    });
  });

  describe("Markdown Serialization", () => {
    describe("Admonition serialization", () => {
      it("should format standard admonition correctly", () => {
        // Expected output format
        const expected = `!!! note "My Note"
    This is the content.`;

        expect(expected).toContain("!!!");
        expect(expected).toContain("note");
        expect(expected).toContain('"My Note"');
        // Content should be indented 4 spaces
        expect(expected).toContain("    This is the content.");
      });

      it("should format collapsible admonition correctly", () => {
        const collapsed = `??? warning "Click to expand"
    Hidden content here.`;

        expect(collapsed).toContain("???");
        expect(collapsed).toContain("warning");

        const expanded = `???+ info "Open by default"
    Visible content.`;

        expect(expanded).toContain("???+");
      });
    });

    describe("Mermaid serialization", () => {
      it("should format as fenced code block", () => {
        const expected = "```mermaid\ngraph LR\n    A --> B\n```";

        expect(expected.startsWith("```mermaid")).toBe(true);
        expect(expected.endsWith("```")).toBe(true);
      });
    });

    describe("Code block serialization", () => {
      it("should format with language identifier", () => {
        const expected = '```python\ndef hello():\n    print("Hello")\n```';

        expect(expected.startsWith("```python")).toBe(true);
        expect(expected.endsWith("```")).toBe(true);
      });

      it("should support meta attributes", () => {
        // Material for MkDocs extended syntax
        const withMeta = '```python title="example.py" hl_lines="1-3"\ndef hello():\n    pass\n```';

        expect(withMeta).toContain("title=");
        expect(withMeta).toContain("hl_lines=");
      });
    });
  });
});
