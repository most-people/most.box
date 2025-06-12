[安装 IPFS](https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions)

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

公网 IPv6 访问

```json
{
  "Gateway": ["/ip4/127.0.0.1/tcp/8080", "/ip6/::/tcp/8080"]
}
```

PM2 开机自动启动

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动应用
pm2 start src/index.mjs --name "dot"

# 3. 保存当前进程列表
pm2 save

# 4. 安装 Windows 启动工具
npm install pm2-windows-startup -g

# 5. 设置开机启动
pm2-startup install
```
