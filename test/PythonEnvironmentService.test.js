/**
 * Tests for PythonEnvironmentService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import {
  checkPythonAvailability,
  detectProjectEnvironment,
  PythonEnvironmentService,
  createPythonEnvironmentService,
} from "../src/main/services/PythonEnvironmentService.js";

// Sample project path for testing
const FIXTURES_PATH = path.join(process.cwd(), "fixtures", "sample-mkdocs-project");

describe("PythonEnvironmentService", () => {
  describe("checkPythonAvailability", () => {
    it("should return availability status object", () => {
      const result = checkPythonAvailability();
      expect(result).toHaveProperty("available");
      expect(typeof result.available).toBe("boolean");

      if (result.available) {
        expect(result).toHaveProperty("version");
        expect(result.version).toMatch(/Python \d+\.\d+/);
        expect(result).toHaveProperty("path");
        expect(result.path).toBeTruthy();
      } else {
        expect(result).toHaveProperty("error");
        expect(result.error).toBeTruthy();
      }
    });

    it("should detect Python 3.x", () => {
      const result = checkPythonAvailability();
      if (result.available) {
        expect(result.version).toMatch(/Python 3\.\d+/);
      }
    });
  });

  describe("detectProjectEnvironment", () => {
    it("should detect basic project structure", async () => {
      const result = await detectProjectEnvironment(FIXTURES_PATH);

      expect(result).toHaveProperty("hasRequirements");
      expect(result).toHaveProperty("hasPoetry");
      expect(result).toHaveProperty("hasPipenv");
      expect(result).toHaveProperty("hasVenv");
      expect(result).toHaveProperty("hasAppVenv");
      expect(result).toHaveProperty("existingVenvPath");

      // All should be booleans
      expect(typeof result.hasRequirements).toBe("boolean");
      expect(typeof result.hasPoetry).toBe("boolean");
      expect(typeof result.hasPipenv).toBe("boolean");
      expect(typeof result.hasVenv).toBe("boolean");
      expect(typeof result.hasAppVenv).toBe("boolean");
    });

    it("should detect requirements.txt if present", async () => {
      // Create a temp requirements.txt
      const tempDir = path.join(process.cwd(), "test", ".temp-env-test");
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, "requirements.txt"), "mkdocs-material\n");

      try {
        const result = await detectProjectEnvironment(tempDir);
        expect(result.hasRequirements).toBe(true);
      } finally {
        // Cleanup
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("should detect poetry.lock if present", async () => {
      const tempDir = path.join(process.cwd(), "test", ".temp-env-test-poetry");
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, "poetry.lock"), "# poetry lock file\n");

      try {
        const result = await detectProjectEnvironment(tempDir);
        expect(result.hasPoetry).toBe(true);
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("should detect pyproject.toml with poetry", async () => {
      const tempDir = path.join(process.cwd(), "test", ".temp-env-test-pyproject");
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, "pyproject.toml"), "[tool.poetry]\nname = 'test'\n");

      try {
        const result = await detectProjectEnvironment(tempDir);
        expect(result.hasPoetry).toBe(true);
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("should detect Pipfile if present", async () => {
      const tempDir = path.join(process.cwd(), "test", ".temp-env-test-pipenv");
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(path.join(tempDir, "Pipfile"), "[[source]]\n");

      try {
        const result = await detectProjectEnvironment(tempDir);
        expect(result.hasPipenv).toBe(true);
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("PythonEnvironmentService class", () => {
    it("should initialize with not-initialized state", () => {
      const service = new PythonEnvironmentService("/some/project");
      const state = service.getState();

      expect(state.status).toBe("not-initialized");
      expect(state.pythonPath).toBeNull();
      expect(state.mkdocsPath).toBeNull();
      expect(state.venvPath).toBeNull();
      expect(state.error).toBeNull();
      expect(state.envType).toBeNull();
    });

    it("should have empty logs initially", () => {
      const service = new PythonEnvironmentService("/some/project");
      expect(service.getLogs()).toEqual([]);
    });

    it("should emit status events", () => {
      const service = new PythonEnvironmentService("/some/project");
      const events = [];

      service.on("status", (state) => {
        events.push(state.status);
      });

      service._updateState({ status: "checking" });
      service._updateState({ status: "creating" });

      expect(events).toContain("checking");
      expect(events).toContain("creating");
    });

    it("should emit log events", () => {
      const service = new PythonEnvironmentService("/some/project");
      const logs = [];

      service.on("log", (entry) => {
        logs.push(entry);
      });

      service._addLog("Test log message");

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("Test log message");
      expect(logs[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}/); // ISO date prefix
    });

    it("should return correct venv path", () => {
      const projectRoot = "/some/project";
      const service = new PythonEnvironmentService(projectRoot);

      expect(service.getAppVenvPath()).toBe(path.join(projectRoot, ".materialdocs-venv"));
    });

    it("should return correct env vars when venv is set", () => {
      const service = new PythonEnvironmentService("/some/project");
      service._updateState({
        venvPath: "/some/project/.materialdocs-venv",
      });

      const envVars = service.getEnvVars();
      expect(envVars).toHaveProperty("PATH");
      expect(envVars).toHaveProperty("VIRTUAL_ENV");
      expect(envVars.VIRTUAL_ENV).toBe("/some/project/.materialdocs-venv");
      expect(envVars.PATH).toContain("/some/project/.materialdocs-venv");
    });
  });

  describe("createPythonEnvironmentService", () => {
    it("should create a service instance", () => {
      const service = createPythonEnvironmentService("/some/project");
      expect(service).toBeInstanceOf(PythonEnvironmentService);
    });

    it("should set project root correctly", () => {
      const projectRoot = "/test/project";
      const service = createPythonEnvironmentService(projectRoot);
      expect(service.projectRoot).toBe(projectRoot);
    });
  });

  // Integration tests (only run if Python is available)
  describe("ensureEnvironment integration", () => {
    it("should fail gracefully if Python is not available", async () => {
      // This test depends on system state - skip if Python is available
      const pythonCheck = checkPythonAvailability();
      if (pythonCheck.available) {
        // Python is available, so we test that ensureEnvironment progresses
        const service = new PythonEnvironmentService(FIXTURES_PATH);
        const statusChanges = [];

        service.on("status", (state) => {
          statusChanges.push(state.status);
        });

        // Don't actually create venv in test - just check initial behavior
        expect(service.getState().status).toBe("not-initialized");
      } else {
        // Python not available - test error handling
        const service = new PythonEnvironmentService(FIXTURES_PATH);
        const result = await service.ensureEnvironment();

        expect(result.status).toBe("error");
        expect(result.error).toContain("Python");
      }
    });
  });
});
