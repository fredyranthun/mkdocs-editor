const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    // App metadata
    name: "Electron MkDocs Editor",
    executableName: "electron-mkdocs-editor",
    // macOS specific
    appBundleId: "com.fredyranthun.electron-mkdocs-editor",
    appCategoryType: "public.app-category.developer-tools",
    // Code signing (configured via environment variables in CI)
    osxSign: process.env.APPLE_ID ? {} : undefined,
    osxNotarize: process.env.APPLE_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID,
        }
      : undefined,
  },
  rebuildConfig: {},
  makers: [
    // =========================================================================
    // Windows makers
    // =========================================================================
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "electron_mkdocs_editor",
        // Windows code signing (configure via WINDOWS_CERTIFICATE env var)
        certificateFile: process.env.WINDOWS_CERT_PATH,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
        // Auto-update settings
        setupIcon: "./assets/icon.ico",
      },
    },
    // =========================================================================
    // macOS makers
    // =========================================================================
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
        // icon: './assets/icon.icns',
      },
    },
    // =========================================================================
    // Linux makers
    // =========================================================================
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          maintainer: "Fredy Ranthun",
          homepage: "https://github.com/fredyranthun/electron-mkdocs-editor",
          section: "devel",
          categories: ["Development", "Utility"],
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          homepage: "https://github.com/fredyranthun/electron-mkdocs-editor",
          categories: ["Development", "Utility"],
        },
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["linux"],
    },
  ],
  // ===========================================================================
  // Publishers - for automated releases
  // ===========================================================================
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "fredyranthun",
          name: "electron-mkdocs-editor",
        },
        prerelease: false,
        draft: true, // Create as draft first, then manually publish
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: "src/main.js",
            config: "vite.main.config.mjs",
            target: "main",
          },
          {
            entry: "src/preload.js",
            config: "vite.preload.config.mjs",
            target: "preload",
          },
        ],
        renderer: [
          {
            name: "main_window",
            config: "vite.renderer.config.mjs",
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
