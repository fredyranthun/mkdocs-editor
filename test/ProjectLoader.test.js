/**
 * Tests for ProjectLoader service
 */

import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findMkDocsConfig,
  parseMkDocsConfig,
  loadProject,
  getAvailableFeatures,
} from "../src/main/services/ProjectLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const SAMPLE_PROJECT = path.join(FIXTURES_DIR, "sample-mkdocs-project");

describe("ProjectLoader", () => {
  describe("findMkDocsConfig", () => {
    it("should find mkdocs.yml in valid project", async () => {
      const result = await findMkDocsConfig(SAMPLE_PROJECT);
      expect(result).toBe(path.join(SAMPLE_PROJECT, "mkdocs.yml"));
    });

    it("should return null for directory without mkdocs.yml", async () => {
      const result = await findMkDocsConfig(FIXTURES_DIR);
      expect(result).toBeNull();
    });

    it("should return null for non-existent directory", async () => {
      const result = await findMkDocsConfig("/non/existent/path");
      expect(result).toBeNull();
    });
  });

  describe("parseMkDocsConfig", () => {
    it("should parse valid mkdocs.yml", async () => {
      const configPath = path.join(SAMPLE_PROJECT, "mkdocs.yml");
      const config = await parseMkDocsConfig(configPath);

      expect(config.siteName).toBe("Sample MkDocs Site");
      expect(config.docsDir).toBe("docs");
      expect(config.siteDir).toBe("site");
      expect(config.nav).toBeInstanceOf(Array);
      expect(config.theme.name).toBe("material");
    });

    it("should extract markdown extension names", async () => {
      const configPath = path.join(SAMPLE_PROJECT, "mkdocs.yml");
      const config = await parseMkDocsConfig(configPath);

      expect(config.markdownExtensions).toContain("admonition");
      expect(config.markdownExtensions).toContain("pymdownx.superfences");
      expect(config.markdownExtensions).toContain("tables");
    });

    it("should throw for invalid file path", async () => {
      await expect(parseMkDocsConfig("/non/existent/mkdocs.yml")).rejects.toThrow();
    });
  });

  describe("loadProject", () => {
    it("should load valid MkDocs project", async () => {
      const project = await loadProject(SAMPLE_PROJECT);

      expect(project.projectRoot).toBe(path.resolve(SAMPLE_PROJECT));
      expect(project.configPath).toBe(path.join(SAMPLE_PROJECT, "mkdocs.yml"));
      expect(project.config.siteName).toBe("Sample MkDocs Site");
    });

    it("should throw for directory without mkdocs.yml", async () => {
      await expect(loadProject(FIXTURES_DIR)).rejects.toThrow(/No mkdocs\.yml found/);
    });

    it("should throw for non-existent directory", async () => {
      await expect(loadProject("/non/existent/project")).rejects.toThrow();
    });
  });

  describe("getAvailableFeatures", () => {
    it("should detect admonitions extension", () => {
      const features = getAvailableFeatures(["admonition"]);
      expect(features.admonitions).toBe(true);
      expect(features.mermaid).toBe(false);
    });

    it("should detect mermaid via superfences", () => {
      const features = getAvailableFeatures(["pymdownx.superfences"]);
      expect(features.mermaid).toBe(true);
    });

    it("should detect code highlight extensions", () => {
      const features1 = getAvailableFeatures(["pymdownx.highlight"]);
      expect(features1.codeHighlight).toBe(true);

      const features2 = getAvailableFeatures(["codehilite"]);
      expect(features2.codeHighlight).toBe(true);
    });

    it("should detect tables extension", () => {
      const features = getAvailableFeatures(["tables"]);
      expect(features.tables).toBe(true);
    });

    it("should return all false for empty extensions", () => {
      const features = getAvailableFeatures([]);
      expect(features.admonitions).toBe(false);
      expect(features.mermaid).toBe(false);
      expect(features.tables).toBe(false);
    });
  });
});
