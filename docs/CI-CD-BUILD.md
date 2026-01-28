# CI/CD Build & Publish Documentation

This document explains the GitHub Actions workflow for building and publishing the Electron MkDocs Editor across all platforms.

## Workflow Overview

The workflow is defined in `.github/workflows/build-and-publish.yml` and triggers on:

- **Push to `main` branch** → Full build + publish release
- **Pull requests to `main`** → Build only (validation)

## Platform Build Matrix

| Platform | Runner           | Makers        | Output Formats               |
| -------- | ---------------- | ------------- | ---------------------------- |
| Linux    | `ubuntu-latest`  | deb, rpm, zip | `.deb`, `.rpm`, `.zip`       |
| macOS    | `macos-latest`   | dmg, zip      | `.dmg`, `.zip`               |
| Windows  | `windows-latest` | squirrel      | `.exe`, `.nupkg`, `RELEASES` |

## GitHub Secrets Required

### Required for All Platforms

| Secret         | Description                                         |
| -------------- | --------------------------------------------------- |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions. Used for releases. |

### macOS Code Signing & Notarization (Optional but Recommended)

Without code signing, macOS users will see security warnings when opening the app.

| Secret                       | Description                       | How to Obtain                    |
| ---------------------------- | --------------------------------- | -------------------------------- |
| `APPLE_CERTIFICATE`          | Base64-encoded `.p12` certificate | Export from Keychain Access      |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file      | Set during export                |
| `APPLE_KEYCHAIN_PASSWORD`    | Temporary keychain password       | Any secure random string         |
| `APPLE_ID`                   | Your Apple Developer email        | developer.apple.com account      |
| `APPLE_ID_PASSWORD`          | App-specific password             | appleid.apple.com → Security     |
| `APPLE_TEAM_ID`              | 10-character Team ID              | developer.apple.com → Membership |

#### How to Create macOS Certificate

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Go to Certificates, Identifiers & Profiles
3. Create a "Developer ID Application" certificate
4. Export from Keychain Access as `.p12`
5. Convert to base64: `base64 -i certificate.p12 | pbcopy`
6. Add to GitHub Secrets as `APPLE_CERTIFICATE`

### Windows Code Signing (Optional but Recommended)

Without code signing, Windows SmartScreen will warn users about an "unrecognized app".

| Secret                         | Description                       | How to Obtain                          |
| ------------------------------ | --------------------------------- | -------------------------------------- |
| `WINDOWS_CERTIFICATE`          | Base64-encoded `.pfx` certificate | Purchase from CA or use Azure SignTool |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the `.pfx` file      | Set during creation                    |

#### Windows Code Signing Options

1. **Standard Code Signing Certificate** (~$200-500/year)
   - Purchase from DigiCert, Sectigo, GlobalSign, etc.
   - Provides immediate SmartScreen trust

2. **EV Code Signing Certificate** (~$300-700/year)
   - Extended Validation (requires identity verification)
   - Immediate SmartScreen reputation
   - Hardware token required (HSM or USB)

3. **Azure Trusted Signing** (Pay-as-you-go)
   - Microsoft's cloud-based signing service
   - No hardware token needed
   - Requires Azure subscription

4. **Self-Signed (Development Only)**
   - Free but users will see warnings
   - Only for internal/dev builds

## Windows Build Requirements

### System Dependencies

Windows builds use **Squirrel.Windows** which requires:

- Windows 10/11 or Windows Server 2019+
- .NET Framework (included in Windows runners)
- No additional installation needed on GitHub Actions

### Squirrel.Windows Features

- **Auto-updates**: Built-in delta update support
- **No admin required**: Installs to user's AppData
- **Desktop/Start Menu shortcuts**: Created automatically
- **Uninstaller**: Registered in Windows Programs & Features

### Known Limitations

1. **No ARM64 builds**: Squirrel doesn't support Windows ARM yet
2. **No MSI output**: Squirrel creates `.exe` installer, not MSI
3. **Per-user install only**: Cannot install to Program Files

### Alternative: NSIS Maker

For MSI or system-wide installations, consider `@electron-forge/maker-wix`:

```bash
npm install --save-dev @electron-forge/maker-wix
```

## Local Development

### Build for Current Platform

```bash
npm run make
```

### Build for Specific Platform (on that OS)

```bash
# Linux
npm run make -- --platform=linux

# macOS
npm run make -- --platform=darwin

# Windows
npm run make -- --platform=win32
```

### Skip Specific Makers

```bash
# Linux without RPM (if rpmbuild not installed)
npm run make -- --platform=linux --targets=@electron-forge/maker-deb,@electron-forge/maker-zip
```

## Workflow Jobs

### 1. Build Job

Runs in parallel on all three platforms:

- Installs platform-specific dependencies
- Sets up code signing (if secrets provided)
- Runs tests
- Builds distributables
- Uploads artifacts

### 2. Publish Job

Runs after all builds succeed (main branch only):

- Downloads all artifacts
- Creates GitHub Release
- Attaches all installers to release

### 3. Cleanup Job

Removes old workflow runs to save storage.

## Versioning & Releases

The version is read from `package.json`. To release a new version:

1. Update version in `package.json`:

   ```json
   "version": "1.1.0"
   ```

2. Commit and push to main:

   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.1.0"
   git push origin main
   ```

3. The workflow will automatically:
   - Build all platforms
   - Create release `v1.1.0`
   - Attach installers

## Troubleshooting

### Linux: `rpmbuild` not found

Install on Ubuntu/Debian:

```bash
sudo apt-get install rpm
```

Or skip RPM maker in local builds.

### macOS: "App is damaged"

This occurs when the app isn't signed. Solutions:

1. Configure code signing secrets
2. Users can bypass: `xattr -cr /Applications/YourApp.app`

### Windows: SmartScreen warning

This occurs without EV certificate. Solutions:

1. Purchase EV code signing certificate
2. Users can click "More info" → "Run anyway"
3. Build reputation over time (thousands of installs)

### Build fails on CI but works locally

1. Check Node.js version matches
2. Ensure all dependencies are in `package.json` (not globally installed)
3. Review CI logs for platform-specific errors

## Cost Summary

| Item                    | Cost                  | Required    |
| ----------------------- | --------------------- | ----------- |
| GitHub Actions          | Free (2000 min/month) | ✅ Yes      |
| Apple Developer Program | $99/year              | ❌ Optional |
| Windows Code Signing    | $200-700/year         | ❌ Optional |

## References

- [Electron Forge Makers](https://www.electronforge.io/config/makers)
- [Electron Forge Publishers](https://www.electronforge.io/config/publishers)
- [Apple Developer](https://developer.apple.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
