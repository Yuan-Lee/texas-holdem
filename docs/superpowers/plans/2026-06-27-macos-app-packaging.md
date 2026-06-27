# macOS App Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tauri v2 packaging to the existing Texas Hold'em web app so it can be built as a macOS .app without affecting the web development workflow.

**Architecture:** Tauri v2 wraps the existing Vite build output (`dist/`) in a native macOS window using the system WKWebView. The Rust layer is minimal (~20 lines) — just window creation and management. Web code is completely unchanged.

**Tech Stack:** Tauri v2, Rust, macOS WKWebView

## Global Constraints

- Web side (`src/`, `vite.config.ts`, `package.json` existing fields) must remain unchanged
- `npm run dev` and `npm run build` must continue to work identically
- All Tauri files go under `src-tauri/` directory
- Bundle ID: `com.texas-holdem`
- Minimum macOS: 13.0+
- Default window: 1200x800, minimum 900x650

---

### Task 1: Install Rust Toolchain

**Files:** None

**Interfaces:**
- Consumes: Nothing
- Produces: `rustc`, `cargo` available on PATH

- [ ] **Step 1: Install Rust via rustup**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Choose option 1 (default installation) when prompted.

- [ ] **Step 2: Verify installation**

```bash
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

Expected output (versions will vary):
```
rustc 1.85.0 (e123456 2026-01-01)
cargo 1.85.0 (abcdef0 2026-01-01)
```

- [ ] **Step 3: Add macOS target (if not already present)**

```bash
rustup target list --installed | grep aarch64-apple-darwin
```

If not listed:
```bash
rustup target add aarch64-apple-darwin
```

(Apple Silicon M-series Macs use `aarch64-apple-darwin`; Intel Macs use `x86_64-apple-darwin`. The default `rustup` installs the host target automatically.)

---

### Task 2: Initialize Tauri in the Project

**Files:**
- Create: `src-tauri/` (entire directory via `npx tauri init`)
- Modify: `package.json` (add `@tauri-apps/cli` devDependency)

**Interfaces:**
- Consumes: Task 1 (Rust available on PATH)
- Produces: `src-tauri/` directory with default template, Tauri CLI available via npm

- [ ] **Step 1: Install Tauri CLI**

```bash
npm install --save-dev @tauri-apps/cli@^2
```

This adds `"@tauri-apps/cli": "^2"` to `devDependencies` in `package.json`.

- [ ] **Step 2: Add `tauri` script to package.json**

Manually add a `"tauri"` script so users can run `npm run tauri`:

In `package.json`, under the `"scripts"` section, add:
```json
"tauri": "tauri"
```

The `scripts` section should now look like:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "test": "node scripts/run-tests.mjs",
  "test:ui": "vitest run",
  "test:ui:watch": "vitest",
  "lint": "eslint ."
}
```

- [ ] **Step 3: Run Tauri init**

```bash
npx tauri init
```

When prompted, answer:
- **App name:** `texas-holdem`
- **Window title:** `Texas Hold'em`
- **Where are your web assets:** `../dist`
- **Dev server URL:** `http://localhost:5173`
- **What command to use to build frontend:** `npm run build`
- **What command to use to run dev server:** `npm run dev`
- **Frontend dist dir:** `../dist`

This creates:
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/build.rs`
- `src-tauri/icons/` (default icons)

- [ ] **Step 4: Verify the generated Cargo.toml**

Read `src-tauri/Cargo.toml` and confirm it has at least:
```toml
[package]
name = "texas-holdem"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

### Task 3: Configure Tauri for Texas Hold'em

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs` (remove default Tauri plugin setup we don't need)
- Create: `src-tauri/Info.plist`

**Interfaces:**
- Consumes: Task 2 (`src-tauri/` exists with default config)
- Produces: Configured Tauri app tailored for Texas Hold'em

- [ ] **Step 1: Edit tauri.conf.json**

Read the generated file first, then write the full replacement:

```json
{
  "$schema": "https://raw.githubusercontent.com/nicegui/tauri-schema-update/refs/heads/main/tauri.conf.json",
  "productName": "Texas Hold'em",
  "version": "0.1.0",
  "identifier": "com.texas-holdem",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "title": "Texas Hold'em",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 650,
        "center": true,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; script-src 'self';"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "13.0",
      "infoPlistPath": "Info.plist"
    }
  }
}
```

The CSP allows:
- `'self'` — load own scripts, styles, and assets from the bundled dist/
- `'unsafe-inline'` on style-src — Vite injects some inline styles
- `data:` on img-src — the game may use data URIs for cards or avatars
- No `connect-src` needed — the game is fully offline, no network requests

- [ ] **Step 2: Clean up src/lib.rs**

Read the generated `src-tauri/src/lib.rs` (Tauri v2 uses `lib.rs` for the main app setup, with `main.rs` just calling the run function). Replace its content with minimal setup:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

(If the generated file uses a different structure like invoking `tauri::Builder::default().run()`, keep the generated approach — just remove any unnecessary plugin registrations like `tauri-plugin-shell`, `tauri-plugin-fs`, etc.)

Also ensure `src-tauri/src/main.rs` is minimal:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    texas_holdem_lib::run();
}
```

(Note: the crate name will match the package name from Cargo.toml, likely `texas_holdem` with underscores.)

- [ ] **Step 3: Remove unused Tauri plugins**

In `Cargo.toml`, remove any default plugins that were added but aren't needed. The game doesn't need shell, fs, or dialog access. Keep the dependencies minimal:

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Remove any extra plugin dependencies like `tauri-plugin-shell`, `tauri-plugin-fs`, etc.

