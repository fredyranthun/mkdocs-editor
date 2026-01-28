/**
 * Security Module Tests
 *
 * Tests for IPC channel whitelist and security utilities
 */

import { describe, it, expect } from "vitest";
import {
  VALID_INVOKE_CHANNELS,
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  isValidInvokeChannel,
  isValidSendChannel,
  isValidReceiveChannel,
  getAllChannels,
} from "../src/main/security/ipcChannelWhitelist.js";

import {
  isLocalhostUrl,
  isValidRelativePath,
  sanitizeFilename,
  getRendererCSP,
  getWebviewSecurityPrefs,
} from "../src/main/security/securityUtils.js";

describe("IPC Channel Whitelist", () => {
  describe("VALID_INVOKE_CHANNELS", () => {
    it("should include all project channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("project:open")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("project:load")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("project:getTree")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("project:getCurrent")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("project:close")).toBe(true);
    });

    it("should include all page channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("page:read")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:write")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:exists")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:create")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:delete")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:rename")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("page:move")).toBe(true);
    });

    it("should include all directory channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("directory:create")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("directory:delete")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("directory:rename")).toBe(true);
    });

    it("should include all asset channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("asset:selectAndCopy")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("asset:copy")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("asset:list")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("asset:delete")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("asset:getRelativePath")).toBe(true);
    });

    it("should include all preview channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("preview:start")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:stop")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:restart")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:getStatus")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:getLogs")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:clearLogs")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:getPageUrl")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:isHealthy")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("preview:checkMkDocs")).toBe(true);
    });

    it("should include all pythonEnv channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:checkPython")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:detectProjectEnv")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:getStatus")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:ensure")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:reinstall")).toBe(true);
      expect(VALID_INVOKE_CHANNELS.has("pythonEnv:getLogs")).toBe(true);
    });

    it("should include app channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("app:getVersion")).toBe(true);
    });

    it("should not include arbitrary channels", () => {
      expect(VALID_INVOKE_CHANNELS.has("malicious:channel")).toBe(false);
      expect(VALID_INVOKE_CHANNELS.has("shell:exec")).toBe(false);
      expect(VALID_INVOKE_CHANNELS.has("fs:readFile")).toBe(false);
    });
  });

  describe("VALID_SEND_CHANNELS", () => {
    it("should include event channels", () => {
      expect(VALID_SEND_CHANNELS.has("preview:status")).toBe(true);
      expect(VALID_SEND_CHANNELS.has("preview:log")).toBe(true);
      expect(VALID_SEND_CHANNELS.has("pythonEnv:status")).toBe(true);
      expect(VALID_SEND_CHANNELS.has("pythonEnv:log")).toBe(true);
    });
  });

  describe("VALID_RECEIVE_CHANNELS", () => {
    it("should include event channels", () => {
      expect(VALID_RECEIVE_CHANNELS.has("preview:status")).toBe(true);
      expect(VALID_RECEIVE_CHANNELS.has("preview:log")).toBe(true);
      expect(VALID_RECEIVE_CHANNELS.has("pythonEnv:status")).toBe(true);
      expect(VALID_RECEIVE_CHANNELS.has("pythonEnv:log")).toBe(true);
    });
  });

  describe("isValidInvokeChannel", () => {
    it("should return true for valid channels", () => {
      expect(isValidInvokeChannel("project:open")).toBe(true);
      expect(isValidInvokeChannel("page:read")).toBe(true);
    });

    it("should return false for invalid channels", () => {
      expect(isValidInvokeChannel("invalid:channel")).toBe(false);
      expect(isValidInvokeChannel("")).toBe(false);
    });
  });

  describe("isValidSendChannel", () => {
    it("should return true for valid channels", () => {
      expect(isValidSendChannel("preview:status")).toBe(true);
    });

    it("should return false for invalid channels", () => {
      expect(isValidSendChannel("invalid:channel")).toBe(false);
    });
  });

  describe("isValidReceiveChannel", () => {
    it("should return true for valid channels", () => {
      expect(isValidReceiveChannel("preview:status")).toBe(true);
    });

    it("should return false for invalid channels", () => {
      expect(isValidReceiveChannel("invalid:channel")).toBe(false);
    });
  });

  describe("getAllChannels", () => {
    it("should return all channel categories", () => {
      const channels = getAllChannels();
      expect(Array.isArray(channels.invoke)).toBe(true);
      expect(Array.isArray(channels.send)).toBe(true);
      expect(Array.isArray(channels.receive)).toBe(true);
      expect(channels.invoke.length).toBeGreaterThan(0);
    });
  });
});

