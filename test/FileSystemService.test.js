/**
 * Tests for FileSystemService
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildFileTree, readFile, writeFile, fileExists, flattenTree } from "../src/main/services/FileSystemService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const SAMPLE_DOCS = path.join(FIXTURES_DIR, "sample-mkdocs-project/docs");

describe("FileSystemService", () => {
  describe("buildFileTree", () => {
    it("should build tree of markdown files", async () => {
      const tree = await buildFileTree(SAMPLE_DOCS);

      expect(tree).toBeInstanceOf(Array);
      expect(tree.length).toBeGreaterThan(0);

      // Should find index.md at root
      const indexFile = tree.find((n) => n.name === "index.md");
      expect(indexFile).toBeDefined();
      expect(indexFile.type).toBe("file");
      expect(indexFile.path).toBe("index.md");
    });

    it("should include directories with markdown children", async () => {
      const tree = await buildFileTree(SAMPLE_DOCS);

      const gettingStarted = tree.find((n) => n.name === "getting-started");
      expect(gettingStarted).toBeDefined();
      expect(gettingStarted.type).toBe("directory");
      expect(gettingStarted.children).toBeInstanceOf(Array);
      expect(gettingStarted.children.length).toBeGreaterThan(0);
    });

    it("should sort directories before files", async () => {
      const tree = await buildFileTree(SAMPLE_DOCS);

      const dirIndex = tree.findIndex((n) => n.type === "directory");
      const fileIndex = tree.findIndex((n) => n.type === "file");

      // If both exist, directories should come first
      if (dirIndex !== -1 && fileIndex !== -1) {
        expect(dirIndex).toBeLessThan(fileIndex);
      }
    });

    it("should skip hidden files", async () => {
      const tree = await buildFileTree(SAMPLE_DOCS);
      const flat = flattenTree(tree);

      const hidden = flat.find((n) => n.name.startsWith("."));
      expect(hidden).toBeUndefined();
    });
  });

  describe("readFile", () => {
    it("should read markdown file content", async () => {
      const result = await readFile(SAMPLE_DOCS, "index.md");

      expect(result.path).toBe("index.md");
      expect(result.content).toContain("# Welcome");
      expect(result.mtime).toBeTypeOf("number");
    });

    it("should reject non-markdown files", async () => {
      await expect(readFile(SAMPLE_DOCS, "test.txt")).rejects.toThrow(/Only markdown files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(readFile(SAMPLE_DOCS, "../mkdocs.yml")).rejects.toThrow(/Access denied/);
    });

    it("should throw for non-existent file", async () => {
      await expect(readFile(SAMPLE_DOCS, "non-existent.md")).rejects.toThrow();
    });
  });

  describe("writeFile", () => {
    const testFilePath = "test-write.md";
    const testContent = "# Test Write\n\nThis is a test file.";

    afterAll(async () => {
      // Cleanup test file
      try {
        await fs.promises.unlink(path.join(SAMPLE_DOCS, testFilePath));
      } catch {
        // Ignore if file doesn't exist
      }
    });

    it("should write markdown file", async () => {
      const result = await writeFile(SAMPLE_DOCS, testFilePath, testContent);

      expect(result.path).toBe(testFilePath);
      expect(result.mtime).toBeTypeOf("number");

      // Verify content was written
      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, testFilePath), "utf-8");
      expect(content).toBe(testContent);
    });

    it("should reject non-markdown files", async () => {
      await expect(writeFile(SAMPLE_DOCS, "test.txt", "content")).rejects.toThrow(/Only markdown files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(writeFile(SAMPLE_DOCS, "../outside.md", "content")).rejects.toThrow(/Access denied/);
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const exists = await fileExists(SAMPLE_DOCS, "index.md");
      expect(exists).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const exists = await fileExists(SAMPLE_DOCS, "non-existent.md");
      expect(exists).toBe(false);
    });
  });

  describe("flattenTree", () => {
    it("should flatten nested tree to file list", async () => {
      const tree = await buildFileTree(SAMPLE_DOCS);
      const flat = flattenTree(tree);

      // All items should be files
      expect(flat.every((n) => n.type === "file")).toBe(true);

      // Should contain expected files
      const paths = flat.map((n) => n.path);
      expect(paths).toContain("index.md");
    });
  });
});
