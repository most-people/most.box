# IPFS & Caddy 网关搭建指南

本指南涵盖了在 Ubuntu 上安装和配置 IPFS 节点及 Caddy 反向代理的详细步骤。

## 1. 安装 IPFS (Kubo)

下载并安装最新稳定版 IPFS (Kubo)。

```bash
# 进入主目录
cd ~
# 下载 v0.39.0 (目前最新的稳定版) https://dist.ipfs.tech/kubo/
wget https://dist.ipfs.tech/kubo/v0.39.0/kubo_v0.39.0_linux-amd64.tar.gz

# 解压
tar -xvzf kubo_v0.39.0_linux-amd64.tar.gz
cd kubo
# 安装
sudo bash install.sh

# 验证安装
ipfs --version
# 输出: ipfs version 0.39.0
```

## 2. 系统配置

### 修复 UDP 缓冲区警告 (UDP Buffer Size)

优化 IPFS 的系统设置。

```bash
echo "net.core.rmem_max=7500000" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max=7500000" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 开启网关访问

配置 IPFS 允许公共网关访问。

```bash
ipfs config --json Addresses.Gateway '["/ip4/0.0.0.0/tcp/8080", "/ip6/::/tcp/8080"]'
ipfs config --json Addresses.Swarm '["/ip4/0.0.0.0/tcp/4001", "/ip4/0.0.0.0/udp/4001/quic-v1", "/ip4/0.0.0.0/udp/4001/quic", "/ip6/::/tcp/4001", "/ip6/::/udp/4001/quic-v1", "/ip6/::/udp/4001/quic"]'
```

## 3. 配置 Systemd 服务

使用 systemd 将 IPFS 作为后台守护进程运行。

1. **停止当前进程：** 如果 ipfs 正在运行，按 `Ctrl + C` 停止。
2. **创建服务文件：**

```bash
sudo nano /etc/systemd/system/ipfs.service
```

3. **粘贴以下配置：**

```ini
[Unit]
Description=IPFS Daemon for Most.box
After=network.target

[Service]
User=ubuntu
# .ipfs 目录所在位置
Environment="IPFS_PATH=/home/ubuntu/.ipfs"
# --migrate 确保版本升级时自动转换数据结构
# --enable-gc 防止空间被撑满
ExecStart=/usr/local/bin/ipfs daemon --migrate=true --enable-gc
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

4. **启用并启动服务：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable ipfs
sudo systemctl start ipfs
# 验证状态
sudo systemctl status ipfs
```

## 4. 防火墙与验证

### 入站规则 (安全组)

确保在云服务提供商的防火墙中开放以下端口：

| 协议 | 端口 | 源地址          | 用途                     |
| ---- | ---- | --------------- | ------------------------ |
| TCP  | 4001 | 0.0.0.0/0, ::/0 | P2P 核心连接（务必开启） |
| UDP  | 4001 | 0.0.0.0/0, ::/0 | QUIC 协议提速            |
| TCP  | 8080 | 0.0.0.0/0, ::/0 | 公共网关访问             |

### 验证外部访问

打开浏览器并测试：

- **IPv4:** `http://<服务器公网IP>:8080/ipfs/`
- **IPv6:** `http://[<服务器公网IPv6>]:8080/ipfs/`

如果看到 IPFS 欢迎页面，说明节点已上线。

---

## 5. 安装 Caddy (Ubuntu)

官方文档: [https://caddyserver.com/docs/install#debian-ubuntu-raspbian](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

```bash
# 安装依赖和密钥环
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# 安装 Caddy
sudo apt update
sudo apt install caddy

# 查看版本
caddy --version
```

## 6. 配置 Caddy 反向代理

编辑 Caddyfile：

```bash
sudo nano /etc/caddy/Caddyfile
```

### 添加配置

在文件末尾添加：

```caddy
most.red {
    reverse_proxy 127.0.0.1:8080
}
```

### 应用更改

```bash
# 验证配置
sudo caddy validate --config /etc/caddy/Caddyfile
# 格式化配置
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
# 重载 Caddy
sudo systemctl reload caddy
# 查看状态
sudo systemctl status caddy
```
