# Most.Box - 如影随形

> **数字资产，从此永生。**
> _Digital assets, immortal from now on._

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Crust](https://img.shields.io/badge/Storage-Crust%20Network-orange)](https://crust.network/)

---

## 📖 什么是 Most.Box？| What is Most.Box?

**Most.Box** 是让你的**数字资产，从此永生**。

在这个数据随时可能被删除、被审查、被遗忘的时代，我们为你提供了一个绝对安全、私密且永续存在的个人空间。你可以把它当作是一个**不会消失的网盘**，或者一本**只有你能打开的日记本**。

它不仅仅是一个应用，更是你通往数字永生的钥匙。你的所有数据在离开设备前都会被加密，随后分散存储在全球成千上万个节点中，确保除了你之外，没有人能偷看，也没有人能销毁。

## ✨ 为什么选择 Most.Box？| Why Most.Box?

### 🔐 绝对隐私 (Privacy First)

你的数据完全属于你。所有内容在上传前都会进行**端到端加密**（就像把信件锁进保险箱再寄出），密钥只存在于你的设备上。即使是开发者也无法查看你的任何文件。

### ♾️ 永续存储 (Perma-Storage)

告别“链接失效”和“服务关停”。我们利用 **Crust Network** 和 **IPFS** 去中心化存储网络，将你的数据备份在全球各地的节点上。只要网络存在，你的数据就永远存在。

### ⚡ 零门槛使用 (Easy Access)

不需要懂复杂的区块链知识。你可以直接使用 **Google 账号、Apple ID** 或 **电子邮箱** 一键登录，像使用普通 App 一样简单，但背后却拥有最顶级的 Web3 安全保障。

### 👑 数据主权 (Data Sovereignty)

代码完全开源，且支持离线运行。即使有一天 Most.Box 的网站打不开了，你依然可以下载源码在本地运行，找回你的所有数据。你的数字资产，由你掌控。

---

## 🛠️ 极客与开发者专区 | For Geeks & Developers

> 以下内容涉及技术细节，普通用户可跳过。

Most.Box 是一个基于 **Next.js 16 (SSG)** 构建的去中心化应用 (DApp)，深度集成了 **Crust Network** 存储层与 **Thirdweb** 账户抽象技术。

### 顶层设计与技术信仰 | Philosophy & Design

Most.Box 的诞生，深受数学与密码朋克精神的指引。我们不相信权威，只相信代码。

- **基于数学的绝对防御**: 所有的去中心化身份（MostWallet）生成逻辑，均在本地浏览器完全透明地执行。
- **彻底的开源**: 前端、后端逻辑 100% 开源 (MIT License)。支持数据自动备份与离线运行。

### 核心功能模块 | Core Modules

#### 1. 双轨制去中心化身份 (Dual-Track Identity)

为了真正服务于“大多数人（Most People）”，我们提供两种非托管身份方案：

- **大众模式 (Powered by Thirdweb)**: 借助账户抽象技术，支持 Google、Apple、邮箱、Passkey 一键登录。
- **极客模式 (Most Wallet)**: 纯粹的大脑钱包。通过确定性算法从“用户名+密码”实时派生私钥，私钥仅在内存中短暂存在。

#### 2. Crust Network 深度集成

- **自动存储订单**: 直接与 Crust 链交互，利用 CRU 代币支付并下发存储订单。
- **链上存证**: 文件 CID 记录在链上，作为永不丢失的数据指针。
- **状态监控**: 实时查询文件在全球网络上的副本分布与健康状态。

#### 3. Web3 极客笔记系统

基于 **Milkdown** 构建的所见即所得 Markdown 编辑器，支持加密后静默同步至 IPFS/Crust 网络。

### 技术架构 | Tech Stack

- **前端**: Next.js 16 (App Router), React 19, Mantine UI, Zustand (SSG 静态导出)。
- **后端/边缘**: Cloudflare Workers (TypeScript)。
- **Web3**: `@polkadot/api`, `viem`, `thirdweb`。
- **存储**: IPFS (Kubo RPC), Crust Network, Cloudflare R2。
- **密码学**: `tweetnacl` (NaCl), `@noble/hashes` (Ed25519/X25519)。

### 目录结构 | Project Structure

```bash
.
├── src/
│   ├── app/          # Next.js App Router 页面
│   ├── components/   # React 组件
│   └── utils/        # 核心逻辑 (crust.ts, ipfs.ts 等)
├── public/           # 静态资源
├── package.json
└── README.md
```

> 后端 API 服务已独立至 [api.most.box](https://github.com/most-people/api.most.box) 仓库。

---

## ⚡ 快速开始 | Getting Started

### 1. 环境准备

- Node.js >= 18
- npm (推荐)

### 2. 安装与运行

```bash
# 克隆仓库
git clone https://github.com/most-people/most.box.git
cd most.box

# 安装依赖
npm install

# 启动前端 (默认端口: 2026)
npm start
```

访问 `http://localhost:2026` 即可预览。

### 3. 构建与部署

```bash
# 构建静态文件 (产物位于 /out)
npm run build
```

## 🤝 参与贡献 | Contributing

欢迎提交 Issue 和 Pull Request！我们需要你的力量来完善这艘数字方舟。

## 📄 许可证 | License

本项目基于 [MIT License](LICENSE) 开源。

---

_Built with ❤️ for the Decentralized Web by [Most People](https://github.com/most-people)._
