
# Most.Box - Linux 安装教程

操作系统：Ubuntu Server 24.04
连接服务器：ssh ubuntu@119.91.211.100

## 1. Node.js 安装

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

sudo apt-get install -y nodejs

node -v
# v22.20.0
npm -v
# 10.9.3
```

## 2. IPFS 安装

文档：https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions

```bash
# 更新系统
sudo apt update

# 安装必要工具
sudo apt install wget curl tar -y

# 下载最新版本的 Kubo 在上面文档查找最新版本
wget https://dist.ipfs.tech/kubo/v0.38.1/kubo_v0.38.1_linux-amd64.tar.gz
# 也可以使用 IPNS 下载
wget http://129.226.147.127:8080/ipns/dist.ipfs.tech/kubo/v0.38.1/kubo_v0.38.1_linux-amd64.tar.gz

# 解压
tar -xvzf kubo_v0.38.1_linux-amd64.tar.gz

# 进入目录并安装
cd kubo
sudo bash install.sh

# 验证安装
ipfs --version

# 初始化 IPFS 仓库
ipfs init

# 设置 8080 端口
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# 测试启动 IPFS
ipfs daemon --enable-gc

# 静默启动 IPFS
nohup ipfs daemon --enable-gc > /home/ubuntu/ipfs.log 2>&1 &

# 关闭 IPFS
ipfs shutdown
```
（替换为服务器 IP）
IPFS 测试访问：http://119.91.211.100:8080

## 3. Most.Box 安装

```bash
# 切换到用户目录
cd ~

# 克隆仓库
git clone https://github.com/most-people/most.box.git
# 或
git clone https://gitee.com/most-people/most.box.git

# 进入目录
cd ~/most.box/dot.most.box

# 安装依赖
npm install

# 安装 pm2
sudo npm install -g pm2

# 检查 pm2 是否安装成功
pm2 -v
# 6.0.13

# 启动应用（命名为 dot）
pm2 start ./src/index.mjs --name dot

# 保存当前进程列表
pm2 save

# Linux 设置开机启动
pm2 startup
```

（替换为服务器 IP）
Most.Box 测试访问：http://119.91.211.100:1976

## 4. IPFS 开机启动（可选）

```bash
# 查找 IPFS 安装路径
which ipfs
# /usr/local/bin/ipfs

# 启动 IPFS 服务
pm2 start /usr/local/bin/ipfs --name ipfs -- daemon --enable-gc

# 配置
sudo env PATH=$PATH pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 保存当前进程列表
pm2 save

# Linux 设置开机启动
pm2 startup
```

## 5. Caddy 域名配置（可选）

域名：x-cid.most.box, x.most.box 解析到服务器 IP 地址 119.91.211.100
文档：https://caddyserver.com/docs/install#debian-ubuntu-raspbian

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 查看版本
caddy -v
# v2.10.2

# 编辑 Caddyfile
sudo nano /etc/caddy/Caddyfile
```

在 **Caddyfile** 文件末尾添加

```
x.most.box {
    reverse_proxy 127.0.0.1:1976
}

x-cid.most.box {
    reverse_proxy 127.0.0.1:8080
}
```

```bash
# 验证
sudo caddy validate --config /etc/caddy/Caddyfile

# 格式化
sudo caddy fmt --overwrite /etc/caddy/Caddyfile

# 重启
sudo systemctl reload caddy

# 查看
sudo systemctl status caddy
```

（替换为正确域名）
IPFS 测试访问：https://x-cid.most.box
Most.Box 测试访问：https://x.most.box
