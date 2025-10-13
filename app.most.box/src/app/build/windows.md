# Most.Box - Windows 安装教程

操作系统：Windows Server 2022
远程桌面连接：119.91.211.100
用户名：Administrator

打开防火墙：1976,8080,9096

## 1. Node.js 安装

打开 https://nodejs.org/zh-cn/download/ 下载 Windows 安装程序(.msi) 安装包

打开 终端 运行以下命令

```bash
node -v
# v22.20.0
npm -v
# 10.9.3
```

## 2. IPFS 安装

文档：https://docs.ipfs.tech/install/command-line/#install-kubo-windows

复制下载连接：https://dist.ipfs.tech/kubo/v0.38.1/kubo_v0.38.1_windows-amd64.zip
也可以使用 IPNS 下载
http://129.226.147.127:8080/ipns/dist.ipfs.tech/kubo/v0.38.1/kubo_v0.38.1_windows-amd64.zip

添加环境变量：

解压 kubo 文件夹 到 C:\Program Files\kubo
搜索 高级系统设置 -> 环境变量 -> Path -> 编辑 -> 新建 -> 输入 C:\Program Files\kubo

打开 终端 运行以下命令

```bash
# 验证安装
ipfs --version
# ipfs version 0.38.1

# 初始化 IPFS 仓库
ipfs init

# 设置 8080 端口
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

# 测试启动 IPFS
ipfs daemon --enable-gc

# 关闭 IPFS
ipfs shutdown
```

（替换为服务器 IP）
IPFS 测试访问：http://119.91.211.100:8080

## 3. Most.Box 安装

打开 https://git-scm.com/downloads/win

下载安装包, 安装时选择默认选项。

打开 Git Bash 运行以下命令

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

# 测试启动 Most.Box
node ./src/index.mjs
```

（替换为服务器 IP）
Most.Box 测试访问：http://119.91.211.100:1976

## 4. Most.Box 开机启动

打开 终端 运行以下命令

```bash
# 安装 pm2
npm install -g pm2

# 检查 pm2 是否安装成功
pm2 -v
# 6.0.13

# 启动 IPFS 服务
pm2 start "C:\Program Files\kubo\ipfs.exe" --name ipfs --interpreter none -- daemon --enable-gc

# 启动 Most.Box（命名为 dot）
pm2 start ./src/index.mjs --name dot

# 保存当前进程列表
pm2 save
```

开机启动

打开启动文件夹

`%HOMEPATH%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

创建 `pm2.bat` 文件

写入以下内容

```bat
@echo off
cd /d %APPDATA%\npm
start "" /b pm2 resurrect
```

## 5. Caddy 域名配置（可选）

域名：x-cid.most.box, x.most.box 解析到服务器 IP 地址 119.91.211.100
文档：https://caddyserver.com/download

添加环境变量：

新建文件夹：C:\caddy\

下载 caddy_windows_amd64.exe 重命名为 caddy.exe 到 C:\caddy\caddy.exe

搜索 高级系统设置 -> 环境变量 -> Path -> 编辑 -> 新建 -> 输入 C:\caddy

新建文本文档 Caddyfile 去掉 .txt 后缀

C:\caddy\Caddyfile

```
x.most.box {
    reverse_proxy 127.0.0.1:1976
}

x-cid.most.box {
    reverse_proxy 127.0.0.1:8080
}
```

打开 终端 运行以下命令

```bash
cd C:/caddy

# 验证
caddy validate

# 格式化
caddy fmt --overwrite

# 测试启动
caddy start

# 关闭 caddy
caddy stop
```

开机启动

打开启动文件夹

`%HOMEPATH%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

创建 `caddy.bat` 文件

写入以下内容

```bat
@echo off
cd /d C:\caddy
start "" /b caddy run
```

查看当前配置
http://localhost:2019/config/

（替换为正确域名）
IPFS 测试访问：https://x-cid.most.box
Most.Box 测试访问：https://x.most.box

## 6. 发布 Most.Box 节点

打开 Git Bash 运行以下命令

```bash
# 进入目录
cd ~/most.box/dot.most.box

