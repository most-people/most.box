[Ubuntu 教程](/dot.most.box/readme.md) Windows 教程

## IPFS Desktop

https://docs.ipfs.tech/install/ipfs-desktop/

[下载安装](https://github.com/ipfs/ipfs-desktop/releases) ipfs-desktop-setup-0.43.0-win-x64.exe

### 修改 IPFS 配置

```json
{
  "Addresses": {
    "Gateway": ["/ip4/0.0.0.0/tcp/8080", "/ip6/::/tcp/8080"]
  }
}
```

重启 - 任务栏 IPFS Desktop 右键 Restart

### 打开防火墙 1976,8080

### 开机启动

1. C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup
2. 放入 IFPS Desktop 快捷方式

## 克隆

先安装

Git
https://git-scm.com/downloads

Github Desktop
https://desktop.github.com/download

Node.js
https://nodejs.org/en/download

```bash
# 二选一
git clone https://github.com/most-people/most.box.git
git clone https://gitee.com/most-people/most.box.git
```

## PM2

```bash
# 安装 PM2
npm install -g pm2

# 进入目录
cd ./dot.most.box/

# 安装依赖
npm install

# 启动应用
pm2 start src/index.mjs --name "dot"

# 保存当前进程列表
pm2 save

# Windows 设置开机启动
npm install pm2-windows-startup -g

# 初始化
pm2-startup install

# Ubuntu 设置开机启动
pm2 startup
```

## 配置文件 .env

```bash
DOT_NAME=Test
# 节点钱包私钥
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
# custom
API_URL=http://xxx.xxx.xxx.xxx:1976
CID_URL=
```
