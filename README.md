# Electron MkDocs Editor

A cross-platform desktop application for editing MkDocs documentation with a visual WYSIWYG editor. Built with Electron, React, and Milkdown.

[![Build and Publish](https://github.com/fredyranthun/electron-mkdocs-editor/actions/workflows/build-and-publish.yml/badge.svg)](https://github.com/fredyranthun/electron-mkdocs-editor/actions/workflows/build-and-publish.yml)

## Features

- 📝 Visual Markdown editor powered by Milkdown
- 📁 MkDocs project navigation and management
- 🔄 Live preview support
- 🎨 Material for MkDocs admonitions and blocks
- 🖼️ Mermaid diagram support
- 💻 Cross-platform: Linux, macOS, and Windows

---

## Download & Installation

Download the latest release from the [Releases Page](https://github.com/fredyranthun/electron-mkdocs-editor/releases/latest).

### Linux

#### Debian/Ubuntu (`.deb`)

```bash
# Download the .deb file, then install:
sudo dpkg -i electron-mkdocs-editor_1.0.0_amd64.deb

# If there are dependency issues:
sudo apt-get install -f
```

Or double-click the `.deb` file to install via Software Center.

#### Fedora/RHEL (`.rpm`)

```bash
# Download the .rpm file, then install:
sudo rpm -i electron-mkdocs-editor-1.0.0.x86_64.rpm

# Or using dnf:
sudo dnf install electron-mkdocs-editor-1.0.0.x86_64.rpm
```

#### Other Distributions (`.zip`)

```bash
# Extract and run:
unzip electron-mkdocs-editor-linux-x64-1.0.0.zip
cd electron-mkdocs-editor-linux-x64
./electron-mkdocs-editor
```

### macOS

#### DMG Installer (Recommended)

1. Download `electron-mkdocs-editor-1.0.0.dmg`
2. Double-click to mount the disk image
3. Drag **Electron MkDocs Editor** to the **Applications** folder
4. Eject the disk image

> ⚠️ **First Launch**: If you see "App can't be opened because it is from an unidentified developer":
>
> - Go to **System Preferences → Security & Privacy → General**
> - Click **Open Anyway**
>
> Or run in Terminal: `xattr -cr /Applications/Electron\ MkDocs\ Editor.app`

#### ZIP Archive

```bash
# Extract and move to Applications:
unzip electron-mkdocs-editor-darwin-x64-1.0.0.zip
mv "Electron MkDocs Editor.app" /Applications/
```

### Windows

#### Installer (`.exe`)

1. Download `electron-mkdocs-editor-1.0.0 Setup.exe`
2. Double-click to run the installer
3. The app installs to your user folder (no admin required)
4. Launch from Start Menu or Desktop shortcut

> ⚠️ **SmartScreen Warning**: If Windows shows "Windows protected your PC":
>
> - Click **More info**
> - Click **Run anyway**
>
> This warning appears because the app is not code-signed with an EV certificate.

#### Portable (No Install)

If a `.zip` is available, extract and run `electron-mkdocs-editor.exe` directly.

---

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/fredyranthun/electron-mkdocs-editor.git
cd electron-mkdocs-editor

# Install dependencies
npm install

# Start development server
npm start
```

### Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm start`       | Start the app in development mode        |
| `npm test`        | Run tests                                |
| `npm run make`    | Build distributable for current platform |
| `npm run package` | Package app without creating installer   |

### Building for Distribution

```bash
# Build for current platform
npm run make

# Build for specific platform (must run on that OS)
npm run make -- --platform=linux
npm run make -- --platform=darwin
npm run make -- --platform=win32
```

---

## Tech Stack

- **Framework**: Electron 40 + Electron Forge
- **Frontend**: React 19 + Vite
- **Editor**: Milkdown (ProseMirror-based)
- **Markdown**: remark ecosystem
- **Testing**: Vitest

---

## License

MIT © [Fredy Ranthun](https://github.com/fredyranthun)
