/**
 * Tests for MkDocsPreviewService
 */

import { describe, it, expect } from "vitest";
import {
  findAvailablePort,
  healthCheck,
  checkMkDocsAvailability,
  PreviewService,
} from "../src/main/services/MkDocsPreviewService.js";

describe("MkDocsPreviewService", () => {
  describe("findAvailablePort", () => {
    it("should find an available port", async () => {
      const port = await findAvailablePort(9000);
      expect(port).toBeTypeOf("number");
      expect(port).toBeGreaterThanOrEqual(9000);
      expect(port).toBeLessThan(9100);
    });

    it("should throw if no port available in range", async () => {
      // This is a theoretical test - in practice ports will be available
      await expect(findAvailablePort(99999, 1)).rejects.toThrow();
    });
  });

  describe("healthCheck", () => {
    it("should return false for non-existent server", async () => {
      const result = await healthCheck("http://127.0.0.1:59999", 1000);
      expect(result).toBe(false);
    });

    it("should timeout for unresponsive server", async () => {
      const startTime = Date.now();
      const result = await healthCheck("http://192.0.2.1:8080", 500); // TEST-NET IP
      const elapsed = Date.now() - startTime;

      expect(result).toBe(false);
      expect(elapsed).toBeLessThan(2000); // Should respect timeout
    });
  });

  describe("checkMkDocsAvailability", () => {
    it("should return availability status object", () => {
      const result = checkMkDocsAvailability();
      expect(result).toHaveProperty("available");
      expect(typeof result.available).toBe("boolean");

      if (result.available) {
        expect(result).toHaveProperty("version");
        expect(result).toHaveProperty("path");
      } else {
        expect(result).toHaveProperty("error");
      }
    });
  });

  describe("PreviewService", () => {
    it("should initialize with stopped state", () => {
      const service = new PreviewService("/some/project");
      const state = service.getState();

      expect(state.status).toBe("stopped");
      expect(state.url).toBeNull();
      expect(state.port).toBeNull();
      expect(state.error).toBeNull();
    });

    it("should have empty logs initially", () => {
      const service = new PreviewService("/some/project");
      expect(service.getLogs()).toEqual([]);
    });

    it("should emit status events", async () => {
      const service = new PreviewService("/some/project");
      const events = [];

      service.on("status", (state) => {
        events.push(state.status);
      });

      // Simulate state changes via internal method
      service._updateState({ status: "starting" });
      service._updateState({ status: "error", error: "Test error" });

      expect(events).toContain("starting");
      expect(events).toContain("error");
    });

    it("should emit log events", () => {
      const service = new PreviewService("/some/project");
      const logs = [];

      service.on("log", (entry) => {
        logs.push(entry);
      });

      service._addLog("Test log message");

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("Test log message");

      service.destroy();
    });

    it("should clear logs", () => {
      const service = new PreviewService("/some/project");

      service._addLog("Log 1");
      service._addLog("Log 2");
      expect(service.getLogs().length).toBe(2);

      service.clearLogs();
      expect(service.getLogs().length).toBe(0);

      service.destroy();
    });

    it("should emit logsCleared event when clearing logs", () => {
      const service = new PreviewService("/some/project");
      let cleared = false;

      service.on("logsCleared", () => {
        cleared = true;
      });

      service.clearLogs();
      expect(cleared).toBe(true);

      service.destroy();
    });

    it("should return null for getPageUrl when not running", () => {
      const service = new PreviewService("/some/project");
      expect(service.getPageUrl("index.md")).toBeNull();
      service.destroy();
    });

    it("should generate correct page URLs when running", () => {
      const service = new PreviewService("/some/project");

      // Simulate running state
      service.state = {
        status: "running",
        url: "http://127.0.0.1:8000",
        port: 8000,
        error: null,
      };

      // Test various path conversions
      expect(service.getPageUrl("index.md")).toBe("http://127.0.0.1:8000/");
      expect(service.getPageUrl("getting-started/installation.md")).toBe(
        "http://127.0.0.1:8000/getting-started/installation/",
      );
      expect(service.getPageUrl("reference/api.md")).toBe("http://127.0.0.1:8000/reference/api/");

      service.destroy();
    });

    it("should return false for isHealthy when not running", async () => {
      const service = new PreviewService("/some/project");
      const healthy = await service.isHealthy();
      expect(healthy).toBe(false);
      service.destroy();
    });

    it("should properly cleanup on destroy", () => {
      const service = new PreviewService("/some/project");
      const eventCount = service.listenerCount("status");

      service.on("status", () => {});
      expect(service.listenerCount("status")).toBe(eventCount + 1);

      service.destroy();
      expect(service.listenerCount("status")).toBe(0);
    });

    // Note: Integration tests for start/stop would require mkdocs to be installed
    // Those are better suited for e2e tests
  });
});
