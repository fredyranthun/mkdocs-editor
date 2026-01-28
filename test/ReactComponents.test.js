/**
 * React Components Tests
 *
 * Tests for React components structure and basic rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.api for component tests
const mockApi = {
  project: {
    open: vi.fn(),
    load: vi.fn(),
    getCurrent: vi.fn(),
    getTree: vi.fn().mockResolvedValue([]),
    close: vi.fn(),
  },
  page: {
    read: vi.fn(),
    write: vi.fn(),
    exists: vi.fn(),
  },
  preview: {
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ status: "stopped", url: null }),
    getLogs: vi.fn(),
    checkMkDocs: vi.fn(),
    onStatus: vi.fn().mockReturnValue(() => {}),
    onLog: vi.fn().mockReturnValue(() => {}),
  },
};

// Set up global mock before imports
globalThis.window = { api: mockApi };

describe("Component Module Structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sidebar Component", () => {
    it("should export Sidebar component", async () => {
      const { Sidebar } = await import("../src/renderer/components/Sidebar.jsx");
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe("function");
    });
  });

  describe("EditorPane Component", () => {
    it("should export EditorPane component", async () => {
      const { EditorPane } = await import("../src/renderer/components/EditorPane.jsx");
      expect(EditorPane).toBeDefined();
      expect(typeof EditorPane).toBe("function");
    });
  });

  describe("PreviewPane Component", () => {
    it("should export PreviewPane component", async () => {
      const { PreviewPane } = await import("../src/renderer/components/PreviewPane.jsx");
      expect(PreviewPane).toBeDefined();
      expect(typeof PreviewPane).toBe("function");
    });
  });

  describe("Header Component", () => {
    it("should export Header component", async () => {
      const { Header } = await import("../src/renderer/components/Header.jsx");
      expect(Header).toBeDefined();
      expect(typeof Header).toBe("function");
    });
  });

  describe("StatusBar Component", () => {
    it("should export StatusBar component", async () => {
      const { StatusBar } = await import("../src/renderer/components/StatusBar.jsx");
      expect(StatusBar).toBeDefined();
      expect(typeof StatusBar).toBe("function");
    });
  });

  describe("MilkdownEditor Component", () => {
    it("should export MilkdownEditor component", async () => {
      const { MilkdownEditor } = await import("../src/renderer/components/MilkdownEditor.jsx");
      expect(MilkdownEditor).toBeDefined();
      // forwardRef components are objects with a $$typeof symbol, not plain functions
      expect(typeof MilkdownEditor).toMatch(/function|object/);
    });
  });

  describe("Component Index Exports", () => {
    it("should export all components from index", async () => {
      const components = await import("../src/renderer/components/index.js");
      expect(components.Sidebar).toBeDefined();
      expect(components.EditorPane).toBeDefined();
      expect(components.PreviewPane).toBeDefined();
      expect(components.Header).toBeDefined();
      expect(components.StatusBar).toBeDefined();
      expect(components.MilkdownEditor).toBeDefined();
    });
  });
});

describe("App Component", () => {
  it("should export App component", async () => {
    const { App } = await import("../src/renderer/App.jsx");
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });
});
