# Texas Hold'em 德扑对战

一个基于 React 的德州扑克对战游戏，支持人机对战与三种 AI 难度等级。

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite) ![Zustand](https://img.shields.io/badge/Zustand-5-brown)

## 功能特性

- **三人/四人/五人/六人桌** — 支持 2–6 名玩家，人类固定为玩家 1，其余为 AI
- **三级 AI 难度** — 简单（随机决策）/ 中等（手牌强度+底池赔率）/ 困难（蒙特卡洛模拟）
- **完整的德扑规则** — 盲注、加注、All-in、边池计算、摊牌比牌
- **视觉效果** — 牌桌渲染、发牌动画、筹码显示、位置标注
- **六人座次** — BTN → SB → BB → UTG → HJ → CO 顺时针排列

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（网页版）
npm run dev

# 构建生产版本（网页版）
npm run build
```

## macOS 桌面应用

该项目也可打包为 macOS 原生桌面应用（基于 Tauri v2），包体积仅约 8 MB。

### 前置条件

```bash
# 安装 Rust 工具链
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 确保已安装 Xcode Command Line Tools
xcode-select --install
```

### 开发（桌面版）

```bash
npm run tauri dev
```

会自动打开原生 macOS 窗口，支持 HMR 热更新。

### 打包

```bash
npm run tauri build
```

生成 `.app` 和 `.dmg`，位于 `src-tauri/target/release/bundle/` 目录下。

### 注意事项

- 桌面版与网页版共享同一份源代码，互不干扰
- 网页版开发命令（`npm run dev`、`npm run build`）完全不变
- Tauri 配置集中在 `src-tauri/` 目录中

## 测试

项目包含两套测试：

| 测试类型 | 运行命令 | 说明 |
|---------|---------|------|
| **UI 组件测试** | `npm run test:ui` | Vitest + Testing Library，覆盖所有 UI 组件 |
| **引擎规则测试** | `npm run test` | Node.js native test runner，覆盖核心规则逻辑 |
| **UI 测试（监视模式）** | `npm run test:ui:watch` | 文件变更自动重跑 |

## 项目结构

```
src/
├── ai/                    # AI 决策引擎
│   ├── types.ts           # AI 接口 & 工具函数
│   ├── easy.ts            # 简单 AI：随机决策
│   ├── medium.ts          # 中等 AI：手牌强度 + 底池赔率
│   └── hard.ts            # 困难 AI：蒙特卡洛模拟
├── engine/                # 核心游戏引擎
│   ├── types.ts           # 类型定义（牌、玩家、状态枚举）
│   ├── constants.ts       # 常量（牌面名称、起始筹码、盲注）
│   ├── deck.ts            # 牌组工具（创建、洗牌、发牌）
│   └── evaluator.ts       # 牌型评估器（C(7,5) 最佳五张牌选择）
├── game/
│   └── index.ts           # 游戏规则引擎（发牌、行动、轮次推进、摊牌比牌）
├── components/
│   ├── GameSetup.tsx       # 游戏设置界面（人数、难度、名称）
│   ├── GameTable.tsx       # 主牌桌组件
│   ├── ActionPanel.tsx     # 行动面板（弃牌/过牌/跟注/加注/All-in）
│   ├── RaisePopup.tsx      # 加注金额弹出框
│   ├── PlayerSeat.tsx      # 玩家座位组件
│   ├── CardView.tsx        # 扑克牌渲染
│   ├── ResultModal.tsx     # 牌局结果弹窗
│   ├── HandRankHelp.tsx    # 牌型帮助浮窗
│   ├── DealerAvatar.tsx    # 庄家标志动画
│   └── gameTableUtils.ts   # 桌位布局 & 位置名称工具
├── hooks/
│   └── useGameLoop.ts      # AI 游戏循环 hook
├── store/
│   └── gameStore.ts        # Zustand 全局状态管理
├── utils/
│   └── sound.ts            # 音效管理
├── App.tsx                 # 根组件
└── main.tsx                # 入口文件

tests/
├── holdem-rules.test.ts    # 引擎规则测试（14 个用例）
└── ui/
    ├── setup.ts            # 测试环境配置
    ├── testUtils.ts        # 测试工具函数
    ├── ActionPanel.test.tsx
    ├── CardView.test.tsx
    ├── GameSetup.test.tsx
    ├── GameTable.test.tsx
    ├── PlayerSeat.test.tsx
    ├── RaisePopup.test.tsx
    └── ResultModal.test.tsx
```

## 技术栈

| 技术 | 用途 |
|------|------|
| [React 19](https://react.dev/) | UI 框架 |
| [TypeScript 6](https://www.typescriptlang.org/) | 类型安全 |
| [Vite 8](https://vitejs.dev/) | 构建工具 |
| [Zustand 5](https://github.com/pmndrs/zustand) | 状态管理 |
| [Vitest 4](https://vitest.dev/) | UI 测试框架 |
| [Testing Library](https://testing-library.com/) | 组件测试 |

## 游戏流程

1. **设置** — 选择玩家人数（2–6）、AI 难度、起始筹码
2. **发牌** — 每人 2 张底牌，自动放置大小盲注
3. **下注轮次** — Preflop → Flop → Turn → River
   - 每个轮次内按座位顺序轮流行动（弃牌/过牌/跟注/加注/All-in）
4. **摊牌** — 剩余玩家亮牌，最佳五张牌型获胜
5. **筹码分配** — 主池和边池按牌型大小分配
6. **下一局** — 庄家轮转，筹码归零的 AI 玩家出局

## 牌型等级（从低到高）

1. 高牌 → 一对 → 两对 → 三条 → 顺子 → 同花 → 葫芦 → 四条 → 同花顺 → 皇家同花顺

## 许可证

MIT