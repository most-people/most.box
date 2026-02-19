# Most.Box - 如影随形

Most.Box 是一个基于 Web3 技术的去中心化应用，致力于提供安全、私密且永久的数据存储解决方案。它结合了现代前端技术栈与去中心化存储网络（Crust Network/IPFS），为用户打造一个“如影随形”的数字空间，支持笔记、文件存储、加密通信等功能。

## 技术架构

本项目基于 Next.js 16 构建，采用静态导出（SSG）模式，可部署于任何静态托管服务或去中心化网络（如 IPFS）。

### 核心技术栈

- **前端框架**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **UI 组件库**: [Mantine UI](https://mantine.dev/) (Core, Hooks, Notifications, Modals)
- **样式处理**: SASS (SCSS), CSS Modules
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **编辑器**: [Milkdown](https://milkdown.dev/) (基于插件的 Markdown 编辑器)

### Web3 与 去中心化存储

- **存储网络**: [IPFS](https://ipfs.tech/) (Kubo RPC), [Crust Network](https://crust.network/)
- **区块链交互**:
  - Polkadot: `@polkadot/api`, `@polkadot/keyring` (用于 Crust 交互)
  - Ethereum: `ethers`, `@reown/appkit` (用于 EVM 兼容链交互)
- **P2P 通信**: `peerjs` (点对点数据同步与通信)

### 加密与安全

- **核心算法**: `tweetnacl` (NaCl), `@noble/hashes`, `@scure/base`
- **加密方案**:
  - **身份生成**: 基于用户凭证（用户名/密码）或签名生成的确定性钱包（Deterministic Wallet）。
  - **非对称加密**: 使用 X25519 (NaCl Box) 进行端到端加密。
  - **签名算法**: Ed25519 / SR25519。

## 核心功能模块

### 1. Most Wallet (去中心化身份)

位于 `src/utils/MostWallet.ts`。
Most.Box 不依赖传统的助记词备份，而是通过确定性算法从用户的“用户名+密码”或“签名”中派生出私钥。

- **多链支持**: 同时生成 Ethereum 地址和 Crust (Substrate) 地址。
- **安全性**: 使用 PBKDF2 和 SHA256 进行密钥派生，确保私钥不在网络上传输，仅在本地生成。

### 2. Crust Network 集成 (去中心化存储)

位于 `src/utils/crust.ts`。
实现了与 Crust Network 的深度集成，确保数据的永久存储：

- **IPFS 上传**: 通过网关将文件/文件夹上传至 IPFS。
- **存储订单**: 直接与 Crust 链交互，通过 `placeStorageOrder` 发送存储订单，利用 CRU 代币支付存储费用。
- **链上存证**: 使用 `system.remark` 将文件 CID 记录在链上，作为不可篡改的数据指针。
- **状态监控**: 实时查询文件在 Crust 网络上的存储状态和过期时间。

### 3. Markdown 笔记系统

基于 Milkdown 编辑器，支持：

- **富文本体验**: 所见即所得的 Markdown 编辑。
- **插件扩展**: 支持历史记录、剪贴板、代码高亮、文件上传等功能。
- **加密存储**: 笔记内容在本地加密后上传至 IPFS/Crust，确保隐私。

## 项目结构

```
d:\Github\most.box\app.most.box\
├── public/              # 静态资源 (字体, 图标, 图片)
├── src/
│   ├── app/             # Next.js App Router 页面路由
│   │   ├── about/       # 关于页面
│   │   ├── chat/        # 聊天功能
│   │   ├── game/        # 游戏模块
│   │   ├── ipfs/        # IPFS 工具
│   │   ├── note/        # 笔记应用
│   │   ├── web3/        # Web3 工具集
│   │   └── ...
│   ├── assets/          # 项目资源 (SVG 图标, 文档)
│   ├── components/      # React 组件
│   │   ├── home/        # 首页组件
│   │   └── ...
│   ├── context/         # React Context (全局状态)
│   ├── hooks/           # 自定义 Hooks
│   ├── stores/          # Zustand 状态存储
│   └── utils/           # 工具函数 (核心逻辑)
│       ├── crust.ts     # Crust 网络交互
│       ├── ipfs.ts      # IPFS 网关检测
│       ├── MostWallet.ts # 钱包与加密逻辑
│       └── ...
├── next.config.ts       # Next.js 配置
├── package.json         # 项目依赖与脚本
└── tsconfig.json        # TypeScript 配置
```

## 快速开始

### 环境要求

- Node.js (建议 v18+)
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
# 或
npm run npm
```

### 启动开发服务器

```bash
npm start
```

访问 `http://localhost:2026` 查看应用。

### 构建与部署

构建静态文件：

```bash
npm run build
```

构建产物将位于 `out/` 目录，可直接部署至 IPFS 或静态服务器。

### 预览构建结果

```bash
npm run preview
```
