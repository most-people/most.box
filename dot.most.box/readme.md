Ubuntu 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

sudo apt-get install -y nodejs

node -v

npm -v

npm i -g pm2
```

[Ubuntu 安装 IPFS](https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions)

```bash
# 更新系统
sudo apt update

# 安装必要工具
sudo apt install wget curl tar -y

# 下载最新版本的 Kubo
wget https://dist.ipfs.tech/kubo/v0.35.0/kubo_v0.35.0_linux-amd64.tar.gz

# 解压
tar -xvzf kubo_v0.35.0_linux-amd64.tar.gz

# 进入目录并安装
cd kubo
sudo bash install.sh

# 验证安装
ipfs --version

# 初始化 IPFS 仓库
ipfs init

# 测试启动 IPFS
ipfs daemon

# 静默启动 IPFS
nohup ipfs daemon > /home/ubuntu/ipfs.log 2>&1 &

# 检查是否运行
ps aux | grep ipfs

# 停止 IPFS
kill 进程号
```

使用 systemd 服务

```bash
# 创建一个systemd服务文件
sudo nano /etc/systemd/system/ipfs.service
```

```ini
[Unit]
Description=IPFS Daemon
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/ipfs daemon
Restart=always
RestartSec=10
KillMode=process

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl enable ipfs.service
sudo systemctl start ipfs.service

# 检查内存使用
free -h

# 检查磁盘空间
df -h

# 查看实时日志
journalctl -u ipfs.service -f

# 查看最近的日志
journalctl -u ipfs.service -n 100

# 查看今天的日志
journalctl -u ipfs.service --since today
```

## Caddy 域名配置

#### Caddyfile

```js
cid.most.box {
    reverse_proxy 127.0.0.1:8080
}

dot.most.box {
    reverse_proxy 127.0.0.1:1976
}
```

### [Windows 安装 Caddy](https://caddyserver.com/download)

下载 caddy_windows_amd64.exe 放在 C:\caddy\caddy.exe

添加环境变量 C:\caddy

```bash
# 查看版本
caddy --version

# 验证
caddy validate --config C:\caddy\Caddyfile

# 格式化
caddy fmt --overwrite C:\caddy\Caddyfile

# 启动
caddy start --config C:\caddy\Caddyfile

caddy status
```

### [Ubuntu 安装 Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

```bash
# 安装
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 查看版本
caddy --version

# 编辑
sudo nano /etc/caddy/Caddyfile
# 验证
sudo caddy validate --config /etc/caddy/Caddyfile
# 格式化
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
# 重启
sudo systemctl reload caddy
# 查看
sudo systemctl status caddy
```
