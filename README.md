## 克隆

```bash
# Github
git clone https://github.com/most-people/most.box.git

# Gitee
git clone https://gitee.com/most-people/most.box.git
```

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

C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup

放入 IFPS Desktop 快捷方式

## PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/index.mjs --name "dot"

# 保存当前进程列表
pm2 save

# Windows
npm install pm2-windows-startup -g

# 设置开机启动
pm2-startup install

# Ubuntu
pm2 startup
```

Github Desktop
https://desktop.github.com/download
Node.js
https://nodejs.org/en/download
