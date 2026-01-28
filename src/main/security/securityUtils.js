/**
 * Security Utilities
 *
 * Common security-related utilities used across the main process.
 */

/**
 * Check if a URL is a safe localhost URL
 * @param {string} url
 * @returns {boolean}
 */
export function isLocalhostUrl(url) {
  if (!url || url === "about:blank") return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "[::1]" ||
      parsed.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

/**
 * Validate that a path is within the allowed base directory
 * Prevents path traversal attacks
 * @param {string} basePath - The allowed base directory
 * @param {string} targetPath - The path to validate
 * @returns {boolean}
 */
export function isPathWithinBase(basePath, targetPath) {
  const path = require("node:path");

  // Normalize both paths
  const normalizedBase = path.resolve(basePath);
  const normalizedTarget = path.resolve(basePath, targetPath);

  // Check if target is within base
  return normalizedTarget.startsWith(normalizedBase + path.sep) || normalizedTarget === normalizedBase;
}

/**
 * Sanitize a filename to prevent directory traversal
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  // Remove any path separators and null bytes
  return filename.replace(/[/\\]/g, "").replace(/\0/g, "").trim();
}

/**
 * Validate that a relative path doesn't contain traversal sequences
 * @param {string} relativePath
 * @returns {boolean}
 */
export function isValidRelativePath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    return false;
  }

  // Check for obvious traversal attempts
  if (relativePath.includes("..") || relativePath.startsWith("/") || relativePath.startsWith("\\")) {
    return false;
  }

  // Check for null bytes
  if (relativePath.includes("\0")) {
    return false;
  }

  return true;
}

/**
 * Content Security Policy configuration for the main renderer
 * @returns {string}
 */
export function getRendererCSP() {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Required for styled components and Milkdown
    "img-src 'self' data: blob:", // Allow data URIs and blobs for images
    "font-src 'self' data:", // Allow embedded fonts
    "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*", // For preview server
    "frame-src http://127.0.0.1:*", // For webview/iframe preview
    "worker-src 'self' blob:", // For web workers if needed
    "object-src 'none'", // Block plugins
    "base-uri 'self'", // Restrict base tag
    "form-action 'self'", // Restrict form submissions
  ].join("; ");
}

/**
 * Webview security configuration
 * @returns {object}
 */
export function getWebviewSecurityPrefs() {
  return {
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    enableBlinkFeatures: "",
  };
}

export default {
  isLocalhostUrl,
  isPathWithinBase,
  sanitizeFilename,
  isValidRelativePath,
  getRendererCSP,
  getWebviewSecurityPrefs,
};
