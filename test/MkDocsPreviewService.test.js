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
    });

    // Note: Integration tests for start/stop would require mkdocs to be installed
    // Those are better suited for e2e tests
  });
});