If `lib.rs` had plugin registrations, remove them too.

- [ ] **Step 4: Create Info.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Texas Hold'em</string>
    <key>CFBundleDisplayName</key>
    <string>Texas Hold'em</string>
    <key>CFBundleIdentifier</key>
    <string>com.texas-holdem</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026. All rights reserved.</string>
</dict>
</plist>
```

Save to `src-tauri/Info.plist`.

---

### Task 4: Create Application Icons

**Files:**
- Create: `src-tauri/icons/` (app icons)

**Interfaces:**
- Consumes: Task 2 (icons directory exists with placeholder icons)
- Produces: Proper macOS icons for the app bundle

- [ ] **Step 1: Generate a simple app icon** (using a script or placeholder)

Since we don't have a custom icon design, use Tauri's built-in icon generation or create PNG icons from an SVG. The simplest approach:

```bash
# Generate a quick SVG icon (a simple poker chip design)
cat > /tmp/texas-holdem-icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#e94560" stroke-width="20"/>
  <circle cx="256" cy="256" r="100" fill="none" stroke="#e94560" stroke-width="10" stroke-dasharray="20 10"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#ffffff" text-anchor="middle">♠</text>
</svg>
SVGEOF
```

Then use `npx tauri icon` to generate all icon sizes:

```bash
npx tauri icon /tmp/texas-holdem-icon.svg
```

This automatically generates all required sizes in `src-tauri/icons/`.

Alternatively, if `npx tauri icon` doesn't work (may need ImageMagick or rsvg-convert), create placeholder icons manually:

```bash
# Use sips (built-in on macOS) to create simple colored icons
# Create a 1024x1024 PNG and let Tauri resize it
```

If icon generation is problematic, use the default Tauri icons that were generated by `tauri init` — they work fine as placeholders and can be replaced later.

- [ ] **Step 2: Verify icons are present**

```bash
ls -la src-tauri/icons/
```

Expected: at least `icon.icns`, `icon.ico`, `32x32.png`, `128x128.png`, `128x128@2x.png`, `Square30x30Logo.png`, etc.

---

### Task 5: Build and Verify the macOS App

**Files:** None (build output goes to `src-tauri/target/`, which is gitignored)

**Interfaces:**
- Consumes: Tasks 2-4 (configured Tauri project with icons)
- Produces: `src-tauri/target/release/bundle/macos/Texas Hold'em.app`

- [ ] **Step 1: Build the app for the first time**

```bash
npm run tauri build
```

First build will take a few minutes as it downloads Tauri crate dependencies and compiles Rust code. Subsequent builds are much faster (only the Rust binary needs recompilation if changed).

Expected output on success:
```
   Compiling texas-holdem v0.1.0 (/path/to/src-tauri)
    Finished `release` profile [optimized] target(s) in Xm YYs
    Bundling macOS DMG (texas-holdem_x.x.x_x64.dmg)
    Bundling macOS app (/path/to/src-tauri/target/release/bundle/macos/Texas Hold'em.app)
```

- [ ] **Step 2: Verify the .app exists and has correct structure**

```bash
ls -la "src-tauri/target/release/bundle/macos/Texas Hold'em.app"
```

Expected: a valid `.app` bundle with `.app` extension.

```bash
# Check the app binary exists inside the bundle
ls "src-tauri/target/release/bundle/macos/Texas Hold'em.app/Contents/MacOS/texas-holdem"
```

Expected: a binary executable file.

```bash
# Check the web assets are bundled
ls "src-tauri/target/release/bundle/macos/Texas Hold'em.app/Contents/Resources/"
```

Expected: `index.html`, JavaScript bundles, CSS, assets from `dist/`.

- [ ] **Step 3: Run the app to verify it works**

```bash
open "src-tauri/target/release/bundle/macos/Texas Hold'em.app"
```

Expected: a native macOS window opens with the Texas Hold'em game loaded and fully functional. Verify:
- Game renders correctly
- Cards display properly
- Sound effects work (if any)
- All game actions (fold/check/call/raise) work
- Window can be resized (constrained to 900x650 minimum)
- Window can be closed normally

- [ ] **Step 4: Verify the web dev workflow still works**

```bash
npm run build
npm run dev &
sleep 3 && echo "Dev server started successfully"
```

Expected: `npm run build` completes without errors, `npm run dev` starts Vite dev server normally.

---

### Task 6: Update .gitignore and Documentation

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Update .gitignore**

Add the following lines to `.gitignore`:
```gitignore
# Tauri
src-tauri/target/
```

- [ ] **Step 2: Update README.md**

Add a new section to `README.md` after the existing installation instructions:

```markdown
## macOS Desktop App

该项目也可打包为 macOS 原生桌面应用（基于 Tauri v2）。

### 前置条件

- Rust 工具链：[安装 rustup](https://rustup.rs/)
- Xcode Command Line Tools：`xcode-select --install`

### 开发（桌面版）

```bash
npm run tauri dev
```

会自动打开一个原生 macOS 窗口，支持 HMR 热更新。

### 打包

```bash
npm run tauri build
```

生成 `.app` 和 `.dmg`，位于 `src-tauri/target/release/bundle/macos/` 目录下。

### 注意

- 桌面版与网页版共享同一份源代码
- 网页版开发命令（`npm run dev`、`npm run build`）完全不变
- 桌面版构建产物 `src-tauri/target/` 已加入 `.gitignore`
```

- [ ] **Step 3: Commit all changes**

```bash
git add package.json src-tauri/ .gitignore README.md
git commit -m "feat: add macOS app packaging with Tauri v2"
```