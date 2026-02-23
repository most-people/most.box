# Most.Box - 如影随形

> **数字资产，从此永生。**
> _Digital assets, immortal from now on._

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Crust](https://img.shields.io/badge/Storage-Crust%20Network-orange)](https://crust.network/)

## 📖 简介 | Introduction

**Most.Box** 是一个面向全球网络环境深度优化的去中心化存储解决方案。我们致力于打破中心化存储的限制，利用 Web3 技术（IPFS/Crust）确保数据的永续性与抗审查性，同时通过边缘计算技术优化访问速度，为用户提供丝滑的“Web2 级别”体验。

这里不仅是存储工具，更是你通往数字永生的方舟。

## 🚀 核心特性 | Features

- **🌐 网络优化**: 聚合全球多个高速网关，支持智能测速与切换，确保存储与检索的高速稳定。
- **♾️ 永续存储**: 基于 **Crust Network** 提供的去中心化存储激励层，支持动态订单续费与预存池功能，确保数据在 IPFS 网络中被持久化备份。
- **🛡️ 极致安全**: 物理级安全隐私，数据上传前即进行分片加密，仅私钥持有者可重组；多副本冗余机制（20+ 随机副本），即使 90% 节点下线仍可找回。
- **🔒 防止篡改**: 数据指纹（CID）寻址，内容不可篡改，无中心化审核机制。
- **💻 开源透明**: 代码完全开源 (MIT License)，支持本地离线运行，无需联网，拒绝黑盒操作。
- **⚡ 极速体验**: 现代化的 **Next.js** 前端与 **Mantine** UI 组件库，打造极客且优雅的交互界面。

## 🛠️ 技术栈 | Tech Stack

本项目采用 Monorepo 结构，核心技术选型如下：

### Frontend (`app.most.box`)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Library**: [Mantine](https://mantine.dev/)
- **Styling**: SCSS / CSS Modules
- **Web3 Integration**: [Viem](https://viem.sh/) (Ethereum Interface)
- **State Management**: Zustand

### Storage, Protocol & Security

- **Storage Layer**: [IPFS](https://ipfs.tech/) (InterPlanetary File System)
- **Incentive Layer**: [Crust Network](https://crust.network/) (Polkadot Ecosystem)
- **Data Layer**: Cloudflare R2 (High-Performance Edge Object Storage)
- **User Layer**: Local Key Derivation (NaCl / sr25519)

### Backend / Edge (`api.most.box`)

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript

## 📂 目录结构 | Project Structure

```bash
.
├── api.most.box/      # 后端 API 服务 (Cloudflare Workers)
├── app.most.box/      # 前端应用 (Next.js)
├── LICENSE            # MIT License
└── README.md          # Project Documentation
```

## ⚡ 快速开始 | Getting Started

### 环境要求 | Prerequisites

- Node.js >= 18
- pnpm (推荐) 或 npm/yarn

### 安装依赖 | Installation

```bash
# 克隆仓库
git clone https://github.com/most-people/most.box.git
cd most.box

# 安装根目录及子项目依赖
npm install
```

### 开发调试 | Development

**启动前端 (Frontend):**

```bash
npm start
```

**启动后端 (Backend):**

```bash
npm run api
```

## 🤝 贡献 | Contributing

欢迎提交 Issue 和 Pull Request！我们需要你的力量来完善这艘数字方舟。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证 | License

本项目基于 [MIT License](LICENSE) 开源。

---

_Built with ❤️ for the Decentralized Web._