describe("Security Utilities", () => {
  describe("isLocalhostUrl", () => {
    it("should return true for localhost URLs", () => {
      expect(isLocalhostUrl("http://localhost:8000")).toBe(true);
      expect(isLocalhostUrl("http://127.0.0.1:8000")).toBe(true);
      expect(isLocalhostUrl("http://localhost:8000/page")).toBe(true);
      expect(isLocalhostUrl("http://sub.localhost:8000")).toBe(true);
    });

    it("should return true for IPv6 localhost", () => {
      // Note: IPv6 ::1 resolves to hostname "::1" not "[::1]"
      expect(isLocalhostUrl("http://[::1]:8000")).toBe(true);
    });

    it("should return true for about:blank", () => {
      expect(isLocalhostUrl("about:blank")).toBe(true);
      expect(isLocalhostUrl("")).toBe(true);
      expect(isLocalhostUrl(null)).toBe(true);
      expect(isLocalhostUrl(undefined)).toBe(true);
    });

    it("should return false for external URLs", () => {
      expect(isLocalhostUrl("http://example.com")).toBe(false);
      expect(isLocalhostUrl("https://google.com")).toBe(false);
      expect(isLocalhostUrl("http://192.168.1.1:8000")).toBe(false);
      expect(isLocalhostUrl("http://malicious.com/localhost")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isLocalhostUrl("not-a-url")).toBe(false);
    });
  });

  describe("isValidRelativePath", () => {
    it("should return true for valid relative paths", () => {
      expect(isValidRelativePath("file.md")).toBe(true);
      expect(isValidRelativePath("folder/file.md")).toBe(true);
      expect(isValidRelativePath("deep/nested/path/file.md")).toBe(true);
    });

    it("should return false for path traversal attempts", () => {
      expect(isValidRelativePath("../file.md")).toBe(false);
      expect(isValidRelativePath("folder/../file.md")).toBe(false);
      expect(isValidRelativePath("..")).toBe(false);
    });

    it("should return false for absolute paths", () => {
      expect(isValidRelativePath("/etc/passwd")).toBe(false);
      expect(isValidRelativePath("\\windows\\system32")).toBe(false);
    });

    it("should return false for null bytes", () => {
      expect(isValidRelativePath("file\0.md")).toBe(false);
    });

    it("should return false for empty or invalid input", () => {
      expect(isValidRelativePath("")).toBe(false);
      expect(isValidRelativePath(null)).toBe(false);
      expect(isValidRelativePath(undefined)).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove path separators", () => {
      expect(sanitizeFilename("../file.md")).toBe("..file.md");
      expect(sanitizeFilename("folder/file.md")).toBe("folderfile.md");
      expect(sanitizeFilename("folder\\file.md")).toBe("folderfile.md");
    });

    it("should remove null bytes", () => {
      expect(sanitizeFilename("file\0.md")).toBe("file.md");
    });

    it("should trim whitespace", () => {
      expect(sanitizeFilename("  file.md  ")).toBe("file.md");
    });

    it("should handle empty input", () => {
      expect(sanitizeFilename("")).toBe("");
      expect(sanitizeFilename(null)).toBe("");
      expect(sanitizeFilename(undefined)).toBe("");
    });
  });

  describe("getRendererCSP", () => {
    it("should return a valid CSP string", () => {
      const csp = getRendererCSP();
      expect(typeof csp).toBe("string");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it("should allow localhost connections", () => {
      const csp = getRendererCSP();
      expect(csp).toContain("connect-src");
      expect(csp).toContain("127.0.0.1");
    });
  });

  describe("getWebviewSecurityPrefs", () => {
    it("should return security preferences object", () => {
      const prefs = getWebviewSecurityPrefs();
      expect(typeof prefs).toBe("object");
    });

    it("should disable node integration", () => {
      const prefs = getWebviewSecurityPrefs();
      expect(prefs.nodeIntegration).toBe(false);
      expect(prefs.nodeIntegrationInWorker).toBe(false);
      expect(prefs.nodeIntegrationInSubFrames).toBe(false);
    });

    it("should enable context isolation and sandbox", () => {
      const prefs = getWebviewSecurityPrefs();
      expect(prefs.contextIsolation).toBe(true);
      expect(prefs.sandbox).toBe(true);
    });

    it("should enable web security", () => {
      const prefs = getWebviewSecurityPrefs();
      expect(prefs.webSecurity).toBe(true);
      expect(prefs.allowRunningInsecureContent).toBe(false);
    });
  });
});
