/**
 * Tests for FileSystemService
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildFileTree,
  readFile,
  writeFile,
  fileExists,
  flattenTree,
  createFile,
  deleteFile,
  renameFile,
  createDirectory,
  deleteDirectory,
  renameDirectory,
  isImageFile,
  copyAsset,
  listAssets,
  deleteAsset,
  getRelativeAssetPath,
} from "../src/main/services/FileSystemService.js";

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

  describe("createFile", () => {
    const testFilePath = "test-create.md";
    const testFileInSubdir = "test-subdir/nested-create.md";

    afterEach(async () => {
      // Cleanup test files
      try {
        await fs.promises.unlink(path.join(SAMPLE_DOCS, testFilePath));
      } catch {
        // Ignore if file doesn't exist
      }
      try {
        await fs.promises.unlink(path.join(SAMPLE_DOCS, testFileInSubdir));
        await fs.promises.rmdir(path.join(SAMPLE_DOCS, "test-subdir"));
      } catch {
        // Ignore if files/dirs don't exist
      }
    });

    it("should create a new markdown file", async () => {
      const result = await createFile(SAMPLE_DOCS, testFilePath, "# New File");

      expect(result.path).toBe(testFilePath);
      expect(result.mtime).toBeTypeOf("number");

      // Verify file exists and has correct content
      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, testFilePath), "utf-8");
      expect(content).toBe("# New File");
    });

    it("should create file with empty content by default", async () => {
      const result = await createFile(SAMPLE_DOCS, testFilePath);

      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, testFilePath), "utf-8");
      expect(content).toBe("");
    });

    it("should create parent directories if needed", async () => {
      const result = await createFile(SAMPLE_DOCS, testFileInSubdir, "# Nested");

      expect(result.path).toBe(testFileInSubdir);

      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, testFileInSubdir), "utf-8");
      expect(content).toBe("# Nested");
    });

    it("should reject if file already exists", async () => {
      await createFile(SAMPLE_DOCS, testFilePath, "first");
      await expect(createFile(SAMPLE_DOCS, testFilePath, "second")).rejects.toThrow(/already exists/);
    });

    it("should reject non-markdown files", async () => {
      await expect(createFile(SAMPLE_DOCS, "test.txt", "content")).rejects.toThrow(/Only markdown files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(createFile(SAMPLE_DOCS, "../outside.md", "content")).rejects.toThrow(/Access denied/);
    });
  });

  describe("deleteFile", () => {
    const testFilePath = "test-delete.md";

    beforeEach(async () => {
      // Create test file
      await fs.promises.writeFile(path.join(SAMPLE_DOCS, testFilePath), "# To Delete", "utf-8");
    });

    afterEach(async () => {
      // Cleanup test file if still exists
      try {
        await fs.promises.unlink(path.join(SAMPLE_DOCS, testFilePath));
      } catch {
        // Ignore
      }
    });

    it("should delete an existing markdown file", async () => {
      const result = await deleteFile(SAMPLE_DOCS, testFilePath);

      expect(result.path).toBe(testFilePath);
      expect(result.deleted).toBe(true);

      // Verify file no longer exists
      const exists = await fileExists(SAMPLE_DOCS, testFilePath);
      expect(exists).toBe(false);
    });

    it("should reject non-markdown files", async () => {
      await expect(deleteFile(SAMPLE_DOCS, "test.txt")).rejects.toThrow(/Only markdown files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(deleteFile(SAMPLE_DOCS, "../outside.md")).rejects.toThrow(/Access denied/);
    });

    it("should throw for non-existent file", async () => {
      await expect(deleteFile(SAMPLE_DOCS, "non-existent.md")).rejects.toThrow();
    });
  });

  describe("renameFile", () => {
    const originalPath = "test-rename-original.md";
    const newPath = "test-rename-new.md";
    const movedPath = "getting-started/test-moved.md";

    beforeEach(async () => {
      // Create test file
      await fs.promises.writeFile(path.join(SAMPLE_DOCS, originalPath), "# Original", "utf-8");
    });

    afterEach(async () => {
      // Cleanup test files
      for (const filePath of [originalPath, newPath, movedPath]) {
        try {
          await fs.promises.unlink(path.join(SAMPLE_DOCS, filePath));
        } catch {
          // Ignore
        }
      }
    });

    it("should rename a markdown file", async () => {
      const result = await renameFile(SAMPLE_DOCS, originalPath, newPath);

      expect(result.oldPath).toBe(originalPath);
      expect(result.newPath).toBe(newPath);
      expect(result.mtime).toBeTypeOf("number");

      // Verify old file doesn't exist
      const oldExists = await fileExists(SAMPLE_DOCS, originalPath);
      expect(oldExists).toBe(false);

      // Verify new file exists with same content
      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, newPath), "utf-8");
      expect(content).toBe("# Original");
    });

    it("should move a file to a different directory", async () => {
      const result = await renameFile(SAMPLE_DOCS, originalPath, movedPath);

      expect(result.oldPath).toBe(originalPath);
      expect(result.newPath).toBe(movedPath);

      // Verify file was moved
      const oldExists = await fileExists(SAMPLE_DOCS, originalPath);
      expect(oldExists).toBe(false);

      const newExists = await fileExists(SAMPLE_DOCS, movedPath);
      expect(newExists).toBe(true);
    });

    it("should reject if destination exists", async () => {
      await fs.promises.writeFile(path.join(SAMPLE_DOCS, newPath), "# Existing", "utf-8");
      await expect(renameFile(SAMPLE_DOCS, originalPath, newPath)).rejects.toThrow(/already exists/);
    });

    it("should reject non-markdown files", async () => {
      await expect(renameFile(SAMPLE_DOCS, originalPath, "new.txt")).rejects.toThrow(/Only markdown files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(renameFile(SAMPLE_DOCS, originalPath, "../outside.md")).rejects.toThrow(/Access denied/);
    });
  });

  describe("createDirectory", () => {
    const testDirPath = "test-new-dir";
    const nestedDirPath = "test-parent/test-child";

    afterEach(async () => {
      // Cleanup test directories
      try {
        await fs.promises.rmdir(path.join(SAMPLE_DOCS, testDirPath));
      } catch {
        // Ignore
      }
      try {
        await fs.promises.rmdir(path.join(SAMPLE_DOCS, "test-parent/test-child"));
        await fs.promises.rmdir(path.join(SAMPLE_DOCS, "test-parent"));
      } catch {
        // Ignore
      }
    });

    it("should create a new directory", async () => {
      const result = await createDirectory(SAMPLE_DOCS, testDirPath);

      expect(result.path).toBe(testDirPath);
      expect(result.created).toBe(true);

      // Verify directory exists
      const stat = await fs.promises.stat(path.join(SAMPLE_DOCS, testDirPath));
      expect(stat.isDirectory()).toBe(true);
    });

    it("should create nested directories", async () => {
      const result = await createDirectory(SAMPLE_DOCS, nestedDirPath);

      expect(result.path).toBe(nestedDirPath);

      const stat = await fs.promises.stat(path.join(SAMPLE_DOCS, nestedDirPath));
      expect(stat.isDirectory()).toBe(true);
    });

    it("should reject path traversal attempts", async () => {
      await expect(createDirectory(SAMPLE_DOCS, "../outside-dir")).rejects.toThrow(/Access denied/);
    });
  });

  describe("deleteDirectory", () => {
    const testDirPath = "test-delete-dir";

    beforeEach(async () => {
      // Create test directory
      await fs.promises.mkdir(path.join(SAMPLE_DOCS, testDirPath), { recursive: true });
    });

    afterEach(async () => {
      // Cleanup test directory
      try {
        await fs.promises.rmdir(path.join(SAMPLE_DOCS, testDirPath));
      } catch {
        // Ignore
      }
    });

    it("should delete an empty directory", async () => {
      const result = await deleteDirectory(SAMPLE_DOCS, testDirPath);

      expect(result.path).toBe(testDirPath);
      expect(result.deleted).toBe(true);

      // Verify directory no longer exists
      await expect(fs.promises.stat(path.join(SAMPLE_DOCS, testDirPath))).rejects.toThrow();
    });

    it("should reject deleting non-empty directory", async () => {
      // Create a file in the directory
      await fs.promises.writeFile(path.join(SAMPLE_DOCS, testDirPath, "file.md"), "content", "utf-8");

      await expect(deleteDirectory(SAMPLE_DOCS, testDirPath)).rejects.toThrow(/not empty/);

      // Cleanup
      await fs.promises.unlink(path.join(SAMPLE_DOCS, testDirPath, "file.md"));
    });

    it("should reject path traversal attempts", async () => {
      await expect(deleteDirectory(SAMPLE_DOCS, "../outside-dir")).rejects.toThrow(/Access denied/);
    });
  });

  describe("renameDirectory", () => {
    const originalDir = "test-dir-original";
    const newDir = "test-dir-new";

    beforeEach(async () => {
      // Create test directory with a file
      await fs.promises.mkdir(path.join(SAMPLE_DOCS, originalDir), { recursive: true });
      await fs.promises.writeFile(path.join(SAMPLE_DOCS, originalDir, "test.md"), "# Test", "utf-8");
    });

    afterEach(async () => {
      // Cleanup test directories
      for (const dir of [originalDir, newDir]) {
        try {
          const entries = await fs.promises.readdir(path.join(SAMPLE_DOCS, dir));
          for (const entry of entries) {
            await fs.promises.unlink(path.join(SAMPLE_DOCS, dir, entry));
          }
          await fs.promises.rmdir(path.join(SAMPLE_DOCS, dir));
        } catch {
          // Ignore
        }
      }
    });

    it("should rename a directory", async () => {
      const result = await renameDirectory(SAMPLE_DOCS, originalDir, newDir);

      expect(result.oldPath).toBe(originalDir);
      expect(result.newPath).toBe(newDir);

      // Verify old directory doesn't exist
      await expect(fs.promises.stat(path.join(SAMPLE_DOCS, originalDir))).rejects.toThrow();

      // Verify new directory exists with contents
      const stat = await fs.promises.stat(path.join(SAMPLE_DOCS, newDir));
      expect(stat.isDirectory()).toBe(true);

      // Verify content was preserved
      const content = await fs.promises.readFile(path.join(SAMPLE_DOCS, newDir, "test.md"), "utf-8");
      expect(content).toBe("# Test");
    });

    it("should reject if destination exists", async () => {
      await fs.promises.mkdir(path.join(SAMPLE_DOCS, newDir), { recursive: true });
      await expect(renameDirectory(SAMPLE_DOCS, originalDir, newDir)).rejects.toThrow(/already exists/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(renameDirectory(SAMPLE_DOCS, originalDir, "../outside-dir")).rejects.toThrow(/Access denied/);
    });

    it("should reject if source is not a directory", async () => {
      await expect(renameDirectory(SAMPLE_DOCS, "index.md", newDir)).rejects.toThrow(/not a directory/);
    });
  });

  // =========================================================================
  // Asset Management Tests
  // =========================================================================

  describe("isImageFile", () => {
    it("should return true for supported image extensions", () => {
      expect(isImageFile("test.png")).toBe(true);
      expect(isImageFile("test.jpg")).toBe(true);
      expect(isImageFile("test.jpeg")).toBe(true);
      expect(isImageFile("test.gif")).toBe(true);
      expect(isImageFile("test.svg")).toBe(true);
      expect(isImageFile("test.webp")).toBe(true);
      expect(isImageFile("test.ico")).toBe(true);
      expect(isImageFile("test.bmp")).toBe(true);
    });

    it("should return true for uppercase extensions", () => {
      expect(isImageFile("test.PNG")).toBe(true);
      expect(isImageFile("test.JPG")).toBe(true);
    });

    it("should return false for non-image files", () => {
      expect(isImageFile("test.md")).toBe(false);
      expect(isImageFile("test.txt")).toBe(false);
      expect(isImageFile("test.js")).toBe(false);
      expect(isImageFile("test.pdf")).toBe(false);
    });

    it("should handle paths with directories", () => {
      expect(isImageFile("assets/images/test.png")).toBe(true);
      expect(isImageFile("/absolute/path/test.jpg")).toBe(true);
    });
  });

  describe("copyAsset", () => {
    const TEST_ASSETS_DIR = path.join(SAMPLE_DOCS, "assets");
    let testImagePath;

    beforeAll(async () => {
      // Create a test image file in fixtures
      testImagePath = path.join(FIXTURES_DIR, "test-image.png");
      // Create a minimal valid PNG (1x1 transparent pixel)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d,
        0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      await fs.promises.writeFile(testImagePath, pngBuffer);
    });

    afterAll(async () => {
      // Cleanup test image
      try {
        await fs.promises.unlink(testImagePath);
      } catch {
        // Ignore
      }
    });

    afterEach(async () => {
      // Cleanup assets directory
      try {
        const entries = await fs.promises.readdir(TEST_ASSETS_DIR);
        for (const entry of entries) {
          await fs.promises.unlink(path.join(TEST_ASSETS_DIR, entry));
        }
        await fs.promises.rmdir(TEST_ASSETS_DIR);
      } catch {
        // Ignore
      }
    });

    it("should copy image to assets directory", async () => {
      const result = await copyAsset(SAMPLE_DOCS, testImagePath);

      expect(result.relativePath).toBe("assets/test-image.png");
      expect(result.filename).toBe("test-image.png");
      expect(result.absolutePath).toBe(path.join(SAMPLE_DOCS, "assets/test-image.png"));

      // Verify file was copied
      const exists = await fs.promises
        .access(result.absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should create assets directory if it doesn't exist", async () => {
      const result = await copyAsset(SAMPLE_DOCS, testImagePath);

      const stat = await fs.promises.stat(TEST_ASSETS_DIR);
      expect(stat.isDirectory()).toBe(true);
    });

    it("should generate unique filename if file exists", async () => {
      // Copy first time
      const result1 = await copyAsset(SAMPLE_DOCS, testImagePath);
      expect(result1.filename).toBe("test-image.png");

      // Copy second time - should get unique name
      const result2 = await copyAsset(SAMPLE_DOCS, testImagePath);
      expect(result2.filename).toBe("test-image-1.png");

      // Copy third time
      const result3 = await copyAsset(SAMPLE_DOCS, testImagePath);
      expect(result3.filename).toBe("test-image-2.png");
    });

    it("should reject non-image files", async () => {
      const textFile = path.join(FIXTURES_DIR, "test.txt");
      await fs.promises.writeFile(textFile, "test");

      await expect(copyAsset(SAMPLE_DOCS, textFile)).rejects.toThrow(/Not a supported image file/);

      await fs.promises.unlink(textFile);
    });

    it("should reject non-existent source file", async () => {
      await expect(copyAsset(SAMPLE_DOCS, "/nonexistent/file.png")).rejects.toThrow(/does not exist/);
    });

    it("should copy to custom subdirectory", async () => {
      const result = await copyAsset(SAMPLE_DOCS, testImagePath, "images");

      expect(result.relativePath).toBe("images/test-image.png");

      // Cleanup custom dir
      await fs.promises.unlink(result.absolutePath);
      await fs.promises.rmdir(path.join(SAMPLE_DOCS, "images"));
    });
  });

  describe("listAssets", () => {
    const TEST_ASSETS_DIR = path.join(SAMPLE_DOCS, "assets");

    afterEach(async () => {
      // Cleanup assets directory
      try {
        const entries = await fs.promises.readdir(TEST_ASSETS_DIR);
        for (const entry of entries) {
          await fs.promises.unlink(path.join(TEST_ASSETS_DIR, entry));
        }
        await fs.promises.rmdir(TEST_ASSETS_DIR);
      } catch {
        // Ignore
      }
    });

    it("should return empty array if assets directory doesn't exist", async () => {
      const assets = await listAssets(SAMPLE_DOCS);
      expect(assets).toEqual([]);
    });

    it("should list image files in assets directory", async () => {
      // Create assets directory with test files
      await fs.promises.mkdir(TEST_ASSETS_DIR, { recursive: true });
      await fs.promises.writeFile(path.join(TEST_ASSETS_DIR, "image1.png"), "fake");
      await fs.promises.writeFile(path.join(TEST_ASSETS_DIR, "image2.jpg"), "fake");
      await fs.promises.writeFile(path.join(TEST_ASSETS_DIR, "notimage.txt"), "text");

      const assets = await listAssets(SAMPLE_DOCS);

      expect(assets.length).toBe(2);
      expect(assets.map((a) => a.name)).toContain("image1.png");
      expect(assets.map((a) => a.name)).toContain("image2.jpg");
      expect(assets.map((a) => a.name)).not.toContain("notimage.txt");
    });

    it("should include file metadata", async () => {
      await fs.promises.mkdir(TEST_ASSETS_DIR, { recursive: true });
      await fs.promises.writeFile(path.join(TEST_ASSETS_DIR, "test.png"), "fake content");

      const assets = await listAssets(SAMPLE_DOCS);

      expect(assets[0]).toHaveProperty("name", "test.png");
      expect(assets[0]).toHaveProperty("path", "assets/test.png");
      expect(assets[0]).toHaveProperty("absolutePath");
      expect(assets[0]).toHaveProperty("size");
      expect(assets[0]).toHaveProperty("mtime");
    });
  });

  describe("deleteAsset", () => {
    const TEST_ASSETS_DIR = path.join(SAMPLE_DOCS, "assets");

    afterEach(async () => {
      // Cleanup assets directory
      try {
        const entries = await fs.promises.readdir(TEST_ASSETS_DIR);
        for (const entry of entries) {
          await fs.promises.unlink(path.join(TEST_ASSETS_DIR, entry));
        }
        await fs.promises.rmdir(TEST_ASSETS_DIR);
      } catch {
        // Ignore
      }
    });

    it("should delete an asset file", async () => {
      await fs.promises.mkdir(TEST_ASSETS_DIR, { recursive: true });
      await fs.promises.writeFile(path.join(TEST_ASSETS_DIR, "delete-me.png"), "fake");

      const result = await deleteAsset(SAMPLE_DOCS, "assets/delete-me.png");

      expect(result.path).toBe("assets/delete-me.png");
      expect(result.deleted).toBe(true);

      // Verify file was deleted
      const exists = await fs.promises
        .access(path.join(TEST_ASSETS_DIR, "delete-me.png"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it("should reject non-image files", async () => {
      await expect(deleteAsset(SAMPLE_DOCS, "assets/file.txt")).rejects.toThrow(/Only image files/);
    });

    it("should reject path traversal attempts", async () => {
      await expect(deleteAsset(SAMPLE_DOCS, "../outside.png")).rejects.toThrow(/Access denied/);
    });
  });

  describe("getRelativeAssetPath", () => {
    it("should return asset path when markdown is at root", () => {
      const result = getRelativeAssetPath("index.md", "assets/image.png");
      expect(result).toBe("assets/image.png");
    });

    it("should calculate relative path from nested markdown", () => {
      const result = getRelativeAssetPath("getting-started/installation.md", "assets/image.png");
      expect(result).toBe("../assets/image.png");
    });

    it("should handle deeply nested markdown files", () => {
      const result = getRelativeAssetPath("a/b/c/page.md", "assets/image.png");
      expect(result).toBe("../../../assets/image.png");
    });

    it("should handle asset in same directory as markdown", () => {
      const result = getRelativeAssetPath("docs/page.md", "docs/image.png");
      expect(result).toBe("image.png");
    });

    it("should use forward slashes for markdown compatibility", () => {
      const result = getRelativeAssetPath("getting-started/page.md", "assets/images/photo.png");
      expect(result).not.toContain("\\");
      expect(result).toBe("../assets/images/photo.png");
    });
  });
});