# 节点配置
nano .env

# 配置文件 .env

DOT_NAME=Test
# 节点钱包私钥 https://most.box/web3/tools/ （需要一些 Base ETH Gas）
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
# 节点 IP 和 网址
API_URLS=https://x.most.box,http://xxx.xxx.xxx.xxx:1976
CID_URLS=https://x-cid.most.box



# （Ctrl + o 保存 -> 回车 -> Ctrl + x 退出

# 重启节点
pm2 restart dot
```

https://dot.most.box 查看已发布的节点

## 7. IPFS Cluster 集群配置

最新安装包：https://dist.ipfs.tech/#ipfs-cluster-service

IPFS Cluster 服务端：https://dist.ipfs.tech/ipfs-cluster-service/v1.1.4/ipfs-cluster-service_v1.1.4_windows-amd64.zip
IPFS Cluster 遥控器：https://dist.ipfs.tech/ipfs-cluster-ctl/v1.1.4/ipfs-cluster-ctl_v1.1.4_windows-amd64.zip

也可以使用 IPNS 下载
IPFS Cluster 服务端：http://129.226.147.127:8080/ipns/dist.ipfs.tech/ipfs-cluster-service/v1.1.4/ipfs-cluster-service_v1.1.4_windows-amd64.zip
IPFS Cluster 遥控器：http://129.226.147.127:8080/ipns/dist.ipfs.tech/ipfs-cluster-ctl/v1.1.4/ipfs-cluster-ctl_v1.1.4_windows-amd64.zip

解压 ipfs-cluster-service_v1.1.4_windows-amd64.zip 到 C:\Program Files\ipfs-cluster-service
解压 ipfs-cluster-ctl_v1.1.4_windows-amd64.zip 到 C:\Program Files\ipfs-cluster-ctl

添加环境变量：

搜索 高级系统设置 -> 环境变量 -> Path -> 编辑 -> 新建 -> 输入 C:\Program Files\ipfs-cluster-service
搜索 高级系统设置 -> 环境变量 -> Path -> 编辑 -> 新建 -> 输入 C:\Program Files\ipfs-cluster-ctl

打开 终端 运行以下命令

```bash
# 验证安装
ipfs-cluster-service --version
# ipfs-cluster-service version 1.1.4

ipfs-cluster-ctl --version
# ipfs-cluster-ctl version 1.1.4

# 初始化
ipfs-cluster-service init --consensus crdt

# 测试启动 IPFS 集群
ipfs-cluster-service daemon

# 查看节点 ID
ipfs-cluster-ctl id
# 12D3KooWK4ScGSEZYKvvRho9VJabKHLLjD7jNy8unNv7LcqfrzHE | VM-8-8-ubuntu | Sees 0 other peers

# 查看所有节点信息
ipfs-cluster-ctl peers ls
```

覆盖配置文件 `C:\Users\Administrator\.ipfs-cluster\service.json`

开机启动

打开启动文件夹

`%HOMEPATH%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

创建 `ipfs-cluster.bat` 文件

写入以下内容

```bat
@echo off
cd /d C:\Program Files\ipfs-cluster-service
start "" /b ipfs-cluster-service daemon
```

启动 ipfs-cluster.bat

打开 http://localhost:9094/health/graph 查看健康状态

可以看到 IPFS 集群中所有节点的信息，包括节点 ID、节点状态、节点 IP 地址等。

大功告成！

通过以上配置，我们可以通过域名访问 Most.Box 前端和 IPFS 网关。

Most.Box 前端
https://x.most.box
http://xxx.xxx.xxx.xxx:1976

IPFS 网关
https://x-cid.most.box
http://xxx.xxx.xxx.xxx:8080
