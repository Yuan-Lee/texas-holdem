# macOS App 打包设计方案

## 概述

将现有的德州扑克 Web 游戏（React + TypeScript + Vite）打包成 macOS 原生桌面应用，同时保持网页版的完整性和独立开发流程。

## 动机

现有项目是一个纯浏览器 Web 应用，用户需要通过 `npm run dev` 或 `npm run build` + 静态服务器来运行。将其打包为 macOS .app 后，用户可以像普通桌面软件一样双击运行，无需启动终端或浏览器标签页，提升使用体验。

## 技术选型

**Tauri v2** — 使用 macOS 系统 WKWebView 作为渲染引擎，Rust 做底层壳。

选择理由：
- 包体积 ~5-10 MB（比 Electron 小 20-40 倍）
- 使用系统 WebView，内存占用低，性能好
- 对现有项目零侵入，配置集中在 `src-tauri/` 目录
- 网页版开发流程完全不受影响
- 直接分发 .app，无需 Apple Developer 账号
- 后续可扩展原生能力（文件系统、快捷键、菜单栏）

## 目录结构

```
texas-holdem/
├── src/                    # 网页源码（完全不变）
├── index.html              # 网页入口（完全不变）
├── package.json            # + @tauri-apps/cli devDependency
├── vite.config.ts          # 完全不变
│
└── src-tauri/              # Tauri 桌面壳
    ├── Cargo.toml          # Rust 项目配置
    ├── tauri.conf.json     # 应用名、窗口大小、图标、安全策略
    ├── capabilities/       # Tauri v2 权限声明
    ├── icons/              # 应用图标 (.icns, .png)
    ├── Info.plist          # macOS 元信息
    ├── src/
    │   └── main.rs         # ~20 行 Rust：创建窗口，加载网页
    └── build.rs            # 构建脚本
```

## 架构

```
┌──────────────────────────────┐
│         macOS App             │
│  ┌────────────────────────┐  │
│  │   WKWebView             │  │  ← macOS 系统渲染引擎
│  │  ┌──────────────────┐   │  │
│  │  │  React App        │   │  │  ← 现有代码，零改动
│  │  │  (Texas Hold'em)  │   │  │
│  │  └──────────────────┘   │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Tauri Rust Runtime    │  │  ← 窗口管理、进程通信
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### 两种运行模式

| 模式 | 命令 | 行为 |
|---|---|---|
| **开发** | `npm run tauri dev` | 启动 Vite dev server → Tauri 窗口加载 `localhost:5173`，HMR 有效 |
| **生产** | `npm run tauri build` | 先 `vite build` 输出到 `dist/` → 打包进 .app，离线运行 |

## 开发环境

需要安装的工具：
- Rust 工具链（通过 rustup 安装）
- Xcode Command Line Tools

### 依赖变更

`package.json` 仅增加一个 devDependency：
```json
{
  "@tauri-apps/cli": "^2"
}
```

`.gitignore` 增加：
```
src-tauri/target/
```

### 日常命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 只开发网页（完全不变） |
| `npm run tauri dev` | 开发桌面版（自动打开 .app 窗口） |
| `npm run tauri build` | 打包 .app |
| `npm run build` | 只构建网页（完全不变） |

## 应用配置

- **应用名称**: Texas Hold'em
- **Bundle ID**: com.yourname.texas-holdem
- **最低系统**: macOS 13.0+ (Ventura)
- **窗口默认尺寸**: 1200 x 800
- **窗口最小尺寸**: 900 x 650
- **窗口支持缩放**: 是
- **窗口支持全屏**: 是
- **安全策略**: 默认 CSP，允许本地脚本/样式执行；游戏离线运行，无需网络权限

## 分发方式

- `npm run tauri build` 生成 `.app` 和 `.dmg`
- 用户直接下载 .dmg 或 .zip 解压后即可运行
- 支持 ad-hoc code signing

## 不做的事

- 不修改网页侧的任何代码、配置或依赖
- 不添加 App Store 沙箱要求（当前是直接分发）
- 不引入额外的运行时依赖（Chromium、Node.js 等）

## 未来可扩展

- 添加 Tauri 插件实现原生菜单栏、快捷键、系统通知
- 添加崩溃报告和自动更新
- 上架 Mac App Store 时补签名和沙箱配置