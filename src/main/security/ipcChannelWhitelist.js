/**
 * IPC Channel Whitelist
 *
 * Security module that defines all allowed IPC channels.
 * This prevents unauthorized channels from being registered
 * and provides validation for incoming IPC requests.
 */

/**
 * List of all valid IPC invoke channels (renderer → main with response)
 * @type {Set<string>}
 */
export const VALID_INVOKE_CHANNELS = new Set([
  // Project operations
  "project:open",
  "project:load",
  "project:getTree",
  "project:getCurrent",
  "project:close",

  // Page/file operations
  "page:read",
  "page:write",
  "page:exists",
  "page:create",
  "page:delete",
  "page:rename",
  "page:move",

  // Directory operations
  "directory:create",
  "directory:delete",
  "directory:rename",

  // Asset operations
  "asset:selectAndCopy",
  "asset:copy",
  "asset:list",
  "asset:delete",
  "asset:getRelativePath",

  // Preview operations
  "preview:start",
  "preview:stop",
  "preview:restart",
  "preview:getStatus",
  "preview:getLogs",
  "preview:clearLogs",
  "preview:getPageUrl",
  "preview:isHealthy",
  "preview:checkMkDocs",

  // Python environment operations
  "pythonEnv:checkPython",
  "pythonEnv:detectProjectEnv",
  "pythonEnv:getStatus",
  "pythonEnv:ensure",
  "pythonEnv:reinstall",
  "pythonEnv:getLogs",

  // App operations
  "app:getVersion",
]);

/**
 * List of all valid IPC send channels (main → renderer, one-way)
 * @type {Set<string>}
 */
export const VALID_SEND_CHANNELS = new Set([
  // Preview status updates
  "preview:status",
  "preview:log",

  // Python environment status updates
  "pythonEnv:status",
  "pythonEnv:log",
]);

/**
 * List of all valid IPC receive channels (renderer can listen to)
 * @type {Set<string>}
 */
export const VALID_RECEIVE_CHANNELS = new Set([
  // Preview events
  "preview:status",
  "preview:log",

  // Python environment events
  "pythonEnv:status",
  "pythonEnv:log",
]);

/**
 * Validates if a channel is in the invoke whitelist
 * @param {string} channel
 * @returns {boolean}
 */
export function isValidInvokeChannel(channel) {
  return VALID_INVOKE_CHANNELS.has(channel);
}

/**
 * Validates if a channel is in the send whitelist
 * @param {string} channel
 * @returns {boolean}
 */
export function isValidSendChannel(channel) {
  return VALID_SEND_CHANNELS.has(channel);
}

/**
 * Validates if a channel is in the receive whitelist
 * @param {string} channel
 * @returns {boolean}
 */
export function isValidReceiveChannel(channel) {
  return VALID_RECEIVE_CHANNELS.has(channel);
}

/**
 * Gets all valid channels for documentation/debugging
 * @returns {{invoke: string[], send: string[], receive: string[]}}
 */
export function getAllChannels() {
  return {
    invoke: Array.from(VALID_INVOKE_CHANNELS).sort(),
    send: Array.from(VALID_SEND_CHANNELS).sort(),
    receive: Array.from(VALID_RECEIVE_CHANNELS).sort(),
  };
}

export default {
  VALID_INVOKE_CHANNELS,
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  isValidInvokeChannel,
  isValidSendChannel,
  isValidReceiveChannel,
  getAllChannels,
};
